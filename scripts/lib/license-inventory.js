'use strict'

/**
 * scripts/lib/license-inventory.js
 *
 * Offline inventory of the production dependencies installed for the repo's
 * workspaces, plus the THIRD_PARTY.md attribution renderer. Everything is read
 * from the node_modules trees and package.json files; nothing touches the network.
 */

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { classifyExpression, declaredLicense } = require('./license-policy.js')

/** Workspace roots whose production dependency trees are inventoried. */
const WORKSPACE_DIRS = ['iNNfo/packages/nn-core', 'iNNfo/packages/nn-mcp', 'skills/nn-sources']

const LICENSE_FILE_RE = /^(licen[cs]e|copying)(\.[a-z]+)?$/i
// A copyright line states a year (or a (c)/copyright sign); prose such as "copyright license" does not.
const COPYRIGHT_RE = /^\s*(copyright\s*(\(c\)|\u00a9|\d{4})|\(c\)\s*\d{4}|\u00a9)/i
/** Copyright headers sit at the top of a license file; later hits are license boilerplate. */
const COPYRIGHT_SCAN_LINES = 20

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const lf = (text) => text.replace(/\r\n/g, '\n')
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex')

/**
 * Node-style lookup of `<name>/package.json`, walking up from `fromDir`.
 * @param {string} name
 * @param {string} fromDir
 * @returns {string | null}
 */
function resolvePackageJson(name, fromDir) {
  let dir = fromDir
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name, 'package.json')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Walks `dependencies` + `optionalDependencies` of every workspace. Optional
 * dependencies that are not installed (other platforms) are skipped; a missing
 * REQUIRED dependency means the tree is not installed and is reported.
 *
 * @param {string} repoRoot
 * @param {string[]} [workspaceDirs]
 * @returns {{ packages: Array<{ name: string, version: string, dir: string, pkg: Record<string, any>, usedBy: string[] }>, missing: string[] }}
 */
function discoverProductionDependencies(repoRoot, workspaceDirs = WORKSPACE_DIRS) {
  const firstParty = new Set()
  for (const rel of workspaceDirs) {
    const file = path.join(repoRoot, rel, 'package.json')
    if (fs.existsSync(file)) firstParty.add(readJson(file).name)
  }

  /** @type {Map<string, { name: string, version: string, dir: string, pkg: Record<string, any>, usedBy: Set<string> }>} */
  const found = new Map()
  /** @type {string[]} */
  const missing = []

  /**
   * @param {string} pkgJsonFile
   * @param {Record<string, any>} pkg
   * @param {string} workspaceLabel
   * @param {Set<string>} seen
   */
  function walk(pkgJsonFile, pkg, workspaceLabel, seen) {
    const required = Object.keys(pkg.dependencies || {})
    const optional = Object.keys(pkg.optionalDependencies || {})
    for (const name of [...required, ...optional]) {
      if (firstParty.has(name)) continue
      const resolved = resolvePackageJson(name, path.dirname(pkgJsonFile))
      if (!resolved) {
        if (required.includes(name))
          missing.push(`${name} (required by ${pkg.name || workspaceLabel})`)
        continue
      }
      const real = fs.realpathSync(resolved)
      const depPkg = readJson(real)
      const key = `${depPkg.name}@${depPkg.version}`
      let entry = found.get(key)
      if (!entry) {
        entry = {
          name: depPkg.name,
          version: depPkg.version,
          dir: path.dirname(real),
          pkg: depPkg,
          usedBy: new Set(),
        }
        found.set(key, entry)
      }
      entry.usedBy.add(workspaceLabel)
      if (seen.has(real)) continue
      seen.add(real)
      walk(real, depPkg, workspaceLabel, seen)
    }
  }

  for (const rel of workspaceDirs) {
    const file = path.join(repoRoot, rel, 'package.json')
    if (!fs.existsSync(file)) continue
    walk(file, readJson(file), path.basename(rel), new Set())
  }

  const packages = [...found.values()]
    .map((e) => ({ ...e, usedBy: [...e.usedBy].sort() }))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en') ||
        a.version.localeCompare(b.version, 'en', { numeric: true }),
    )
  return { packages, missing: [...new Set(missing)].sort() }
}

/**
 * Policy override for a package, matched by exact name AND version. An override
 * without a version never matches (validatePolicy reports it), so a verdict
 * granted for one release cannot silently cover a later one.
 * @param {{ packageOverrides?: Array<{ package: string, version: string, license: string, reason: string }> }} policy
 * @param {string} name
 * @param {string} version
 */
function findOverride(policy, name, version) {
  return (policy.packageOverrides || []).find((o) => o.package === name && o.version === version)
}

/**
 * Human-reviewed exception for a package@version whose license verdict is "review".
 * @param {{ reviewed?: Array<{ package: string, version: string, reason: string }> }} policy
 * @param {string} name
 * @param {string} version
 */
function findReviewed(policy, name, version) {
  return (policy.reviewed || []).find((r) => r.package === name && r.version === version)
}

/**
 * Structural checks of the policy file itself (fail-closed on malformed entries).
 * @param {any} policy
 * @returns {string[]}
 */
function validatePolicy(policy) {
  /** @type {string[]} */
  const errors = []
  const blank = (v) => typeof v !== 'string' || v.trim() === ''
  ;(policy.packageOverrides || []).forEach((o, i) => {
    const label = `packageOverrides[${i}] (${o && o.package})`
    if (!o || blank(o.package)) errors.push(`${label}: "package" is required`)
    if (!o || blank(o.version))
      errors.push(`${label}: "version" is required (overrides are per exact release)`)
    if (!o || blank(o.license)) errors.push(`${label}: "license" is required`)
    if (!o || blank(o.reason)) errors.push(`${label}: "reason" is required`)
  })
  if (!Array.isArray(policy.reviewed)) {
    errors.push('reviewed must be an array of { package, version, reason } (may be empty)')
  } else {
    policy.reviewed.forEach((r, i) => {
      const label = `reviewed[${i}] (${r && r.package})`
      if (!r || blank(r.package)) errors.push(`${label}: "package" is required`)
      if (!r || blank(r.version)) errors.push(`${label}: "version" is required`)
      if (!r || blank(r.reason)) errors.push(`${label}: "reason" is required`)
    })
  }
  // A vendored file reaches users inside the console bundle, so its attribution must be
  // in the policy: the copyright lines and a committed copy of the upstream license text.
  ;(policy.vendored || []).forEach((v, i) => {
    const label = `vendored[${i}] (${v && v.name})`
    const copyright = v && v.copyright
    if (!Array.isArray(copyright) || copyright.length === 0 || copyright.some(blank))
      errors.push(`${label}: "copyright" is required (a non-empty array of copyright lines)`)
    if (!v || blank(v.licenseFile))
      errors.push(
        `${label}: "licenseFile" is required (a committed copy of the upstream license text)`,
      )
    if (v && v.notice !== undefined && blank(v.notice))
      errors.push(`${label}: "notice", when present, is the verbatim upstream NOTICE text`)
    ;((v && v.includes) || []).forEach((inc, j) => {
      if (!inc || blank(inc.name) || blank(inc.license) || blank(inc.copyright))
        errors.push(
          `${label}: includes[${j}] (${inc && inc.name}): "license" and "copyright" are required`,
        )
    })
  })
  return errors
}

/**
 * Turns classified packages into gate failures: deny and unknown always fail; a
 * review verdict fails unless the exact package@version is in policy.reviewed.
 * @param {Array<{ name: string, version: string, license: string, verdict: string, note?: string }>} classified
 * @param {any} policy
 * @returns {string[]}
 */
function policyProblems(classified, policy) {
  /** @type {string[]} */
  const problems = []
  for (const p of classified) {
    if (p.verdict === 'deny')
      problems.push(`denied license: ${p.name}@${p.version} is ${p.license}`)
    else if (p.verdict === 'unknown')
      problems.push(
        `unknown license: ${p.name}@${p.version} is ${p.license}${p.note ? ` (${p.note})` : ''}`,
      )
    else if (p.verdict === 'review' && !findReviewed(policy, p.name, p.version))
      problems.push(
        `license needs review: ${p.name}@${p.version} is ${p.license}; read its license text, then list it under "reviewed" in scripts/license-policy.json`,
      )
  }
  return problems
}

/**
 * Classifies every discovered package.
 * @param {Array<{ name: string, version: string, dir: string, pkg: Record<string, any>, usedBy: string[] }>} packages
 * @param {any} policy
 * @returns {Array<{ name: string, version: string, license: string, verdict: string, note?: string, usedBy: string[], dir: string }>}
 */
function classifyPackages(packages, policy) {
  return packages.map((p) => {
    const override = findOverride(policy, p.name, p.version)
    const declared = declaredLicense(p.pkg)
    const license = override ? override.license : declared || '(none declared)'
    /** @type {{ verdict: string, error?: string }} */
    const result =
      declared || override
        ? classifyExpression(license, policy)
        : { verdict: 'unknown', error: 'no license declared' }
    const note = override ? `override: ${override.reason}` : result.error
    return {
      name: p.name,
      version: p.version,
      license,
      verdict: result.verdict,
      note,
      usedBy: p.usedBy,
      dir: p.dir,
    }
  })
}

/**
 * Copyright lines and text of the package's license file (LF-normalized), or nulls.
 * @param {string} dir
 * @returns {{ file: string | null, text: string | null, copyright: string[] }}
 */
function readLicenseFile(dir) {
  let names = []
  try {
    names = fs
      .readdirSync(dir)
      .filter((n) => LICENSE_FILE_RE.test(n))
      .sort()
  } catch {
    return { file: null, text: null, copyright: [] }
  }
  if (names.length === 0) return { file: null, text: null, copyright: [] }
  const text = lf(fs.readFileSync(path.join(dir, names[0]), 'utf8')).trim()
  const copyright = text
    .split('\n')
    .slice(0, COPYRIGHT_SCAN_LINES)
    .filter((line) => COPYRIGHT_RE.test(line))
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .slice(0, 3)
  return { file: names[0], text, copyright }
}

/**
 * Text without copyright lines and with collapsed whitespace, for grouping identical licenses.
 * @param {string} text
 */
function licenseBody(text) {
  return text
    .split('\n')
    .filter((line) => !COPYRIGHT_RE.test(line))
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Checks the hand-maintained vendored-asset list against the files on disk, and
 * classifies each entry's declared license against the policy.
 * @param {string} repoRoot
 * @param {any} policy
 * @returns {{ problems: string[] }}
 */
function checkVendored(repoRoot, policy) {
  /** @type {string[]} */
  const problems = []
  for (const v of policy.vendored || []) {
    const result = classifyExpression(v.license || '', policy)
    if (result.verdict === 'deny')
      problems.push(`denied license: vendored asset ${v.name} is ${v.license}`)
    else if (result.verdict === 'unknown')
      problems.push(
        `unknown license: vendored asset ${v.name} is ${v.license || '(none declared)'}${result.error ? ` (${result.error})` : ''}`,
      )
    else if (result.verdict === 'review' && !findReviewed(policy, v.name, v.version))
      problems.push(
        `license needs review: vendored asset ${v.name}@${v.version} is ${v.license}; list it under "reviewed" in scripts/license-policy.json`,
      )
    if (v.licenseFile && !fs.existsSync(path.join(repoRoot, v.licenseFile)))
      problems.push(`vendored asset ${v.name}: license file ${v.licenseFile} does not exist`)
    const file = path.join(repoRoot, v.path)
    if (!fs.existsSync(file)) {
      problems.push(`vendored asset ${v.name}: ${v.path} does not exist`)
      continue
    }
    const actual = sha256(lf(fs.readFileSync(file, 'utf8')))
    if (actual !== v.sha256) {
      problems.push(
        `vendored asset ${v.name}: ${v.path} changed (sha256 ${actual}); update scripts/license-policy.json`,
      )
    }
  }
  return { problems }
}

/** @param {unknown} value */
const escapeCell = (value) => String(value).replace(/\|/g, '&#124;')

/**
 * Renders THIRD_PARTY.md. Deterministic: same installed tree and policy give the same bytes.
 * @param {{ classified: ReturnType<typeof classifyPackages>, policy: any, projectLicense: string, repoRoot?: string }} input
 */
function renderThirdParty({ classified, policy, projectLicense, repoRoot }) {
  /** @type {string[]} */
  const lines = []
  lines.push('# Third-Party Notices')
  lines.push('')
  lines.push(
    `cogNNitive is released under the ${projectLicense} license (see [LICENSE](LICENSE)). It incorporates the`,
  )
  lines.push('third-party components listed below, each under its own license.')
  lines.push('')
  lines.push(
    '> Generated by `node scripts/check-licenses.mjs --write` from the installed production dependencies and',
  )
  lines.push(
    '> `scripts/license-policy.json`. Do not edit by hand: `npm run check:licenses` fails when this file is stale.',
  )
  lines.push('')
  lines.push('## Vendored and bundled assets')
  lines.push('')
  lines.push(
    'Files copied into the repository (not installed from npm). The list is hand-maintained in',
  )
  lines.push(
    '`scripts/license-policy.json`; the check fails when a listed file changes or disappears.',
  )
  lines.push('')
  lines.push('| Component | Version | License | Copyright | File | Source |')
  lines.push('|---|---|---|---|---|---|')
  for (const v of policy.vendored || []) {
    lines.push(
      `| ${escapeCell(v.name)} | ${escapeCell(v.version)} | ${escapeCell(v.license)} | ${escapeCell((v.copyright || []).join('; '))} | \`${v.path}\` | ${v.source} |`,
    )
  }
  lines.push('')
  lines.push(
    'The console bundle (`nn-console.bundle.js`, also served from a SHA-pinned jsDelivr tag) concatenates the',
  )
  lines.push(
    'vendored assets above with first-party code, and every exported `domaiNN_console.html` inlines that whole',
  )
  lines.push(
    'bundle. Their notices and license texts are reproduced in full at the end of this file. The nn-mcp CDN',
  )
  lines.push(
    'bundle (`nn-mcp.bundle.js`) inlines the `nn-mcp` production dependencies, and the generated `*.generated.cjs`',
  )
  lines.push('skill mirrors inline `yaml`; all of them are listed in the npm table below.')
  lines.push('')
  lines.push('## npm production dependencies')
  lines.push('')
  lines.push('Production dependency trees of `nn-core`, `nn-mcp` and `nn-sources`. Development')
  lines.push('tooling is not distributed and is not listed.')
  lines.push('')
  lines.push('| Package | Version | License | Policy | Used by | Copyright |')
  lines.push('|---|---|---|---|---|---|')

  /** @type {Map<string, { text: string, members: string[] }>} */
  const groups = new Map()
  for (const p of classified) {
    const info = readLicenseFile(p.dir)
    const copyright = info.copyright.length > 0 ? info.copyright.join('; ') : '(see package)'
    lines.push(
      `| ${escapeCell(p.name)} | ${p.version} | ${escapeCell(p.license)} | ${p.verdict} | ${p.usedBy.join(', ')} | ${escapeCell(copyright)} |`,
    )
    if (info.text) {
      const key = sha256(licenseBody(info.text))
      let group = groups.get(key)
      if (!group) {
        group = { text: info.text, members: [] }
        groups.set(key, group)
      }
      group.members.push(`${p.name}@${p.version}`)
    }
  }

  lines.push('')
  lines.push('## License texts')
  lines.push('')
  lines.push(
    'Each distinct license text shipped by the packages above, listed once with the packages that use it.',
  )
  lines.push('Copyright lines are in the table above and in each package.')
  lines.push('')
  const ordered = [...groups.values()].sort(
    (a, b) => b.members.length - a.members.length || a.members[0].localeCompare(b.members[0], 'en'),
  )
  for (const g of ordered) {
    const head =
      g.members.length > 3
        ? `${g.members.slice(0, 3).join(', ')} and ${g.members.length - 3} more`
        : g.members.join(', ')
    lines.push(`### ${head}`)
    lines.push('')
    if (g.members.length > 3) {
      lines.push(`Applies to: ${g.members.join(', ')}.`)
      lines.push('')
    }
    lines.push('```text')
    lines.push(
      g.text
        .split('\n')
        .filter((l) => !COPYRIGHT_RE.test(l))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    lines.push('```')
    lines.push('')
  }
  lines.push(...renderVendoredTexts(policy, repoRoot))
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

/**
 * The per-asset attribution of the vendored files: copyright, the upstream NOTICE text
 * verbatim (Apache-2.0 §4(d)), the third-party code each one embeds, and its license text
 * with the copyright lines kept. Reads only the repository, never node_modules.
 * @param {any} policy
 * @param {string | undefined} repoRoot
 * @returns {string[]}
 */
function renderVendoredTexts(policy, repoRoot) {
  const vendored = policy.vendored || []
  if (vendored.length === 0) return []
  const lines = ['## Vendored asset notices and license texts', '']
  lines.push(
    'Reproduced in full for each vendored asset, because each one is redistributed inside the',
  )
  lines.push('console bundle and every exported console.')
  lines.push('')
  for (const v of vendored) {
    lines.push(`### ${v.name} ${v.version} (${v.license})`)
    lines.push('')
    for (const c of v.copyright || []) lines.push(`${c}  `)
    lines.push(`Source: ${v.source}`)
    lines.push('')
    if (v.notice) {
      lines.push('NOTICE:')
      lines.push('')
      lines.push('```text')
      lines.push(lf(v.notice).trim())
      lines.push('```')
      lines.push('')
    }
    if (v.includes && v.includes.length > 0) {
      lines.push('Includes third-party code:')
      lines.push('')
      for (const inc of v.includes) lines.push(`- ${inc.name} (${inc.license}), ${inc.copyright}`)
      lines.push('')
    }
    if (v.licenseFile && repoRoot) {
      const file = path.join(repoRoot, v.licenseFile)
      if (fs.existsSync(file)) {
        lines.push(`License text (\`${v.licenseFile}\`):`)
        lines.push('')
        lines.push('```text')
        lines.push(
          lf(fs.readFileSync(file, 'utf8'))
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
        )
        lines.push('```')
        lines.push('')
      }
    }
  }
  return lines
}

module.exports = {
  WORKSPACE_DIRS,
  discoverProductionDependencies,
  classifyPackages,
  checkVendored,
  validatePolicy,
  policyProblems,
  findReviewed,
  renderThirdParty,
  readLicenseFile,
  licenseBody,
}
