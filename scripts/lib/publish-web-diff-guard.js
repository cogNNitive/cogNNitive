/**
 * scripts/lib/publish-web-diff-guard.js
 *
 * Refuses a site publish whose computed diff would delete more of the public
 * repository than a publish ever legitimately deletes.
 *
 * Why this exists (run 45843892753, 2026-11-26):
 *
 *   publish-web: site → 0 added, 0 modified, 405 removed.
 *
 * The docs build produced nothing, and the publisher was one step from deleting
 * the public site. Only an unrelated `git pull --rebase` conflict stopped it, so
 * the guard is not a precaution — it is the check that would have made the
 * failure loud instead of near-fatal.
 *
 * Two independent rules, because they catch different accidents:
 *
 * 1. **An empty artifact deletes everything.** `replaceSiteTree` removes the
 *    target tree before copying, so a build that produced zero files is a
 *    full-site deletion. This is checked on the artifact, not on the diff, so it
 *    fires even when the mirror is already empty.
 * 2. **A large removal is not a publish.** A normal publish removes single
 *    digits: a renamed page, a retired section. Hundreds is a broken build or a
 *    wiped checkout.
 *
 * Release-owned and public-owned paths are excluded from the count: `replaceSiteTree`
 * preserves them, so counting them would make every publish after a release look
 * destructive. `assertNoReleaseOwnedInArtifact` guarantees the artifact never carries
 * them, which means they always appear in `removed` while never actually being deleted.
 */

const { PublishError } = require('./publish-web-git.js')
const { DEFAULT_PRESERVE, isReleaseOwnedPath } = require('./publish-web-tree.js')

/**
 * Removals a normal publish may carry. Measured against the observed failure: a
 * healthy publish removes single digits, the broken one computed 405.
 */
const DEFAULT_MAX_REMOVALS = 25

/** How many paths the refusal names before summarizing the rest. */
const SAMPLE_SIZE = 8

/**
 * True when `replaceSiteTree` would restore this target path instead of deleting it.
 *
 * @param {string} relPath posix path relative to the site root
 * @returns {boolean}
 */
function preservedOnReplace(relPath) {
  const norm = relPath.replace(/\\/g, '/').replace(/^\/+/, '')
  return DEFAULT_PRESERVE.includes(norm) || isReleaseOwnedPath(norm)
}

/**
 * The removals that would really delete a file from the public repository.
 *
 * @param {{ removed: string[] }} siteDiff
 * @returns {string[]}
 */
function destructiveRemovals(siteDiff) {
  return siteDiff.removed.filter((rel) => !preservedOnReplace(rel))
}

/**
 * Resolves the removal ceiling. An operator who intends a large deletion sets
 * `WEB_PUBLISH_MAX_REMOVALS` in the job, where the change is reviewable — there is
 * no automatic override and no way to disable the guard from an artifact.
 *
 * @param {number|string|null|undefined} value
 * @returns {number}
 */
function resolveMaxRemovals(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_MAX_REMOVALS
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new PublishError(
      `publish-web: WEB_PUBLISH_MAX_REMOVALS must be a non-negative number, got ${JSON.stringify(value)}`,
    )
  }
  return Math.floor(parsed)
}

/**
 * Derives the `files` count from a site diff when the caller has no tree count:
 * `added` plus `modified` undercounts (unchanged files are in neither), so callers
 * must pass the real artifact size when they have it.
 *
 * @param {{ added: string[], modified: string[] }} siteDiff
 * @returns {number}
 */
function changedFileCount(siteDiff) {
  return siteDiff.added.length + siteDiff.modified.length
}

/**
 * Throws when publishing this diff would be destructive or when the artifact is empty.
 * Pure: reads nothing, mutates nothing, so it can run before any clone is touched.
 *
 * @param {object} input
 * @param {{ added: string[], modified: string[], removed: string[] }} input.siteDiff
 * @param {number} input.sourceFileCount files in the built artifact
 * @param {number|string} [input.maxRemovals] overrides DEFAULT_MAX_REMOVALS
 * @param {string} [input.subdir] target subdirectory, for the message only
 * @returns {number} the destructive removal count that was allowed
 */
function assertNotDestructive(input) {
  const { siteDiff, sourceFileCount } = input
  const subdir = input.subdir || 'docs'
  const maxRemovals = resolveMaxRemovals(input.maxRemovals)

  if (sourceFileCount === 0) {
    throw new PublishError(
      `publish-web: refusing to publish — the built site has 0 files, so this publish would delete all ${siteDiff.removed.length} file(s) under '${subdir}' in the target repository. ` +
        'This is what a failed or skipped `npm run build:docs` produces. Nothing was pushed.',
    )
  }

  const deletions = destructiveRemovals(siteDiff)
  if (deletions.length <= maxRemovals) return deletions.length

  const sample = deletions.slice(0, SAMPLE_SIZE).join(', ')
  const more = deletions.length > SAMPLE_SIZE ? `, … ${deletions.length - SAMPLE_SIZE} more` : ''
  throw new PublishError(
    `publish-web: refusing to publish — this publish would delete ${deletions.length} file(s) from '${subdir}' in the target repository (limit ${maxRemovals}). ` +
      `Nothing was pushed. First removals: ${sample}${more}. ` +
      'Rebuild with `npm run build:docs` and check the artifact; if the removal is intentional, set WEB_PUBLISH_MAX_REMOVALS to at least ' +
      `${deletions.length} in the publish job.`,
  )
}

module.exports = {
  DEFAULT_MAX_REMOVALS,
  SAMPLE_SIZE,
  assertNotDestructive,
  changedFileCount,
  destructiveRemovals,
  preservedOnReplace,
  resolveMaxRemovals,
}
