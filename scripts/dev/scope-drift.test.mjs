#!/usr/bin/env node

/**
 * scripts/dev/scope-drift.test.mjs
 *
 * Tests for scripts/dev/scope-drift.mjs, the read-only drift report CLI. Runs the real
 * script as a child process over the committed synthetic fixtures (video GOLD and the
 * programas ELFIX) and needs nn-core built (`npm --workspace=@cognnitive/nn-core run build`).
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')
const CLI = join(HERE, 'scope-drift.mjs')
const FIXTURES = join(REPO, 'iNNfo', 'packages', 'nn-core', 'tests', 'fixtures')
const GOLD = join(FIXTURES, 'video-golden')
const ELFIX = join(FIXTURES, 'programas-golden')

const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf-8' })

/** Digest of every file under `dir` (relative path and bytes), to prove a run wrote nothing. */
function hashTree(dir) {
  const h = createHash('sha256')
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name)
      if (statSync(full).isDirectory()) walk(full)
      else h.update(full.slice(dir.length)).update(readFileSync(full))
    }
  }
  walk(dir)
  return h.digest('hex')
}

// Every test below runs the CLI straight on the committed fixtures; none may leave a trace.
const fixtureDigests = { gold: hashTree(GOLD), elfix: hashTree(ELFIX) }
after(() => {
  assert.equal(hashTree(GOLD), fixtureDigests.gold, 'GOLD fixture changed during the run')
  assert.equal(hashTree(ELFIX), fixtureDigests.elfix, 'ELFIX fixture changed during the run')
})

const json = (...args) => {
  const r = run(...args, '--json')
  assert.equal(r.status, 0, r.stderr)
  return JSON.parse(r.stdout)
}
const rowOf = (report, scope, key) => report.rows.find((r) => r.scope === scope && r.key === key)

test('GOLD with --unit doc: the series volume is deviated by one of two scripts', () => {
  const report = json(GOLD, '--unit', 'doc', '--ignore', 'slug,title')
  assert.equal(report.v, 1)
  const row = rowOf(report, 'series/innteresante', 'music_volume')
  assert.ok(row, 'row for the series volume')
  assert.deepEqual(row.baseline.value, 0.4)
  assert.equal(row.baseline.present, true)
  assert.deepEqual(row.units, { total: 2, deviating: 1, uniform: false })
  assert.deepEqual(row.variants.map((v) => [v.value, v.units]), [[0.06, 1]])
})

test('GOLD with --unit doc: a series value every script inherits is uniform', () => {
  const report = json(GOLD, '--unit', 'doc')
  const row = rowOf(report, 'series/innteresante', 'voice_id')
  assert.equal(row.baseline.value, 'LucasCervera02')
  assert.deepEqual(row.units, { total: 2, deviating: 0, uniform: true })
  const other = rowOf(report, 'series/villabotijos-today', 'music_volume')
  assert.deepEqual(other.units, { total: 1, deviating: 0, uniform: true })
})

test('GOLD with the default unit counts the leaf elements', () => {
  const report = json(GOLD, '--ignore', 'slug,title')
  const row = rowOf(report, 'series/innteresante', 'music_volume')
  // 3 Scenes of the script plus 2 Video elements of the series document; the script's own
  // Video is the parent of its Scenes, so it is not a leaf.
  assert.deepEqual(row.units, { total: 5, deviating: 1, uniform: false })
})

test('--json output equals driftReport over the same chains', async () => {
  const core = await import(pathToFileURL(join(REPO, 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js')).href)
  const bosco = join(GOLD, 'series/innteresante/assets/bosco-verticale/bosco-verticale_video-script_innteresante_NN.md')
  const boa = join(GOLD, 'series/villabotijos-today/assets/boa-constrictor-suelta/boa-constrictor-suelta_video-script_villabotijos-today_NN.md')
  const videos = join(GOLD, 'series/innteresante/innteresante_video_NN.md')
  const chains = []
  for (const [doc, concept] of [[bosco, 'Scene'], [boa, 'Video'], [videos, 'Video']]) {
    const listed = core.listScopeElements(doc)
    assert.equal(listed.ok, true)
    for (const el of listed.elements.filter((e) => e.concept === concept)) {
      const r = core.loadElementChain(doc, { concept, slug: el.slug })
      assert.equal(r.ok, true)
      chains.push({ unit: listed.doc, nodes: r.loaded.nodes })
    }
  }
  const expected = core.driftReport({ floor: null, chains, ignore: ['slug', 'title'] })
  const actual = json(GOLD, '--unit', 'doc', '--ignore', 'slug,title')
  assert.deepEqual(actual, JSON.parse(JSON.stringify(expected)))
})

test('--none compares a key against an absent baseline (ELFIX)', () => {
  const keys = 'precio_hora_tutoria'
  const inherited = rowOf(json(ELFIX, '--keys', keys), '', keys)
  assert.equal(inherited.baseline.present, true)
  assert.equal(inherited.baseline.value, '84')

  const report = json(ELFIX, '--keys', keys, '--none', keys)
  const row = rowOf(report, '', keys)
  assert.equal(row.baseline.present, false)
  // Pedido 001 omits the price (absent, nothing inherited), Pedido 002 holds its own "90".
  assert.deepEqual(row.units, { total: 2, deviating: 1, uniform: false })
  assert.deepEqual(row.variants.map((v) => [v.value, v.units]), [['90', 1]])
})

test('text view hides scopes that declare nothing, --all shows every row', () => {
  const shown = run(ELFIX, '--ignore', 'slug,title', '--none', 'precio_hora_tutoria')
  assert.equal(shown.status, 0, shown.stderr)
  // The root declares idioma (es), so it is a baseline; numero_pedido is declared by no scope.
  assert.match(shown.stdout, /idioma/)
  assert.doesNotMatch(shown.stdout, /numero_pedido/)
  const all = run(ELFIX, '--all', '--ignore', 'slug,title', '--none', 'precio_hora_tutoria')
  assert.match(all.stdout, /numero_pedido/)
})

test('an element that cannot be placed is reported on stderr and the run goes on', () => {
  const r = run(ELFIX, '--keys', 'idioma')
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stderr, /UNKNOWN_PARENT_ELEMENT/)
  assert.match(r.stdout, /idioma/)
})

test('a path outside any domaiNN exits non-zero with the searched list', () => {
  const outside = mkdtempSync(join(tmpdir(), 'scope-drift-outside-'))
  try {
    const r = run(outside)
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /NO_DOMAIN_ROOT/)
    assert.ok(r.stderr.includes(outside), 'the searched list names the directory it looked in')
    assert.equal(r.stdout, '')
  } finally {
    rmSync(outside, { recursive: true, force: true })
  }
})

test('no argument is a usage error', () => {
  const r = run()
  assert.equal(r.status, 2)
  assert.match(r.stderr, /usage/)
})

test('a run never writes into the domain', () => {
  // Fresh copies, so the first run is the one that would leave a trace.
  const work = mkdtempSync(join(tmpdir(), 'scope-drift-readonly-'))
  try {
    for (const [name, dir] of [['gold', GOLD], ['elfix', ELFIX]]) {
      const copy = join(work, name)
      cpSync(dir, copy, { recursive: true })
      const before = hashTree(copy)
      assert.equal(run(copy, '--unit', 'doc').status, 0)
      assert.equal(hashTree(copy), before, `${name} changed after a text run`)
      assert.equal(run(copy, '--json', '--all').status, 0)
      assert.equal(hashTree(copy), before, `${name} changed after a json run`)
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
})

/** Writes `files` (relative path -> text) under a fresh temp directory and returns it. */
function tempDomain(files) {
  const base = mkdtempSync(join(tmpdir(), 'scope-drift-domain-'))
  for (const [rel, text] of Object.entries(files)) {
    const path = join(base, rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text, 'utf-8')
  }
  return base
}
const ENTRY = '---\ntitle: t\n---\n# t\n'
/** A document with one `Item` element carrying `tag:: <name>`. */
const itemDoc = (name) =>
  `---\nlevel: 3\nscope_elements:\n  - concept: Item\n---\n\n# NN Item\n\n## NN Item: ${name}\ntag:: ${name}\n`
/** The `tag` values the report saw, one per scanned document. */
const tagsSeen = (report) =>
  [...new Set(report.rows.filter((r) => r.key === 'tag').flatMap((r) => [r.baseline.value, ...r.variants.map((v) => v.value)]))]
    .filter((v) => v !== undefined && v !== null)
    .sort()

test('the scan skips sources/ and changes/ at the domain root only, and never enters a nested domaiNN', () => {
  const base = tempDomain({
    'domaiNN_NN.md': ENTRY,
    'programs/a_NN.md': itemDoc('a'),
    'programs/sources/b_NN.md': itemDoc('b'),
    'sources/c_NN.md': itemDoc('c'),
    'changes/d_NN.md': itemDoc('d'),
    'vendor/domaiNN_NN.md': ENTRY,
    'vendor/e_NN.md': itemDoc('e'),
    'vendor/deep/f_NN.md': itemDoc('f'),
  })
  try {
    const report = json(base, '--unit', 'doc', '--all')
    assert.deepEqual(tagsSeen(report), ['a', 'b'])
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('a chain error other than a missing domaiNN prints the real code and exits 2', () => {
  const base = tempDomain({
    'domaiNN_NN.md': ENTRY,
    'g/one_NN.md': '---\nlevel: 3\nscope: true\n---\n# NN S\n',
    'g/two_NN.md': '---\nlevel: 3\nscope: true\n---\n# NN S\n',
  })
  try {
    const r = run(join(base, 'g'))
    assert.equal(r.status, 2)
    assert.match(r.stderr, /DUPLICATE_SCOPE_MARKER/)
    assert.match(r.stderr, /one_NN\.md/)
    assert.doesNotMatch(r.stderr, /no domaiNN_NN\.md in the ancestry/)
    assert.equal(r.stdout, '')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('a malformed marker exits 2 naming the document', () => {
  const base = tempDomain({
    'domaiNN_NN.md': ENTRY,
    'g/bad_NN.md': '---\nscope: [unclosed\n---\n# NN S\n',
  })
  try {
    const r = run(join(base, 'g'))
    assert.equal(r.status, 2)
    assert.match(r.stderr, /MALFORMED_FRONTMATTER/)
    assert.match(r.stderr, /bad_NN\.md/)
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('the missing-domaiNN exit code stays 1', () => {
  const outside = mkdtempSync(join(tmpdir(), 'scope-drift-outside-'))
  try {
    assert.equal(run(outside).status, 1)
  } finally {
    rmSync(outside, { recursive: true, force: true })
  }
})
