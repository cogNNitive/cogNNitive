/**
 * scripts/release/blueprint-versions.test.js
 *
 * The publisher half of C3: `versions.json` accumulates, names a verifiable commit, and
 * only ever describes units that ship a `blueprint.json`.
 */

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  VERSIONS_FILE,
  readVersionLists,
  upsertVersion,
  versionFilePaths,
  writeVersionLists,
} = require('./blueprint-versions.js')

const COMMIT = '7777777777777777777777777777777777777777'
const OLDER = '8888888888888888888888888888888888888888'

/** A logger that records instead of printing, so "warned" is assertable. */
function recorder() {
  const warns = []
  return { warns, warn: (m) => warns.push(m), log: () => {} }
}

function tmpMirror(units) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-versions-'))
  const base = path.join(root, 'iNNfo', 'specs', 'bluepriNNts')
  for (const [name, unit] of Object.entries(units)) {
    const dir = path.join(base, name)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'spec_NN.md'), '---\nlevel: 2\n---\n# x', 'utf-8')
    if (unit.manifest !== undefined) {
      fs.writeFileSync(path.join(dir, 'blueprint.json'), JSON.stringify(unit.manifest), 'utf-8')
    }
    if (unit.versions !== undefined) {
      fs.writeFileSync(path.join(dir, VERSIONS_FILE), unit.versions, 'utf-8')
    }
  }
  return { root, base, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) }
}

const manifestOf = (name, version) => ({
  name,
  version,
  format_version: 'V_0-5-0',
  distribution_url: `https://raw.githubusercontent.com/o/r/main/iNNfo/specs/bluepriNNts/${name}`,
})

// --- upsert ---------------------------------------------------------------

test('a new version is prepended newest-first, never appended', () => {
  const list = upsertVersion([{ version: 'V_0-1-0', tag: 'a', commit: OLDER }], {
    version: 'V_0-2-0',
    tag: 'b',
    commit: COMMIT,
  })
  assert.deepEqual(
    list.map((e) => e.version),
    ['V_0-2-0', 'V_0-1-0'],
  )
})

test('republishing the same version replaces its entry instead of duplicating it', () => {
  const list = upsertVersion(
    [
      { version: 'V_0-2-0', tag: 'old-tag', commit: OLDER },
      { version: 'V_0-1-0', tag: 'a', commit: OLDER },
    ],
    { version: 'V_0-2-0', tag: 'new-tag', commit: COMMIT },
  )
  assert.equal(list.length, 2)
  assert.deepEqual(
    list.find((e) => e.version === 'V_0-2-0'),
    {
      version: 'V_0-2-0',
      tag: 'new-tag',
      commit: COMMIT,
    },
  )
})

test('an unparseable version never sorts ahead of a real one', () => {
  const list = upsertVersion([{ version: 'V_0-1-0', tag: null, commit: OLDER }], {
    version: 'later',
    tag: null,
    commit: COMMIT,
  })
  assert.deepEqual(
    list.map((e) => e.version),
    ['V_0-1-0', 'later'],
  )
})

// --- writing --------------------------------------------------------------

test('every unit with a blueprint.json gets an accumulator naming the release tag and commit', () => {
  const m = tmpMirror({
    domaiNN: { manifest: manifestOf('domaiNN', 'V_0-4-1') },
    business: { manifest: manifestOf('business', 'V_0-5-2') },
  })
  const logger = recorder()
  try {
    const out = writeVersionLists({
      mirrorDir: m.root,
      tag: 'blueprints-v1.0.0',
      commit: COMMIT,
      logger,
    })
    assert.equal(out.changed, true)
    assert.deepEqual(out.written.sort(), ['business@V_0-5-2', 'domaiNN@V_0-4-1'])
    const body = JSON.parse(fs.readFileSync(path.join(m.base, 'domaiNN', VERSIONS_FILE), 'utf-8'))
    assert.deepEqual(body, {
      versions: [{ version: 'V_0-4-1', tag: 'blueprints-v1.0.0', commit: COMMIT }],
    })
  } finally {
    m.cleanup()
  }
})

test('the list accumulates: a later release keeps the earlier versions', () => {
  const m = tmpMirror({
    domaiNN: {
      manifest: manifestOf('domaiNN', 'V_0-5-0'),
      versions: JSON.stringify({
        versions: [{ version: 'V_0-4-1', tag: 'blueprints-v1.0.0', commit: OLDER }],
      }),
    },
  })
  try {
    // Mirror the pipeline order: read before the tree is replaced, write after.
    const existing = readVersionLists(m.root, recorder())
    fs.writeFileSync(
      path.join(m.base, 'domaiNN', 'blueprint.json'),
      JSON.stringify(manifestOf('domaiNN', 'V_0-5-0')),
    )
    writeVersionLists({
      mirrorDir: m.root,
      tag: 'blueprints-v1.1.0',
      commit: COMMIT,
      existing,
      logger: recorder(),
    })

    const body = JSON.parse(fs.readFileSync(path.join(m.base, 'domaiNN', VERSIONS_FILE), 'utf-8'))
    assert.deepEqual(body.versions, [
      { version: 'V_0-5-0', tag: 'blueprints-v1.1.0', commit: COMMIT },
      { version: 'V_0-4-1', tag: 'blueprints-v1.0.0', commit: OLDER },
    ])
  } finally {
    m.cleanup()
  }
})

test('a directory with no blueprint.json is warned about and gets no accumulator', () => {
  const m = tmpMirror({
    domaiNN: { manifest: manifestOf('domaiNN', 'V_0-4-1') },
    orphan: {},
  })
  const logger = recorder()
  try {
    writeVersionLists({ mirrorDir: m.root, tag: 'blueprints-v1.0.0', commit: COMMIT, logger })
    assert.equal(fs.existsSync(path.join(m.base, 'orphan', VERSIONS_FILE)), false)
    assert.ok(
      logger.warns.some((w) => w.includes('orphan') && w.includes('blueprint.json')),
      `expected a warning naming the unit, got ${JSON.stringify(logger.warns)}`,
    )
  } finally {
    m.cleanup()
  }
})

test('a version that is not V_x-y-z is refused rather than published', () => {
  const m = tmpMirror({ odd: { manifest: manifestOf('odd', 'v1.2.3') } })
  const logger = recorder()
  try {
    const out = writeVersionLists({
      mirrorDir: m.root,
      tag: 'blueprints-v1.0.0',
      commit: COMMIT,
      logger,
    })
    assert.equal(out.changed, false)
    assert.equal(fs.existsSync(path.join(m.base, 'odd', VERSIONS_FILE)), false)
    assert.ok(logger.warns.some((w) => w.includes('not V_x-y-z')))
  } finally {
    m.cleanup()
  }
})

test('a commit that is not a sha is refused: an entry that cannot be verified is worse than none', () => {
  const m = tmpMirror({ domaiNN: { manifest: manifestOf('domaiNN', 'V_0-4-1') } })
  try {
    assert.throws(
      () =>
        writeVersionLists({
          mirrorDir: m.root,
          tag: 'blueprints-v1.0.0',
          commit: 'blueprints-v1.0.0',
          logger: recorder(),
        }),
      /commit must be a 40-hex sha/,
    )
  } finally {
    m.cleanup()
  }
})

test('a second write with the same content changes nothing, so a re-run makes no commit', () => {
  const m = tmpMirror({ domaiNN: { manifest: manifestOf('domaiNN', 'V_0-4-1') } })
  try {
    const first = writeVersionLists({
      mirrorDir: m.root,
      tag: 'blueprints-v1.0.0',
      commit: COMMIT,
      logger: recorder(),
    })
    const second = writeVersionLists({
      mirrorDir: m.root,
      tag: 'blueprints-v1.0.0',
      commit: COMMIT,
      existing: readVersionLists(m.root, recorder()),
      logger: recorder(),
    })
    assert.equal(first.changed, true)
    assert.equal(second.changed, false)
  } finally {
    m.cleanup()
  }
})

// --- reading --------------------------------------------------------------

test('a malformed accumulator is named and treated as empty, never silently kept', () => {
  const m = tmpMirror({
    domaiNN: { manifest: manifestOf('domaiNN', 'V_0-4-1'), versions: '{ not json' },
  })
  const logger = recorder()
  try {
    const lists = readVersionLists(m.root, logger)
    assert.deepEqual(lists.get('domaiNN'), [])
    assert.ok(logger.warns.some((w) => w.includes('treating as empty')))
  } finally {
    m.cleanup()
  }
})

test('entries without a verifiable commit are dropped, not trusted', () => {
  const m = tmpMirror({
    domaiNN: {
      manifest: manifestOf('domaiNN', 'V_0-4-1'),
      versions: JSON.stringify({
        versions: [
          { version: 'V_0-4-1', tag: 't', commit: COMMIT },
          { version: 'V_0-4-0', tag: 't', commit: 'not-a-sha' },
        ],
      }),
    },
  })
  try {
    const lists = readVersionLists(m.root, recorder())
    assert.deepEqual(
      lists.get('domaiNN').map((e) => e.version),
      ['V_0-4-1'],
    )
  } finally {
    m.cleanup()
  }
})

test('the paths a caller must preserve are exactly the accumulators that exist', () => {
  const m = tmpMirror({
    domaiNN: { manifest: manifestOf('domaiNN', 'V_0-4-1'), versions: '{"versions":[]}' },
    business: { manifest: manifestOf('business', 'V_0-5-2') },
  })
  try {
    assert.deepEqual(versionFilePaths(m.root), ['iNNfo/specs/bluepriNNts/domaiNN/versions.json'])
  } finally {
    m.cleanup()
  }
})
