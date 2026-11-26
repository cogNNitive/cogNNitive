#!/usr/bin/env node
/**
 * scripts/release/channel-drift.js
 *
 * Fails when `main` has moved ahead of the manifest that installs resolve, for an artifact
 * the manifest marks as released, and when a released pin no longer resolves to the commit
 * it records (a re-tag, or a tag that moved, would otherwise change what a manifest means).
 *
 * Why this exists: merging to `main` publishes nothing, so a merged fix can sit unused while
 * the published manifest keeps installing the previous commit, and nothing said so.
 *
 * Policy, explicit rather than implied: this check is BLOCKING in CI (the `spec-integrity`
 * job runs it without `--advisory`). `--advisory` exists for a local run and for the window
 * where the published manifest is known to lag on purpose; it prints the same lines and
 * exits 0. There is no third mode, and CI never passes `--advisory`.
 *
 * A manifest entry is "released" when its `ref` is a release tag (`skills-v*`,
 * `blueprints-v*`, `templates-v*`, `nn-mcp-v*`, `nn-console-v*`). An entry pinned to `main`
 * is a preview channel, not a release, and is out of scope by construction.
 *
 * Zero dependencies; git is read from the local clone only (no api.github.com).
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const RELEASE_TAG_RE = /^(?:skills|blueprints|templates|nn-mcp|nn-console)-v\d+\.\d+\.\d+$/
const DEFAULT_MANIFEST = path.join('docs', 'use', 'manifest-next.md')

/**
 * The entries of a manifest document: `name`, `repo`, `path`, `ref`, `commit`, and the
 * `kind` implied by the block it sits in (`skills`, `blueprints`, `mcp`, `console`).
 * The manifest is generated with a fixed shape, so this reads the same fields the
 * generator writes; anything it cannot read is reported, never guessed.
 * @param {string} text
 * @returns {Array<{ kind: string, name: string, repo: string|null, path: string|null, ref: string|null, commit: string|null }>}
 */
function parseManifestEntries(text) {
  const entries = []
  let kind = 'skills'
  let current = null
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '  ')
    const section = /^ {2}([a-z-]+):\s*$/.exec(line)
    if (section) {
      kind = section[1]
      current = null
      continue
    }
    const start = /^\s*-\s+name:\s*"?([^"\n]+?)"?\s*$/.exec(line)
    if (start) {
      current = { kind, name: start[1], repo: null, path: null, ref: null, commit: null }
      entries.push(current)
      continue
    }
    if (!current) continue
    const field = /^\s+(repo|path|ref|commit):\s*"?([^"\n]*?)"?\s*$/.exec(line)
    if (field) current[field[1]] = field[2]
  }
  return entries
}

/** True when the entry pins a released artifact. */
function isReleased(entry) {
  return Boolean(entry.ref && RELEASE_TAG_RE.test(entry.ref))
}

/**
 * The drift of one released entry: `main` ahead of its published commit, within the paths it
 * ships. Returns null when the pin is current, or a problem naming both commits.
 * @param {{ entry: object, mainSha: string, runGit: (args: string[]) => string }} input
 */
function entryDrift({ entry, mainSha, runGit }) {
  if (!isReleased(entry)) return null
  if (!entry.commit || !/^[0-9a-f]{40}$/i.test(entry.commit)) {
    return {
      artifact: entry.name,
      kind: 'unpinned',
      message: `manifest entry "${entry.name}" (${entry.kind}) is released by ${entry.ref} but records no immutable 40-char commit`,
    }
  }
  // Scope the drift to the subtree this entry ships: the entry path itself when it is a
  // directory, its directory when it names a file (a generated bundle).
  const rel = String(entry.path || '.')
  const paths = /\.[a-z0-9]+$/i.test(rel)
    ? path.posix.dirname(rel.replace(/\\/g, '/'))
    : rel.replace(/\\/g, '/')
  const count = Number.parseInt(
    runGit(['rev-list', '--count', `${entry.commit}..${mainSha}`, '--', paths]).trim(),
    10,
  )
  if (Number.isFinite(count) && count > 0) {
    return {
      artifact: entry.name,
      kind: 'ahead',
      message:
        `artifact "${entry.name}" (${entry.kind}) is released at ${entry.ref} = ${entry.commit}, ` +
        `but main (${mainSha}) is ${count} commit(s) ahead of that pin under ${paths}`,
    }
  }
  return null
}

/**
 * The pin of one released entry must still resolve to the commit the manifest records: a
 * re-tag or a moved tag would otherwise silently change what the manifest installs.
 */
function entryTagMismatch({ entry, runGit }) {
  if (!isReleased(entry) || !entry.commit) return null
  let resolved
  try {
    resolved = runGit(['rev-parse', `${entry.ref}^{commit}`]).trim()
  } catch {
    return {
      artifact: entry.name,
      kind: 'unresolvable',
      message: `artifact "${entry.name}" (${entry.kind}) pins ${entry.ref}, which does not resolve in this clone`,
    }
  }
  if (resolved !== entry.commit) {
    return {
      artifact: entry.name,
      kind: 'retagged',
      message:
        `artifact "${entry.name}" (${entry.kind}) pins ${entry.ref}, which now resolves to ${resolved}, ` +
        `not the recorded commit ${entry.commit}: the pin moved`,
    }
  }
  return null
}

/**
 * @param {{ manifestText: string, mainSha: string, runGit: (args: string[]) => string, checkTags?: boolean }} input
 * @returns {{ problems: Array<{ artifact: string, kind: string, message: string }>, released: number }}
 */
function checkChannelDrift({ manifestText, mainSha, runGit, checkTags = true }) {
  const entries = parseManifestEntries(manifestText)
  const released = entries.filter(isReleased)
  const problems = []
  for (const entry of released) {
    const drift = entryDrift({ entry, mainSha, runGit })
    if (drift) problems.push(drift)
    if (checkTags) {
      const mismatch = entryTagMismatch({ entry, runGit })
      if (mismatch) problems.push(mismatch)
    }
  }
  return { problems, released: released.length }
}

function realRunGit(repoRoot) {
  return (args) =>
    execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
}

function main(argv) {
  const repoRoot = path.join(__dirname, '..', '..')
  const advisory = argv.includes('--advisory')
  const manifestArg = argv.find((a) => a.startsWith('--manifest='))
  const manifestPath = path.resolve(
    repoRoot,
    manifestArg ? manifestArg.slice('--manifest='.length) : DEFAULT_MANIFEST,
  )
  const mainArg = argv.find((a) => a.startsWith('--main='))
  const runGit = realRunGit(repoRoot)
  const head = runGit(['rev-parse', 'HEAD']).trim()
  // A PR checkout has no local `main`: try it, then the remote-tracking ref, then fall back to
  // the checked-out commit (which cannot drift from itself, so the run is a no-op, never a lie).
  const resolveMain = () => {
    for (const ref of ['main', 'origin/main']) {
      try {
        return runGit(['rev-parse', ref]).trim()
      } catch {
        /* try the next ref */
      }
    }
    return head
  }
  const mainSha = mainArg ? mainArg.slice('--main='.length) : resolveMain()

  const manifestText = fs.readFileSync(manifestPath, 'utf8')
  const { problems, released } = checkChannelDrift({ manifestText, mainSha, runGit })

  if (problems.length === 0) {
    console.log(`manifest-drift: ok (${released} released artifact(s) at their pin)`)
    return 0
  }
  console.error(
    `manifest-drift: ${problems.length} problem(s) between main (${mainSha.slice(0, 12)}) and ${path.relative(repoRoot, manifestPath)}:`,
  )
  for (const problem of problems) console.error(`  - ${problem.message}`)
  console.error(
    advisory
      ? 'manifest-drift: ADVISORY (--advisory): this run does not fail.'
      : 'manifest-drift: BLOCKING: release, or re-pin, before main moves further.',
  )
  return advisory ? 0 : 1
}

module.exports = {
  checkChannelDrift,
  entryDrift,
  entryTagMismatch,
  isReleased,
  parseManifestEntries,
  RELEASE_TAG_RE,
}

if (require.main === module) process.exit(main(process.argv.slice(2)))
