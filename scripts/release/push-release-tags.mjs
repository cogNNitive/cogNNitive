#!/usr/bin/env node

/**
 * scripts/release/push-release-tags.mjs
 *
 * The tag step of the `auto-tag` job. It replaces the inline `bash -e` loop that
 * pushed the planned tags one at a time (#725): a single rejected push aborted the
 * loop, the job failed, and the `release` job that `needs` it was skipped — so a
 * commit could end up with some tags created, no release published, and a green run
 * after a `--failed` rerun.
 *
 * The contract:
 *
 *   1. ONE `git push --atomic`: either every planned tag lands or none does, so a
 *      rejection leaves a retryable state instead of a half-tagged commit.
 *   2. An existing tag that already points at this commit is SUCCESS, not a
 *      conflict, so re-running the job (or the step) is safe.
 *   3. An existing tag at another commit is a hard failure: a published tag is never
 *      moved or deleted.
 *   4. A bounded retry covers a transient remote rejection; after the last attempt
 *      the step fails and names the manual recovery.
 *
 * Inputs, all environment (the workflow passes the plan output through):
 *   TAGS                     JSON array of tag names to create
 *   RELEASE_TARGET_SHA       commit the tags point at. This is NOT `GITHUB_SHA`: a step
 *                            cannot override a default variable, so `env: GITHUB_SHA:` is
 *                            silently ignored and the tags would point at the merge commit
 *                            while the write-back lane's regenerated commit sits one ahead.
 *   GITHUB_SHA               fallback, for a run with no regeneration commit
 *   GITHUB_STEP_SUMMARY      optional file to append the summary lines to
 *   PUSH_RELEASE_TAGS_ATTEMPTS / PUSH_RELEASE_TAGS_DELAY_MS   test seams
 *
 * Usage:
 *   TAGS='["nn-mcp-v0.39.0"]' RELEASE_TARGET_SHA=$(git rev-parse HEAD) node scripts/release/push-release-tags.mjs
 */

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'

const ATTEMPTS = Math.max(1, Number(process.env.PUSH_RELEASE_TAGS_ATTEMPTS ?? '3'))
const DELAY_MS = Math.max(0, Number(process.env.PUSH_RELEASE_TAGS_DELAY_MS ?? '15000'))

/** The identity an annotated tag is created with; the runner has no global one. */
const TAG_IDENTITY = [
  '-c',
  'user.name=github-actions[bot]',
  '-c',
  'user.email=41898282+github-actions[bot]@users.noreply.github.com',
]

/** Runs git and returns stdout. Throws with stdout/stderr attached on failure. */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/** Runs git, returning `{ ok, out }` instead of throwing. */
function tryGit(args) {
  try {
    return { ok: true, out: git(args) }
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()
    return { ok: false, out }
  }
}

function sleep(ms) {
  if (ms <= 0) return
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function summary(line) {
  const file = process.env.GITHUB_STEP_SUMMARY
  if (file) {
    try {
      appendFileSync(file, `${line}\n`)
      return
    } catch {
      // Fall through to stdout: a missing summary file must not fail the release.
    }
  }
  console.log(line)
}

/**
 * The commit a tag points at on the remote, or null when the tag does not exist
 * there. An annotated tag lists a peeled `^{}` line with the commit; a lightweight
 * tag lists only the plain ref, which is already the commit.
 */
function remoteTagCommit(tag) {
  const res = tryGit(['ls-remote', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`])
  if (!res.ok) return { error: res.out }
  let plain = null
  let peeled = null
  for (const line of res.out.split('\n')) {
    const [sha, ref] = line.trim().split('\t')
    if (!sha || !ref) continue
    if (ref.endsWith('^{}')) peeled = sha
    else plain = sha
  }
  return { commit: peeled ?? plain }
}

function fail(message) {
  console.error(`push-release-tags: ${message}`)
  process.exit(1)
}

function recoveryHint() {
  console.error(
    'push-release-tags: nothing was tagged - the push is atomic, so rerunning this job is safe.',
  )
  console.error('push-release-tags: recovery:')
  console.error(
    '  gh run rerun <run-id>   (re-runs the whole run, so the release matrix is evaluated again)',
  )
  console.error(
    '  gh workflow run release.yml --ref main -f tag=<tag> -f publish=true   (one tag at a time)',
  )
}

function main() {
  let tags
  try {
    tags = JSON.parse(process.env.TAGS ?? '[]')
  } catch (error) {
    fail(`TAGS is not valid JSON: ${error.message}`)
  }
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string' || tag.trim() === '')) {
    fail('TAGS must be a JSON array of tag names')
  }
  if (tags.length === 0) {
    console.log('push-release-tags: nothing to tag')
    return
  }

  const sha = (process.env.RELEASE_TARGET_SHA ?? process.env.GITHUB_SHA ?? '').trim()
  if (!sha) fail('RELEASE_TARGET_SHA (or GITHUB_SHA) is not set')

  // Every check runs before the push, so a conflict cannot leave a partial batch.
  const refs = []
  for (const tag of tags) {
    const { commit, error } = remoteTagCommit(tag)
    if (error) {
      recoveryHint()
      fail(`could not read refs/tags/${tag} from origin: ${error}`)
    }
    if (commit) {
      if (commit !== sha) {
        recoveryHint()
        fail(
          `refs/tags/${tag} already exists at ${commit}, not at ${sha}; ` +
            'a published tag is never moved (delete it by hand only if it is certainly wrong)',
        )
      }
      continue
    }
    // A retry in the same job already created the local tag: reuse it.
    if (!tryGit(['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).ok) {
      const created = tryGit([...TAG_IDENTITY, 'tag', '-a', tag, '-m', `release: ${tag}`, sha])
      if (!created.ok) {
        recoveryHint()
        fail(`could not create the local tag ${tag}: ${created.out}`)
      }
    }
    refs.push(`refs/tags/${tag}`)
  }

  if (refs.length > 0) {
    let lastError = ''
    let pushed = false
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      const res = tryGit(['push', '--atomic', 'origin', ...refs])
      if (res.ok) {
        pushed = true
        break
      }
      lastError = res.out
      if (attempt < ATTEMPTS) {
        console.error(
          `push-release-tags: attempt ${attempt}/${ATTEMPTS} failed, retrying in ${DELAY_MS}ms: ${lastError}`,
        )
        sleep(DELAY_MS * attempt)
      }
    }
    if (!pushed) {
      recoveryHint()
      fail(`could not push the release tags after ${ATTEMPTS} attempt(s): ${lastError}`)
    }
  }

  for (const tag of tags) summary(`- \`${tag}\``)
}

main()
