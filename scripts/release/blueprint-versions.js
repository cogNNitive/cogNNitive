/**
 * scripts/release/blueprint-versions.js
 *
 * The publisher half of the blueprint provenance contract (plan C3).
 *
 * P1 taught the client to read `<distribution_url>/versions.json` and verify the
 * commit it names. Nothing produced that file, so `status` and `install --blueprint`
 * could only ever answer `no-versions`. This module writes it, at release time, from
 * the trees the release actually publishes.
 *
 * The shape is fixed by `fetchPublishedVersions`:
 *
 *   { "versions": [ { "version": "V_0-32-4", "tag": "blueprints-v0.104.0", "commit": "<40 hex>" } ] }
 *
 * Two rules that are easy to get wrong:
 *
 * 1. **The list accumulates.** A release adds its version; it never replaces the file
 *    with one entry, or every client older than the newest release becomes unverifiable.
 * 2. **The commit must carry the unit.** `verifyCommit` fetches `<commit>/<path>/blueprint.json`
 *    and compares name and version, so an entry may only name a commit whose tree holds
 *    that version. A tag name alone is not good enough.
 *
 * The accumulator lives in the mirror, inside the tree `copyDistributionPath` replaces
 * wholesale. `readVersionLists` therefore runs before the copy and `writeVersionLists`
 * after it; the caller owns that order.
 */

'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { parseVersion } = require('../lib/blueprint-provenance.js')

const VERSIONS_FILE = 'versions.json'
const BLUEPRINTS_REL = path.join('iNNfo', 'specs', 'bluepriNNts')

/**
 * @param {string} mirrorDir the mirror checkout
 * @returns {string}
 */
function blueprintsDirOf(mirrorDir) {
  return path.join(mirrorDir, BLUEPRINTS_REL)
}

/**
 * Reads a versions.json body. A malformed file is reported and treated as empty, never
 * silently kept: an accumulator that cannot be read is a broken channel, not a no-op.
 *
 * @param {string} file
 * @param {{ warn: (message: string) => void }} logger
 * @returns {Array<{ version: string, tag: string|null, commit: string }>}
 */
function readVersionFile(file, logger) {
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (err) {
    logger.warn(
      `blueprint-versions: ${file}: ${err instanceof Error ? err.message : String(err)} â€” treating as empty`,
    )
    return []
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && Array.isArray(parsed.versions)
      ? parsed.versions
      : null
  if (!list) {
    logger.warn(`blueprint-versions: ${file}: expected { "versions": [...] } â€” treating as empty`)
    return []
  }
  return list
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
}

/**
 * Every accumulator in the mirror, keyed by blueprint directory name.
 *
 * @param {string} mirrorDir
 * @param {{ warn: (message: string) => void }} logger
 * @returns {Map<string, Array<{ version: string, tag: string|null, commit: string }>>}
 */
function readVersionLists(mirrorDir, logger) {
  const out = new Map()
  const base = blueprintsDirOf(mirrorDir)
  if (!fs.existsSync(base)) return out
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(base, entry.name, VERSIONS_FILE)
    if (!fs.existsSync(file)) continue
    out.set(entry.name, readVersionFile(file, logger))
  }
  return out
}

/**
 * The repo-relative paths of every published accumulator, for a caller that is about to
 * replace the tree they live in and must put them back.
 *
 * @param {string} mirrorDir
 * @returns {string[]}
 */
function versionFilePaths(mirrorDir) {
  const out = []
  const base = blueprintsDirOf(mirrorDir)
  if (!fs.existsSync(base)) return out
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(base, entry.name, VERSIONS_FILE)
    if (fs.existsSync(file)) {
      out.push(`${BLUEPRINTS_REL.split(path.sep).join('/')}/${entry.name}/${VERSIONS_FILE}`)
    }
  }
  return out.sort()
}

/**
 * Adds or replaces one version and keeps the list newest-first.
 *
 * A re-release of an already-listed version replaces its entry: the same version can be
 * republished (a re-tag of a failed leg), and the newest commit that carries it is the one
 * a client should verify.
 *
 * @param {Array<{ version: string, tag: string|null, commit: string }>} list
 * @param {{ version: string, tag: string|null, commit: string }} entry
 * @returns {Array<{ version: string, tag: string|null, commit: string }>}
 */
function upsertVersion(list, entry) {
  const next = list.filter((item) => item.version !== entry.version)
  next.push(entry)
  return next.sort((a, b) => {
    const pa = parseVersion(a.version)
    const pb = parseVersion(b.version)
    if (pa && pb) {
      for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return pb[i] - pa[i]
      return 0
    }
    // A version that cannot be parsed never sorts ahead of one that can; it stays last.
    if (pa) return -1
    if (pb) return 1
    return a.version < b.version ? 1 : a.version > b.version ? -1 : 0
  })
}

/**
 * Writes the accumulator for every distributable unit in the mirror's blueprint tree.
 *
 * A directory without `blueprint.json` is not a unit and gets no file: the manifest is
 * what declares the version, so a directory that omits it has nothing to publish and is
 * reported rather than skipped in silence.
 *
 * @param {object} input
 * @param {string} input.mirrorDir
 * @param {string} input.tag the release tag being published
 * @param {string} input.commit the commit whose tree carries these versions
 * @param {Map<string, Array<any>>} [input.existing] from `readVersionLists`, read before the copy
 * @param {{ warn: (message: string) => void }} input.logger
 * @returns {{ changed: boolean, written: string[] }}
 */
function writeVersionLists(input) {
  const { mirrorDir, tag, commit, logger } = input
  const existing = input.existing || new Map()
  if (!/^[0-9a-f]{40}$/i.test(String(commit || ''))) {
    throw new Error(
      `blueprint-versions: ${tag}: commit must be a 40-hex sha, got ${JSON.stringify(commit)}`,
    )
  }
  const base = blueprintsDirOf(mirrorDir)
  if (!fs.existsSync(base)) return { changed: false, written: [] }

  const written = []
  let changed = false
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = path.join(base, entry.name)
    const manifestPath = path.join(dir, 'blueprint.json')
    if (!fs.existsSync(manifestPath)) {
      logger.warn(
        `blueprint-versions: ${entry.name} ships no blueprint.json, so it has no versions.json`,
      )
      continue
    }
    let manifest
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch (err) {
      logger.warn(
        `blueprint-versions: ${entry.name}/blueprint.json: ${err instanceof Error ? err.message : String(err)} â€” skipped`,
      )
      continue
    }
    const version = typeof manifest.version === 'string' ? manifest.version.trim() : ''
    if (!parseVersion(version)) {
      logger.warn(
        `blueprint-versions: ${entry.name} declares version ${JSON.stringify(manifest.version)}, which is not V_x-y-z â€” skipped`,
      )
      continue
    }

    const next = upsertVersion(existing.get(entry.name) || [], {
      version,
      tag,
      commit: String(commit).toLowerCase(),
    })
    const file = path.join(dir, VERSIONS_FILE)
    const body = `${JSON.stringify({ versions: next }, null, 2)}\n`
    const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null
    if (previous !== body) {
      fs.writeFileSync(file, body, 'utf-8')
      changed = true
    }
    written.push(`${entry.name}@${version}`)
  }
  return { changed, written }
}

/**
 * Stamps the release tag into the two `catalog.json` copies the publish carries.
 *
 * Lives here rather than in the orchestrator because `run-release.js` is capped at 200
 * physical lines by the line-count guard, and this is blueprint bookkeeping, not flow.
 *
 * @param {string} workDir the mirror checkout
 * @param {string} tag
 * @param {{ warn: (message: string) => void }} logger
 */
function stampCatalog(workDir, tag, logger) {
  for (const rel of [
    'iNNfo/specs/bluepriNNts/catalog.json',
    'docs/innfo/blueprints/catalog.json',
  ]) {
    const catPath = path.join(workDir, ...rel.split('/'))
    if (!fs.existsSync(catPath)) continue
    try {
      const raw = JSON.parse(fs.readFileSync(catPath, 'utf-8'))
      for (const sec of [raw.blueprints, raw.frozen]) {
        if (sec)
          for (const bp of Object.values(sec))
            if (bp && typeof bp === 'object') bp.release_tag = tag
      }
      fs.writeFileSync(catPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
    } catch (err) {
      logger.warn(`Could not stamp release_tag on ${catPath}: ${err.message}`)
    }
  }
}

/**
 * Records the release in every accumulator and, when something changed, commits and pushes
 * it as a second commit over the content one. Returns the commit the tag must point at.
 *
 * Two commits, not one: an entry has to name a commit whose tree already carries that
 * version, and the file cannot name the commit that introduces it. So the entry names the
 * content commit (C1) and the tag names C2, the tree that also carries the file.
 *
 * @param {object} input
 * @param {string} input.mirrorDir
 * @param {string} input.tag
 * @param {string} input.contentSha
 * @param {Map<string, Array<any>>} input.existing
 * @param {{ warn: (message: string) => void, log: (message: string) => void }} input.logger
 * @param {(args: string[]) => string} input.git
 * @param {() => void} input.push
 * @returns {string} the commit to tag
 */
function recordBlueprintVersions(input) {
  const { mirrorDir, tag, existing, logger, git, push } = input
  const recorded = writeVersionLists({ mirrorDir, tag, commit: input.contentSha, existing, logger })
  if (!recorded.changed) {
    logger.log(
      `run-release: ${VERSIONS_FILE} already records ${tag} for ${recorded.written.length} blueprint(s)`,
    )
    return input.contentSha
  }
  git(['add', '-A'])
  git(['commit', '-m', `release(blueprints): record ${tag} in ${VERSIONS_FILE}`])
  push()
  const next = git(['rev-parse', 'HEAD'])
  logger.log(
    `run-release: ${VERSIONS_FILE} records ${recorded.written.length} blueprint(s) at ${next.slice(0, 7)}`,
  )
  return next
}

module.exports = {
  BLUEPRINTS_REL,
  VERSIONS_FILE,
  blueprintsDirOf,
  readVersionFile,
  readVersionLists,
  recordBlueprintVersions,
  stampCatalog,
  upsertVersion,
  versionFilePaths,
  writeVersionLists,
}
