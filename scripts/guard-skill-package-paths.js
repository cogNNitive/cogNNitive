#!/usr/bin/env node

/**
 * scripts/guard-skill-package-paths.js
 *
 * Rule: a script inside a skill package must not climb out of its own package
 * with a literal relative-path chain unless that chain is declared in
 * `scripts/skill-package-paths.json`. A declaration names the file and the
 * number of `'..'` literals, the repo-relative target, the anchor and the
 * reason the read exists; target and anchor are optional for a probe (below).
 *
 * Why: a skill script that reaches a sibling of its package works when the
 * skill sits inside its blueprint and silently resolves somewhere else when the
 * skill is installed flat (`~/.agents/skills/<name>`). The failure is silent: a
 * stale orphan copy is still a readable file, so the run produces wrong output
 * and only dies later, far from the cause. The defect is invisible in review
 * and nobody watches it, so it has to be a declaration plus a gate.
 *
 * What it scans: every `*.mjs`, `*.js`, `*.cjs` under `scripts/` and `bin/` of
 * each skill package root, where a package root is
 * `skills/<name>` or `iNNfo/specs/bluepriNNts/<blueprint>/skills/<name>`.
 * `node_modules` and any `fixtures/` subtree are skipped. `<skill>/test/**` is
 * NOT scanned: a skill's own suites are verification, not a runtime resource
 * read, which is the same line `scripts/guard-template-immutability.js` draws
 * when it exempts a skill's tests from the owning blueprint's version bump.
 *
 * How a chain is detected (LITERAL-ONLY, deliberately):
 *   - call sites of `path.resolve(` and `path.join(` only. A bare `resolve(` or
 *     `join(` imported from `node:path` is not followed: in this repository
 *     those names are mostly local helpers, so following them would invent
 *     findings. This is a tripwire on the common pattern, not a proof.
 *   - only plain single/double-quoted string literals are understood. Template
 *     literals, identifiers and calls are dynamic. The chain is taken from the
 *     literal run after the last dynamic argument, so `path.resolve(dir, '..',
 *     n)` is dynamic and ignored.
 *   - the climb count is the length of the first consecutive run of `'..'`
 *     literals in that literal run; the segments after it are the tail. A second
 *     `'..'` inside the tail makes the chain unanalysable and it is ignored.
 *   - the target is `path.resolve(fileDir, ...climbs, ...tail)` where fileDir is
 *     the directory of the scanned file. A chain whose first argument is a
 *     variable that already contains a climb (for example `BLUEPRINT =
 *     path.resolve(SKILL, '..', '..')`) therefore resolves one level inward of
 *     what the runtime does. The climb count and the declaration are still
 *     right; only the recorded target is conservative.
 *   - call sites inside comments and string/template literals are masked out
 *     before scanning, so a documented example is never a finding.
 *
 * `dirSegments` is how many path segments the scanned file's directory sits
 * below its package root (`<root>/scripts/lib/x.mjs` -> 2). A chain escapes
 * when `climbs > dirSegments`.
 *
 * A declaration without `probe: true` is a resource read: its target must exist
 * under the repo root. A declaration that matches no current chain is a
 * violation too, so the file cannot rot into a lying allowlist.
 *
 * Probes: a chain that only asks whether a candidate path exists (the
 * existsSync-then-next-candidate pattern in a fallback list) is a probe, not a
 * read, and a missing candidate is correct behaviour. Such a declaration carries
 * `"probe": true`: it still needs `file`, `climbs` and a `reason` naming the
 * fallback it probes; `target` and `anchor` are optional and informational, and
 * its target is NOT existence-checked. A probe matches its chain on file and
 * climb count alone. No other field opts a declaration out of the existence
 * check: an unknown flag is ignored, never honoured.
 *
 * Usage:
 *   node scripts/guard-skill-package-paths.js [--root <repoRoot>] [--declarations <file>]
 *
 *   --root          repository root to scan (default: the repository of this
 *                   script, i.e. `path.join(__dirname, '..')`).
 *   --declarations  declaration file (default: `<root>/scripts/skill-package-paths.json`).
 *
 * Exit 0 with one summary line when every escape is declared, exit 1 printing
 * one line per violation.
 */

'use strict'

const fs = require('fs')
const path = require('path')

const DEFAULT_ROOT = path.join(__dirname, '..')
const DECLARATIONS_REL = 'scripts/skill-package-paths.json'
const SCAN_SURFACES = ['scripts', 'bin']
const SCRIPT_RE = /\.(mjs|cjs|js)$/i
const SKIP_DIRS = new Set(['node_modules', 'fixtures'])
const CALL_RE = /\bpath\.(resolve|join)\s*\(/g

// Characters after which a `/` starts a regex literal rather than a division.
const REGEX_PRECEDERS = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '<',
  '>',
  '~',
  '^',
])

function getArg(flag) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null
}

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function dirNames(absDir) {
  try {
    return fs
      .readdirSync(absDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

/** Every skill package root of a repository, as absolute paths. */
function listSkillPackageRoots(rootAbs) {
  const roots = []
  const flat = path.join(rootAbs, 'skills')
  for (const name of dirNames(flat)) roots.push(path.join(flat, name))
  const blueprints = path.join(rootAbs, 'iNNfo', 'specs', 'bluepriNNts')
  for (const blueprint of dirNames(blueprints)) {
    const skills = path.join(blueprints, blueprint, 'skills')
    for (const name of dirNames(skills)) roots.push(path.join(skills, name))
  }
  return roots
}

function collectScripts(absDir, out) {
  let entries
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      collectScripts(path.join(absDir, entry.name), out)
    } else if (SCRIPT_RE.test(entry.name)) {
      out.push(path.join(absDir, entry.name))
    }
  }
  return out
}

/**
 * Blank out comments, string literals, template literals and regex literals,
 * keeping every offset and every newline. Call sites are searched in the masked
 * text and their arguments are read from the original text at the same offsets.
 */
function maskNonCode(source) {
  const chars = source.split('')
  const blank = (index) => {
    if (chars[index] !== '\n' && chars[index] !== '\r') chars[index] = ' '
  }
  let i = 0
  let previous = ''
  while (i < source.length) {
    const char = source[i]
    const next = source[i + 1]
    if (char === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') {
        blank(i)
        i++
      }
      continue
    }
    if (char === '/' && next === '*') {
      blank(i)
      blank(i + 1)
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        blank(i)
        i++
      }
      if (i < source.length) {
        blank(i)
        blank(i + 1)
        i += 2
      }
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      i++
      while (i < source.length) {
        if (source[i] === '\\') {
          blank(i)
          i++
          if (i < source.length) {
            blank(i)
            i++
          }
          continue
        }
        if (source[i] === char) {
          i++
          break
        }
        blank(i)
        i++
      }
      previous = char
      continue
    }
    if (char === '/' && (previous === '' || REGEX_PRECEDERS.has(previous))) {
      i++
      let inClass = false
      while (i < source.length) {
        const inner = source[i]
        if (inner === '\\') {
          blank(i)
          i++
          if (i < source.length) {
            blank(i)
            i++
          }
          continue
        }
        if (inner === '[') inClass = true
        else if (inner === ']') inClass = false
        else if (inner === '\n') break
        else if (inner === '/' && !inClass) {
          i++
          break
        }
        blank(i)
        i++
      }
      previous = '/'
      continue
    }
    if (!/\s/.test(char)) previous = char
    i++
  }
  return chars.join('')
}

/** The text between the parentheses that open at `openIndex`, from the original source. */
function callText(source, openIndex) {
  let depth = 0
  let quote = null
  for (let i = openIndex; i < source.length; i++) {
    const char = source[i]
    if (quote) {
      if (char === '\\') {
        i++
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '(') depth++
    else if (char === ')') {
      depth--
      if (depth === 0) return source.slice(openIndex + 1, i)
    }
  }
  return null
}

/** Split a call's argument text on top-level commas. */
function splitArguments(text) {
  const args = []
  let depth = 0
  let quote = null
  let current = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quote) {
      current += char
      if (char === '\\') {
        current += text[i + 1] ?? ''
        i++
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      current += char
      continue
    }
    if (char === '(' || char === '[' || char === '{') depth++
    else if (char === ')' || char === ']' || char === '}') depth--
    if (char === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim() !== '') args.push(current.trim())
  return args
}

/** A plain single/double-quoted literal's value, or null when the argument is not one. */
function plainString(argument) {
  const match = /^'([^'\\]*)'$|^"([^"\\]*)"$/.exec(argument)
  if (!match) return null
  return match[1] !== undefined ? match[1] : match[2]
}

/**
 * The literal climb chain of a call, or null when there is none to analyse.
 * @param {string[]} args
 * @returns {{ climbs: number, tail: string[] } | null}
 */
function literalChain(args) {
  const literals = args.map(plainString)
  let lastDynamic = -1
  for (let i = 0; i < literals.length; i++) if (literals[i] === null) lastDynamic = i
  const suffix = literals.slice(lastDynamic + 1)
  if (suffix.length === 0) return null
  const first = suffix.indexOf('..')
  if (first === -1) return null
  let climbs = 0
  while (first + climbs < suffix.length && suffix[first + climbs] === '..') climbs++
  const tail = suffix.slice(first + climbs)
  if (tail.includes('..')) return null // not a single trailing run: unanalysable
  return { climbs, tail }
}

/** Analyse one source file. Returns `{ inside, escapes }` for that file. */
function analyseFile(rootAbs, skillRootAbs, fileAbs) {
  const source = fs.readFileSync(fileAbs, 'utf8')
  const masked = maskNonCode(source)
  const fileRel = toPosix(path.relative(rootAbs, fileAbs))
  const skillPackage = toPosix(path.relative(rootAbs, skillRootAbs))
  const fileDirRel = path.posix.dirname(fileRel)
  const withinPackage = toPosix(path.relative(skillRootAbs, path.dirname(fileAbs)))
  const dirSegments =
    withinPackage === '' || withinPackage === '.' ? 0 : withinPackage.split('/').length

  const result = { inside: 0, escapes: [] }
  CALL_RE.lastIndex = 0
  let match
  while ((match = CALL_RE.exec(masked)) !== null) {
    const openIndex = match.index + match[0].length - 1
    const text = callText(source, openIndex)
    if (text === null) continue
    const chain = literalChain(splitArguments(text))
    if (!chain || chain.climbs === 0) continue

    const line = masked.slice(0, match.index).split('\n').length
    if (chain.climbs <= dirSegments) {
      result.inside++
      continue
    }

    const segments = []
    for (let i = 0; i < chain.climbs; i++) segments.push('..')
    segments.push(...chain.tail)
    const target = path.posix.normalize(path.posix.join(fileDirRel, ...segments))
    result.escapes.push({
      file: fileRel,
      line,
      climbs: chain.climbs,
      dirSegments,
      skillPackage,
      target,
    })
  }
  return result
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Load and shape-check the declaration file. A missing file is an empty
 * allowlist (every escape then fails on its own); malformed JSON is a violation.
 */
function loadDeclarations(declarationsPath, errors) {
  if (!fs.existsSync(declarationsPath)) return []
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(declarationsPath, 'utf8'))
  } catch (error) {
    errors.push(`ERROR: ${toPosix(declarationsPath)} is not valid JSON (${error.message}).`)
    return []
  }
  const allowed = parsed && Array.isArray(parsed.allowed) ? parsed.allowed : null
  if (allowed === null) {
    errors.push(`ERROR: ${toPosix(declarationsPath)} has no "allowed" array.`)
    return []
  }
  const declarations = []
  allowed.forEach((entry, index) => {
    const label = `declaration #${index + 1} in ${toPosix(declarationsPath)}`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`ERROR: ${label} is not an object.`)
      return
    }
    if (!isNonEmptyString(entry.file)) return errors.push(`ERROR: ${label} has no "file".`)
    if (!Number.isInteger(entry.climbs) || entry.climbs < 1) {
      return errors.push(`ERROR: ${label} has no positive integer "climbs".`)
    }
    if (!isNonEmptyString(entry.reason)) return errors.push(`ERROR: ${label} has no "reason".`)
    const probe = entry.probe === true
    if (!probe) {
      if (!isNonEmptyString(entry.target)) return errors.push(`ERROR: ${label} has no "target".`)
      if (!isNonEmptyString(entry.anchor)) return errors.push(`ERROR: ${label} has no "anchor".`)
    }
    if (entry.target !== undefined && !isNonEmptyString(entry.target)) {
      return errors.push(`ERROR: ${label} has an empty "target".`)
    }
    declarations.push({
      file: entry.file.split('\\').join('/'),
      climbs: entry.climbs,
      target: entry.target === undefined ? null : entry.target.split('\\').join('/'),
      anchor: entry.anchor === undefined ? null : entry.anchor,
      reason: entry.reason,
      probe,
    })
  })
  return declarations
}

/**
 * Scan the repository and validate every escape against its declaration.
 * @param {{ root?: string, declarations?: string }} [options]
 * @returns {{ ok: boolean, errors: string[], escapes: object[], inside: number, declared: number, packages: string[], declarationsPath: string }}
 */
function scanSkillPackagePaths(options = {}) {
  const rootAbs = path.resolve(options.root || DEFAULT_ROOT)
  const declarationsPath = path.resolve(
    options.declarations || path.join(rootAbs, ...DECLARATIONS_REL.split('/')),
  )
  const errors = []

  const packages = listSkillPackageRoots(rootAbs)
  if (packages.length === 0)
    errors.push(`ERROR: no skill packages found under ${toPosix(rootAbs)}.`)

  const escapes = []
  let inside = 0
  for (const skillRootAbs of packages) {
    const files = []
    for (const surface of SCAN_SURFACES) collectScripts(path.join(skillRootAbs, surface), files)
    files.sort()
    for (const fileAbs of files) {
      const analysed = analyseFile(rootAbs, skillRootAbs, fileAbs)
      inside += analysed.inside
      escapes.push(...analysed.escapes)
    }
  }

  const declarations = loadDeclarations(declarationsPath, errors)
  const declarationsLabel = toPosix(path.relative(rootAbs, declarationsPath))
  const declarationsShown = declarationsLabel.startsWith('..')
    ? toPosix(declarationsPath)
    : declarationsLabel
  const used = new Set()
  let declared = 0

  for (const escape of escapes) {
    if (escape.target === '..' || escape.target.startsWith('../')) {
      errors.push(
        `ERROR: ${escape.file}:${escape.line} climbs ${escape.climbs} level(s) out of ${escape.skillPackage} ` +
          `and leaves the repository (resolves to ${escape.target}); that cannot be declared.`,
      )
      continue
    }
    const sameSite = declarations.filter(
      (entry) => entry.file === escape.file && entry.climbs === escape.climbs,
    )
    const exact = sameSite.find((entry) => !entry.probe && entry.target === escape.target)
    if (exact) {
      used.add(exact)
      declared++
      continue
    }
    // A probe matches on file and climb count alone: its target is informational
    // because the candidate it names is allowed not to exist.
    const probe = sameSite.find((entry) => entry.probe)
    if (probe) {
      used.add(probe)
      declared++
      continue
    }
    if (sameSite.length > 0) {
      errors.push(
        `ERROR: ${escape.file}:${escape.line} climbs ${escape.climbs} level(s) out of ${escape.skillPackage}, ` +
          `but the declaration names ${sameSite[0].target} while the literals resolve to ${escape.target}.`,
      )
      continue
    }
    errors.push(
      `ERROR: ${escape.file}:${escape.line} climbs ${escape.climbs} level(s) out of ${escape.skillPackage} ` +
        `with no declaration (resolves to ${escape.target}); add an entry to ${declarationsShown}.`,
    )
  }

  for (const entry of declarations) {
    if (!fs.existsSync(path.join(rootAbs, entry.file))) {
      continue
    }
    if (!entry.probe && !fs.existsSync(path.join(rootAbs, entry.target))) {
      errors.push(
        `ERROR: declaration for ${entry.file} points at ${entry.target}, which does not exist under ${toPosix(rootAbs)}.`,
      )
      continue
    }
    if (!used.has(entry)) {
      errors.push(
        `ERROR: declaration for ${entry.file} (climbs ${entry.climbs} -> ${entry.target ?? 'no target'}) matches no escaping chain; ` +
          'delete or update it so the file cannot rot into a lying allowlist.',
      )
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    escapes,
    inside,
    declared,
    packages: packages.map((root) => toPosix(path.relative(rootAbs, root))),
    declarationsPath: toPosix(path.relative(rootAbs, declarationsPath)),
  }
}

function main() {
  const result = scanSkillPackagePaths({
    root: getArg('--root') || undefined,
    declarations: getArg('--declarations') || undefined,
  })

  if (!result.ok) {
    console.log(`Skill package path guard: ${result.errors.length} violation(s) found.`)
    for (const error of result.errors) console.log(`  ${error}`)
    process.exit(1)
  }
  console.log(
    `skill-package-paths: ${result.inside} chain(s) stay inside their package, ${result.declared} declared escape(s).`,
  )
  process.exit(0)
}

if (require.main === module) main()

module.exports = { scanSkillPackagePaths, listSkillPackageRoots, maskNonCode, literalChain }
