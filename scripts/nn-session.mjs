#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const DEFAULT_ROOT = resolve(here, '..')

function git(args, root) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function option(argv, flag) {
  const i = argv.indexOf(flag)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined
}

function sessionId(argv) {
  return option(argv, '--id') || process.env.NN_SESSION_ID || `${os.hostname()}-${process.pid}`
}

function repoRoot(argv) {
  const r = option(argv, '--root')
  return r ? resolve(r) : DEFAULT_ROOT
}

function worktreePath(root, id) {
  return join(dirname(root), `cogNNitive-${id}`)
}

function tryGit(args, root) {
  try {
    return { ok: true, out: git(args, root) }
  } catch {
    return { ok: false, out: '' }
  }
}

// Each entry is an independent npm project: skills/nn-sources ships its own deps
// outside the root workspaces, so the root `npm ci` does not cover it.
const INSTALL_DIRS = ['', join('skills', 'nn-sources')]

/** @returns {string|null} SHA-256 of `file`, or null when it does not exist. */
function sha256(file) {
  try {
    return createHash('sha256').update(readFileSync(file)).digest('hex')
  } catch {
    return null
  }
}

function npmCi(dir) {
  // Test seam: skip the real (slow) install and stand in a plain node_modules dir.
  if (process.env.NN_SESSION_TEST_NPM_STUB) {
    console.error(`nn-session: [stub] npm ci in ${dir}`)
    mkdirSync(join(dir, 'node_modules'), { recursive: true })
    return
  }
  console.error(`nn-session: npm ci in ${dir}…`)
  try {
    execFileSync('npm', ['ci'], { cwd: dir, stdio: ['ignore', 2, 2], shell: process.platform === 'win32' })
  } catch {
    console.error(`WARNING: npm ci failed in ${dir}; fix and re-run it there, or start with --no-install`)
    process.exitCode = 1
  }
}

/**
 * Reuses the primary checkout's installed dependencies when the worktree's
 * `package-lock.json` SHA-256 matches the primary's and `node_modules` is present
 * (design D6): the worktree gets a `node_modules` directory junction instead of a
 * ~90s `npm ci`. Falls back to a real `npm ci` when lockfiles differ, the primary
 * has no `node_modules`, or `--full-install` is passed.
 *
 * A real install makes @cognnitive/* resolve to THIS worktree's source, so tests
 * and gates exercise the session's own edits. (#1624/#2009)
 * @param {string} target - the session worktree root
 * @param {string} root - the primary checkout
 * @param {boolean} fullInstall
 */
function hydrateDependencies(target, root, fullInstall) {
  for (const rel of INSTALL_DIRS) {
    const dir = join(target, rel)
    if (!existsSync(join(dir, 'package.json'))) continue
    const linkPath = join(dir, 'node_modules')
    const targetLock = sha256(join(dir, 'package-lock.json'))
    const primaryLock = sha256(join(root, rel, 'package-lock.json'))
    const primaryModules = join(root, rel, 'node_modules')
    const reusable =
      !fullInstall && targetLock !== null && targetLock === primaryLock && existsSync(primaryModules)
    if (reusable) {
      removeLink(linkPath) // drop a stale junction before re-pointing
      try {
        symlinkSync(primaryModules, linkPath, 'junction')
        console.error(`nn-session: linked node_modules in ${dir} (lockfile match)`)
        continue
      } catch (err) {
        console.error(`WARNING: could not link node_modules in ${dir} (${err.message}); falling back to npm ci`)
      }
    }
    npmCi(dir)
  }
}

/** Builds @cognnitive/nn-core in the worktree so its dist matches the session source. */
function buildCore(target) {
  const coreDir = join(target, 'iNNfo', 'packages', 'nn-core')
  if (!existsSync(join(coreDir, 'package.json')) || process.env.NN_SESSION_TEST_NPM_STUB) return
  console.error('nn-session: building @cognnitive/nn-core…')
  try {
    execFileSync('npm', ['run', 'build'], { cwd: coreDir, stdio: ['ignore', 2, 2], shell: process.platform === 'win32' })
  } catch {
    console.error('WARNING: building @cognnitive/nn-core failed; build it there before using the worktree')
    process.exitCode = 1
  }
}

function removeLink(p) {
  // Remove only the reparse point: `rmdir` drops a Windows junction or a
  // directory symlink without touching its target; `unlink` covers POSIX
  // symlinks. Both throw harmlessly if `p` is a real, non-empty directory.
  try {
    rmdirSync(p)
  } catch {
    try {
      unlinkSync(p)
    } catch {}
  }
}

/**
 * Legacy cleanup for worktrees created before real installs: remove every
 * junctioned node_modules inside a session worktree BEFORE git deletes it. `git worktree remove` recurses through those junctions into the
 * primary checkout and, following the npm workspace symlinks it finds there,
 * deletes the primary's package sources. Symlinks are removed link-only and
 * never traversed, so the primary is never touched.
 */
function removeNodeModulesLinks(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name === '.git') continue
    const full = join(dir, entry.name)
    let st
    try {
      st = lstatSync(full)
    } catch {
      continue
    }
    if (st.isSymbolicLink()) {
      removeLink(full)
      continue
    }
    if (st.isDirectory()) removeNodeModulesLinks(full)
  }
}

/**
 * Base ref for a new session: `origin/dev` after a best-effort fetch, so a stale
 * local `dev` in the primary never becomes the session's starting point. Falls
 * back to local `dev` only when `origin/dev` does not exist (no remote).
 */
function sessionBase(root) {
  tryGit(['fetch', 'origin'], root) // best-effort; offline is fine
  return tryGit(['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/dev'], root).ok ? 'origin/dev' : 'dev'
}

function start(argv) {
  const root = repoRoot(argv)
  const id = sessionId(argv)
  const target = worktreePath(root, id)
  if (!existsSync(target)) {
    // --no-track: a session branch must not track origin/dev (a bare `git push` would target dev).
    git(['worktree', 'add', '--no-track', '-b', `session/${id}`, target, sessionBase(root)], root)
    if (!argv.includes('--no-install')) {
      hydrateDependencies(target, root, argv.includes('--full-install'))
      buildCore(target)
    }
  }
  console.log(target)
}

function list(argv) {
  const root = repoRoot(argv)
  const out = git(['worktree', 'list', '--porcelain'], root)
  const lines = out.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const w = lines[i].match(/^worktree (.+)$/)
    if (w) {
      // Porcelain order is `worktree`, `HEAD`, then `branch` (absent when detached),
      // so look through the block instead of assuming the next line.
      let branch = '(detached)'
      for (let j = i + 1; j < lines.length && lines[j] !== ''; j++) {
        const b = lines[j].match(/^branch refs\/heads\/(.+)$/)
        if (b) branch = b[1]
      }
      console.log(`${w[1]}  [${branch}]`)
    }
  }
}

function worktreeRegistered(root, target) {
  const norm = (p) => resolve(p).replace(/\\/g, '/').toLowerCase()
  const want = norm(target)
  for (const block of tryGit(['worktree', 'list', '--porcelain'], root).out.split(/\r?\n\r?\n/)) {
    const m = block.match(/^worktree (.+)$/m)
    if (m && norm(m[1]) === want) return true
  }
  return false
}

/**
 * One-block health report for the primary checkout — the single command that
 * replaces the five manual git calls of §1b. Informational: always exits 0.
 */
function status(argv) {
  const root = repoRoot(argv)
  tryGit(['fetch', 'origin'], root) // best-effort; offline is fine
  const head = tryGit(['rev-parse', '--short', 'HEAD'], root).out || '?'
  const branch = tryGit(['symbolic-ref', '--short', 'HEAD'], root).out || '(detached)'
  const dirty = tryGit(['status', '--porcelain'], root).out
  const dirtyCount = dirty ? dirty.split(/\r?\n/).filter(Boolean).length : 0
  const dev = (tryGit(['rev-list', '--left-right', '--count', 'origin/dev...dev'], root).out || '? ?').split(/\s+/)
  const main = (tryGit(['rev-list', '--left-right', '--count', 'origin/main...origin/dev'], root).out || '? ?').split(/\s+/)
  const worktrees = tryGit(['worktree', 'list'], root).out
  const stash = tryGit(['reflog', 'show', 'refs/stash'], root).out

  console.log('🌿 nn-session status')
  console.log(`- primary: ${branch} @ ${head} · ${dirtyCount === 0 ? 'clean' : `${dirtyCount} dirty`}`)
  console.log(`- origin/dev...dev: ${dev[0]} behind · ${dev[1]} ahead`)
  console.log(`- pending (origin/main..origin/dev): ${main[1]} commit(s)`)
  console.log('- worktrees:')
  for (const line of (worktrees || '').split(/\r?\n/).filter(Boolean)) console.log(`    ${line}`)
  console.log(`- stash: ${stash ? `${stash.split(/\r?\n/).filter(Boolean).length} entry(ies)` : 'none'}`)
}

/**
 * Read-only precheck for the dev -> main batch (skill §4-pre). Informational:
 * exits 0 unless `--strict` is given and the verdict is not READY.
 */
async function batchStatus(argv) {
  const { collectBatchStatus, renderBatchStatus } = await import('./lib/batch-status.mjs')
  const result = collectBatchStatus({ root: repoRoot(argv) })
  console.log(argv.includes('--json') ? JSON.stringify(result, null, 2) : renderBatchStatus(result))
  if (argv.includes('--strict') && result.verdict !== 'READY') process.exitCode = 1
}

function stop(argv) {
  const root = repoRoot(argv)
  const id = sessionId(argv)
  const target = worktreePath(root, id)
  const branch = `session/${id}`

  const branchExists = tryGit(['rev-parse', '--verify', '--quiet', branch], root).ok
  const isIn = (ref) => tryGit(['merge-base', '--is-ancestor', branch, ref], root).ok

  // Refuse to delete a branch with unique work. (`dev` may be stale locally
  // while `origin/dev` already carries the branch, so check both.)
  if (branchExists && !isIn('dev') && !isIn('origin/dev')) {
    const bases = ['dev', 'origin/dev'].filter((ref) => tryGit(['rev-parse', '--verify', '--quiet', ref], root).ok)
    const unique = tryGit(['log', '--oneline', branch, '--not', ...bases], root).out
    console.error(`refusing: ${branch} has commits not in dev or origin/dev:\n${unique}`)
    process.exit(1)
  }

  const registered = worktreeRegistered(root, target)
  let dirExists = existsSync(target)

  if (registered && dirExists) {
    // An empty or foreign target (Windows lock, partial removal) is not dirty;
    // only real uncommitted changes refuse. (#1982)
    const dirty = tryGit(['status', '--porcelain'], target).out
    if (dirty) {
      console.error(`refusing: ${target} has uncommitted changes:\n${dirty}\nsave what matters and revert the rest, then stop again.`)
      process.exit(1)
    }
    removeNodeModulesLinks(target)
    tryGit(['worktree', 'remove', target], root)
    dirExists = existsSync(target)
  }
  if (registered) tryGit(['worktree', 'prune'], root)

  // A leftover dir a process still holds: drop it if possible, else leave for the maintainer.
  if (dirExists) {
    try {
      rmSync(target, { recursive: true, force: true })
      dirExists = false
    } catch {
      // locked by another process
    }
  }

  if (branchExists) tryGit(['branch', '-D', branch], root)

  if (!registered && !branchExists && !dirExists) {
    console.log(`nothing to stop for session/${id}`)
    return
  }
  console.log(`removed ${target}`)
  if (dirExists) {
    console.error(`note: ${target} still exists (locked); delete it once the lock holder closes.`)
  }
}

function sweep(argv) {
  const root = repoRoot(argv)
  const isAncestor = (branch, ref) => tryGit(['merge-base', '--is-ancestor', branch, ref], root).ok

  // 1. Scan registered worktrees
  const out = tryGit(['worktree', 'list', '--porcelain'], root).out
  const blocks = out.split(/\r?\n\r?\n/)
  for (const block of blocks) {
    const wm = block.match(/^worktree (.+)$/m)
    const bm = block.match(/^branch refs\/heads\/(session\/.+)$/m)
    if (wm && bm) {
      const target = wm[1]
      const branch = bm[1]
      const id = branch.replace(/^session\//, '')
      if (isAncestor(branch, 'dev') || isAncestor(branch, 'origin/dev') || isAncestor(branch, 'main')) {
        console.log(`sweeping merged session worktree: ${branch} (${target})`)
        stop(['stop', '--id', id, '--root', root])
      }
    }
  }

  // 2. Scan remaining local session/* branches that are already merged
  const rawBranches = tryGit(['branch', '--list', 'session/*'], root).out
  const branches = rawBranches.split(/\r?\n/).map((b) => b.trim().replace(/^\*\s*/, '')).filter(Boolean)
  for (const branch of branches) {
    if (isAncestor(branch, 'dev') || isAncestor(branch, 'origin/dev') || isAncestor(branch, 'main')) {
      console.log(`deleting merged local branch: ${branch}`)
      tryGit(['branch', '-d', branch], root)
    }
  }
}

const cmd = process.argv[2]
if (cmd === 'start') start(process.argv.slice(2))
else if (cmd === 'list') list(process.argv.slice(2))
else if (cmd === 'status') status(process.argv.slice(2))
else if (cmd === 'batch-status') await batchStatus(process.argv.slice(2))
else if (cmd === 'stop') stop(process.argv.slice(2))
else if (cmd === 'sweep') sweep(process.argv.slice(2))
else {
  console.error('usage: nn-session.mjs start|list|status|batch-status|stop|sweep [--id <id>] [--no-install] [--full-install] [--root <path>] [--json] [--strict]')
  process.exit(2)
}
