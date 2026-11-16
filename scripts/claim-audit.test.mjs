#!/usr/bin/env node

/**
 * scripts/claim-audit.test.mjs
 *
 * Tests for scripts/claim-audit.mjs. Plain node, zero deps, fixture roots in the
 * OS temp dir so nothing under the repo is read or written. Every case passes
 * `--prs`, so the suite never touches the network or the GitHub CLI.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.join(SCRIPT_DIR, 'claim-audit.mjs')

function fixture({ claims = {}, prs = [] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-audit-test-'))
  const dir = path.join(root, 'openspec', 'claims')
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(claims)) {
    fs.writeFileSync(path.join(dir, name), body)
  }
  const file = path.join(root, 'prs.json')
  fs.writeFileSync(file, JSON.stringify(prs))
  return { root, file }
}

function run(args) {
  const result = spawnSync(process.execPath, [AUDIT, ...args], { encoding: 'utf8' })
  return { code: result.status, out: `${result.stdout}${result.stderr}` }
}

const LIVE_CLAIM = `# claim: console-live

branch: session/console-live
pr: 700
opened: 2026-11-16

area:
  - scripts/export-console.mjs
`

const RELEASED_CLAIM = `# claim: console-csp-hash

branch: session/console-csp-hash
pr: 672
opened: 2026-11-16

area:
  - scripts/console-views.mjs
`

const NO_PR_CLAIM = `# claim: console-draft

branch: session/console-draft
area:
  - scripts/claim-audit.mjs
`

test('every claim with an open PR exits 0', () => {
  const { root, file } = fixture({
    claims: { 'console-live.md': LIVE_CLAIM },
    prs: [{ number: 700 }],
  })
  const { code, out } = run(['--root', root, '--prs', file])
  assert.strictEqual(code, 0)
  assert.match(out, /1 live/)
  assert.match(out, /no released claim/)
})

test('a claim whose PR already landed exits 1 and names the file', () => {
  const { root, file } = fixture({
    claims: { 'console-csp-hash.md': RELEASED_CLAIM },
    prs: [{ number: 700 }],
  })
  const { code, out } = run(['--root', root, '--prs', file])
  assert.strictEqual(code, 1)
  assert.match(out, /released/)
  assert.match(out, /openspec\/claims\/console-csp-hash\.md/)
  assert.match(out, /PR #672/)
})

test('a claim with no PR yet is reported but never fails the audit', () => {
  const { root, file } = fixture({
    claims: { 'console-draft.md': NO_PR_CLAIM },
    prs: [],
  })
  const { code, out } = run(['--root', root, '--prs', file])
  assert.strictEqual(code, 0)
  assert.match(out, /no PR yet/)
  assert.match(out, /openspec\/claims\/console-draft\.md/)
})

test('--warn-only reports a released claim and still exits 0', () => {
  const { root, file } = fixture({
    claims: { 'console-csp-hash.md': RELEASED_CLAIM },
    prs: [],
  })
  const { code, out } = run(['--root', root, '--prs', file, '--warn-only'])
  assert.strictEqual(code, 0)
  assert.match(out, /openspec\/claims\/console-csp-hash\.md/)
})

test('--json reports the same decision machine-readably', () => {
  const { root, file } = fixture({
    claims: { 'console-live.md': LIVE_CLAIM, 'console-csp-hash.md': RELEASED_CLAIM },
    prs: [{ number: 700 }],
  })
  const { code, out } = run(['--root', root, '--prs', file, '--json'])
  assert.strictEqual(code, 1)
  const payload = JSON.parse(out)
  assert.strictEqual(payload.ok, false)
  assert.strictEqual(payload.released.length, 1)
  assert.strictEqual(payload.released[0].file, 'openspec/claims/console-csp-hash.md')
  assert.strictEqual(payload.released[0].pr, 672)
  assert.strictEqual(payload.live, 1)
})

test('an empty claims folder is clean', () => {
  const { root, file } = fixture({ claims: {}, prs: [] })
  const { code, out } = run(['--root', root, '--prs', file])
  assert.strictEqual(code, 0)
  assert.match(out, /0 claim/)
})

test('a missing --prs file is a usage error, never a silent pass', () => {
  const { root } = fixture({ claims: { 'console-csp-hash.md': RELEASED_CLAIM } })
  const missing = path.join(root, 'does-not-exist.json')
  const { code, out } = run(['--root', root, '--prs', missing])
  assert.strictEqual(code, 2)
  assert.match(out, /cannot read --prs/)
})

test('omitting --prs is a usage error and prints the collector command', () => {
  const { root } = fixture({ claims: { 'console-live.md': LIVE_CLAIM } })
  const { code, out } = run(['--root', root])
  assert.strictEqual(code, 2)
  assert.match(out, /gh pr list --state open/)
})

test('a UTF-16 PR list, as PowerShell writes it, is still read', () => {
  const { root, file } = fixture({
    claims: { 'console-live.md': LIVE_CLAIM },
    prs: [{ number: 700 }],
  })
  fs.writeFileSync(file, `\uFEFF${JSON.stringify([{ number: 700 }])}`, 'utf16le')
  const { code, out } = run(['--root', root, '--prs', file])
  assert.strictEqual(code, 0)
  assert.match(out, /1 live/)
})
