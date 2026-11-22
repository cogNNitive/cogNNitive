'use strict'

/**
 * scripts/lib/regen-writeback.js
 *
 * The push half of the `regen` lane on `main` (`.github/workflows/ci.yml`).
 *
 * `npm run regen` rewrites derived artifacts; this module commits them and lands the commit on
 * `main`. It lives here, not inline in the workflow, because the push is the part that races:
 * two merges landing minutes apart each start a run whose checkout is the commit *that trigger
 * saw*, so the first run's generated commit is behind the branch by the time it is pushed and
 * `git push` rejects it as non-fast-forward.
 *
 * That rejection used to abort the job (`set -euo pipefail`), which skipped `auto-tag` and
 * `release`: the release lane went quiet and nothing said so. The fix is to re-apply the same
 * generated change on the commit that actually arrived and try again, a bounded number of
 * times, and to report exhaustion as a failure rather than as a success with nothing to do.
 *
 * The generated change is re-derived, never replayed: after a rebase the working tree is stale
 * (the generator reads the sources it checked out), so the caller re-runs the pass. Keeping
 * that decision here instead of in the workflow is what makes it testable.
 */

const { execFileSync } = require('node:child_process')

/** Commit subject the lane writes; also the idempotence guard the workflow checks. */
const WRITE_BACK_SUBJECT =
  'chore(regen): regenerate derived artifacts and write back the pending versions'

/**
 * Runs one git command in `cwd`.
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ allowFailure?: boolean }} [options]
 * @returns {{ ok: boolean, stdout: string, error: string }} `error` is empty on success.
 */
function git(cwd, args, options = {}) {
  try {
    const stdout = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, stdout: stdout.trim(), error: '' }
  } catch (error) {
    if (options.allowFailure) {
      const stderr = error.stderr === undefined ? '' : String(error.stderr).trim()
      return { ok: false, stdout: '', error: stderr }
    }
    throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${error.message}`)
  }
}

/**
 * True when a push was refused only because the branch moved forward under us.
 *
 * `git` rejects a stale push with `[rejected] ... (non-fast-forward)` or `(fetch first)` on
 * stderr. Any other rejection — a protected branch, a missing permission, a hook — is a real
 * failure and must not be retried: retrying it hides an authority problem behind a loop.
 *
 * @param {string} stderr
 * @returns {boolean}
 */
function isStalePushRejection(stderr) {
  if (stderr === '') return false
  const text = stderr.toLowerCase()
  const stale = text.includes('non-fast-forward') || text.includes('fetch first')
  const rejected = text.includes('rejected') || text.includes('[remote rejected]')
  return stale && rejected
}

/**
 * True when the working tree has a pending generated change.
 *
 * Untracked scratch files count: the caller stages with `-A`, so a new artifact would otherwise
 * be generated, committed, and then judged as "nothing moved" on the next attempt.
 *
 * @param {string} cwd
 * @returns {boolean}
 */
function hasPendingChange(cwd) {
  return git(cwd, ['status', '--porcelain']).stdout !== ''
}

/**
 * True when HEAD is already the lane's own regeneration commit.
 *
 * The guard makes a re-run of the same push a no-op instead of an empty commit, and stops the
 * retry loop from spinning when the pass reproduces bytes that are already committed.
 *
 * @param {string} cwd
 * @returns {boolean}
 */
function headIsWriteBack(cwd) {
  return git(cwd, ['log', '-1', '--format=%s']).stdout === WRITE_BACK_SUBJECT
}

/**
 * Commits every pending change with the lane's subject.
 * @param {string} cwd
 * @param {{ name: string, email: string }} author
 * @returns {string} the new commit sha.
 */
function commitPendingChange(cwd, author) {
  git(cwd, ['config', 'user.name', author.name])
  git(cwd, ['config', 'user.email', author.email])
  git(cwd, ['add', '-A'])
  git(cwd, ['commit', '-m', WRITE_BACK_SUBJECT])
  return git(cwd, ['rev-parse', 'HEAD']).stdout
}

/**
 * Moves HEAD onto the current remote `main`, keeping the generated change as working-tree edits.
 *
 * `--autostash` is not used on purpose: the caller re-runs the generator afterwards, so a
 * conflicted stash would be a second, worse problem. Resetting to the fetched tip and
 * re-deriving is the only state that is guaranteed consistent, which is why this function
 * reports `rederive: true` and leaves the tree clean.
 *
 * @param {string} cwd
 * @param {string} branch
 * @returns {{ ok: boolean, redrive: boolean, error: string }}
 */
function resetToRemoteBranch(cwd, branch) {
  const fetched = git(cwd, ['fetch', 'origin', `${branch}:refs/remotes/origin/${branch}`], {
    allowFailure: true,
  })
  if (!fetched.ok) {
    return { ok: false, redrive: false, error: fetched.error }
  }
  const reset = git(cwd, ['reset', '--hard', `origin/${branch}`], { allowFailure: true })
  if (!reset.ok) {
    return { ok: false, redrive: false, error: reset.error }
  }
  return { ok: true, redrive: true, error: '' }
}

/**
 * Runs the write-back to completion.
 *
 * `regenerate` is the caller's pass function: it writes the artifacts and returns nothing. It
 * runs once per attempt, because after `resetToRemoteBranch` the tree is the new tip and the
 * bytes must be derived again from it — replaying the old tree would push artifacts built from
 * sources that no longer exist.
 *
 * @param {{
 *   cwd: string,
 *   branch?: string,
 *   author?: { name: string, email: string },
 *   regenerate: () => void,
 *   maxAttempts?: number,
 *   log?: (message: string) => void,
 * }} options
 * @returns {{ status: 'pushed', sha: string, attempts: number }
 *   | { status: 'no-change', attempts: number }
 *   | { status: 'exhausted', attempts: number, error: string }}
 */
function writeBack(options) {
  const cwd = options.cwd
  const branch = options.branch === undefined ? 'main' : options.branch
  const author =
    options.author === undefined
      ? {
          name: 'github-actions[bot]',
          email: '41898282+github-actions[bot]@users.noreply.github.com',
        }
      : options.author
  const maxAttempts = options.maxAttempts === undefined ? 3 : options.maxAttempts
  const log = options.log === undefined ? () => {} : options.log

  if (headIsWriteBack(cwd)) {
    log('the last commit is already a regeneration: nothing to do')
    return { status: 'no-change', attempts: 0 }
  }

  let lastError = ''
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options.regenerate()

    if (!hasPendingChange(cwd)) {
      log('no derived artifact and no pending version moved')
      return { status: 'no-change', attempts: attempt }
    }

    const sha = commitPendingChange(cwd, author)
    const pushed = git(cwd, ['push', 'origin', `HEAD:${branch}`], { allowFailure: true })
    if (pushed.ok) {
      return { status: 'pushed', sha, attempts: attempt }
    }

    if (!isStalePushRejection(pushed.error)) {
      return { status: 'exhausted', attempts: attempt, error: pushed.error }
    }

    lastError = pushed.error
    log(
      `${branch} moved while the artifacts were generated (attempt ${attempt}/${maxAttempts}); ` +
        're-deriving on the new tip',
    )
    const reset = resetToRemoteBranch(cwd, branch)
    if (!reset.ok) {
      return { status: 'exhausted', attempts: attempt, error: reset.error }
    }
  }

  return {
    status: 'exhausted',
    attempts: maxAttempts,
    error: `${branch} kept moving; last rejection: ${lastError}`,
  }
}

module.exports = {
  WRITE_BACK_SUBJECT,
  commitPendingChange,
  hasPendingChange,
  headIsWriteBack,
  isStalePushRejection,
  resetToRemoteBranch,
  writeBack,
}
