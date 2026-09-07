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
const COMMITTED = path.join(
  SCRIPT_DIR,
  '..',
  'actioNN',
  'skills',
  'nn-preflight',
  'scripts',
  'lib',
  'version-status.generated.cjs',
)

function run(args) {
  return spawnSync(process.execPath, [BUILDER, ...args], { encoding: 'utf-8' })
}

async function runTests() {
  console.log('Running build-preflight-primitives unit tests...')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-primitives-'))
  const out = path.join(tmp, 'version-status.generated.cjs')
  try {
    // Test 1: render mode writes a requireable CJS bundle
    {
      const res = run(['--out', out])
      assert.strictEqual(res.status, 0, res.stderr)
      assert.ok(fs.existsSync(out), 'bundle written')
      const mod = require(out)
      assert.strictEqual(typeof mod.classifyAgainstCatalog, 'function', 'exports classifyAgainstCatalog')
      assert.strictEqual(typeof mod.parsePinnedUrl, 'function', 'exports parsePinnedUrl')
      assert.strictEqual(typeof mod.gapKind, 'function', 'exports gapKind')
      assert.strictEqual(typeof mod.compareVersions, 'function', 'exports compareVersions')
      // behaviour parity spot-check
      assert.strictEqual(mod.gapKind('V_0-1-0', 'V_0-2-0'), 'minor')
      const c = mod.classifyAgainstCatalog(
        'https://x/iNNfo/specs/templates/business/business_V_0-1-0_NN.md',
        { templates: { business: { name: 'business', adopted: 'V_0-2-0', versions: [{ template_version: 'V_0-1-0' }, { template_version: 'V_0-2-0' }] } } },
      )
      assert.strictEqual(c.status, 'upgrade-available')
      assert.strictEqual(c.gap, 'minor')
      console.log('✔ render mode emits a requireable CJS bundle with the ported primitives')
    }

    // Test 2: --check passes when the target matches the rendered bundle
    {
      const res = run(['--check', '--out', out])
      assert.strictEqual(res.status, 0, res.stderr)
      console.log('✔ --check passes when the artifact is in sync')
    }

    // Test 3: --check exits 1 on drift
    {
      fs.writeFileSync(out, fs.readFileSync(out, 'utf-8') + '\n// tampered\n')
      const res = run(['--check', '--out', out])
      assert.strictEqual(res.status, 1, '--check must exit 1 on a stale artifact')
      assert.ok(res.stderr.includes('DRIFT'), 'drift report present')
      console.log('✔ --check exits 1 with a drift report on a stale artifact')
    }

    // Test 4: the committed artifact is in sync with the current source
    {
      const res = run(['--check'])
      assert.strictEqual(
        res.status,
        0,
        `committed ${path.basename(COMMITTED)} is stale — re-run: node scripts/build-preflight-primitives.mjs\n${res.stderr}`,
      )
      console.log('✔ committed version-status.generated.cjs matches the innfo-core source')
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
