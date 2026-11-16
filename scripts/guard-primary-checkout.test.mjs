#!/usr/bin/env node

/**
 * scripts/guard-primary-checkout.test.mjs
 *
 * The guard decides "primary vs worktree" from one fact: `.git` is a directory in
 * the primary checkout and a file in a linked worktree. Fixtures live in the OS
 * temp dir, so the suite never touches this repository's own git state.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { findGitDir, guard, isPrimaryCheckout } from './guard-primary-checkout.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const GUARD = path.join(SCRIPT_DIR, 'guard-primary-checkout.mjs')

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'guard-primary-test-'))
}

/** A directory shaped like a primary checkout: `.git` is a directory. */
function primaryCheckout() {
  const root = tempRoot()
  fs.mkdirSync(path.join(root, '.git'), { recursive: true })
  return root
}

/** A directory shaped like a linked worktree: `.git` is a file. */
function linkedWorktree() {
  const root = tempRoot()
  fs.writeFileSync(path.join(root, '.git'), 'gitdir: /elsewhere/.git/worktrees/x\n')
  return root
}

/** A stderr double: records what the guard wrote, and reports success like a stream. */
function captureStderr(writes) {
  return {
    write: (chunk) => {
      writes.push(chunk)
      return true
    },
  }
}

test('findGitDir walks up from a nested path', () => {
  const root = primaryCheckout()
  const nested = path.join(root, 'scripts', 'lib')
  fs.mkdirSync(nested, { recursive: true })
  assert.strictEqual(findGitDir(nested), path.join(root, '.git'))
})

test('findGitDir returns null outside a repository', () => {
  assert.strictEqual(findGitDir(tempRoot()), null)
})

test('a .git directory is the primary checkout', () => {
  assert.strictEqual(isPrimaryCheckout(primaryCheckout()), true)
})

test('a .git file is a linked worktree', () => {
  assert.strictEqual(isPrimaryCheckout(linkedWorktree()), false)
})

test('a path outside any repository is not the primary checkout', () => {
  assert.strictEqual(isPrimaryCheckout(tempRoot()), false)
})

test('guard blocks the primary checkout and names the refused action', () => {
  const writes = []
  const code = guard('commit', { cwd: primaryCheckout(), stderr: captureStderr(writes) })

  assert.strictEqual(code, 1)
  assert.match(writes.join(''), /BLOCKED: commit in the primary checkout/)
  assert.match(writes.join(''), /nn-session\.mjs start/)
})

test('guard allows a linked worktree silently', () => {
  const writes = []
  const code = guard('commit', { cwd: linkedWorktree(), stderr: captureStderr(writes) })

  assert.strictEqual(code, 0)
  assert.deepStrictEqual(writes, [])
})

test('the CLI exits 1 in a primary checkout and 0 in a worktree', () => {
  const blocked = spawnSync(process.execPath, [GUARD, 'rebase'], {
    cwd: primaryCheckout(),
    encoding: 'utf8',
  })
  assert.strictEqual(blocked.status, 1)
  assert.match(blocked.stderr, /BLOCKED: rebase/)

  const allowed = spawnSync(process.execPath, [GUARD, 'rebase'], {
    cwd: linkedWorktree(),
    encoding: 'utf8',
  })
  assert.strictEqual(allowed.status, 0)
})
