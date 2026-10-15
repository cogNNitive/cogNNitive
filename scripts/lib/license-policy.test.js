#!/usr/bin/env node

/**
 * scripts/lib/license-policy.test.js
 *
 * Plain-node tests for the SPDX classifier and the offline dependency inventory.
 */

const assert = require('node:assert')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { classifyExpression, declaredLicense } = require('./license-policy.js')
const {
  discoverProductionDependencies,
  classifyPackages,
  checkVendored,
  renderThirdParty,
} = require('./license-inventory.js')

const POLICY = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'license-policy.json'), 'utf8'),
)
const verdict = (expr) => classifyExpression(expr, POLICY).verdict

const tests = []
const test = (name, fn) => tests.push([name, fn])

test('single permissive ids pass, case-insensitively', () => {
  assert.strictEqual(verdict('MIT'), 'allow')
  assert.strictEqual(verdict('mit'), 'allow')
  assert.strictEqual(verdict('BSD-3-Clause'), 'allow')
})

test('MIT OR Apache-2.0 is permissive', () => {
  assert.strictEqual(verdict('MIT OR Apache-2.0'), 'allow')
})

test('MIT AND GPL-3.0 is NOT permissive (the worst branch of an AND counts)', () => {
  assert.strictEqual(verdict('MIT AND GPL-3.0'), 'deny')
  assert.strictEqual(verdict('(MIT AND GPL-3.0-or-later)'), 'deny')
})

test('OR picks the best branch, so a dual license with a copyleft option still passes', () => {
  assert.strictEqual(verdict('(MIT OR GPL-3.0-or-later)'), 'allow')
  assert.strictEqual(verdict('GPL-3.0-only OR LGPL-3.0-only'), 'review')
  assert.strictEqual(verdict('GPL-3.0 OR AGPL-3.0'), 'deny')
})

test('AND binds tighter than OR', () => {
  assert.strictEqual(verdict('MIT OR GPL-3.0 AND Apache-2.0'), 'allow')
  assert.strictEqual(verdict('GPL-3.0 AND MIT OR GPL-2.0'), 'deny')
})

test('permissive AND permissive passes (MIT AND Zlib)', () => {
  assert.strictEqual(verdict('(MIT AND Zlib)'), 'allow')
})

test('copyleft families are denied or reviewed by prefix, LGPL is not mistaken for GPL', () => {
  assert.strictEqual(verdict('GPL-2.0'), 'deny')
  assert.strictEqual(verdict('AGPL-3.0-only'), 'deny')
  assert.strictEqual(verdict('LGPL-2.1'), 'review')
  assert.strictEqual(verdict('MPL-2.0'), 'review')
  assert.strictEqual(verdict('CC-BY-NC-4.0'), 'deny')
})

test('unknown and unparseable expressions are never allowed', () => {
  assert.strictEqual(verdict('Totally-Custom-1.0'), 'unknown')
  assert.strictEqual(verdict('BSD'), 'unknown')
  assert.strictEqual(verdict('SEE LICENSE IN LICENSE.txt'), 'unknown')
  assert.strictEqual(verdict('MIT AND'), 'unknown')
  assert.strictEqual(verdict('(MIT'), 'unknown')
  assert.strictEqual(verdict(''), 'unknown')
  assert.strictEqual(verdict('UNLICENSED'), 'deny')
})

test('a WITH exception never makes a license safer, and an unvetted one downgrades to review', () => {
  assert.strictEqual(verdict('GPL-2.0 WITH Classpath-exception-2.0'), 'deny')
  assert.strictEqual(verdict('MIT WITH Some-exception'), 'review')
  const vetted = { ...POLICY, allowedExceptions: ['Some-exception'] }
  assert.strictEqual(classifyExpression('MIT WITH Some-exception', vetted).verdict, 'allow')
})

test('declaredLicense reads string, object and legacy array forms', () => {
  assert.strictEqual(declaredLicense({ license: 'MIT' }), 'MIT')
  assert.strictEqual(declaredLicense({ license: { type: 'ISC' } }), 'ISC')
  assert.strictEqual(
    declaredLicense({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }),
    '(MIT OR Apache-2.0)',
  )
  assert.strictEqual(declaredLicense({}), null)
})

test('the shipped policy has no allowed id that is also denied', () => {
  for (const id of POLICY.allow)
    assert.notStrictEqual(classifyExpression(id, POLICY).verdict, 'deny', id)
})

function makeTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'license-inventory-'))
  const write = (rel, data) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), typeof data === 'string' ? data : JSON.stringify(data))
  }
  write('app/package.json', {
    name: 'app',
    dependencies: { good: '1', odd: '1', copyleft: '1' },
    optionalDependencies: { 'not-installed-here': '1' },
    devDependencies: { 'dev-only': '1' },
  })
  write('node_modules/good/package.json', {
    name: 'good',
    version: '1.0.0',
    license: 'MIT',
    dependencies: { nested: '1' },
  })
  write(
    'node_modules/good/LICENSE',
    'MIT License\n\nCopyright (c) 2020 Good Authors\n\nPermission is hereby granted.\n',
  )
  write('node_modules/nested/package.json', {
    name: 'nested',
    version: '2.0.0',
    license: '(MIT OR Apache-2.0)',
  })
  write('node_modules/odd/package.json', { name: 'odd', version: '1.0.0', license: 'BSD' })
  write('node_modules/copyleft/package.json', {
    name: 'copyleft',
    version: '1.0.0',
    license: 'MIT AND GPL-3.0',
  })
  write('node_modules/dev-only/package.json', {
    name: 'dev-only',
    version: '1.0.0',
    license: 'GPL-3.0',
  })
  return root
}

test('inventory walks production trees only, skips absent optional deps, and classifies', () => {
  const root = makeTree()
  const { packages, missing } = discoverProductionDependencies(root, ['app'])
  assert.deepStrictEqual(missing, [])
  assert.deepStrictEqual(
    packages.map((p) => p.name),
    ['copyleft', 'good', 'nested', 'odd'],
  )
  const byName = Object.fromEntries(
    classifyPackages(packages, POLICY).map((p) => [p.name, p.verdict]),
  )
  assert.deepStrictEqual(byName, {
    copyleft: 'deny',
    good: 'allow',
    nested: 'allow',
    odd: 'unknown',
  })
})

test('a missing REQUIRED dependency is reported as not installed', () => {
  const root = makeTree()
  fs.rmSync(path.join(root, 'node_modules', 'good'), { recursive: true })
  assert.deepStrictEqual(discoverProductionDependencies(root, ['app']).missing, [
    'good (required by app)',
  ])
})

test('a package override resolves an ambiguous declaration', () => {
  const root = makeTree()
  const { packages } = discoverProductionDependencies(root, ['app'])
  const policy = {
    ...POLICY,
    packageOverrides: [
      { package: 'odd', version: '1.0.0', license: 'BSD-2-Clause', reason: 'test' },
    ],
  }
  assert.strictEqual(
    classifyPackages(packages, policy).find((p) => p.name === 'odd').verdict,
    'allow',
  )
})

test('vendored assets are pinned by content hash, ignoring line endings', () => {
  const root = makeTree()
  fs.writeFileSync(path.join(root, 'asset.js'), 'a\r\nb\n')
  const sha = crypto.createHash('sha256').update('a\nb\n').digest('hex')
  const policy = { vendored: [{ name: 'Asset', path: 'asset.js', sha256: sha }] }
  assert.deepStrictEqual(checkVendored(root, policy).problems, [])
  fs.writeFileSync(path.join(root, 'asset.js'), 'changed')
  assert.strictEqual(checkVendored(root, policy).problems.length, 1)
  fs.rmSync(path.join(root, 'asset.js'))
  assert.match(checkVendored(root, policy).problems[0], /does not exist/)
})

test('THIRD_PARTY.md carries copyright and license text, and rendering is deterministic', () => {
  const root = makeTree()
  const { packages } = discoverProductionDependencies(root, ['app'])
  const classified = classifyPackages(packages, POLICY)
  const input = { classified, policy: { vendored: [] }, projectLicense: 'MIT' }
  const first = renderThirdParty(input)
  assert.strictEqual(first, renderThirdParty(input))
  assert.ok(
    first.includes('| good | 1.0.0 | MIT | allow | app | Copyright (c) 2020 Good Authors |'),
  )
  assert.ok(first.includes('Permission is hereby granted.'))
})

let failed = 0
for (const [name, fn] of tests) {
  try {
    fn()
    console.log('  ok  ' + name)
  } catch (err) {
    failed += 1
    console.error('  FAIL ' + name + '\n' + err.stack)
  }
}
console.log('\n' + (tests.length - failed) + '/' + tests.length + ' license-policy tests passed')
process.exit(failed === 0 ? 0 : 1)
