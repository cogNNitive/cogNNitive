/**
 * scripts/lib/blueprint-provenance.js
 *
 * Provenance for installed bluepriNNts (blueprints-distribution plan, P1).
 *
 * Two facts and one fetch, and never a catalog:
 *
 *   installed  — `.blueprint-lock.json` in the blueprints directory, written by
 *                the installer beside the managed layer and committed with the
 *                domain (C5). It holds the resolved tag, the resolved commit and
 *                a digest of every installed file (S3, S7).
 *   published  — `<distribution_url>/versions.json`, a HINT only: the commit it
 *                names is what gets verified, by fetching that commit's tree and
 *                reading the `blueprint.json` shipped in it (C3).
 *   verdict    — a named outcome. "Up to date" is never a fallback for "I could
 *                not tell" (P1 constraint 3).
 *
 * `distribution_url` is the mutable, fetchable base of the published blueprint
 * directory, in `raw.githubusercontent.com` shape:
 *
 *   <origin>/<owner>/<repo>/<ref>/<path/to/blueprint>
 *
 * The ref segment is what gets replaced by a verified commit, which is why the
 * address has to carry it: a channel entry is `{ name, distribution_url }` and
 * nothing else (D4), so the repo and the in-repo path cannot come from anywhere
 * else, and C3 puts `versions.json` at this same address.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const { fetchString } = require('./github-client.js')
const { saveJsonAtomic } = require('./atomic-fs.js')

const LOCK_FILE = '.blueprint-lock.json'
const LOCK_FORMAT_VERSION = 1
const MANIFEST_FILE = 'blueprint.json'
const MANIFEST_FIELDS = ['name', 'version', 'format_version', 'distribution_url']

/**
 * @param {string} blueprintsDir
 * @returns {string}
 */
function lockFilePath(blueprintsDir) {
  return path.join(blueprintsDir, LOCK_FILE)
}

/**
 * Reads the lock. A missing file is an empty lock — every unit installed before
 * provenance existed. An unreadable file is NOT an empty lock: it is reported so
 * the caller can name it instead of pretending nothing is installed.
 *
 * @param {string} blueprintsDir
 * @returns {{ ok: boolean, reason: string|null, blueprints: Record<string, any> }}
 */
function readLock(blueprintsDir) {
  const file = lockFilePath(blueprintsDir)
  if (!fs.existsSync(file)) return { ok: true, reason: null, blueprints: {} }
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (err) {
    return { ok: false, reason: `${file}: ${err.message}`, blueprints: {} }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: `${file}: not a JSON object`, blueprints: {} }
  }
  if (
    parsed.blueprints !== undefined &&
    (typeof parsed.blueprints !== 'object' || Array.isArray(parsed.blueprints))
  ) {
    return { ok: false, reason: `${file}: "blueprints" is not an object`, blueprints: {} }
  }
  return { ok: true, reason: null, blueprints: parsed.blueprints || {} }
}

/**
 * @param {string} blueprintsDir
 * @param {{ blueprints: Record<string, any> }} lock
 * @returns {void}
 */
function writeLock(blueprintsDir, lock) {
  saveJsonAtomic(lockFilePath(blueprintsDir), {
    format_version: LOCK_FORMAT_VERSION,
    blueprints: lock.blueprints || {},
  })
}

/**
 * Records one installed unit. Normalises the record so a tag can never be stored
 * in the commit field again: `commit` is a 40-hex sha or it is null.
 *
 * @param {string} blueprintsDir
 * @param {string} name
 * @param {{ version?: string|null, tag?: string|null, commit?: string|null, distribution_url?: string|null, digests?: Record<string, string> }} entry
 * @returns {{ version: string|null, tag: string|null, commit: string|null, distribution_url: string|null, digests: Record<string, string> }}
 */
function recordProvenance(blueprintsDir, name, entry) {
  const lock = readLock(blueprintsDir)
  const commit =
    typeof entry.commit === 'string' && /^[0-9a-f]{40}$/i.test(entry.commit)
      ? entry.commit.toLowerCase()
      : null
  const record = {
    version: entry.version || null,
    tag: entry.tag || null,
    commit,
    distribution_url: entry.distribution_url || null,
    digests: entry.digests || {},
  }
  lock.blueprints[name] = record
  writeLock(blueprintsDir, lock)
  return record
}

/**
 * @param {string} blueprintsDir
 * @param {string} name
 * @returns {{ ok: boolean, reason: string|null, entry: any|null }}
 */
function readProvenance(blueprintsDir, name) {
  const lock = readLock(blueprintsDir)
  if (!lock.ok) return { ok: false, reason: lock.reason, entry: null }
  const entry = lock.blueprints[name]
  if (!entry || typeof entry !== 'object') {
    return { ok: true, reason: null, entry: null }
  }
  return { ok: true, reason: null, entry }
}

/**
 * Reads `<installed>/blueprint.json`, the unit's own declaration (S1). A unit
 * that ships none has no provenance to record — which the caller reports, never
 * guesses around.
 *
 * @param {string} installedDir
 * @returns {{ ok: boolean, reason: string|null, value: any|null }}
 */
function readBlueprintManifest(installedDir) {
  const file = path.join(installedDir, MANIFEST_FILE)
  if (!fs.existsSync(file)) {
    return { ok: false, reason: `${file}: missing`, value: null }
  }
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (err) {
    return { ok: false, reason: `${file}: ${err.message}`, value: null }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: `${file}: not a JSON object`, value: null }
  }
  const missing = MANIFEST_FIELDS.filter(
    (field) => typeof parsed[field] !== 'string' || parsed[field].trim() === '',
  )
  if (missing.length > 0) {
    return { ok: false, reason: `${file}: missing ${missing.join(', ')}`, value: null }
  }
  return { ok: true, reason: null, value: parsed }
}

/**
 * SHA-256 of every file below a directory, keyed by repository-relative POSIX
 * path. Symlinks are hashed by their target so a link cannot hide a change.
 *
 * @param {string} dir
 * @returns {Record<string, string>}
 */
function digestTree(dir) {
  /** @type {Record<string, string>} */
  const out = {}
  const root = path.resolve(dir)
  if (!fs.existsSync(root)) return out

  /** @param {string} current */
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name)
      const rel = path.relative(root, abs).split(path.sep).join('/')
      if (rel === LOCK_FILE) continue
      if (entry.name.includes('.tmp-') || entry.name.includes('.staging-')) continue
      if (entry.isDirectory()) {
        walk(abs)
      } else if (entry.isSymbolicLink()) {
        const target = fs.readlinkSync(abs)
        out[rel] = crypto.createHash('sha256').update(`symlink:${target}`).digest('hex')
      } else if (entry.isFile()) {
        out[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex')
      }
    }
  }

  walk(root)
  return out
}

/**
 * Compares files in installedDir with the recorded digests from the lock.
 * Returns whether any files were modified, missing, or added.
 *
 * @param {string} installedDir
 * @param {Record<string, string>|null|undefined} recordedDigests
 * @returns {{ modified: boolean, differing: string[] }}
 */
function diffBlueprintTree(installedDir, recordedDigests) {
  if (
    !installedDir ||
    !fs.existsSync(installedDir) ||
    !recordedDigests ||
    typeof recordedDigests !== 'object'
  ) {
    return { modified: false, differing: [] }
  }
  const recordedKeys = Object.keys(recordedDigests)
  if (recordedKeys.length === 0) return { modified: false, differing: [] }

  const current = digestTree(installedDir)
  /** @type {string[]} */
  const differing = []

  for (const rel of recordedKeys) {
    if (!(rel in current)) {
      differing.push(`${rel} (missing)`)
    } else if (current[rel] !== recordedDigests[rel]) {
      differing.push(`${rel} (modified)`)
    }
  }

  for (const rel of Object.keys(current)) {
    if (!(rel in recordedDigests)) {
      differing.push(`${rel} (added)`)
    }
  }

  differing.sort()
  return {
    modified: differing.length > 0,
    differing,
  }
}

/**
 * Parses `V_x-y-z`. Returns null for anything else, so an unparseable version
 * can never be treated as "newest".
 *
 * @param {unknown} value
 * @returns {[number, number, number]|null}
 */
function parseVersion(value) {
  if (typeof value !== 'string') return null
  const match = /^V_(\d+)-(\d+)-(\d+)$/i.exec(value.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * @param {unknown} left
 * @param {unknown} right
 * @returns {number|null} negative when left < right, null when either is unparseable
 */
function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) return null
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

/**
 * Splits a `distribution_url` into the parts a commit fetch needs.
 *
 * @param {unknown} url
 * @returns {{ origin: string, repo: string, ref: string, blueprintPath: string }|null}
 */
function distributionUrlParts(url) {
  if (typeof url !== 'string' || url.trim() === '') return null
  let parsed
  try {
    parsed = new URL(url.trim())
  } catch (_) {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length < 4) return null
  return {
    origin: parsed.origin,
    repo: `${segments[0]}/${segments[1]}`,
    ref: segments[2],
    blueprintPath: segments.slice(3).join('/'),
  }
}

/**
 * The URL of the same published directory at a verified commit.
 *
 * @param {unknown} url
 * @param {string} commit
 * @returns {string|null}
 */
function commitUrlFor(url, commit) {
  const parts = distributionUrlParts(url)
  if (!parts || !/^[0-9a-f]{40}$/i.test(String(commit || ''))) return null
  return `${parts.origin}/${parts.repo}/${String(commit).toLowerCase()}/${parts.blueprintPath}`
}

/**
 * Fetches `<distribution_url>/versions.json`. The body is a hint: nothing here
 * is trusted until `verifyCommit` has looked at the tree it names.
 *
 * @param {string} distributionUrl
 * @param {{ fetchString: (url: string) => Promise<string> }} deps
 * @returns {Promise<{ ok: boolean, versions: Array<{ version: string, tag: string|null, commit: string }>, reason: string|null }>}
 */
async function fetchPublishedVersions(distributionUrl, deps) {
  const url = `${String(distributionUrl).replace(/\/+$/, '')}/versions.json`
  let text
  try {
    text = await deps.fetchString(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const statusMatch = /status: (\d{3})/.exec(message)
    if (statusMatch && statusMatch[1] === '404') {
      return { ok: false, versions: [], reason: `${url}: versions.json is not published (404)` }
    }
    return { ok: false, versions: [], reason: `${url}: ${message}` }
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return {
      ok: false,
      versions: [],
      reason: `${url}: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && Array.isArray(parsed.versions)
      ? parsed.versions
      : null
  if (!list) {
    return {
      ok: false,
      versions: [],
      reason: `${url}: expected { "versions": [ { version, tag, commit } ] }`,
    }
  }
  const versions = list
    .filter(
      (item) =>
        item &&
        typeof item.version === 'string' &&
        /^[0-9a-f]{40}$/i.test(String(item.commit || '')),
    )
    .map((item) => ({
      version: String(item.version).trim(),
      tag: typeof item.tag === 'string' && item.tag.trim() !== '' ? item.tag : null,
      commit: String(item.commit).toLowerCase(),
    }))
  if (versions.length === 0) {
    return { ok: false, versions: [], reason: `${url}: no entry carries a verifiable commit` }
  }
  return { ok: true, versions, reason: null }
}

/**
 * Verifies that the commit a hint names really publishes the version it claims,
 * by fetching that commit's tree and reading the shipped `blueprint.json`.
 *
 * @param {{ distributionUrl: string, name: string, entry: { version: string, commit: string } }} candidate
 * @param {{ fetchString: (url: string) => Promise<string> }} deps
 * @returns {Promise<{ ok: boolean, reason: string|null }>}
 */
async function verifyCommit(candidate, deps) {
  const base = commitUrlFor(candidate.distributionUrl, candidate.entry.commit)
  if (!base) {
    return {
      ok: false,
      reason: `${candidate.distributionUrl}: cannot address a commit's tree (expected <origin>/<owner>/<repo>/<ref>/<blueprint path>)`,
    }
  }
  const url = `${base}/${MANIFEST_FILE}`
  let text
  try {
    text = await deps.fetchString(url)
  } catch (err) {
    return { ok: false, reason: `${url}: ${err instanceof Error ? err.message : String(err)}` }
  }
  let manifest
  try {
    manifest = JSON.parse(text)
  } catch (err) {
    return { ok: false, reason: `${url}: ${err instanceof Error ? err.message : String(err)}` }
  }
  if (!manifest || typeof manifest !== 'object') {
    return { ok: false, reason: `${url}: not a JSON object` }
  }
  if (manifest.version !== candidate.entry.version) {
    return {
      ok: false,
      reason: `${url}: declares version ${JSON.stringify(manifest.version)} but versions.json lists ${JSON.stringify(candidate.entry.version)}`,
    }
  }
  if (manifest.name !== candidate.name) {
    return {
      ok: false,
      reason: `${url}: declares name ${JSON.stringify(manifest.name)} but the installed unit is ${JSON.stringify(candidate.name)}`,
    }
  }
  return { ok: true, reason: null }
}

/**
 * Resolves what is published for one unit: the highest version that can be
 * parsed AND whose commit verifies.
 *
 * @param {{ distributionUrl: string, name: string }} target
 * @param {{ fetchString: (url: string) => Promise<string> }} deps
 * @returns {Promise<{ ok: boolean, reason: string|null, entry: { version: string, tag: string|null, commit: string }|null }>}
 */
async function resolvePublished(target, deps) {
  const fetched = await fetchPublishedVersions(target.distributionUrl, deps)
  if (!fetched.ok) return { ok: false, reason: fetched.reason, entry: null }

  const ordered = fetched.versions
    .map((entry) => ({ entry, parts: parseVersion(entry.version) }))
    .filter((item) => item.parts)
    .sort((a, b) => {
      for (let i = 0; i < 3; i += 1) {
        if (a.parts[i] !== b.parts[i]) return b.parts[i] - a.parts[i]
      }
      return 0
    })

  if (ordered.length === 0) {
    return {
      ok: false,
      reason: `${target.distributionUrl}: versions.json lists no parsable version`,
      entry: null,
    }
  }

  const rejected = []
  for (const item of ordered) {
    const verified = await verifyCommit(
      { distributionUrl: target.distributionUrl, name: target.name, entry: item.entry },
      deps,
    )
    if (verified.ok) return { ok: true, reason: null, entry: item.entry }
    rejected.push(`${item.entry.version}: ${verified.reason}`)
  }
  return {
    ok: false,
    reason: `no published version could be verified — ${rejected.join('; ')}`,
    entry: null,
  }
}

/**
 * The verdict for one installed unit.
 *
 * Statuses: `current`, `update-available`, `ahead`, `unknown`, `unreachable`,
 * `no-versions`, `unverifiable`, `modified locally`, `lock-unreadable`.
 *
 * @param {{ blueprintsDir: string, installedDir: string, name: string }} target
 * @param {{ fetchString?: (url: string) => Promise<string> }} [deps]
 * @returns {Promise<{ status: string, recorded: boolean, installed: string|null, published: string|null, commit: string|null, tag: string|null, detail: string|null, differing?: string[] }>}
 */
async function blueprintVerdict(target, deps = {}) {
  const resolvedDeps = { fetchString: deps.fetchString || fetchString }
  const provenance = readProvenance(target.blueprintsDir, target.name)

  if (!provenance.ok) {
    return {
      status: 'lock-unreadable',
      recorded: false,
      installed: null,
      published: null,
      commit: null,
      tag: null,
      detail: `the provenance lock could not be read: ${provenance.reason}`,
    }
  }
  if (!provenance.entry) {
    return {
      status: 'unknown',
      recorded: false,
      installed: null,
      published: null,
      commit: null,
      tag: null,
      detail: `no provenance recorded for ${target.name} (installed before provenance was recorded); run: install --blueprint ${target.name} --yes or update --blueprint ${target.name}`,
    }
  }

  const entry = provenance.entry
  const installed = typeof entry.version === 'string' ? entry.version : null
  const recordedTag = typeof entry.tag === 'string' ? entry.tag : null

  // P3: Digest verification against local modification (D9)
  const localDiff = diffBlueprintTree(target.installedDir, entry.digests)
  if (localDiff.modified) {
    let publishedVersion = null
    let publishedCommit = entry.commit || null
    let publishedTag = recordedTag
    if (entry.distribution_url) {
      try {
        const resolved = await resolvePublished(
          { distributionUrl: entry.distribution_url, name: target.name },
          resolvedDeps,
        )
        if (resolved.ok && resolved.entry) {
          publishedVersion = resolved.entry.version
          publishedCommit = resolved.entry.commit
          publishedTag = resolved.entry.tag || recordedTag
        }
      } catch (_) {}
    }
    return {
      status: 'modified-locally',
      recorded: true,
      installed,
      published: publishedVersion,
      commit: publishedCommit,
      tag: publishedTag,
      detail: `the installed unit has been modified locally: ${localDiff.differing.join(', ')}; update is refused to protect local edits`,
      differing: localDiff.differing,
    }
  }

  if (!entry.distribution_url) {
    return {
      status: 'unknown',
      recorded: true,
      installed,
      published: null,
      commit: entry.commit || null,
      tag: recordedTag,
      detail: `the installed copy declares no distribution_url (no ${MANIFEST_FILE} beside spec_NN.md), so there is nothing to check ${target.name} against`,
    }
  }

  const resolved = await resolvePublished(
    { distributionUrl: entry.distribution_url, name: target.name },
    resolvedDeps,
  )
  if (!resolved.ok) {
    const status =
      /versions\.json is not published|lists no parsable version|expected \{ "versions"/.test(
        String(resolved.reason),
      )
        ? 'no-versions'
        : /could be verified|declares (version|name)|not a JSON object|cannot address a commit/.test(
              String(resolved.reason),
            )
          ? 'unverifiable'
          : 'unreachable'
    return {
      status,
      recorded: true,
      installed,
      published: null,
      commit: entry.commit || null,
      tag: recordedTag,
      detail: resolved.reason,
    }
  }

  const published = resolved.entry
  const comparison = installed ? compareVersions(installed, published.version) : null
  const executable = 'update --blueprint ' + target.name

  if (comparison === null) {
    return {
      status: 'unverifiable',
      recorded: true,
      installed,
      published: published.version,
      commit: entry.commit || null,
      tag: recordedTag,
      detail: installed
        ? `the installed version ${JSON.stringify(installed)} is not a V_x-y-z version, so it cannot be compared with ${published.version}`
        : `the installed copy records no version, so it cannot be compared with ${published.version}; run: ${executable}`,
    }
  }
  if (comparison < 0) {
    return {
      status: 'update-available',
      recorded: true,
      installed,
      published: published.version,
      commit: published.commit,
      tag: published.tag,
      detail: `installed ${installed}, published ${published.version} (${published.tag || published.commit.slice(0, 7)}); run: ${executable}`,
    }
  }
  if (comparison > 0) {
    return {
      status: 'ahead',
      recorded: true,
      installed,
      published: published.version,
      commit: entry.commit || null,
      tag: recordedTag,
      detail: `installed ${installed} is newer than the highest published version (${published.version}) at ${entry.distribution_url}`,
    }
  }
  return {
    status: 'current',
    recorded: true,
    installed,
    published: published.version,
    commit: entry.commit || null,
    tag: recordedTag,
    detail: null,
  }
}

module.exports = {
  LOCK_FILE,
  LOCK_FORMAT_VERSION,
  MANIFEST_FILE,
  MANIFEST_FIELDS,
  lockFilePath,
  readLock,
  writeLock,
  recordProvenance,
  readProvenance,
  readBlueprintManifest,
  digestTree,
  diffBlueprintTree,
  parseVersion,
  compareVersions,
  distributionUrlParts,
  commitUrlFor,
  fetchPublishedVersions,
  verifyCommit,
  resolvePublished,
  blueprintVerdict,
}
