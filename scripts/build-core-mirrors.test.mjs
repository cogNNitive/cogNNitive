#!/usr/bin/env node

/**
 * scripts/build-core-mirrors.test.mjs
 *
 * Unit tests for scripts/build-core-mirrors.mjs (plain node, zero-framework .test convention).
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
const BUILDER = path.join(SCRIPT_DIR, 'build-core-mirrors.mjs')

const COMMITTED_TARGETS = [
  path.join(SCRIPT_DIR, '..', 'skills', 'nn-sources', 'scripts', 'lib', 'nn-core.generated.cjs'),
  path.join(
    SCRIPT_DIR,
    '..',
    'iNNfo',
    'specs',
    'bluepriNNts',
    'video-script',
    'skills',
    'nn-video-script',
    'scripts',
    'lib',
    'nn-core.generated.cjs',
  ),
]

function run(args) {
  return spawnSync(process.execPath, [BUILDER, ...args], { encoding: 'utf-8' })
}

async function runTests() {
  console.log('Running build-core-mirrors unit tests...')

  // Test 1: render mode writes all requireable CJS bundles
  {
    const res = run([])
    assert.strictEqual(res.status, 0, res.stderr)
    for (const target of COMMITTED_TARGETS) {
      assert.ok(fs.existsSync(target), `bundle written: ${path.basename(target)}`)
      const mod = require(target)
      if (target.includes('nn-sources')) {
        for (const fn of ['slugifyHeading', 'parseCitation', 'createFsSourceResolver', 'validateCitations', 'projectLineage']) {
          assert.strictEqual(typeof mod[fn], 'function', `nn-sources mirror exports ${fn}`)
        }
      } else if (target.includes('video-script')) {
        for (const fn of ['findDomainRoot', 'resolve', 'findScopeChain', 'loadChain', 'loadElementChain', 'elementChain', 'driftReport', 'resolveProcedures', 'resolveModelId']) {
          assert.strictEqual(typeof mod[fn], 'function', `video-script scope mirror exports ${fn}`)
        }
      }
    }
    console.log('✔ Test 1: all core mirrors rendered and export required functions')
  }

  // Test 2: --check succeeds when clean
  {
    const res = run(['--check'])
    assert.strictEqual(res.status, 0, res.stderr)
    assert.ok(res.stdout.includes('is up to date'), 'stdout confirms up to date')
    console.log('✔ Test 2: --check succeeds when mirrors match')
  }

  // Test 3: drift detection in temp file
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'core-mirrors-test-'))
    try {
      const tempTarget = path.join(tmp, 'nn-core.generated.cjs')
      fs.writeFileSync(tempTarget, '/* stale content */\n', 'utf-8')
      const res = run(['--check', '--target', 'trannsform', '--out', tempTarget])
      assert.strictEqual(res.status, 1, 'expected status 1 on drift')
      assert.ok(res.stderr.includes('DRIFT'), 'stderr reports DRIFT')
      console.log('✔ Test 3: --check exits 1 on stale/drifted mirror')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }

  console.log('All build-core-mirrors unit tests passed successfully!')
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
