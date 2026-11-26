/**
 * scripts/lib/blueprint-channels.js
 *
 * Channels for distributable bluepriNNts (blueprints-distribution plan, P2).
 *
 * A channel is a published directory that holds distributable units, and nothing
 * else. Its entry is `{ name, distribution_url }` (D4): no version, no tag, no
 * `latest` pointer. Versions are resolved between the installed unit and the unit's
 * own declaration, which is why a channel entry carrying a version is refused here
 * rather than ignored — a second source of truth is how `release_tag: null` breaks an
 * install today.
 *
 * Resolution order is the channel list's order, and the first channel that yields a
 * verifiable unit wins. "Verifiable" is P1's rule, reused unchanged (C3): the channel
 * publishes `<distribution_url>/<name>/versions.json`, the list is a **hint**, and the
 * commit it names is what gets verified by reading that commit's own `blueprint.json`.
 * A branch, a `latest` pointer or a tag list is never read as authority.
 *
 * Discovery is a website, not a protocol (D5): this module answers only "does a
 * channel I was given carry this unit, and at which commit".
 */

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const { resolvePublished } = require('./blueprint-provenance.js')
const { fetchString } = require('./github-client.js')

/** File name an operator or an agent keeps beside the blueprints directory. */
const CHANNELS_FILE = 'channels.json'

/**
 * Where an operator's own list lives: next to the installed blueprints, in the same
 * `~/.agents` root the manager already owns.
 *
 * @param {string} [home]
 * @returns {string}
 */
function defaultChannelsFile(home = os.homedir()) {
  return path.join(home, '.agents', CHANNELS_FILE)
}

/**
 * Channels every installation knows about, resolved in this order. D5 asks for two:
 * one official, one curated third-party. Only the official one is published today
 * (`cogNNitive_blueprints` is the only blueprint distribution repository in the
 * organisation), so the list carries what exists and the second default is an open
 * item in the ledger — inventing a URL that 404s would be the silent failure this
 * plan exists to remove.
 */
const DEFAULT_CHANNELS = [
  {
    name: 'official',
    distribution_url:
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive_blueprints/main/iNNfo/specs/bluepriNNts',
  },
]

/**
 * Keys a channel entry must never carry: every one of them restates a version or a
 * pointer outside the unit, which D4 exists to prevent.
 */
const FORBIDDEN_CHANNEL_KEYS = ['version', 'versions', 'latest', 'tag', 'release_tag', 'adopted']

const CHANNEL_URL_HELP =
  'a channel distribution_url must be <origin>/<owner>/<repo>/<ref>/<path>, e.g. https://raw.githubusercontent.com/owner/repo/main/iNNfo/specs/bluepriNNts'

/**
 * Validates one channel entry. Throws instead of skipping: a channel that cannot be
 * used is reported, never silently dropped from the resolution order.
 *
 * @param {unknown} entry
 * @param {number} index
 * @param {string} [source] where the document came from, for messages
 * @returns {{ name: string, distribution_url: string }}
 */
function parseChannelEntry(entry, index, source = CHANNELS_FILE) {
  const where = `channels[${index}]`
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`${source}: ${where} must be an object with name and distribution_url`)
  }
  /** @type {Record<string, unknown>} */
  const raw = /** @type {Record<string, unknown>} */ (entry)

  const forbidden = FORBIDDEN_CHANNEL_KEYS.filter((key) => raw[key] !== undefined)
  if (forbidden.length > 0) {
    throw new Error(
      `${source}: ${where} ("${typeof raw.name === 'string' && raw.name ? raw.name : 'unnamed'}") carries ${forbidden.join(', ')}. ` +
        'A channel never restates versions (D4): it is { name, distribution_url } and nothing else. ' +
        "The version belongs to the unit's own blueprint.json.",
    )
  }

  const unknown = Object.keys(raw).filter((key) => !['name', 'distribution_url'].includes(key))
  if (unknown.length > 0) {
    throw new Error(
      `${source}: ${where} carries unknown field(s) ${unknown.join(', ')}. ` +
        'A channel entry is { name, distribution_url } and nothing else.',
    )
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) {
    throw new Error(`${source}: ${where} needs a non-empty name`)
  }

  const url = typeof raw.distribution_url === 'string' ? raw.distribution_url.trim() : ''
  if (!url) {
    throw new Error(`${source}: ${where} ("${name}") needs a non-empty distribution_url`)
  }

  // The shape matters: commit verification replaces the ref segment, so an address
  // without one cannot name an immutable tree.
  const segments = (() => {
    try {
      return new URL(url).pathname.split('/').filter(Boolean)
    } catch (_) {
      return []
    }
  })()
  if (segments.length < 4) {
    throw new Error(
      `${source}: ${where} ("${name}") distribution_url is unusable — ${CHANNEL_URL_HELP}`,
    )
  }

  return { name, distribution_url: url }
}

/**
 * Validates a whole channels document. Accepts `{ channels: [...] }` or a bare array;
 * both are read strictly.
 *
 * @param {unknown} raw parsed JSON
 * @param {string} [source] name of where it came from, for messages
 * @returns {{ channels: Array<{ name: string, distribution_url: string }> }}
 */
function parseChannels(raw, source = CHANNELS_FILE) {
  /** @type {any} */
  const doc = raw
  const list = Array.isArray(doc) ? doc : doc && Array.isArray(doc.channels) ? doc.channels : null
  if (!list) {
    throw new Error(
      `${source}: expected { "channels": [ { "name": "...", "distribution_url": "..." } ] }`,
    )
  }
  if (list.length === 0) {
    throw new Error(`${source}: declares no channels, so nothing can be resolved by name`)
  }
  const channels = list.map((entry, index) => parseChannelEntry(entry, index, source))
  const seen = new Set()
  for (const channel of channels) {
    const key = channel.name.toLowerCase()
    if (seen.has(key)) {
      throw new Error(`${source}: duplicate channel name ${JSON.stringify(channel.name)}`)
    }
    seen.add(key)
  }
  return { channels }
}

/**
 * The URL of one unit inside a channel.
 *
 * @param {{ distribution_url: string }} channel
 * @param {string} name
 * @returns {string}
 */
function unitDistributionUrl(channel, name) {
  return `${String(channel.distribution_url).replace(/\/+$/, '')}/${String(name).trim()}`
}

/**
 * Resolves which channel list to use. Order: an explicit path or URL, then
 * `COGNNITIVE_CHANNELS`, then the file the caller points at, then the built-in
 * defaults. A malformed source throws — it never falls back to the defaults, because
 * a broken configuration that silently becomes "the official channel" is
 * indistinguishable from a deliberate choice.
 *
 * @param {{ override?: string, file?: string, home?: string, env?: Record<string, string|undefined>, deps?: { fetchString?: (url: string) => Promise<string> } }} [options]
 * @returns {Promise<{ channels: Array<{ name: string, distribution_url: string }>, source: string }>}
 */
async function loadChannels(options = {}) {
  const env = options.env || process.env
  const deps = { fetchString: (options.deps && options.deps.fetchString) || fetchString }
  const homeFile = defaultChannelsFile(options.home)
  const explicit = options.override || env.COGNNITIVE_CHANNELS
  // An operator's own list wins over the built-in defaults, but only when it exists:
  // a missing `~/.agents/channels.json` is "nobody configured anything", not an error.
  const candidate = explicit || options.file || (fs.existsSync(homeFile) ? homeFile : null)

  if (!candidate) {
    return { channels: DEFAULT_CHANNELS.map((c) => ({ ...c })), source: 'built-in defaults' }
  }

  const isUrl = /^https?:\/\//i.test(candidate)
  let text
  if (isUrl) {
    text = await deps.fetchString(candidate)
  } else {
    if (!fs.existsSync(candidate)) {
      throw new Error(`channels file not found: ${candidate}`)
    }
    text = fs.readFileSync(candidate, 'utf-8')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    throw new Error(`${candidate}: ${err instanceof Error ? err.message : String(err)}`)
  }
  return { ...parseChannels(parsed, candidate), source: candidate }
}

/**
 * Resolves a unit by name across the channels, in order. The first channel that
 * yields a verifiable unit wins; every channel tried is reported when none does, so
 * `unlisted` can say *which* channels were asked instead of "not found".
 *
 * @param {{ name: string, channels: Array<{ name: string, distribution_url: string }> }} request
 * @param {{ fetchString?: (url: string) => Promise<string> }} [deps]
 * @returns {Promise<{
 *   ok: boolean,
 *   channel: { name: string, distribution_url: string } | null,
 *   distribution_url: string | null,
 *   entry: { version: string, tag: string | null, commit: string } | null,
 *   tried: Array<{ channel: string, reason: string }>
 * }>}
 */
async function resolveBlueprintInChannels(request, deps = {}) {
  const resolvedDeps = { fetchString: deps.fetchString || fetchString }
  const name = String(request.name || '').trim()
  if (!name) throw new Error('resolveBlueprintInChannels: a blueprint name is required')

  /** @type {Array<{ channel: string, reason: string }>} */
  const tried = []
  for (const channel of request.channels || []) {
    const distributionUrl = unitDistributionUrl(channel, name)
    const published = await resolvePublished({ distributionUrl, name }, resolvedDeps)
    if (published.ok && published.entry) {
      return {
        ok: true,
        channel,
        distribution_url: distributionUrl,
        entry: published.entry,
        tried,
      }
    }
    tried.push({ channel: channel.name, reason: published.reason })
  }
  return { ok: false, channel: null, distribution_url: null, entry: null, tried }
}

module.exports = {
  CHANNELS_FILE,
  CHANNEL_URL_HELP,
  DEFAULT_CHANNELS,
  FORBIDDEN_CHANNEL_KEYS,
  defaultChannelsFile,
  loadChannels,
  parseChannelEntry,
  parseChannels,
  resolveBlueprintInChannels,
  unitDistributionUrl,
}
