/**
 * scripts/lib/blueprint-provenance.test.js
 *
 * The provenance layer of plan phase P1: the lock written beside the installed
 * unit (S3, S7), the publisher's `versions.json` read as a hint (C3), and the
 * named verdict — never "up to date" as a fallback (S5, A7).
 */

const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  LOCK_FILE,
  lockFilePath,
  readLock,
  writeLock,
  recordProvenance,
  readProvenance,
  readBlueprintManifest,
  digestTree,
  parseVersion,
  compareVersions,
  distributionUrlParts,
  commitUrlFor,
  fetchPublishedVersions,
  resolvePublished,
  blueprintVerdict,
} = require('./blueprint-provenance.js')

const COMMIT = '2222222222222222222222222222222222222222'
const NEWER = '3333333333333333333333333333333333333333'
const URL_BASE =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/demo'

function tmp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-provenance-'))
  const blueprintsDir = path.join(root, 'bluepriNNts')
  fs.mkdirSync(path.join(blueprintsDir, 'demo'), { recursive: true })
  return {
    root,
    blueprintsDir,
    installedDir: path.join(blueprintsDir, 'demo'),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

function writeDoc(dir, rel, body = 'x') {
  const abs = path.join(dir, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, body, 'utf-8')
}

/** A fetchString stand-in over a `{ url: body | Error }` map. */
function serveMap(map) {
  return async (url) => {
    const body = map[url]
    if (body instanceof Error) throw body
    if (body === undefined) throw new Error(`Failed to fetch ${url}, status: 404`)
    return body
  }
}

function versionsBody(list) {
  return JSON.stringify({ versions: list })
}

function manifestBody(overrides = {}) {
  return JSON.stringify({
    name: 'demo',
    version: 'V_0-2-0',
    format_version: 'V_0-5-0',
    distribution_url: URL_BASE,
    ...overrides,
  })
}

// --- the lock -------------------------------------------------------------

test('recordProvenance writes a lock that never stores a tag in the commit field', () => {
  const t = tmp()
  try {
    recordProvenance(t.blueprintsDir, 'demo', {
      version: 'V_0-2-0',
      tag: 'blueprints-v0.9.0',
      commit: 'blueprints-v0.9.0',
      distribution_url: URL_BASE,
      digests: { 'spec_NN.md': 'abc' },
    })

    const raw = JSON.parse(fs.readFileSync(lockFilePath(t.blueprintsDir), 'utf-8'))
    assert.strictEqual(raw.format_version, 1)
    assert.deepStrictEqual(raw.blueprints.demo, {
      version: 'V_0-2-0',
      tag: 'blueprints-v0.9.0',
      commit: null,
      distribution_url: URL_BASE,
      digests: { 'spec_NN.md': 'abc' },
    })
  } finally {
    t.cleanup()
  }
})

test('recordProvenance replaces an entry in place and leaves the others alone', () => {
  const t = tmp()
  try {
    recordProvenance(t.blueprintsDir, 'demo', { version: 'V_0-1-0', commit: COMMIT })
    recordProvenance(t.blueprintsDir, 'other', { version: 'V_0-9-0', commit: NEWER })
    recordProvenance(t.blueprintsDir, 'demo', { version: 'V_0-2-0', commit: COMMIT })

    const lock = readLock(t.blueprintsDir)
    assert.strictEqual(lock.ok, true)
    assert.strictEqual(lock.blueprints.demo.version, 'V_0-2-0')
    assert.strictEqual(lock.blueprints.other.version, 'V_0-9-0')
    assert.strictEqual(Object.keys(lock.blueprints).length, 2)
  } finally {
    t.cleanup()
  }
})

test('a missing lock is an empty lock, a malformed lock is named rather than ignored', () => {
  const t = tmp()
  try {
    assert.deepStrictEqual(readLock(t.blueprintsDir), { ok: true, reason: null, blueprints: {} })

    fs.writeFileSync(lockFilePath(t.blueprintsDir), '{ not json', 'utf-8')
    const broken = readLock(t.blueprintsDir)
    assert.strictEqual(broken.ok, false)
    assert.ok(broken.reason.includes(LOCK_FILE), broken.reason)
  } finally {
    t.cleanup()
  }
})

test('readProvenance reports an absent entry as absent, not as an error', () => {
  const t = tmp()
  try {
    const missing = readProvenance(t.blueprintsDir, 'demo')
    assert.deepStrictEqual([missing.ok, missing.entry], [true, null])
  } finally {
    t.cleanup()
  }
})

test('digestTree covers every installed file and skips the lock itself', () => {
  const t = tmp()
  try {
    writeDoc(t.installedDir, 'spec_NN.md', '# spec')
    writeDoc(t.installedDir, path.join('procedures', 'a_procedures_NN.md'), '# a')
    writeLock(t.blueprintsDir, { blueprints: {} })

    const digests = digestTree(t.installedDir)
    assert.deepStrictEqual(Object.keys(digests).sort(), [
      'procedures/a_procedures_NN.md',
      'spec_NN.md',
    ])
    assert.match(digests['spec_NN.md'], /^[0-9a-f]{64}$/)
    assert.ok(!Object.keys(digests).includes(LOCK_FILE))

    const same = digestTree(t.installedDir)
    assert.deepStrictEqual(same, digests, 'digests must be stable across runs')

    writeDoc(t.installedDir, 'spec_NN.md', '# spec changed')
    assert.notStrictEqual(digestTree(t.installedDir)['spec_NN.md'], digests['spec_NN.md'])
  } finally {
    t.cleanup()
  }
})

test('readBlueprintManifest names the missing field', () => {
  const t = tmp()
  try {
    const absent = readBlueprintManifest(t.installedDir)
    assert.strictEqual(absent.ok, false)
    assert.ok(absent.reason.includes('blueprint.json'), absent.reason)

    fs.writeFileSync(
      path.join(t.installedDir, 'blueprint.json'),
      JSON.stringify({ name: 'demo', version: 'V_0-1-0' }),
      'utf-8',
    )
    const partial = readBlueprintManifest(t.installedDir)
    assert.strictEqual(partial.ok, false)
    assert.ok(
      partial.reason.includes('format_version') && partial.reason.includes('distribution_url'),
      partial.reason,
    )
  } finally {
    t.cleanup()
  }
})

// --- versions and addresses ----------------------------------------------

test('versions compare numerically, not lexically, and an unparseable one never wins', () => {
  assert.deepStrictEqual(parseVersion('V_0-9-0'), [0, 9, 0])
  assert.strictEqual(parseVersion('0.9.0'), null)
  assert.strictEqual(compareVersions('V_0-9-0', 'V_0-10-0'), -1)
  assert.strictEqual(compareVersions('V_0-10-0', 'V_0-9-0'), 1)
  assert.strictEqual(compareVersions('V_1-0-0', 'V_0-99-99'), 1)
  assert.strictEqual(compareVersions('nonsense', 'V_0-1-0'), null)
})

test('a distribution_url yields the repo, the mutable ref and the in-repo path', () => {
  assert.deepStrictEqual(distributionUrlParts(URL_BASE), {
    origin: 'https://raw.githubusercontent.com',
    repo: 'cogNNitive/cogNNitive-web',
    ref: 'main',
    blueprintPath: 'iNNfo/specs/bluepriNNts/demo',
  })
  assert.strictEqual(distributionUrlParts('https://github.com/cogNNitive/cogNNitive-web'), null)
  assert.strictEqual(distributionUrlParts('not a url'), null)
  assert.strictEqual(commitUrlFor(URL_BASE, NEWER), `${URL_BASE.replace('/main/', `/${NEWER}/`)}`)
  assert.strictEqual(commitUrlFor(URL_BASE, 'not-a-sha'), null)
})

test('versions.json is a hint: an entry without a commit is dropped, not trusted', async () => {
  const t = tmp()
  try {
    const fetched = await fetchPublishedVersions(URL_BASE, {
      fetchString: serveMap({
        [`${URL_BASE}/versions.json`]: versionsBody([
          { version: 'V_0-3-0', tag: 'blueprints-v0.3.0', commit: NEWER },
          { version: 'V_0-4-0', tag: 'blueprints-v0.4.0' },
          { version: 'V_0-5-0', tag: 'blueprints-v0.5.0', commit: 'blueprints-v0.5.0' },
        ]),
      }),
    })
    assert.strictEqual(fetched.ok, true)
    assert.deepStrictEqual(fetched.versions, [
      { version: 'V_0-3-0', tag: 'blueprints-v0.3.0', commit: NEWER },
    ])
  } finally {
    t.cleanup()
  }
})

test('an unpublished versions.json is named, not treated as current', async () => {
  const fetched = await fetchPublishedVersions(URL_BASE, { fetchString: serveMap({}) })
  assert.strictEqual(fetched.ok, false)
  assert.ok(fetched.reason.includes(`${URL_BASE}/versions.json`), fetched.reason)
  assert.ok(fetched.reason.includes('404'), fetched.reason)
})

// --- the verdict ---------------------------------------------------------

test('a unit with no recorded provenance is unknown, never current', async () => {
  const t = tmp()
  try {
    const verdict = await blueprintVerdict({
      blueprintsDir: t.blueprintsDir,
      installedDir: t.installedDir,
      name: 'demo',
    })
    assert.strictEqual(verdict.status, 'unknown')
    assert.ok(verdict.detail.includes('no provenance'), verdict.detail)
  } finally {
    t.cleanup()
  }
})

test('a unit whose copy declares no distribution_url is unknown and says why', async () => {
  const t = tmp()
  try {
    recordProvenance(t.blueprintsDir, 'demo', { version: 'V_0-1-0', commit: COMMIT })
    const verdict = await blueprintVerdict({
      blueprintsDir: t.blueprintsDir,
      installedDir: t.installedDir,
      name: 'demo',
    })
    assert.strictEqual(verdict.status, 'unknown')
    assert.ok(verdict.detail.includes('distribution_url'), verdict.detail)
  } finally {
    t.cleanup()
  }
})

test('the three comparable verdicts: current, update-available, ahead', async () => {
  const cases = [
    { installed: 'V_0-2-0', published: 'V_0-2-0', expected: 'current' },
    { installed: 'V_0-2-0', published: 'V_0-3-0', expected: 'update-available' },
    { installed: 'V_0-4-0', published: 'V_0-3-0', expected: 'ahead' },
  ]
  for (const item of cases) {
    const t = tmp()
    try {
      recordProvenance(t.blueprintsDir, 'demo', {
        version: item.installed,
        tag: 'blueprints-v0.2.0',
        commit: COMMIT,
        distribution_url: URL_BASE,
      })
      const verdict = await blueprintVerdict(
        { blueprintsDir: t.blueprintsDir, installedDir: t.installedDir, name: 'demo' },
        {
          fetchString: serveMap({
            [`${URL_BASE}/versions.json`]: versionsBody([
              { version: item.published, tag: 'blueprints-v0.3.0', commit: NEWER },
            ]),
            [`${URL_BASE.replace('/main/', `/${NEWER}/`)}/blueprint.json`]: manifestBody({
              version: item.published,
            }),
          }),
        },
      )
      assert.strictEqual(
        verdict.status,
        item.expected,
        `${item.installed} vs ${item.published}: ${verdict.detail}`,
      )
      if (item.expected === 'update-available') {
        assert.strictEqual(verdict.commit, NEWER)
        assert.strictEqual(verdict.tag, 'blueprints-v0.3.0')
        assert.ok(verdict.detail.includes('update --blueprint demo'), verdict.detail)
      }
    } finally {
      t.cleanup()
    }
  }
})

test('a commit whose tree declares a different version does not verify', async () => {
  const t = tmp()
  try {
    recordProvenance(t.blueprintsDir, 'demo', {
      version: 'V_0-1-0',
      commit: COMMIT,
      distribution_url: URL_BASE,
    })
    const verdict = await blueprintVerdict(
      { blueprintsDir: t.blueprintsDir, installedDir: t.installedDir, name: 'demo' },
      {
        fetchString: serveMap({
          [`${URL_BASE}/versions.json`]: versionsBody([
            { version: 'V_0-3-0', tag: null, commit: NEWER },
          ]),
          [`${URL_BASE.replace('/main/', `/${NEWER}/`)}/blueprint.json`]: manifestBody({
            version: 'V_0-2-0',
          }),
        }),
      },
    )
    assert.strictEqual(verdict.status, 'unverifiable')
    assert.ok(
      verdict.detail.includes('V_0-3-0') && verdict.detail.includes('V_0-2-0'),
      verdict.detail,
    )
  } finally {
    t.cleanup()
  }
})

test('an unreachable publisher is a named failure that carries the URL', async () => {
  const t = tmp()
  try {
    recordProvenance(t.blueprintsDir, 'demo', {
      version: 'V_0-1-0',
      commit: COMMIT,
      distribution_url: URL_BASE,
    })
    const verdict = await blueprintVerdict(
      { blueprintsDir: t.blueprintsDir, installedDir: t.installedDir, name: 'demo' },
      {
        fetchString: async () => {
          throw new Error('getaddrinfo ENOTFOUND raw.githubusercontent.com')
        },
      },
    )
    assert.strictEqual(verdict.status, 'unreachable')
    assert.ok(verdict.detail.includes(`${URL_BASE}/versions.json`), verdict.detail)
    assert.ok(verdict.detail.includes('ENOTFOUND'), verdict.detail)
  } finally {
    t.cleanup()
  }
})

test('a publisher that publishes no versions.json is no-versions, not up to date', async () => {
  const t = tmp()
  try {
    recordProvenance(t.blueprintsDir, 'demo', {
      version: 'V_0-1-0',
      commit: COMMIT,
      distribution_url: URL_BASE,
    })
    const verdict = await blueprintVerdict(
      { blueprintsDir: t.blueprintsDir, installedDir: t.installedDir, name: 'demo' },
      { fetchString: serveMap({}) },
    )
    assert.strictEqual(verdict.status, 'no-versions')
  } finally {
    t.cleanup()
  }
})

test('resolvePublished picks the highest verifiable version, not the highest listed', async () => {
  const resolved = await resolvePublished(
    { distributionUrl: URL_BASE, name: 'demo' },
    {
      fetchString: serveMap({
        [`${URL_BASE}/versions.json`]: versionsBody([
          { version: 'V_0-2-0', tag: null, commit: COMMIT },
          { version: 'V_0-3-0', tag: null, commit: NEWER },
        ]),
        [`${URL_BASE.replace('/main/', `/${COMMIT}/`)}/blueprint.json`]: manifestBody({
          version: 'V_0-2-0',
        }),
      }),
    },
  )
  assert.strictEqual(resolved.ok, true)
  assert.strictEqual(resolved.entry.version, 'V_0-2-0')
  assert.strictEqual(resolved.entry.commit, COMMIT)
})
