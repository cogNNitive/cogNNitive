'use strict'

/**
 * scripts/lib/shared-artifacts.js
 *
 * The paths every change rewrites, so an overlap on one of them is mechanical and
 * not a coordination failure. Measured over the 19-20 Nov batch (30 merged PRs):
 * 89 files were touched by two or more PRs, and the eight most shared ones were all
 * in this list — `catalog.json` in 17 PRs, the mcp bundle and the console export in
 * 15, the three `package.json` files in 14, 14 and 13.
 *
 * Two callers depend on this list:
 *   - `scripts/pr-overlap.mjs` reports a shared path as mechanical instead of
 *     blocking, because a rebase and a regenerated artifact is the whole fix;
 *   - the pre-commit and post-merge regeneration lane needs the same set to know
 *     what may move without a human.
 *
 * A path belongs here only when *every* change to it is a side effect of a source
 * change elsewhere. A tracker, a test or a source file does not belong here, however
 * hot it is: on those, an overlap means two sessions are editing the same decision.
 */

/**
 * @typedef {{ label: string, test: (posixPath: string) => boolean }} SharedArtifact
 * @type {SharedArtifact[]}
 */
const SHARED_ARTIFACTS = [
  {
    label: 'version metadata',
    test: (p) => p === 'package-lock.json' || /(^|\/)package\.json$/.test(p),
  },
  {
    label: 'build bundle',
    test: (p) => /\.bundle\.(js|cjs|mjs)$/.test(p),
  },
  {
    label: 'generated module',
    test: (p) => /\.generated\.(cjs|js|mjs|ts)$/.test(p),
  },
  {
    label: 'blueprint catalog',
    test: (p) => /(^|\/)catalog\.json$/.test(p),
  },
  {
    label: 'console export',
    test: (p) =>
      p === 'test/fixtures/testlab/domaiNN_console.html' || /(^|\/)artifact_shell\.html$/.test(p),
  },
]

/** Windows checkouts hand back backslashes; every comparison here is POSIX. */
const toPosix = (path) => String(path).replace(/\\/g, '/')

/**
 * The mechanical label for a path, or `null` when a change to it is hand-authored.
 *
 * @param {string} path - repository-relative path, either separator style.
 * @returns {string | null}
 */
function sharedArtifactLabel(path) {
  const posix = toPosix(path)
  const hit = SHARED_ARTIFACTS.find((entry) => entry.test(posix))
  return hit ? hit.label : null
}

module.exports = { SHARED_ARTIFACTS, sharedArtifactLabel, toPosix }
