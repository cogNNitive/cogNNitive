#!/usr/bin/env node

/**
 * scripts/claim-check.test.mjs
 *
 * Tests for scripts/claim-check.mjs. Plain node, zero deps, fixture roots in the
 * OS temp dir so nothing under the repo is read or written.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { globToRegExp } from './claim-check.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.join(SCRIPT_DIR, 'claim-check.mjs')

function fixture({ claims = {}, prs = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-check-test-'))
  const dir = path.join(root, 'openspec', 'claims')
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(claims)) {
    fs.writeFileSync(path.join(dir, name), body)
  }
  const args = ['--root', root]
  if (prs) {
    const file = path.join(root, 'prs.json')
    fs.writeFileSync(file, JSON.stringify(prs))
    args.push('--prs', file)
  }
  return { root, args }
}

function run(args, areas) {
  const result = spawnSync(
    process.execPath,
    [CHECKER, ...args, ...areas.flatMap((area) => ['--area', area])],
    {
      encoding: 'utf8',
    },
  )
  return { code: result.status, out: `${result.stdout}${result.stderr}` }
}

const CONSOLE_CLAIM = `# claim: console-dom-budget

branch: session/console-dom-budget
pr: 650
opened: 2026-11-15

area:
  - iNNfo/specs/bluepriNNts/console/ui-kit.js
  - iNNfo/specs/bluepriNNts/console/nn-console.bundle.js   # generated

excludes:
  - iNNfo/specs/bluepriNNts/console/nn-runtime.js
`

test('a free area exits 0', () => {
  const { args } = fixture({ claims: { 'console-dom-budget.md': CONSOLE_CLAIM } })
  const { code, out } = run(args, ['scripts/unrelated.mjs'])
  assert.strictEqual(code, 0)
  assert.match(out, /area is free/)
})

test('a literal path already claimed exits 1 and names the claim', () => {
  const { args } = fixture({ claims: { 'console-dom-budget.md': CONSOLE_CLAIM } })
  const { code, out } = run(args, ['iNNfo/specs/bluepriNNts/console/ui-kit.js'])
  assert.strictEqual(code, 1)
  assert.match(out, /claim "console-dom-budget"/)
  assert.match(out, /PR #650/)
})

test('a glob claim covers a literal path inside it', () => {
  const { args } = fixture({
    claims: {
      'skills.md': '# claim: skills\narea:\n  - .agents/skills/**\n',
    },
  })
  const { code, out } = run(args, ['.agents/skills/nn-dev-development/SKILL.md'])
  assert.strictEqual(code, 1)
  assert.match(out, /claim "skills"/)
})

test('an excluded path is released by the claim that owns it', () => {
  const { args } = fixture({ claims: { 'console-dom-budget.md': CONSOLE_CLAIM } })
  const { code, out } = run(args, ['iNNfo/specs/bluepriNNts/console/nn-runtime.js'])
  assert.strictEqual(code, 0)
  assert.match(out, /area is free/)
})

test('a claim whose PR is no longer open is reported as released, not as a conflict', () => {
  const { args } = fixture({
    claims: { 'console-dom-budget.md': CONSOLE_CLAIM },
    prs: [{ number: 649, headRefName: 'fix/console-view-data-cache-bust', files: [] }],
  })
  const { code, out } = run(args, ['iNNfo/specs/bluepriNNts/console/ui-kit.js'])
  assert.strictEqual(code, 0)
  assert.match(out, /released \(PR #650 is not open\)/)
})

test('an open PR touching the area is a conflict even with no claim', () => {
  const { args } = fixture({
    claims: {},
    prs: [
      {
        number: 648,
        headRefName: 'session/console-cpu-budget',
        files: [{ path: 'scripts/export-console.mjs' }],
      },
    ],
  })
  const { code, out } = run(args, ['scripts/export-console.mjs'])
  assert.strictEqual(code, 1)
  assert.match(out, /PR #648 \(session\/console-cpu-budget\)/)
})

test('a missing --area is a usage error', () => {
  const { args } = fixture()
  const { code } = run(args, [])
  assert.strictEqual(code, 2)
})

test('--self keeps a claim from blocking the session that wrote it', () => {
  const { args } = fixture({
    claims: {
      'claim-protocol.md': '# claim: claim-protocol\narea:\n  - scripts/claim-check.mjs\n',
    },
  })
  const blocked = run(args, ['scripts/claim-check.mjs'])
  assert.strictEqual(blocked.code, 1)
  const self = run(
    [...args, '--self', 'openspec/claims/claim-protocol.md'],
    ['scripts/claim-check.mjs'],
  )
  assert.strictEqual(self.code, 0)
  assert.match(self.out, /area is free/)
})

test('--json reports the same decision machine-readably', () => {
  const { args } = fixture({ claims: { 'console-dom-budget.md': CONSOLE_CLAIM } })
  const result = spawnSync(
    process.execPath,
    [CHECKER, ...args, '--area', 'iNNfo/specs/bluepriNNts/console/ui-kit.js', '--json'],
    { encoding: 'utf8' },
  )
  const payload = JSON.parse(result.stdout)
  assert.strictEqual(payload.free, false)
  assert.strictEqual(payload.conflicts[0].claim.slug, 'console-dom-budget')
})

test('README.md inside the claims folder is documentation, not a claim', () => {
  const { args } = fixture({
    claims: {
      'README.md': '# Write-area claims\n\nExample:\n\narea:\n  - scripts/claim-check.mjs\n',
    },
  })
  const { code, out } = run(args, ['scripts/claim-check.mjs'])
  assert.strictEqual(code, 0)
  assert.match(out, /area is free/)
})

test('** crosses segments and also matches zero of them', () => {
  const re = globToRegExp('openspec/**/claims/*.md')
  assert.strictEqual(re.test('openspec/claims/a.md'), true)
  assert.strictEqual(re.test('openspec/x/y/claims/a.md'), true)
  assert.strictEqual(re.test('openspec/x/y/claims/a.txt'), false)
})
