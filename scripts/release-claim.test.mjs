#!/usr/bin/env node

/**
 * scripts/release-claim.test.mjs
 *
 * Tests for scripts/release-claim.mjs. Plain node, zero deps, fixture roots in
 * the OS temp dir so nothing under the repo is read or written.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const RELEASE = path.join(SCRIPT_DIR, 'release-claim.mjs')

const CLAIM = (slug, branch) => `# claim: ${slug}

branch: ${branch}
pr: 700
opened: 2026-11-16

area:
  - scripts/export-console.mjs
`

function fixture(claims = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-claim-test-'))
  const dir = path.join(root, 'openspec', 'claims')
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(claims)) {
    fs.writeFileSync(path.join(dir, name), body)
  }
  return { root, dir }
}

function run(args) {
  const result = spawnSync(process.execPath, [RELEASE, ...args], { encoding: 'utf8' })
  return { code: result.status, out: `${result.stdout}${result.stderr}` }
}

test('deletes the claim whose branch just landed', () => {
  const { root, dir } = fixture({
    'console-cli-input.md': CLAIM('console-cli-input', 'session/console-cli-input'),
  })
  const { code, out } = run(['--root', root, '--branch', 'session/console-cli-input'])
  assert.strictEqual(code, 0)
  assert.match(out, /removed .*console-cli-input\.md/)
  assert.strictEqual(fs.existsSync(path.join(dir, 'console-cli-input.md')), false)
})

test('leaves every other claim alone', () => {
  const { root, dir } = fixture({
    'console-cli-input.md': CLAIM('console-cli-input', 'session/console-cli-input'),
    'console-runtime-status.md': CLAIM('console-runtime-status', 'session/console-runtime-status'),
  })
  const { code } = run(['--root', root, '--branch', 'session/console-cli-input'])
  assert.strictEqual(code, 0)
  assert.strictEqual(fs.existsSync(path.join(dir, 'console-cli-input.md')), false)
  assert.strictEqual(fs.existsSync(path.join(dir, 'console-runtime-status.md')), true)
})

test('a branch with no claim is a no-op, because the PR may have deleted it already', () => {
  const { root, dir } = fixture({
    'console-runtime-status.md': CLAIM('console-runtime-status', 'session/console-runtime-status'),
  })
  const { code, out } = run(['--root', root, '--branch', 'session/nowhere'])
  assert.strictEqual(code, 0)
  assert.match(out, /nothing to release/)
  assert.strictEqual(fs.existsSync(path.join(dir, 'console-runtime-status.md')), true)
})

test('falls back to the slug when a claim carries no branch line', () => {
  const { root, dir } = fixture({
    'console-bare.md': '# claim: console-bare\n\narea:\n  - scripts/export-console.mjs\n',
  })
  const { code } = run(['--root', root, '--branch', 'session/console-bare'])
  assert.strictEqual(code, 0)
  assert.strictEqual(fs.existsSync(path.join(dir, 'console-bare.md')), false)
})

test('--dry-run names the file without deleting it', () => {
  const { root, dir } = fixture({
    'console-cli-input.md': CLAIM('console-cli-input', 'session/console-cli-input'),
  })
  const { code, out } = run(['--root', root, '--branch', 'session/console-cli-input', '--dry-run'])
  assert.strictEqual(code, 0)
  assert.match(out, /would remove .*console-cli-input\.md/)
  assert.strictEqual(fs.existsSync(path.join(dir, 'console-cli-input.md')), true)
})

test('a missing --branch is a usage error', () => {
  const { root } = fixture({})
  const { code, out } = run(['--root', root])
  assert.strictEqual(code, 2)
  assert.match(out, /--branch is required/)
})

test('--check fails while the branch still owns a claim, and deletes nothing', () => {
  const { root, dir } = fixture({
    'console-cli-input.md': CLAIM('console-cli-input', 'session/console-cli-input'),
  })
  const { code, out } = run(['--root', root, '--branch', 'session/console-cli-input', '--check'])
  assert.strictEqual(code, 1)
  assert.match(out, /still claims session\/console-cli-input/)
  assert.match(out, /Delete it in this pull request/)
  assert.strictEqual(fs.existsSync(path.join(dir, 'console-cli-input.md')), true)
})

test('--check passes once the pull request released its claim', () => {
  const { root } = fixture({
    'console-runtime-status.md': CLAIM('console-runtime-status', 'session/console-runtime-status'),
  })
  const { code, out } = run(['--root', root, '--branch', 'session/console-cli-input', '--check'])
  assert.strictEqual(code, 0)
  assert.match(out, /released its claim/)
})

test('--check sees the fallback slug too, so a bare claim still blocks the landing', () => {
  const { root } = fixture({
    'console-bare.md': '# claim: console-bare\n\narea:\n  - scripts/export-console.mjs\n',
  })
  const { code } = run(['--root', root, '--branch', 'session/console-bare', '--check'])
  assert.strictEqual(code, 1)
})
