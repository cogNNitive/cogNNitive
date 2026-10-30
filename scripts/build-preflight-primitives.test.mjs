#!/usr/bin/env node

/**
 * scripts/build-preflight-primitives.test.mjs
 *
 * Unit tests for scripts/build-preflight-primitives.mjs (plain node, matches the
 * repo's zero-framework .test convention).
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const BUILDER = path.join(SCRIPT_DIR, 'build-preflight-primitives.mjs')

const COMMITTED_TARGETS = [
  path.join(SCRIPT_DIR, '..', 'skills', 'nn-preflight', 'scripts', 'lib', 'version-status.generated.cjs'),
  path.join(SCRIPT_DIR, '..', 'skills', 'nn-preflight', 'scripts', 'lib', 'naming-contract.generated.cjs'),
  path.join(SCRIPT_DIR, '..', 'skills', 'nn-upgrade', 'scripts', 'lib', 'nn-core.generated.cjs'),
]

// The layout detector bundle was retired with the legacy quarantine.
const RETIRED_DETECT_BUNDLE = path.join(SCRIPT_DIR, '..', 'skills', 'nn-preflight', 'scripts', 'lib', 'legacy-detect.generated.cjs')

// The planner bundle was retired with the in-place migration flows (S4).
const RETIRED_MIGRATE_BUNDLE = path.join(SCRIPT_DIR, '..', 'skills', 'nn-upgrade', 'scripts', 'lib', 'legacy-migrate.generated.cjs')

function run(args) {
  return spawnSync(process.execPath, [BUILDER, ...args], { encoding: 'utf-8' })
}

async function runTests() {
  console.log('Running build-preflight-primitives unit tests...')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-primitives-'))
  try {
    // Test 1: render mode writes all requireable CJS bundles into an isolated output dir
    {
      const res = run(['--out', tmp])
      assert.strictEqual(res.status, 0, res.stderr)
      for (const target of COMMITTED_TARGETS) {
        const rendered = path.join(tmp, path.basename(target))
        assert.ok(fs.existsSync(rendered), `bundle written: ${path.basename(target)}`)
        const mod = require(rendered)
        if (target.endsWith('version-status.generated.cjs')) {
          assert.strictEqual(typeof mod.classifyAgainstCatalog, 'function', 'exports classifyAgainstCatalog')
          assert.strictEqual(typeof mod.parsePinnedUrl, 'function', 'exports parsePinnedUrl')
          assert.strictEqual(typeof mod.gapKind, 'function', 'exports gapKind')
          assert.strictEqual(typeof mod.compareVersions, 'function', 'exports compareVersions')
        } else if (target.endsWith('nn-core.generated.cjs')) {
          for (const fn of ['planDomainScaffold', 'parseKnowledge', 'serializeKnowledge', 'freeze_slugs']) {
            assert.strictEqual(typeof mod[fn], 'function', `exports ${fn}`)
          }
        }
      }
      assert.ok(!fs.existsSync(RETIRED_MIGRATE_BUNDLE), 'the legacy-migrate planner bundle is not rendered')
      assert.ok(!fs.existsSync(RETIRED_DETECT_BUNDLE), 'the legacy-detect bundle is not rendered')
      console.log('✔ render mode emits all requireable CJS bundles (version-status, naming-contract) and no legacy bundle')
    }

    // Test 2: --check passes when all artifacts are in sync
    {
      const res = run(['--check'])
      assert.strictEqual(res.status, 0, res.stderr)
      console.log('✔ --check passes when all artifacts are in sync')
    }

    // Test 3: --check exits 1 on drift in any bundle
    {
      const targetToTamper = COMMITTED_TARGETS[1]
      const original = fs.readFileSync(targetToTamper, 'utf-8')
      try {
        fs.writeFileSync(targetToTamper, original + '\n// tampered\n')
        const res = run(['--check'])
        assert.strictEqual(res.status, 1, '--check must exit 1 on a stale artifact')
        assert.ok(res.stderr.includes('DRIFT'), 'drift report present')
        console.log('✔ --check exits 1 with a drift report on a stale artifact')
      } finally {
        fs.writeFileSync(targetToTamper, original)
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }

  console.log('All build-preflight-primitives tests passed successfully!\n')
}

runTests().catch((err) => {
  console.error('Test failure:', err)
  process.exit(1)
})
