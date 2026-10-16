#!/usr/bin/env node
/**
 * scripts/check-licenses.mjs
 *
 * Offline third-party license gate.
 *
 *   node scripts/check-licenses.mjs           # same as --check
 *   node scripts/check-licenses.mjs --check   # fail on denied/unknown licenses, unreviewed "review" licenses, changed vendored
 *                                             # assets, or a stale THIRD_PARTY.md
 *   node scripts/check-licenses.mjs --write   # regenerate THIRD_PARTY.md (policy still enforced)
 *
 * Reads production dependencies from the installed node_modules trees (run `npm ci` and
 * `npm ci --prefix skills/nn-sources` first) and the policy from scripts/license-policy.json.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const {
  discoverProductionDependencies,
  classifyPackages,
  checkVendored,
  validatePolicy,
  policyProblems,
  renderThirdParty,
} = require('./lib/license-inventory.js')

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const POLICY_FILE = path.join(REPO_ROOT, 'scripts', 'license-policy.json')
const OUTPUT_FILE = path.join(REPO_ROOT, 'THIRD_PARTY.md')

const write = process.argv.slice(2).includes('--write')

const policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'))
const projectLicense = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
).license
/** @type {string[]} */
const problems = []

if (!projectLicense) problems.push('root package.json declares no license')
if (!fs.existsSync(path.join(REPO_ROOT, 'LICENSE'))) problems.push('LICENSE file is missing')

const { packages, missing } = discoverProductionDependencies(REPO_ROOT)
for (const m of missing)
  problems.push(
    `dependency not installed: ${m} (run npm ci, and npm ci --prefix skills/nn-sources)`,
  )

problems.push(...validatePolicy(policy))
const classified = classifyPackages(packages, policy)
problems.push(...policyProblems(classified, policy))
problems.push(...checkVendored(REPO_ROOT, policy).problems)

if (problems.length === 0) {
  const rendered = renderThirdParty({ classified, policy, projectLicense })
  if (write) {
    fs.writeFileSync(OUTPUT_FILE, rendered)
    console.log(
      `license-check: wrote THIRD_PARTY.md (${classified.length} npm packages, ${(policy.vendored || []).length} vendored assets).`,
    )
  } else {
    const current = fs.existsSync(OUTPUT_FILE)
      ? fs.readFileSync(OUTPUT_FILE, 'utf8').replace(/\r\n/g, '\n')
      : ''
    if (current !== rendered)
      problems.push('THIRD_PARTY.md is stale; run: node scripts/check-licenses.mjs --write')
  }
}

if (problems.length > 0) {
  for (const p of problems) console.error(`license-check: ${p}`)
  process.exit(1)
}
if (!write)
  console.log(
    `license-check: OK (${classified.length} npm packages, ${(policy.vendored || []).length} vendored assets).`,
  )
