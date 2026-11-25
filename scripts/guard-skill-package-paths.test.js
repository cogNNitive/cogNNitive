'use strict'

/**
 * scripts/guard-skill-package-paths.test.js
 *
 * Tests for the skill package path guard. Every fixture is built under
 * `os.tmpdir()`; nothing is written inside the repository. The guard is driven
 * through its exported scan so the CLI is not needed here.
 *
 * Fixture shape (one skill package embedded in a blueprint, like the real
 * `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent`):
 *
 *   <tmp>/iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs
 *
 * For that file `dirSegments` is 2 (`scripts/lib`), so a chain of 3 or more
 * `'..'` literals escapes the package.
 *
 * Two rules the tests pin down, both mirroring the guard header:
 *   - `<skill>/test/**` is not scanned: a skill's own suites are verification,
 *     not a runtime resource read.
 *   - a declaration marked `probe: true` documents an existence probe whose
 *     target may legitimately be absent; any other declaration must point at a
 *     path that exists.
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { scanSkillPackagePaths } = require('./guard-skill-package-paths.js')

const REPO_ROOT = path.join(__dirname, '..')

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-package-paths-'))
  fs.mkdirSync(
    path.join(
      root,
      'iNNfo',
      'specs',
      'bluepriNNts',
      'blueprint',
      'skills',
      'demo',
      'scripts',
      'lib',
    ),
    {
      recursive: true,
    },
  )
  return { root }
}

function pkgRel(fixture, absOrRel) {
  const abs = path.isAbsolute(absOrRel) ? absOrRel : path.join(fixture.root, absOrRel)
  return path.relative(fixture.root, abs).split(path.sep).join('/')
}

function writeFile(fixture, rel, content) {
  const abs = path.join(fixture.root, rel.split('/').join(path.sep))
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content)
  return abs
}

function writeDeclarations(fixture, allowed) {
  const file = path.join(fixture.root, 'declarations.json')
  fs.writeFileSync(file, JSON.stringify({ note: 'test fixture declarations', allowed }, null, 2))
  return file
}

function chain(climbs, ...rest) {
  return [...Array.from({ length: climbs }, () => "'..'"), ...rest.map((r) => `'${r}'`)].join(', ')
}

/** A one-line escaping assignment at line 1. */
function escapeSource(climbs, ...rest) {
  return `const REF = path.resolve(here, ${chain(climbs, ...rest)});\n`
}

function scan(fixture, declarations) {
  return scanSkillPackagePaths({ root: fixture.root, declarations })
}

test('an undeclared escape fails and names the file, line and climb count', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    escapeSource(4, 'catalog', 'c.md'),
  )
  const declarations = writeDeclarations(fixture, [])

  const result = scan(fixture, declarations)

  assert.equal(result.ok, false)
  assert.equal(result.escapes.length, 1)
  const error = result.errors.find((e) => e.includes('scripts/lib/x.mjs:1'))
  assert.ok(error, `expected an error naming the file and line, got:\n${result.errors.join('\n')}`)
  assert.match(error, /climbs 4 level\(s\) out of/)
  assert.match(error, /with no declaration/)
})

test('an escape declared with an existing target passes', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  const script = writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    escapeSource(4, 'catalog', 'c.md'),
  )
  writeFile(fixture, 'iNNfo/specs/bluepriNNts/blueprint/catalog/c.md', '# catalog\n')
  const declarations = writeDeclarations(fixture, [
    {
      file: pkgRel(fixture, script),
      climbs: 4,
      target: 'iNNfo/specs/bluepriNNts/blueprint/catalog/c.md',
      anchor: 'blueprint-root',
      reason: 'reads the blueprint reference catalog above the skill package',
    },
  ])

  const result = scan(fixture, declarations)

  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.escapes.length, 1)
  assert.equal(result.declared, 1)
  assert.equal(result.errors.length, 0)
})

test('a declared target that is missing on disk fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  const script = writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    escapeSource(4, 'catalog', 'c.md'),
  )
  const declarations = writeDeclarations(fixture, [
    {
      file: pkgRel(fixture, script),
      climbs: 4,
      target: 'iNNfo/specs/bluepriNNts/blueprint/catalog/c.md',
      anchor: 'blueprint-root',
      reason: 'reads the blueprint reference catalog above the skill package',
    },
  ])

  const result = scan(fixture, declarations)

  assert.equal(result.ok, false)
  const error = result.errors.find((e) => e.includes('catalog/c.md') && /does not exist/.test(e))
  assert.ok(error, `expected a missing-target error, got:\n${result.errors.join('\n')}`)
})

test('a probe declaration needs no existing target, and target and anchor are optional', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  const script = writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    escapeSource(4, 'catalog', 'c.md'),
  )
  const declarations = writeDeclarations(fixture, [
    {
      file: pkgRel(fixture, script),
      climbs: 4,
      probe: true,
      reason: 'third fallback candidate of findThing(); every candidate is tested before use',
    },
  ])

  const result = scan(fixture, declarations)

  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.escapes.length, 1)
  assert.equal(result.declared, 1)
})

test('an unknown opt-out flag does not bypass the target-existence check', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  const script = writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    escapeSource(4, 'catalog', 'c.md'),
  )
  const declarations = writeDeclarations(fixture, [
    {
      file: pkgRel(fixture, script),
      climbs: 4,
      target: 'iNNfo/specs/bluepriNNts/blueprint/catalog/c.md',
      anchor: 'blueprint-root',
      reason: 'a real read whose declared target is missing on disk',
      unresolved: true,
    },
  ])

  const result = scan(fixture, declarations)

  assert.equal(result.ok, false)
  const error = result.errors.find((e) => e.includes('catalog/c.md') && /does not exist/.test(e))
  assert.ok(error, `expected a missing-target error, got:\n${result.errors.join('\n')}`)
})

test('a stale declaration that matches no chain fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  const script = writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    "const REF = path.join(here, 'catalog', 'c.md');\n",
  )
  writeFile(fixture, 'iNNfo/specs/bluepriNNts/blueprint/catalog/c.md', '# catalog\n')
  const declarations = writeDeclarations(fixture, [
    {
      file: pkgRel(fixture, script),
      climbs: 4,
      target: 'iNNfo/specs/bluepriNNts/blueprint/catalog/c.md',
      anchor: 'blueprint-root',
      reason: 'stale entry left behind after the read moved inside the package',
    },
  ])

  const result = scan(fixture, declarations)

  assert.equal(result.ok, false)
  assert.equal(result.escapes.length, 0)
  const error = result.errors.find((e) => /matches no escaping chain/.test(e))
  assert.ok(error, `expected a stale-declaration error, got:\n${result.errors.join('\n')}`)
})

test('a chain that stays inside the package never fails, with no declarations file at all', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    "const REF = path.resolve(here, '..', 'scripts', 'y.mjs');\n",
  )

  const result = scan(fixture, path.join(fixture.root, 'does-not-exist.json'))

  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.escapes.length, 0)
  assert.equal(result.inside, 1)
  assert.equal(result.declared, 0)
})

test('a chain that stays inside the package never fails with an empty declaration list', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    "const REF = path.resolve(here, '..', 'scripts', 'y.mjs');\n",
  )

  const result = scan(fixture, writeDeclarations(fixture, []))

  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.inside, 1)
})

test('a multi-line formatted argument list is detected', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  const multiLine = [
    'export const REFERENCE_CATALOG = path.resolve(',
    '  path.dirname(fileURLToPath(import.meta.url)),',
    "  '..',",
    "  '..',",
    "  '..',",
    "  '..',",
    "  'catalog',",
    "  'model-catalog_NN.md',",
    ');',
    '',
  ].join('\n')
  writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/catalog.mjs',
    multiLine,
  )

  const undeclared = scan(fixture, writeDeclarations(fixture, []))
  assert.equal(undeclared.ok, false)
  assert.equal(undeclared.escapes.length, 1)
  const error = undeclared.errors.find(
    (e) => e.includes('catalog.mjs:1') && /climbs 4 level\(s\)/.test(e),
  )
  assert.ok(error, `expected a 4-climb error, got:\n${undeclared.errors.join('\n')}`)

  writeFile(fixture, 'iNNfo/specs/bluepriNNts/blueprint/catalog/model-catalog_NN.md', '# catalog\n')
  const declared = scan(
    fixture,
    writeDeclarations(fixture, [
      {
        file: 'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/catalog.mjs',
        climbs: 4,
        target: 'iNNfo/specs/bluepriNNts/blueprint/catalog/model-catalog_NN.md',
        anchor: 'blueprint-root',
        reason: 'reads the blueprint reference catalog above the skill package',
      },
    ]),
  )
  assert.equal(declared.ok, true, declared.errors.join('\n'))
})

test('a declaration whose target differs from the literal resolution fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  const script = writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    escapeSource(4, 'catalog', 'c.md'),
  )
  writeFile(fixture, 'iNNfo/specs/bluepriNNts/blueprint/catalog/c.md', '# catalog\n')
  writeFile(fixture, 'iNNfo/specs/bluepriNNts/blueprint/catalog/other.md', '# other\n')
  const declarations = writeDeclarations(fixture, [
    {
      file: pkgRel(fixture, script),
      climbs: 4,
      target: 'iNNfo/specs/bluepriNNts/blueprint/catalog/other.md',
      anchor: 'blueprint-root',
      reason: 'a declaration that drifted away from the literal target',
    },
  ])

  const result = scan(fixture, declarations)

  assert.equal(result.ok, false)
  const error = result.errors.find((e) => /while the literals resolve to/.test(e))
  assert.ok(error, `expected a target-mismatch error, got:\n${result.errors.join('\n')}`)
})

test('the scripts and bin surfaces of a package are scanned', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  writeFile(fixture, 'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/x.js', escapeSource(2))
  writeFile(fixture, 'iNNfo/specs/bluepriNNts/blueprint/skills/demo/bin/x.cjs', escapeSource(2))

  const result = scan(fixture, writeDeclarations(fixture, []))

  assert.equal(result.ok, false)
  assert.equal(result.escapes.length, 2)
  const surfaces = result.errors
    .map((e) => /^ERROR: (\S+):\d+ /.exec(e))
    .filter(Boolean)
    .map((m) => path.posix.dirname(m[1]).split('/').pop())
    .sort()
  assert.deepEqual(surfaces, ['bin', 'scripts'])
})

test('a test suite that climbs out of the package neither fails nor needs a declaration', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  // Same shape as a real verification suite reading a blueprint fixture: it would
  // escape if the test surface were scanned. A skill's own tests are verification,
  // not a runtime resource read, so the guard does not look at `<skill>/test/**`.
  writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/test/x.test.mjs',
    escapeSource(3, 'catalog', 'c.md'),
  )

  const result = scan(fixture, writeDeclarations(fixture, []))

  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.escapes.length, 0)
  assert.equal(result.inside, 0)
  assert.equal(result.declared, 0)
})

test('a flat skills/<name> package is scanned too', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  writeFile(fixture, 'skills/demo/scripts/lib/x.mjs', escapeSource(4, 'catalog', 'c.md'))

  const result = scan(fixture, writeDeclarations(fixture, []))

  assert.equal(result.ok, false)
  assert.equal(result.escapes.length, 1)
  assert.equal(result.escapes[0].skillPackage, 'skills/demo')
})

test('a commented-out chain is not a chain', (t) => {
  const fixture = makeFixture()
  t.after(() => fs.rmSync(fixture.root, { recursive: true, force: true }))

  writeFile(
    fixture,
    'iNNfo/specs/bluepriNNts/blueprint/skills/demo/scripts/lib/x.mjs',
    [
      "// path.resolve(here, '..', '..', '..', 'catalog', 'c.md') was the old shape.",
      '/* path.resolve(here,',
      "   '..', '..', '..', 'catalog', 'c.md') */",
      "const REF = path.join(here, 'catalog', 'c.md');",
      '',
    ].join('\n'),
  )

  const result = scan(fixture, writeDeclarations(fixture, []))

  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.equal(result.escapes.length, 0)
  assert.equal(result.inside, 0)
})

test('the shipped declaration covers every escape in this repository', () => {
  const result = scanSkillPackagePaths({ root: REPO_ROOT })

  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.ok(result.escapes.length > 0, 'expected at least one declared escape in this repository')
  assert.equal(result.declared, result.escapes.length)
})
