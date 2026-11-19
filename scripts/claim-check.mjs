#!/usr/bin/env node

/**
 * scripts/claim-check.mjs
 *
 * Answers one question before the first write of a session: "is anybody else
 * already writing inside the paths I am about to touch?"
 *
 * Worktree isolation protects files; it does not protect decisions. Two sessions
 * can cut independent worktrees, work for hours, and discover the collision only
 * when one of the PRs conflicts or, worse, when both rewrite the same generated
 * artifact and the second one silently drops the first one's content.
 *
 * The claim is a versioned file under `openspec/claims/` so that every harness
 * and every new session can read it without talking to the session that wrote it.
 * The format is deliberately plain (`key: value` plus indented `- item` lists):
 * no YAML dependency, no parser that can drift, readable in a diff.
 *
 * What this deliberately does NOT do:
 *   - It does not write claims. Creating one is a human/agent decision, and a
 *     tool that invented claims would hide the decision it exists to surface.
 *   - It does not resolve the conflict. It names it and exits non-zero; deciding
 *     to proceed anyway is the maintainer's call and gets recorded in the claim.
 *   - It does not try to intersect two globs. That is undecidable in general, so
 *     a pattern is only tested against literal paths. Declare literal paths when
 *     you need certainty.
 *
 * Usage:
 *   node scripts/claim-check.mjs --area <path-or-glob> [--area ...] [--self <claim-file>]
 *   node scripts/claim-check.mjs --area ... --prs <file.json>
 *   node scripts/claim-check.mjs --area ... --json
 *
 *   --root <dir>   repository root (default: parent of this script)
 *   --self <file>  your own claim, file path or slug. It is skipped: a claim must
 *                  never block the session that just wrote it.
 *   --prs <file>   open PRs as JSON, gh shape: [{"number":650,"files":[{"path":"x"}]}]
 *                  or the simpler [{"number":650,"paths":["x"]}]. Without it the
 *                  checker cannot tell a stale claim from an active one and keeps
 *                  every claim, which is the conservative side.
 *   --json         machine-readable result
 *
 * Exit codes: 0 free, 1 conflict, 2 usage error.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CLAIMS_DIR = path.join('openspec', 'claims')
const KEY_RE = /^([A-Za-z][\w-]*):\s*(.*)$/
const ITEM_RE = /^\s*-\s+(.*)$/

/** Turns a repo-relative glob into an anchored regexp. `**` crosses segments. */
export function globToRegExp(glob) {
  let pattern = String(glob).trim().replace(/\\/g, '/').replace(/^\.\//, '')
  if (pattern.endsWith('/')) pattern += '**'
  let source = ''
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]
    if (char === '*') {
      if (pattern[index + 1] === '*') {
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?'
          index += 2
        } else {
          source += '.*'
          index += 1
        }
      } else {
        source += '[^/]*'
      }
    } else if (char === '?') {
      source += '[^/]'
    } else if ('.+^${}()|[]\\'.includes(char)) {
      source += `\\${char}`
    } else {
      source += char
    }
  }
  return new RegExp(`^${source}$`)
}

/** True when `candidate` matches any declared pattern. Literal paths only. */
export function matchesAny(candidate, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(candidate))
}

/** `key: value` lines plus `key:` blocks of `- item` lines. Comments discarded. */
export function parseClaim(text, file = '') {
  const claim = {
    file,
    slug: '',
    branch: '',
    pr: null,
    opened: '',
    thread: '',
    area: [],
    excludes: [],
  }
  let block = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim()) continue
    const item = ITEM_RE.exec(line)
    if (item) {
      if (!block) continue
      const value = item[1]
        .split(/\s+#\s/)[0]
        .replace(/`/g, '')
        .trim()
      if (value) claim[block].push(value)
      continue
    }
    if (line.startsWith('#')) {
      block = null
      const title = /^#\s*claim:\s*(.+)$/.exec(line.trim())
      if (title) claim.slug = title[1].trim()
      continue
    }
    if (/^\s/.test(line)) {
      block = null
      continue
    }
    const key = KEY_RE.exec(line)
    if (!key) {
      block = null
      continue
    }
    const name = key[1].toLowerCase()
    const value = key[2].trim().replace(/`/g, '')
    if (name === 'area' || name === 'excludes') {
      block = name
      if (value) claim[name].push(value)
      continue
    }
    block = null
    if (name === 'pr') claim.pr = value ? Number(value.replace(/^#/, '')) : null
    else if (name in claim) claim[name] = value
    if (!claim.slug && name === 'branch') claim.slug = path.basename(value)
  }
  if (!claim.slug) claim.slug = path.basename(file, '.md')
  return claim
}

export function readClaims(root) {
  const dir = path.join(root, CLAIMS_DIR)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
    .sort()
    .map((name) => {
      const file = path.join(dir, name)
      return parseClaim(
        fs.readFileSync(file, 'utf8'),
        path.join(CLAIMS_DIR, name).replace(/\\/g, '/'),
      )
    })
}

/** gh's `--json files` shape and the simpler `paths` shape both work. */
export function normalizePullRequests(input) {
  if (!Array.isArray(input)) return []
  return input.map((pr) => ({
    number: Number(pr.number),
    branch: String(pr.headRefName ?? pr.branch ?? ''),
    paths: (pr.files ?? pr.paths ?? []).map((entry) => String(entry.path ?? entry)).filter(Boolean),
  }))
}

/**
 * Reads a JSON file the way a Windows shell writes it. PowerShell's `>` emits
 * UTF-16 with a BOM, so `gh pr list ... > prs.json` — the command this repo
 * documents — produces a file a plain `JSON.parse` rejects. A checker that
 * fails on the shell it documents is a checker nobody runs.
 */
export function readJsonLoose(file) {
  const buffer = fs.readFileSync(file)
  const text =
    buffer.length > 1 && buffer[0] === 0xff && buffer[1] === 0xfe
      ? buffer.toString('utf16le')
      : buffer.toString('utf8')
  return JSON.parse(text.replace(/^\uFEFF/, ''))
}

function loadPullRequests(root, explicit) {
  if (!explicit) return null
  const file = path.isAbsolute(explicit) ? explicit : path.join(root, explicit)
  return normalizePullRequests(readJsonLoose(file))
}

/**
 * A claim conflicts when one of its patterns covers one of ours and it is not
 * excused. Both sides keep literal paths in the common case, which is the only
 * case this resolver promises to get right.
 */
export function findConflicts({ areas, claims, pullRequests, self = null }) {
  const openNumbers = pullRequests ? new Set(pullRequests.map((pr) => pr.number)) : null
  const conflicts = []
  const stale = []

  for (const claim of claims) {
    if (self && (claim.file === self || claim.slug === self)) continue
    if (openNumbers && claim.pr && !openNumbers.has(claim.pr)) {
      stale.push(claim)
      continue
    }
    for (const target of areas) {
      const hit = matchesAny(target, claim.area)
      if (!hit) continue
      if (matchesAny(target, claim.excludes)) continue
      conflicts.push({ path: target, kind: 'claim', claim })
    }
  }

  for (const pr of pullRequests ?? []) {
    for (const target of areas) {
      if (!matchesAny(target, pr.paths)) continue
      conflicts.push({ path: target, kind: 'pull-request', pullRequest: pr })
    }
  }

  return { conflicts, stale }
}

function parseArgs(argv) {
  const options = {
    areas: [],
    root: path.resolve(SCRIPT_DIR, '..'),
    prs: null,
    self: null,
    json: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--area') options.areas.push(argv[++index])
    else if (arg === '--root') options.root = argv[++index]
    else if (arg === '--prs') options.prs = argv[++index]
    else if (arg === '--self') options.self = String(argv[++index]).replace(/\\/g, '/')
    else if (arg === '--json') options.json = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else options.unknown = arg
  }
  return options
}

function report(result) {
  const lines = []
  for (const conflict of result.conflicts) {
    const owner =
      conflict.kind === 'claim'
        ? `claim "${conflict.claim.slug}" (${conflict.claim.file}${conflict.claim.pr ? `, PR #${conflict.claim.pr}` : ''})`
        : `open PR #${conflict.pullRequest.number}${conflict.pullRequest.branch ? ` (${conflict.pullRequest.branch})` : ''}`
    lines.push(`  ${conflict.path}  <- already taken by ${owner}`)
  }
  for (const claim of result.stale) {
    lines.push(`  ${claim.file}  released (PR #${claim.pr} is not open) — safe to delete`)
  }
  return lines.join('\n')
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help) {
    process.stdout.write(
      'usage: claim-check --area <path-or-glob> [--area ...] [--self <claim-file>] [--prs <file.json>] [--root <dir>] [--json]\n',
    )
    return 0
  }
  if (options.unknown) {
    process.stderr.write(`claim-check: unknown argument ${options.unknown}\n`)
    return 2
  }
  if (options.areas.length === 0) {
    process.stderr.write('claim-check: at least one --area is required\n')
    return 2
  }

  const claims = readClaims(options.root)
  let pullRequests = null
  try {
    pullRequests = loadPullRequests(options.root, options.prs)
  } catch (error) {
    process.stderr.write(`claim-check: cannot read --prs ${options.prs}: ${error.message}\n`)
    return 2
  }

  const areas = options.areas.map((area) => area.replace(/\\/g, '/').trim())
  const result = findConflicts({ areas, claims, pullRequests, self: options.self })
  const free = result.conflicts.length === 0

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ free, ...result }, null, 2)}\n`)
  } else {
    const heading = free
      ? 'claim-check: area is free'
      : `claim-check: ${result.conflicts.length} conflict(s)`
    process.stdout.write(`${heading}\n${report(result)}\n`)
    if (!free) {
      process.stdout.write(
        'Do not start this work as planned. Hand the areas over, or record the accepted overlap in your claim.\n',
      )
    }
  }
  return free ? 0 : 1
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  process.exitCode = main()
}
