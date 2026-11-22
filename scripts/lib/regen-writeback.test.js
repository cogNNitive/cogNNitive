#!/usr/bin/env node
'use strict'

/**
 * scripts/lib/regen-writeback.test.js
 *
 * Behaviour tests for the push half of the `regen` lane (`scripts/lib/regen-writeback.js`).
 *
 * Every case runs git for real against throwaway repositories in the OS temp dir — a `remote`
 * bare repo plus a clone — and asserts through the module's public functions, never its
 * internals. The regression this pins is the one that disabled `auto-tag` and `release`: a
 * second merge landed on `main` while the lane generated its commit, `git push` was rejected
 * as non-fast-forward, and the job aborted instead of re-deriving on the new tip.
 */

const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const {
  WRITE_BACK_SUBJECT,
  hasPendingChange,
  headIsWriteBack,
  isStalePushRejection,
  writeBack,
} = require('./regen-writeback.js')

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
 * `writer` pushes its generated commit, `other` pushes an unrelated commit to the same
 * branch, and `writer`'s next push is stale.
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

test('a concurrent landing between generation and push still lands the artifact', () => {
  const rig = makeRig()
  let attempts = 0

  const result = writeBack({
    cwd: rig.writer,
    regenerate: () => {
      attempts += 1
      if (attempts === 1) {
        // Land an unrelated commit from the other clone, so our push is behind.
        fs.writeFileSync(path.join(rig.other, 'unrelated.txt'), 'landed meanwhile\n')
        git(rig.other, 'add', '-A')
        git(rig.other, 'commit', '-m', 'chore: something else landed')
        git(rig.other, 'push', 'origin', 'HEAD:main')
      }
      writeArtifact(rig.writer, `derived at attempt ${attempts}\n`)
    },
    maxAttempts: 3,
  })

  assert.equal(result.status, 'pushed')
  assert.equal(result.attempts, 2)

  // main now carries both commits, and the artifact was derived from the tip that won.
  git(rig.other, 'fetch', '--quiet', 'origin', 'main')
  const tipArtifact = git(rig.other, 'show', 'origin/main:artifact.txt')
  assert.equal(tipArtifact, 'derived at attempt 2')

  const log = git(rig.other, 'log', '--format=%s', 'origin/main')
  assert.match(log, /chore: something else landed/)
  assert.match(log, new RegExp(WRITE_BACK_SUBJECT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('nothing to write back is reported as no-change, not as a failure', () => {
  const rig = makeRig()
  const result = writeBack({ cwd: rig.writer, regenerate: () => {} })

  assert.equal(result.status, 'no-change')
  assert.equal(result.attempts, 1)
})

test('a re-run over the lane own commit is a no-op', () => {
  const rig = makeRig()
  writeArtifact(rig.writer, 'derived\n')
  const first = writeBack({
    cwd: rig.writer,
    regenerate: () => writeArtifact(rig.writer, 'derived\n'),
  })
  assert.equal(first.status, 'pushed')

  git(rig.writer, 'pull', '--quiet', 'origin', 'main')
  const second = writeBack({
    cwd: rig.writer,
    regenerate: () => writeArtifact(rig.writer, 'derived\n'),
  })
  assert.equal(second.status, 'no-change')
  assert.equal(second.attempts, 0)
  assert.equal(headIsWriteBack(rig.writer), true)
})

test('a rejection that is not a stale branch is not retried', () => {
  const rig = makeRig()
  let attempts = 0

  // Make the remote refuse every push for a reason retrying cannot fix: a pre-receive hook
  // that rejects everything stands in for a protected branch or a missing permission.
  const hookPath = path.join(rig.remote, 'hooks', 'pre-receive')
  fs.writeFileSync(hookPath, '#!/bin/sh\necho "denied by policy" >&2\nexit 1\n', { mode: 0o755 })

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
      fs.writeFileSync(path.join(rig.other, `landing-${attempts}.txt`), 'x\n')
      git(rig.other, 'add', '-A')
      git(rig.other, 'commit', '-m', `chore: landing ${attempts}`)
      git(rig.other, 'push', 'origin', 'HEAD:main')
      writeArtifact(rig.writer, `derived at attempt ${attempts}\n`)
    },
    maxAttempts: 2,
  })

  assert.equal(result.status, 'exhausted')
  assert.equal(attempts, 2)
  assert.match(result.error, /kept moving/)
})

test('isStalePushRejection separates a moved branch from a policy refusal', () => {
  assert.equal(isStalePushRejection(' ! [rejected]        HEAD -> main (non-fast-forward)'), true)
  assert.equal(isStalePushRejection(' ! [rejected]        HEAD -> main (fetch first)'), true)
  assert.equal(isStalePushRejection('remote: error: GH006: Protected branch update failed'), false)
  assert.equal(isStalePushRejection('denied by policy'), false)
  assert.equal(isStalePushRejection(''), false)
})

test('hasPendingChange sees a new untracked artifact', () => {
  const rig = makeRig()
  assert.equal(hasPendingChange(rig.writer), false)
  writeArtifact(rig.writer, 'new\n')
  assert.equal(hasPendingChange(rig.writer), true)
})
