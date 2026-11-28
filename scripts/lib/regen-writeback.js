'use strict'

/**
 * scripts/lib/regen-writeback.js
 *
 * The write-back half of the `regen` lane on `main` (`.github/workflows/ci.yml`).
 *
 * `npm run regen` rewrites derived artifacts; this module commits them and lands them on a
 * branch. It lives here, not inline in the workflow, because three decisions inside it are
 * the ones that go wrong silently, and a YAML file cannot pin any of them:
 *
 *  - which branch the write-back lands on (`WRITE_BACK_BRANCH`, never `main`), so the branch
 *    protection on `main` has no automated writer to except;
 *  - whether a pull request has to be opened, reused, or left alone (`planPullRequest`), so a
 *    later push refreshes the one pull request instead of stacking a duplicate or failing
 *    because it already exists;
 *  - what the job reports (`regenOutputs`), which is the `pending` flag `auto-tag` reads.
 *
 * The push is also the part that races: two merges landing minutes apart each start a run whose
 * checkout is the commit *that trigger saw*. The write-back commit is therefore rebuilt on the
 * tip that actually exists and force-pushed with a lease, and a rejection that says the branch
 * moved re-derives instead of aborting the job.
 *
 * Two constraints shape the tree it publishes, and both are older than this module:
 *  - the commit must land before the tag, because the release copies the tag's tree, so a
 *    write-back that lands after `auto-tag` ships the stale artifacts (release-writeback S2);
 *  - the regeneration must reach a fixed point, or the lane opens a pull request forever. It
 *    does: `write-pending-versions` writes a version only when the file does not already carry
 *    it, and `npm run regen` writes only committed artifacts whose sources moved. The tag-derived
 *    catalog is not rewritten by the write pass at all (`WRITE_SKIPS` in scripts/regen.js).
 */

const { execFileSync } = require('node:child_process')

/** Commit subject the lane writes; also the title of the pull request it opens. */
const WRITE_BACK_SUBJECT =
  'chore(regen): regenerate derived artifacts and write back the pending versions'

/**
 * Branch the write-back lands on.
 *
 * Not `main`: a push to `main` is the only automated direct write this repository had, and it is
 * what made `main` impossible to require checks on — there is no bypass actor for Actions on this
 * repository, so the automation has to stop writing to the branch instead of being excepted.
 */
const WRITE_BACK_BRANCH = 'chore/regen'

/** Branch the write-back is proposed against. */
const WRITE_BACK_BASE = 'main'

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
 * True when a push was refused only because the ref it targeted moved under us.
 *
 * Two texts mean that with the lease this module pushes under:
 *  - `(non-fast-forward)` / `(fetch first)` when the branch moved forward, and
 *  - `(stale info)` when the expected value of `--force-with-lease` no longer matches, which is
 *    the same situation seen by a force push: a concurrent run already rebuilt the branch.
 *
 * Any other rejection — a protected branch, a missing permission, a hook — is a real failure and
 * must not be retried: retrying it hides an authority problem behind a loop.
 *
 * @param {string} stderr
 * @returns {boolean}
 */
function isStalePushRejection(stderr) {
  if (stderr === '') return false
  const text = stderr.toLowerCase()
  const stale =
    text.includes('non-fast-forward') || text.includes('fetch first') || text.includes('stale info')
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
 * The sha the write-back branch currently points at, or `null` when it does not exist.
 *
 * Read from the remote rather than from a remote-tracking ref: the value is the lease the push
 * in `writeBack` is conditioned on, so it has to be what the remote says now, not what the last
 * fetch happened to leave behind. A branch deleted by `deleteBranchOnMerge` reads as `null`,
 * which is the ordinary case after the write-back pull request landed.
 *
 * @param {string} cwd
 * @param {string} branch
 * @returns {string|null}
 */
function remoteBranchSha(cwd, branch) {
  const result = git(cwd, ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], {
    allowFailure: true,
  })
  if (!result.ok || result.stdout === '') return null
  const [sha] = result.stdout.split(/\s+/)
  return sha === '' || sha === undefined ? null : sha
}

/**
 * Builds the lease argument for `git push`.
 *
 * `--force-with-lease=<ref>:<expect>` with an empty `<expect>` asserts the ref does not exist,
 * which is what makes "create the branch" and "replace the branch" one code path: a concurrent
 * run that created or rebuilt it in between rejects the push instead of being overwritten.
 *
 * @param {string} branch
 * @param {string|null} expected current remote sha, or null when the branch must not exist
 * @returns {string}
 */
function leaseArgument(branch, expected) {
  return `--force-with-lease=refs/heads/${branch}:${expected === null ? '' : expected}`
}

/**
 * Fetches `branch` from origin and returns the sha it points at now.
 * @param {string} cwd
 * @param {string} branch
 * @returns {{ ok: boolean, sha: string, error: string }}
 */
function fetchOriginBranch(cwd, branch) {
  const fetched = git(cwd, ['fetch', 'origin', `${branch}:refs/remotes/origin/${branch}`], {
    allowFailure: true,
  })
  if (!fetched.ok) return { ok: false, sha: '', error: fetched.error }
  return {
    ok: true,
    sha: git(cwd, ['rev-parse', `refs/remotes/origin/${branch}`]).stdout,
    error: '',
  }
}

/**
 * Puts HEAD on the current remote `base`, reporting whether that moved it.
 *
 * `--autostash` is not used on purpose: the caller re-runs the generator afterwards, so a
 * conflicted stash would be a second, worse problem. Resetting to the fetched tip and
 * re-deriving is the only state that is guaranteed consistent.
 *
 * This is not only the retry path. A run's checkout is the commit its trigger saw, which is not
 * necessarily the tip: `main` is never cancelled by the concurrency group (every `main` commit
 * keeps its gate), so a queued run can start on a commit that has already been superseded.
 *
 * @param {string} cwd
 * @param {string} branch
 * @returns {{ ok: boolean, moved: boolean, sha: string, error: string }}
 */
function syncToRemoteBranch(cwd, branch) {
  const tip = fetchOriginBranch(cwd, branch)
  if (!tip.ok) return { ok: false, moved: false, sha: '', error: tip.error }

  const head = git(cwd, ['rev-parse', 'HEAD'], { allowFailure: true })
  if (head.ok && head.stdout === tip.sha) return { ok: true, moved: false, sha: tip.sha, error: '' }

  const reset = git(cwd, ['reset', '--hard', tip.sha], { allowFailure: true })
  if (!reset.ok) return { ok: false, moved: false, sha: '', error: reset.error }
  return { ok: true, moved: true, sha: tip.sha, error: '' }
}

/**
 * Runs the write-back to the branch, never to `main`.
 *
 * `regenerate` is the caller's pass function: it writes the artifacts and returns nothing. It
 * runs once per attempt, because after `syncToRemoteBranch` the tree is the new tip and the bytes
 * must be derived again from it — replaying the old tree would push artifacts built from sources
 * that no longer exist.
 *
 * A push to a branch cannot be rejected by `main` moving, which is why the base is verified
 * *after* the push: a write-back commit whose parent is no longer `main` carries a diff against
 * the new tip that silently reverts whatever landed in between. The lease covers the branch, the
 * parent check covers the base, and a mismatch re-derives instead of proposing that commit.
 *
 * @param {{
 *   cwd: string,
 *   base?: string,
 *   branch?: string,
 *   author?: { name: string, email: string },
 *   regenerate: () => void,
 *   maxAttempts?: number,
 *   log?: (message: string) => void,
 * }} options
 * @returns {{ status: 'pushed', sha: string, base: string, branch: string, replaced: string|null, attempts: number }
 *   | { status: 'no-change', attempts: number }
 *   | { status: 'exhausted', attempts: number, error: string }}
 */
function writeBack(options) {
  const cwd = options.cwd
  const base = options.base === undefined ? WRITE_BACK_BASE : options.base
  const branch = options.branch === undefined ? WRITE_BACK_BRANCH : options.branch
  const author =
    options.author === undefined
      ? {
          name: 'github-actions[bot]',
          email: '41898282+github-actions[bot]@users.noreply.github.com',
        }
      : options.author
  const maxAttempts = options.maxAttempts === undefined ? 3 : options.maxAttempts
  const log = options.log === undefined ? () => {} : options.log

  let lastError = ''
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const synced = syncToRemoteBranch(cwd, base)
    if (!synced.ok) {
      return { status: 'exhausted', attempts: attempt, error: synced.error }
    }
    if (synced.moved) {
      log(
        `${base} moved since this run checked out (attempt ${attempt}/${maxAttempts}); ` +
          're-deriving on the new tip',
      )
    }

    options.regenerate()

    if (!hasPendingChange(cwd)) {
      log('no derived artifact and no pending version moved')
      return { status: 'no-change', attempts: attempt }
    }

    const replaced = remoteBranchSha(cwd, branch)
    const sha = commitPendingChange(cwd, author)
    const pushed = git(
      cwd,
      ['push', leaseArgument(branch, replaced), 'origin', `HEAD:refs/heads/${branch}`],
      { allowFailure: true },
    )
    if (!pushed.ok) {
      if (!isStalePushRejection(pushed.error)) {
        return { status: 'exhausted', attempts: attempt, error: pushed.error }
      }
      lastError = pushed.error
      log(
        `${branch} moved while the artifacts were generated (attempt ` +
          `${attempt}/${maxAttempts}); re-deriving on the new tip`,
      )
      continue
    }

    const parent = git(cwd, ['rev-parse', 'HEAD^']).stdout
    const tip = fetchOriginBranch(cwd, base)
    if (!tip.ok) {
      return { status: 'exhausted', attempts: attempt, error: tip.error }
    }
    if (tip.sha !== parent) {
      lastError = `${base} moved to ${tip.sha} while ${sha} was generated`
      log(`${lastError} (attempt ${attempt}/${maxAttempts}); re-deriving on the new tip`)
      continue
    }

    return {
      status: 'pushed',
      sha,
      base: synced.sha,
      branch,
      replaced,
      attempts: attempt,
    }
  }

  return {
    status: 'exhausted',
    attempts: maxAttempts,
    error: `${base} or ${branch} kept moving; last rejection: ${lastError}`,
  }
}

/**
 * What the lane does with the pull request that proposes the write-back.
 *
 * `reuse` is not "do nothing": the push that reported it has already updated the open pull
 * request in place, which is the whole point — a second one would be a duplicate of the same
 * regenerated tree, and `gh pr create` would refuse it anyway, turning an ordinary second merge
 * into a red job.
 *
 * `skip` covers two states on purpose: nothing to write, and nothing to write while an earlier
 * pull request is still open. That pull request is obsolete, but closing it from here races a
 * concurrent run that is opening it (two merges can overlap, and the second run rebuilds the
 * branch it already found), so the stale pull request is left visible to the maintainer instead
 * of being closed behind its back.
 *
 * @param {{ hasPending: boolean, openNumber: number|null }} input
 * @returns {'skip'|'create'|'reuse'}
 */
function planPullRequest({ hasPending, openNumber }) {
  if (!hasPending) return 'skip'
  return openNumber === null ? 'create' : 'reuse'
}

/**
 * The `regen` job's outputs.
 *
 * `pending` is `'true'` while a write-back pull request is open, which is exactly when `main`
 * does not yet carry the derived artifacts and the derived version. `auto-tag` reads it: the tag
 * must point at the tree that carries the versions, so tagging waits for that pull request to
 * land. The values are strings with no other spelling, because the workflow compares them.
 *
 * @param {{ hasPending: boolean, branch?: string }} input
 * @returns {{ pending: 'true'|'false', branch: string }}
 */
function regenOutputs({ hasPending, branch }) {
  return {
    pending: hasPending ? 'true' : 'false',
    branch: branch === undefined ? WRITE_BACK_BRANCH : branch,
  }
}

/**
 * The GitHub App identity that authors a pull request opened with the workflow token.
 */
const AUTOMATION_AUTHOR = 'app/github-actions'

/**
 * Why a write-back pull request with this author can never land, or `null` when it can.
 *
 * A pull request opened with `GITHUB_TOKEN` is authored by `app/github-actions`. GitHub holds
 * that author's `pull_request` run for approval, so the five checks the `main` ruleset requires
 * never report, the merge is refused by the ruleset, and `auto-tag` waits behind a pull request
 * nobody can land — while the `regen` job itself finishes green. The lane therefore reads the
 * author it actually got instead of trusting the credential that opened it.
 *
 * @param {string|null} login the pull request author's login, or null when it could not be read
 * @returns {string|null} a refusal naming the fix, or null when the pull request can land
 */
function writeBackAuthorRefusal(login) {
  if (typeof login !== 'string' || login === '') {
    return (
      'the write-back pull request has no resolvable author, so the checks it needs cannot be ' +
      'proven to run; refusing to report a pending write-back that may be unmergeable'
    )
  }
  if (login === AUTOMATION_AUTHOR || login.endsWith('[bot]')) {
    return (
      `the write-back pull request is authored by ${login}, whose pull_request run GitHub holds ` +
      'for approval: the required checks never report and the ruleset refuses the merge. Open it ' +
      'with a maintainer token (REGEN_PR_TOKEN) that has contents:write and pull-requests:write.'
    )
  }
  return null
}

module.exports = {
  AUTOMATION_AUTHOR,
  WRITE_BACK_SUBJECT,
  WRITE_BACK_BRANCH,
  WRITE_BACK_BASE,
  commitPendingChange,
  fetchOriginBranch,
  hasPendingChange,
  isStalePushRejection,
  leaseArgument,
  planPullRequest,
  regenOutputs,
  remoteBranchSha,
  syncToRemoteBranch,
  writeBack,
  writeBackAuthorRefusal,
}
