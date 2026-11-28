#!/usr/bin/env node
'use strict'

/**
 * scripts/lib/regen-writeback.test.js
 *
 * Behaviour tests for the write-back half of the `regen` lane
 * (`scripts/lib/regen-writeback.js`) and for the workflow wiring that consumes it.
 *
 * Every git case runs git for real against throwaway repositories in the OS temp dir — a
 * `remote` bare repo plus two clones — and asserts through the module's public functions, never
 * its internals. Three regressions are pinned here:
 *
 *  - the lane must never push to `main` (a push to a branch cannot be excepted from branch
 *    protection, so an automated write to `main` is what makes required checks impossible);
 *  - a write-back commit whose parent is no longer `main` must never be proposed, because its
 *    diff against the new tip silently reverts whatever landed in between;
 *  - a second pass over the tree the write-back already landed in must produce nothing, or the
 *    lane opens a pull request forever.
 */

const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const {
  WRITE_BACK_BRANCH,
  WRITE_BACK_SUBJECT,
  hasPendingChange,
  isStalePushRejection,
  leaseArgument,
  planPullRequest,
  regenOutputs,
  remoteBranchSha,
  writeBack,
  writeBackAuthorRefusal,
} = require('./regen-writeback.js')

const repoRoot = path.resolve(__dirname, '..', '..')

/** Runs git in `cwd` and returns trimmed stdout. */
function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

/**
 * A bare `remote` and two clones of it, so a concurrent landing can be simulated exactly:
 * `writer` pushes its write-back commit, `other` lands an unrelated commit or merges the
 * write-back, and the lane has to react to the tip that actually exists.
 */
function makeRig() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-writeback-test-'))
  const remote = path.join(root, 'remote.git')
  const writer = path.join(root, 'writer')
  const other = path.join(root, 'other')

  execFileSync('git', ['init', '--bare', '-b', 'main', remote], { stdio: 'ignore' })

  for (const dir of [writer, other]) {
    execFileSync('git', ['clone', remote, dir], { stdio: 'ignore' })
    git(dir, 'config', 'user.email', 't@test')
    git(dir, 'config', 'user.name', 't')
    git(dir, 'config', 'commit.gpgsign', 'false')
    // Byte-exact working trees: with the Windows default (`autocrlf=true`) a generator that
    // writes the same bytes git just checked out would still read as modified, and the
    // "second pass moves nothing" case would pass or fail on the host rather than on the code.
    git(dir, 'config', 'core.autocrlf', 'false')
  }

  fs.writeFileSync(path.join(writer, 'source.txt'), 'one\n')
  git(writer, 'add', '-A')
  git(writer, 'commit', '-m', 'base')
  git(writer, 'push', 'origin', 'HEAD:main')
  git(other, 'pull', '--quiet', 'origin', 'main')

  return { root, remote, writer, other }
}

/** Writes the derived artifact the "generator" produces. */
function writeArtifact(dir, contents) {
  fs.writeFileSync(path.join(dir, 'artifact.txt'), contents)
}

/** Lands an unrelated commit on `main` from the other clone. */
function landOnMain(rig, name) {
  fs.writeFileSync(path.join(rig.other, `${name}.txt`), `${name}\n`)
  git(rig.other, 'add', '-A')
  git(rig.other, 'commit', '-m', `chore: ${name} landed`)
  git(rig.other, 'push', 'origin', 'HEAD:main')
}

/** Installs a pre-receive hook in the bare remote. */
function preReceive(remote, script) {
  fs.writeFileSync(path.join(remote, 'hooks', 'pre-receive'), `#!/bin/sh\n${script}\n`, {
    mode: 0o755,
  })
}

test('the write-back lands on its branch, and main never receives it', () => {
  const rig = makeRig()
  const result = writeBack({
    cwd: rig.writer,
    regenerate: () => writeArtifact(rig.writer, 'derived\n'),
  })

  assert.equal(result.status, 'pushed')
  assert.equal(result.branch, WRITE_BACK_BRANCH)
  assert.equal(result.replaced, null, 'the branch did not exist before this run')

  // The pull request's commit is there...
  git(rig.other, 'fetch', '--quiet', 'origin', WRITE_BACK_BRANCH)
  assert.equal(git(rig.other, 'show', `origin/${WRITE_BACK_BRANCH}:artifact.txt`), 'derived')
  assert.equal(
    git(rig.other, 'log', '-1', '--format=%s', `origin/${WRITE_BACK_BRANCH}`),
    WRITE_BACK_SUBJECT,
  )
  // ...the branch is exactly one commit ahead of main, so the diff is only the regeneration...
  assert.equal(
    git(rig.other, 'rev-list', '--count', `origin/main..origin/${WRITE_BACK_BRANCH}`),
    '1',
  )
  // ...and main is untouched: no artifact, no regeneration commit.
  git(rig.other, 'fetch', '--quiet', 'origin', 'main')
  assert.throws(() => git(rig.other, 'show', 'origin/main:artifact.txt'))
  assert.doesNotMatch(git(rig.other, 'log', '--format=%s', 'origin/main'), /chore\(regen\)/)
})

test('a merge landing while the artifacts are generated is re-derived, not proposed stale', () => {
  const rig = makeRig()
  let attempts = 0

  const result = writeBack({
    cwd: rig.writer,
    regenerate: () => {
      attempts += 1
      if (attempts === 1) landOnMain(rig, 'meanwhile')
      writeArtifact(rig.writer, `derived at attempt ${attempts}\n`)
    },
    maxAttempts: 3,
  })

  assert.equal(result.status, 'pushed')
  assert.equal(result.attempts, 2, 'the first commit was parented on a tip main had left')

  // The proposed commit sits on the tip that actually won, so merging it reverts nothing.
  git(rig.other, 'fetch', '--quiet', 'origin', WRITE_BACK_BRANCH)
  const proposedParent = git(rig.other, 'rev-parse', `origin/${WRITE_BACK_BRANCH}^`)
  assert.equal(proposedParent, git(rig.other, 'rev-parse', 'origin/main'))
  assert.equal(
    git(rig.other, 'show', `origin/${WRITE_BACK_BRANCH}:artifact.txt`),
    'derived at attempt 2',
  )
})

test('nothing to write back is reported as no-change and leaves no branch behind', () => {
  const rig = makeRig()
  const result = writeBack({ cwd: rig.writer, regenerate: () => {} })

  assert.equal(result.status, 'no-change')
  assert.equal(result.attempts, 1)
  assert.equal(remoteBranchSha(rig.writer, WRITE_BACK_BRANCH), null)
})

test('a second pass over the tree the write-back already landed in pushes nothing', () => {
  const rig = makeRig()
  const first = writeBack({
    cwd: rig.writer,
    regenerate: () => writeArtifact(rig.writer, 'derived\n'),
  })
  assert.equal(first.status, 'pushed')

  // The pull request is merged: the regeneration is now part of main.
  git(rig.other, 'fetch', '--quiet', 'origin', WRITE_BACK_BRANCH)
  git(
    rig.other,
    'merge',
    '--quiet',
    '--no-ff',
    '-m',
    'Merge the write-back',
    `origin/${WRITE_BACK_BRANCH}`,
  )
  git(rig.other, 'push', 'origin', 'HEAD:main')

  const second = writeBack({
    cwd: rig.other,
    regenerate: () => writeArtifact(rig.other, 'derived\n'),
  })

  assert.equal(second.status, 'no-change')
  assert.equal(
    remoteBranchSha(rig.other, WRITE_BACK_BRANCH),
    first.sha,
    'the loop is broken by the second pass finding nothing, not by rewriting the branch',
  )
})

test('a later push replaces the branch instead of stacking a commit on it', () => {
  const rig = makeRig()
  const first = writeBack({
    cwd: rig.writer,
    regenerate: () => writeArtifact(rig.writer, 'derived at the first tip\n'),
  })
  assert.equal(first.status, 'pushed')

  landOnMain(rig, 'a later merge')

  const second = writeBack({
    cwd: rig.writer,
    regenerate: () => writeArtifact(rig.writer, 'derived at the second tip\n'),
  })

  assert.equal(second.status, 'pushed')
  assert.equal(second.replaced, first.sha)
  git(rig.other, 'fetch', '--quiet', 'origin', WRITE_BACK_BRANCH)
  assert.equal(
    git(rig.other, 'rev-list', '--count', 'origin/main..origin/chore/regen'),
    '1',
    'the branch is rebuilt from the new tip, never one write-back commit per push',
  )
  assert.equal(
    git(rig.other, 'show', `origin/${WRITE_BACK_BRANCH}:artifact.txt`),
    'derived at the second tip',
  )
})

test('a stale lease is retried: a concurrent run rebuilt the branch first', () => {
  const rig = makeRig()

  // A pre-receive hook that answers the first push the way git answers a lease that no longer
  // matches: the branch moved between `ls-remote` and the push.
  const counter = path.join(rig.root, 'pushes')
  fs.writeFileSync(counter, '0')
  preReceive(
    rig.remote,
    [
      `n=$(cat ${JSON.stringify(counter)} 2>/dev/null || echo 0)`,
      'n=$((n+1))',
      `echo $n > ${JSON.stringify(counter)}`,
      'if [ "$n" -eq 1 ]; then',
      '  echo " ! [rejected]        HEAD -> chore/regen (stale info)" >&2',
      '  exit 1',
      'fi',
      'exit 0',
    ].join('\n'),
  )

  const result = writeBack({
    cwd: rig.writer,
    regenerate: () => writeArtifact(rig.writer, 'derived\n'),
    maxAttempts: 3,
  })

  assert.equal(result.status, 'pushed')
  assert.equal(result.attempts, 2)
})

test('a rejection that is not a moved ref is not retried', () => {
  const rig = makeRig()
  let attempts = 0

  // Make the remote refuse every push for a reason retrying cannot fix: a pre-receive hook
  // that rejects everything stands in for a missing permission or a hook.
  preReceive(rig.remote, 'echo "denied by policy" >&2\nexit 1')

  const result = writeBack({
    cwd: rig.writer,
    regenerate: () => {
      attempts += 1
      writeArtifact(rig.writer, 'derived\n')
    },
    maxAttempts: 3,
  })

  assert.equal(result.status, 'exhausted')
  assert.equal(attempts, 1, 'a policy rejection must not be retried: the loop would hide it')
})

test('exhausting the attempts is a failure, never a quiet success', () => {
  const rig = makeRig()
  let attempts = 0

  const result = writeBack({
    cwd: rig.writer,
    regenerate: () => {
      attempts += 1
      // Every attempt loses the branch again, so the bound is the only thing that ends it.
      landOnMain(rig, `landing-${attempts}`)
      writeArtifact(rig.writer, `derived at attempt ${attempts}\n`)
    },
    maxAttempts: 2,
  })

  assert.equal(result.status, 'exhausted')
  assert.equal(attempts, 2)
  assert.match(result.error, /kept moving/)
})

test('isStalePushRejection separates a moved ref from a policy refusal', () => {
  assert.equal(
    isStalePushRejection(' ! [rejected]        HEAD -> chore/regen (non-fast-forward)'),
    true,
  )
  assert.equal(isStalePushRejection(' ! [rejected]        HEAD -> main (fetch first)'), true)
  assert.equal(isStalePushRejection(' ! [rejected]        HEAD -> chore/regen (stale info)'), true)
  assert.equal(isStalePushRejection('remote: error: GH006: Protected branch update failed'), false)
  assert.equal(isStalePushRejection('denied by policy'), false)
  assert.equal(isStalePushRejection(''), false)
})

test('the lease asserts absence for a new branch and the exact sha it expects otherwise', () => {
  assert.equal(leaseArgument('chore/regen', null), '--force-with-lease=refs/heads/chore/regen:')
  assert.equal(
    leaseArgument('chore/regen', 'abc123'),
    '--force-with-lease=refs/heads/chore/regen:abc123',
  )
})

test('planPullRequest opens one pull request, then reuses it', () => {
  assert.equal(planPullRequest({ hasPending: true, openNumber: null }), 'create')
  assert.equal(planPullRequest({ hasPending: true, openNumber: 12 }), 'reuse')
  assert.equal(planPullRequest({ hasPending: false, openNumber: null }), 'skip')
  // A pull request left open by an earlier cycle is not closed from here: two runs overlap, and
  // the second one rebuilds the branch the first opened.
  assert.equal(planPullRequest({ hasPending: false, openNumber: 12 }), 'skip')
})

test('the pending output is the exact string the workflow compares against', () => {
  assert.deepEqual(regenOutputs({ hasPending: true }), { pending: 'true', branch: 'chore/regen' })
  assert.deepEqual(regenOutputs({ hasPending: false }), { pending: 'false', branch: 'chore/regen' })
})

test('hasPendingChange sees a new untracked artifact', () => {
  const rig = makeRig()
  assert.equal(hasPendingChange(rig.writer), false)
  writeArtifact(rig.writer, 'new\n')
  assert.equal(hasPendingChange(rig.writer), true)
})

test('a write-back pull request authored by the automation is refused, naming the credential', () => {
  // A pull request opened with GITHUB_TOKEN is authored by app/github-actions; GitHub holds its
  // pull_request run for approval, so the five required checks never report and the ruleset
  // refuses the merge. The lane has to say so instead of reporting pending as progress.
  assert.match(String(writeBackAuthorRefusal('app/github-actions')), /REGEN_PR_TOKEN/)
  assert.match(String(writeBackAuthorRefusal('dependabot[bot]')), /REGEN_PR_TOKEN/)
  assert.equal(writeBackAuthorRefusal('lucas'), null)
})

test('an unreadable author is refused instead of assumed mergeable', () => {
  assert.match(String(writeBackAuthorRefusal(null)), /no resolvable author/)
  assert.match(String(writeBackAuthorRefusal('')), /no resolvable author/)
  assert.match(String(writeBackAuthorRefusal(undefined)), /no resolvable author/)
})

test('the workflow wires the lane: pending gates auto-tag, and nothing pushes to main', () => {
  const workflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8')

  // `regen` has to publish both outputs from the step that owns the decision.
  assert.match(
    workflow,
    /pending: \$\{\{ steps\.writeback\.outputs\.pending \}\}/,
    'regen must expose the pending output',
  )
  assert.match(
    workflow,
    /branch: \$\{\{ steps\.writeback\.outputs\.branch \}\}/,
    'regen must expose the branch output',
  )
  // Opening and listing the write-back pull request needs the pull-requests permission.
  assert.match(workflow, /pull-requests: write/, 'regen must be allowed to open its pull request')
  // The pull request must be opened by a maintainer identity. Opened with GITHUB_TOKEN it is
  // authored by app/github-actions, GitHub holds its run for approval, the required checks never
  // report and the ruleset refuses the merge — the release then stalls behind it, silently.
  assert.match(
    workflow,
    /GH_TOKEN: \$\{\{ secrets\.REGEN_PR_TOKEN \}\}/,
    'the write-back must be opened with the maintainer token',
  )
  assert.doesNotMatch(
    workflow,
    /GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/,
    'GITHUB_TOKEN authors the write-back as app/github-actions, which is never checked',
  )
  assert.match(
    workflow,
    /REGEN_PR_TOKEN is not set/,
    'the lane must fail loudly when the maintainer token is missing',
  )
  // The tag must wait for the write-back: `auto-tag` reads exactly the value `regenOutputs` sets.
  assert.match(
    workflow,
    /needs\.regen\.outputs\.pending != 'true'/,
    'auto-tag must be skipped while the write-back is pending',
  )
  // The reason the whole change exists: no automated direct push to main is left in the pipeline.
  assert.doesNotMatch(workflow, /HEAD:main/, 'nothing in CI may push to main')
})
