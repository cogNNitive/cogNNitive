#!/usr/bin/env node

/**
 * scripts/build-skills-manager-bundle.test.mjs
 *
 * Unit tests for scripts/build-skills-manager-bundle.mjs (plain node, matches the
 * repo's zero-framework .test convention).
 */

import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const BUILDER = path.join(SCRIPT_DIR, 'build-skills-manager-bundle.mjs')
const BUNDLE = path.join(SCRIPT_DIR, '..', 'skills', 'nn-skills-lifecycle', 'scripts', 'skills-manager.js')

function run(args) {
  return spawnSync(process.execPath, [BUILDER, ...args], { encoding: 'utf-8' })
}

function runTests() {
  console.log('Running build-skills-manager-bundle unit tests...')

  // Test 1: render mode writes a self-contained bundle with a generated header
  {
    const res = run([])
    assert.strictEqual(res.status, 0, res.stderr)
    assert.ok(fs.existsSync(BUNDLE), 'bundle written')
    const text = fs.readFileSync(BUNDLE, 'utf-8')
    assert.ok(text.includes('GENERATED FILE'), 'generated-file header present')
    assert.ok(text.startsWith('#!/usr/bin/env node'), 'shebang kept on the first line')
    assert.ok(!/require\(["']\.{1,2}\//.test(text), 'no relative require() left in the bundle')
    console.log('✔ render mode emits a self-contained bundle with a generated header')
  }

  // Test 2: the bundle runs without the repo's scripts/lib (prints usage)
  {
    const res = spawnSync(process.execPath, [BUNDLE], { encoding: 'utf-8' })
    assert.ok((res.stdout + res.stderr).includes('Usage:'), res.stdout + res.stderr)
    console.log('✔ bundle runs standalone')
  }

  // Test 3: --check passes when in sync
  {
    const res = run(['--check'])
    assert.strictEqual(res.status, 0, res.stderr)
    console.log('✔ --check passes when the artifact is in sync')
  }

  // Test 4: --check exits 1 on a stale bundle
  {
    const original = fs.readFileSync(BUNDLE, 'utf-8')
    try {
      fs.writeFileSync(BUNDLE, original + '\n// tampered\n')
      const res = run(['--check'])
      assert.strictEqual(res.status, 1, '--check must exit 1 on a stale artifact')
      assert.ok(res.stderr.includes('DRIFT'), 'drift report present')
      console.log('✔ --check exits 1 with a drift report on a stale artifact')
    } finally {
      fs.writeFileSync(BUNDLE, original)
    }
  }

  console.log('All build-skills-manager-bundle tests passed successfully!\n')
}

try {
  runTests()
} catch (err) {
  console.error('Test failure:', err)
  process.exit(1)
}
