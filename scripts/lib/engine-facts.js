'use strict'

/**
 * scripts/lib/engine-facts.js
 *
 * The engine version (nn-core's package.json) and the iNNfo format versions
 * (`iNNfo/specs/iNNfo_V_*_NN.md`) the blueprint compatibility contract (P5, D7) checks
 * against.
 *
 * The distributed skills-manager bundle runs without a repo checkout, so
 * scripts/build-skills-manager-bundle.mjs reads these facts at build time and inlines
 * them through esbuild `define` (`__NN_ENGINE_FACTS__`), the same way the nn-mcp build
 * injects `__INNFO_MCP_VERSION__`. Unbundled, the source reads them from its own repo
 * and throws when either source is missing: there is no hardcoded fallback.
 */

const fs = require('fs')
const path = require('path')

const FORMAT_SPEC_RE = /^iNNfo_(V_(\d+)-(\d+)-(\d+))_NN\.md$/

/**
 * @param {string} repoRoot
 * @returns {{ engineVersion: string, formatVersions: string[] }}
 */
function readEngineFacts(repoRoot) {
  const corePkgPath = path.join(repoRoot, 'iNNfo', 'packages', 'nn-core', 'package.json')
  if (!fs.existsSync(corePkgPath)) {
    throw new Error(`engine facts: missing ${corePkgPath}`)
  }
  const engineVersion = JSON.parse(fs.readFileSync(corePkgPath, 'utf-8')).version
  if (!engineVersion) throw new Error(`engine facts: no version in ${corePkgPath}`)

  const specsDir = path.join(repoRoot, 'iNNfo', 'specs')
  if (!fs.existsSync(specsDir)) throw new Error(`engine facts: missing ${specsDir}`)
  const formatVersions = fs
    .readdirSync(specsDir)
    .map((f) => FORMAT_SPEC_RE.exec(f))
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(a[2]) - Number(b[2]) || Number(a[3]) - Number(b[3]) || Number(a[4]) - Number(b[4]),
    )
    .map((m) => m[1])
  if (formatVersions.length === 0) {
    throw new Error(`engine facts: no iNNfo_V_*_NN.md format specs in ${specsDir}`)
  }
  return { engineVersion, formatVersions }
}

/** @returns {{ engineVersion: string, formatVersions: string[] }} */
function engineFacts() {
  // @ts-ignore -- defined by scripts/build-skills-manager-bundle.mjs in the bundle only
  if (typeof __NN_ENGINE_FACTS__ !== 'undefined') return __NN_ENGINE_FACTS__
  return readEngineFacts(path.resolve(__dirname, '..', '..'))
}

module.exports = { readEngineFacts, engineFacts }
