/**
 * scripts/lib/blueprint-channels.test.js
 *
 * Plan phase P2. Three things are pinned here and nothing else:
 *
 *   1. a unit in no channel is still resolvable by its own provenance — channels are
 *      discovery, never the source of a version (P1 already owns that, so the check is
 *      that a channel miss reports *which* channels were asked, not "not found");
 *   2. a unit carried only by a second channel resolves by name, in order;
 *   3. a channel entry carrying a version is refused, because a channel never
 *      restates versions (D4).
 */

const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  CHANNELS_FILE,
  DEFAULT_CHANNELS,
  FORBIDDEN_CHANNEL_KEYS,
  defaultChannelsFile,
  loadChannels,
  parseChannels,
  resolveBlueprintInChannels,
  unitDistributionUrl,
} = require('./blueprint-channels.js')

const COMMIT = '4444444444444444444444444444444444444444'
const OLDER = '5555555555555555555555555555555555555555'

const OFFICIAL = 'https://channels.test/official/blueprints/main/iNNfo/specs/bluepriNNts'
const CURATED = 'https://channels.test/curated/blueprints/main/iNNfo/specs/bluepriNNts'

const CHANNELS = [
  { name: 'official', distribution_url: OFFICIAL },
  { name: 'curated', distribution_url: CURATED },
]

function versionsBody(list) {
  return JSON.stringify({ versions: list })
}

function manifestBody(name, version) {
  return JSON.stringify({
    name,
    version,
    format_version: 'V_0-5-0',
    distribution_url: 'placeholder',
  })
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

function commitUrl(channel, name, commit) {
  return `${channel.replace('/main/', `/${commit}/`)}/${name}/blueprint.json`
}

function tmpFile(rel, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-channels-'))
  const file = path.join(root, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, body, 'utf-8')
  return { file, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) }
}

// --- the default list ----------------------------------------------------

test('the built-in defaults point at the address the units themselves declare', () => {
  assert.doesNotThrow(() => parseChannels({ channels: DEFAULT_CHANNELS }))
  assert.strictEqual(DEFAULT_CHANNELS[0].name, 'official')
  // Verified against every shipped blueprint.json: the distribution_url they record is
  // under cogNNitive-web, so a channel anywhere else would install a unit whose provenance
  // names a different repository than the one it was fetched from.
  assert.ok(DEFAULT_CHANNELS[0].distribution_url.includes('cogNNitive-web'))
})

test('every default channel carries name and distribution_url and nothing else', () => {
  for (const channel of DEFAULT_CHANNELS) {
    assert.deepStrictEqual(Object.keys(channel).sort(), ['distribution_url', 'name'])
  }
})

// --- resolution, in order ------------------------------------------------

test('a unit carried only by the second channel resolves from it', async () => {
  const map = {
    [`${OFFICIAL}/demo/versions.json`]: new Error('Failed to fetch, status: 404'),
    [`${CURATED}/demo/versions.json`]: versionsBody([
      { version: 'V_0-2-0', tag: 'blueprints-v0.2.0', commit: COMMIT },
    ]),
    [commitUrl(CURATED, 'demo', COMMIT)]: manifestBody('demo', 'V_0-2-0'),
  }

  const result = await resolveBlueprintInChannels(
    { name: 'demo', channels: CHANNELS },
    { fetchString: serveMap(map) },
  )

  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.channel.name, 'curated')
  assert.strictEqual(result.distribution_url, `${CURATED}/demo`)
  assert.deepStrictEqual(result.entry, {
    version: 'V_0-2-0',
    tag: 'blueprints-v0.2.0',
    commit: COMMIT,
  })
})

test('the first channel that carries the unit wins, in list order', async () => {
  const map = {
    [`${OFFICIAL}/demo/versions.json`]: versionsBody([
      { version: 'V_0-3-0', tag: 'blueprints-v0.3.0', commit: COMMIT },
    ]),
    [commitUrl(OFFICIAL, 'demo', COMMIT)]: manifestBody('demo', 'V_0-3-0'),
    [`${CURATED}/demo/versions.json`]: versionsBody([
      { version: 'V_0-9-0', tag: 'blueprints-v0.9.0', commit: OLDER },
    ]),
    [commitUrl(CURATED, 'demo', OLDER)]: manifestBody('demo', 'V_0-9-0'),
  }

  const result = await resolveBlueprintInChannels(
    { name: 'demo', channels: CHANNELS },
    { fetchString: serveMap(map) },
  )

  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.channel.name, 'official')
  assert.strictEqual(result.entry.version, 'V_0-3-0')
})

test('the order is the list order: swapping the list swaps the winner', async () => {
  const map = {
    [`${OFFICIAL}/demo/versions.json`]: versionsBody([
      { version: 'V_0-3-0', tag: null, commit: COMMIT },
    ]),
    [commitUrl(OFFICIAL, 'demo', COMMIT)]: manifestBody('demo', 'V_0-3-0'),
    [`${CURATED}/demo/versions.json`]: versionsBody([
      { version: 'V_0-9-0', tag: null, commit: OLDER },
    ]),
    [commitUrl(CURATED, 'demo', OLDER)]: manifestBody('demo', 'V_0-9-0'),
  }

  const result = await resolveBlueprintInChannels(
    { name: 'demo', channels: [CHANNELS[1], CHANNELS[0]] },
    { fetchString: serveMap(map) },
  )

  assert.strictEqual(result.channel.name, 'curated')
  assert.strictEqual(result.entry.version, 'V_0-9-0')
})

test('a unit in no channel is named channel by channel, never "not found"', async () => {
  const result = await resolveBlueprintInChannels(
    { name: 'ghost', channels: CHANNELS },
    {
      fetchString: serveMap({
        [`${OFFICIAL}/ghost/versions.json`]: new Error('Failed to fetch, status: 404'),
        [`${CURATED}/ghost/versions.json`]: new Error('Failed to fetch, status: 404'),
      }),
    },
  )

  assert.strictEqual(result.ok, false)
  assert.deepStrictEqual(
    result.tried.map((t) => t.channel),
    ['official', 'curated'],
  )
  for (const entry of result.tried) {
    assert.match(entry.reason, /versions\.json is not published/)
  }
})

test('a hint is a hint: a commit whose blueprint.json disagrees does not resolve', async () => {
  const map = {
    [`${OFFICIAL}/demo/versions.json`]: versionsBody([
      { version: 'V_0-7-0', tag: 'blueprints-v0.7.0', commit: COMMIT },
    ]),
    // The commit declares a different version than the list claims.
    [commitUrl(OFFICIAL, 'demo', COMMIT)]: manifestBody('demo', 'V_0-1-0'),
  }

  const result = await resolveBlueprintInChannels(
    { name: 'demo', channels: [CHANNELS[0]] },
    { fetchString: serveMap(map) },
  )

  assert.strictEqual(result.ok, false)
  assert.match(result.tried[0].reason, /declares version/)
})

test('a unit URL is the channel root joined with the name, without a double slash', () => {
  assert.strictEqual(
    unitDistributionUrl({ distribution_url: `${OFFICIAL}/` }, 'demo'),
    `${OFFICIAL}/demo`,
  )
})

// --- a channel never restates versions (D4) ------------------------------

test('a channel entry carrying a version is refused, naming the field and the rule', () => {
  for (const key of FORBIDDEN_CHANNEL_KEYS) {
    assert.throws(
      () =>
        parseChannels({ channels: [{ name: 'x', distribution_url: OFFICIAL, [key]: 'V_0-1-0' }] }),
      (err) => {
        assert.match(err.message, new RegExp(`carries ${key}`), `${key} must be named`)
        assert.match(err.message, /never restates versions/)
        return true
      },
    )
  }
})

test('a channel entry with an unknown field is refused rather than silently ignored', () => {
  assert.throws(
    () => parseChannels({ channels: [{ name: 'x', distribution_url: OFFICIAL, mirror: 'y' }] }),
    /unknown field\(s\) mirror/,
  )
})

test('a malformed channel list is refused, never replaced by the defaults', async () => {
  assert.throws(() => parseChannels({}), /expected \{ "channels"/)
  assert.throws(() => parseChannels({ channels: [] }), /declares no channels/)
  assert.throws(
    () => parseChannels({ channels: [{ name: '', distribution_url: OFFICIAL }] }),
    /non-empty name/,
  )
  assert.throws(() => parseChannels({ channels: [{ name: 'x' }] }), /non-empty distribution_url/)
  assert.throws(
    () => parseChannels({ channels: [{ name: 'x', distribution_url: 'https://x/y' }] }),
    /unusable/,
  )
  assert.throws(
    () =>
      parseChannels({
        channels: [
          { name: 'x', distribution_url: OFFICIAL },
          { name: 'X', distribution_url: CURATED },
        ],
      }),
    /duplicate channel name/,
  )
})

// --- loading -------------------------------------------------------------

test('with no override the built-in defaults are used and named as such', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-home-'))
  try {
    const loaded = await loadChannels({ env: {}, home })
    assert.strictEqual(loaded.source, 'built-in defaults')
    assert.deepStrictEqual(loaded.channels, DEFAULT_CHANNELS)
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test("a channels.json under ~/.agents is the operator's own list", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-home-'))
  try {
    const file = defaultChannelsFile(home)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(
      file,
      JSON.stringify({ channels: [{ name: 'mine', distribution_url: CURATED }] }),
      'utf-8',
    )
    const loaded = await loadChannels({ env: {}, home })
    assert.strictEqual(loaded.source, file)
    assert.deepStrictEqual(loaded.channels, [{ name: 'mine', distribution_url: CURATED }])
  } finally {
    fs.rmSync(home, { recursive: true, force: true })
  }
})

test('COGNNITIVE_CHANNELS points the list at a file', async () => {
  const t = tmpFile(
    CHANNELS_FILE,
    JSON.stringify({ channels: [{ name: 'mine', distribution_url: CURATED }] }),
  )
  try {
    const loaded = await loadChannels({ env: { COGNNITIVE_CHANNELS: t.file } })
    assert.strictEqual(loaded.source, t.file)
    assert.deepStrictEqual(loaded.channels, [{ name: 'mine', distribution_url: CURATED }])
  } finally {
    t.cleanup()
  }
})

test('a channels file that does not exist is named, not silently defaulted', async () => {
  await assert.rejects(
    () =>
      loadChannels({
        env: { COGNNITIVE_CHANNELS: path.join(os.tmpdir(), 'no-such-channels.json') },
      }),
    /channels file not found/,
  )
})

test('a channels file with a bad entry fails with the source in the message', async () => {
  const t = tmpFile(
    CHANNELS_FILE,
    JSON.stringify({ channels: [{ name: 'mine', distribution_url: CURATED, version: 'V_0-1-0' }] }),
  )
  try {
    await assert.rejects(
      () => loadChannels({ env: { COGNNITIVE_CHANNELS: t.file } }),
      (err) => {
        assert.ok(err.message.includes(t.file), `message must name the source: ${err.message}`)
        assert.match(err.message, /carries version/)
        return true
      },
    )
  } finally {
    t.cleanup()
  }
})
