#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const DEFAULT_ROOT = resolve(here, '..')

function git(args, root) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

function option(argv, flag) {
  const i = argv.indexOf(flag)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined
}

function sessionId(argv) {
  return option(argv, '--id') || process.env.NN_SESSION_ID || `${os.hostname()}-${process.pid}`
}

/**
 * The repo's PRIMARY checkout — its main worktree — asked of git instead of assumed.
 * `git worktree list` always lists the main worktree first, so this answers "which
 * checkout is the primary one" from inside a session worktree or any subdirectory.
 * Returns null when the directory is not inside a git repository.
 */
function primaryCheckout(startDir) {
  try {
    const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: startDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const m = out.match(/^worktree (.+)$/m)
    return m ? resolve(m[1].trim()) : null
  } catch {
    return null
  }
}

/**
 * Root for every subcommand. A session worktree ships its own copy of this script,
 * so resolving from the script's own location labelled the worktree "primary" and
 * pointed every subcommand at the wrong checkout. Ask git first, from the caller's
 * cwd and then from the script; keep the script's parent only as a last resort so a
 * copy outside git still works. `--root` still wins over all of it.
 */
function repoRoot(argv) {
  const r = option(argv, '--root')
  if (r) return resolve(r)
  return primaryCheckout(process.cwd()) ?? primaryCheckout(here) ?? DEFAULT_ROOT
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
    execFileSync('npm', ['ci'], {
      cwd: dir,
      stdio: ['ignore', 2, 2],
      shell: process.platform === 'win32',
    })
  } catch {
    console.error(
      `WARNING: npm ci failed in ${dir}; fix and re-run it there, or start with --no-install`,
    )
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
      !fullInstall &&
      targetLock !== null &&
      targetLock === primaryLock &&
      existsSync(primaryModules)
    if (reusable) {
      removeLink(linkPath) // drop a stale junction before re-pointing
      try {
        symlinkSync(primaryModules, linkPath, 'junction')
        console.error(`nn-session: linked node_modules in ${dir} (lockfile match)`)
        continue
      } catch (err) {
        console.error(
          `WARNING: could not link node_modules in ${dir} (${err.message}); falling back to npm ci`,
        )
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
    execFileSync('npm', ['run', 'build'], {
      cwd: coreDir,
      stdio: ['ignore', 2, 2],
      shell: process.platform === 'win32',
    })
  } catch {
    console.error(
      'WARNING: building @cognnitive/nn-core failed; build it there before using the worktree',
    )
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
  for (const rel of INSTALL_DIRS) {
    removeLink(join(dir, rel, 'node_modules'))
  }
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
 * Base ref for a new session: `origin/main` after a best-effort fetch, so a stale
 * local `main` in the primary never becomes the session's starting point. Falls
 * back to local `main` only when `origin/main` does not exist (no remote).
 */
function sessionBase(root) {
  tryGit(['fetch', 'origin'], root) // best-effort; offline is fine
  return tryGit(['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main'], root).ok
    ? 'origin/main'
    : 'main'
}

/** Refs a session branch counts as landed in (`main` may be stale locally). */
const INTEGRATION_REFS = ['main', 'origin/main']

function start(argv) {
  const root = repoRoot(argv)
  const id = sessionId(argv)
  const target = worktreePath(root, id)
  if (!existsSync(target)) {
    // --no-track: a session branch must not track origin/main (a bare `git push` would target main).
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
 *
 * Since 2026-11-21 it also reports every session worktree — dirty count, how long ago
 * somebody last wrote in it, and the open PR of its branch when `--prs` names the JSON
 * that `gh pr list --state open --json number,headRefName` writes. That is the piece
 * that was missing when five live branches stepped on each other for two days: the
 * report said nothing about whether a worktree was in use.
 */
function status(argv) {
  const root = repoRoot(argv)
  tryGit(['fetch', 'origin'], root) // best-effort; offline is fine
  const head = tryGit(['rev-parse', '--short', 'HEAD'], root).out || '?'
  const branch = tryGit(['symbolic-ref', '--short', 'HEAD'], root).out || '(detached)'
  const dirty = tryGit(['status', '--porcelain'], root).out
  const dirtyCount = dirty ? dirty.split(/\r?\n/).filter(Boolean).length : 0
  const main = (
    tryGit(['rev-list', '--left-right', '--count', 'origin/main...main'], root).out || '? ?'
  ).split(/\s+/)
  const stash = tryGit(['reflog', 'show', 'refs/stash'], root).out

  console.log('🌿 nn-session status')
  console.log(
    `- primary: ${branch} @ ${head} · ${dirtyCount === 0 ? 'clean' : `${dirtyCount} dirty`}`,
  )
  console.log(`- origin/main...main: ${main[0]} behind · ${main[1]} ahead`)

  const prsFile = option(argv, '--prs')
  const prByBranch = readPrNumbers(prsFile)
  const now = Date.now()
  console.log('- worktrees:')
  for (const wt of readWorktrees(root)) {
    const porcelain = tryGit(['status', '--porcelain'], wt.path).out || ''
    const count = porcelain ? porcelain.split(/\r?\n/).filter(Boolean).length : 0
    const newest = newestModifiedMs(wt.path, porcelain)
    const pr = prByBranch.get(wt.branch)
    const facts = [
      count === 0 ? 'clean' : `${count} dirty`,
      ...(newest > 0 ? [`last write ${ageLabel(now - newest)}`] : []),
      ...(pr !== undefined ? [`PR #${pr}`] : []),
    ]
    console.log(`    ${wt.path}  ${wt.sha} [${wt.branch}] · ${facts.join(' · ')}`)
  }
  if (prsFile && prByBranch.size === 0) {
    console.log(`- prs: could not read ${prsFile} (PR numbers omitted)`)
  }

  const links = workspaceLinks(root)
  if (links.length > 0) {
    // Classified against the worktree the command runs *in*, not the primary: the point
    // of the line is whether this checkout's typecheck would read its own core.
    const cwdRoot = tryGit(['rev-parse', '--show-toplevel'], process.cwd()).out || root
    console.log('- workspace links:')
    for (const link of links) {
      const state = !link.exists
        ? 'MISSING — repoint it before trusting a typecheck'
        : insidePath(link.target, cwdRoot)
          ? 'this worktree'
          : 'another checkout'
      console.log(`    @cognnitive/${link.name} -> ${link.target ?? '(not a link)'}  (${state})`)
    }
  }

  console.log(
    `- stash: ${stash ? `${stash.split(/\r?\n/).filter(Boolean).length} entry(ies)` : 'none'}`,
  )
}

/** `just now`, `12m ago`, `3h ago`, `2d ago` — coarse on purpose. */
function ageLabel(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '?'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}

/**
 * Newest mtime among the files this worktree has modified. Whole-tree mtimes are noise
 * (a checkout or an install touches everything); the modified set is what says whether
 * an agent is typing in there right now.
 */
function newestModifiedMs(worktreePath, porcelain) {
  let newest = 0
  for (const line of porcelain.split(/\r?\n/)) {
    if (!line.trim()) continue
    const rel = line
      .slice(3)
      .trim()
      .split(' -> ')
      .pop()
      .replace(/^"(.*)"$/, '$1')
    try {
      newest = Math.max(newest, statSync(join(worktreePath, rel)).mtimeMs)
    } catch {
      // deleted, renamed or unreadable: it contributes no timestamp
    }
  }
  return newest
}

/** `path`, `sha` and `branch` for every registered worktree, in git's order (primary first). */
function readWorktrees(root) {
  const out = tryGit(['worktree', 'list', '--porcelain'], root).out || ''
  return out
    .split(/\r?\n\r?\n/)
    .filter((block) => block.trim())
    .map((block) => ({
      path: ((block.match(/^worktree (.+)$/m) || [])[1] || '?').replace(/\\/g, '/'),
      sha: ((block.match(/^HEAD ([0-9a-f]+)$/m) || [])[1] || '?').slice(0, 8),
      branch: (block.match(/^branch refs\/heads\/(.+)$/m) || [])[1] || '(detached)',
    }))
}

/** branch -> PR number, from the JSON `gh pr list --state open --json number,headRefName` writes. */
function readPrNumbers(file) {
  const byBranch = new Map()
  if (!file || !existsSync(file)) return byBranch
  try {
    for (const pr of JSON.parse(readFileSync(file, 'utf8'))) {
      if (pr && pr.headRefName && pr.number !== undefined) byBranch.set(pr.headRefName, pr.number)
    }
  } catch {
    // an unreadable list leaves the map empty and the caller says so
  }
  return byBranch
}

const normalizePath = (p) => resolve(p).replace(/\\/g, '/').toLowerCase()

/** True when `target` points inside `root` — the only state that makes a typecheck honest. */
function insidePath(target, root) {
  if (!target) return false
  return normalizePath(target).startsWith(`${normalizePath(root)}/`)
}

/**
 * Where `node_modules/@cognnitive/*` resolves from this checkout. A junction to another
 * worktree is the trap that made `npm run typecheck` report a missing export that the
 * source clearly had; a junction to a swept worktree dangles and breaks it for everyone
 * sharing that `node_modules`.
 */
function workspaceLinks(root) {
  const dir = join(root, 'node_modules', '@cognnitive')
  if (!existsSync(dir)) return []
  return readdirSync(dir).map((name) => {
    const link = join(dir, name)
    let target = null
    try {
      if (lstatSync(link).isSymbolicLink()) target = readlinkSync(link)
    } catch {
      // a real directory is reported without a target
    }
    return { name, target, exists: target ? existsSync(target) : existsSync(link) }
  })
}

/**
 * True when the branch's reflog proves no commit was ever authored on it. Such a
 * branch still points at the commit it was cut from, so `merge-base --is-ancestor`
 * reads it as merged while its agent may be writing files right now.
 *
 * Only `commit` counts. A `rebase` or a `reset` moves the ref without creating any
 * work: a session that rebased onto main and had not committed yet is exactly the
 * case this function exists to protect, and counting those entries as commits made
 * it answer "may have work", so `sweep` went ahead. Branches that really carry
 * commits are already excluded by the ancestry check in the caller.
 *
 * An empty or unreadable reflog proves nothing and returns false.
 */
function neverCommitted(root, branch) {
  const log = tryGit(['reflog', 'show', '--format=%gs', `refs/heads/${branch}`], root)
  const entries = log.ok ? log.out.split(/\r?\n/).filter(Boolean) : []
  if (entries.length === 0) return false
  return !entries.some((subject) => /^commit/.test(subject))
}

function stop(argv) {
  const refusal = stopSession(repoRoot(argv), sessionId(argv), {
    force: argv.includes('--force'),
  })
  if (refusal) {
    console.error(refusal)
    process.exit(1)
  }
}

/**
 * Removes one session worktree and its branch. Returns a refusal message instead
 * of exiting, so `sweep` can skip one session and carry on with the rest.
 * @param {string} root - repository root
 * @param {string} id - session id (branch suffix)
 * @param {{ force?: boolean, registeredPath?: string|null }} [options] -
 *   `registeredPath` is the worktree path git reports. Guessing it as
 *   `<parent>/cogNNitive-<id>` deletes the wrong directory the moment a worktree
 *   was created anywhere else, which is what #721 reported.
 * @returns {string | null}
 */
function stopSession(root, id, { force = false, registeredPath = null } = {}) {
  const branch = `session/${id}`
  // The path git reports for this branch, before falling back to a reconstruction.
  // Guessing `<parent>/cogNNitive-<id>` finds nothing the moment the worktree lives
  // anywhere else, and the old code still printed `removed` for that guessed path
  // while the real directory survived (#721).
  const registeredForBranch = (readWorktrees(root).find((w) => w.branch === branch) || {}).path
  const target = registeredPath || registeredForBranch || worktreePath(root, id)

  const branchExists = tryGit(['rev-parse', '--verify', '--quiet', branch], root).ok
  const isIn = (ref) => tryGit(['merge-base', '--is-ancestor', branch, ref], root).ok

  // Refuse to delete a branch with unique work.
  if (branchExists && !INTEGRATION_REFS.some(isIn)) {
    const bases = INTEGRATION_REFS.filter(
      (ref) => tryGit(['rev-parse', '--verify', '--quiet', ref], root).ok,
    )
    const unique = tryGit(['log', '--oneline', branch, '--not', ...bases], root).out
    return `refusing: ${branch} has commits not in main or origin/main:\n${unique}`
  }

  const registered = worktreeRegistered(root, target)
  let dirExists = existsSync(target)
  const hadDir = dirExists

  if (registered && dirExists) {
    // An empty or foreign target (Windows lock, partial removal) is not dirty;
    // only real uncommitted changes refuse. (#1982)
    const dirty = tryGit(['status', '--porcelain'], target).out
    if (dirty) {
      return `refusing: ${target} has uncommitted changes:\n${dirty}\nsave what matters and revert the rest, then stop again.`
    }
  }
  // "No commits yet" passes the ancestry test above, so it would read as merged.
  if (branchExists && !force && neverCommitted(root, branch)) {
    return `refusing: ${branch} has no commits yet, so it may be a live session that has not committed.\nconfirm nobody is using it, then stop it with --force.`
  }
  if (registered && dirExists) {
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
  const branchGone = branchExists && !tryGit(['rev-parse', '--verify', '--quiet', branch], root).ok

  if (dirExists) {
    return `refusing: ${target} still exists (locked); nothing was removed. Delete it once the lock holder closes.`
  }
  if (!hadDir && !branchGone) {
    console.log(`nothing to stop for session/${id}`)
    return null
  }
  // Report what actually happened. The old code printed `removed <path>` for a path it
  // had merely guessed, so a session whose worktree lived elsewhere read as cleaned up
  // while the directory survived (#721).
  if (hadDir) console.log(`removed ${target}`)
  if (branchGone) console.log(`deleted branch ${branch}`)
  return null
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
      if (INTEGRATION_REFS.some((ref) => isAncestor(branch, ref))) {
        console.log(`sweeping merged session worktree: ${branch} (${target})`)
        // The path git reports, not a reconstructed one (#721).
        const refusal = stopSession(root, id, { registeredPath: target })
        if (refusal) console.error(`skipped ${branch}: ${refusal}`)
      }
    }
  }

  // 2. Scan remaining local session/* branches that are already merged
  const rawBranches = tryGit(['branch', '--list', 'session/*'], root).out
  const branches = rawBranches
    .split(/\r?\n/)
    .map((b) => b.trim().replace(/^\*\s*/, ''))
    .filter(Boolean)
  for (const branch of branches) {
    if (INTEGRATION_REFS.some((ref) => isAncestor(branch, ref))) {
      console.log(`deleting merged local branch: ${branch}`)
      // `-d` checks against the primary's HEAD, which may not be main; ancestry
      // of main or origin/main was proven just above.
      tryGit(['branch', '-D', branch], root)
    }
  }
}

const USAGE =
  'usage: nn-session.mjs start|list|status|stop|sweep [--id <id>] [--no-install] [--full-install] [--force] [--root <path>] [--prs <file>]'

const argv = process.argv.slice(2)
const cmd = argv[0]

// Asking for help must never run a command. `--help` used to be ignored as an unknown
// flag, so `start --help` cut a session branch from origin/main and created a worktree
// named after the host and pid, at a path nobody chose (#770, #721).
if (cmd === 'help' || argv.includes('--help') || argv.includes('-h')) {
  console.log(USAGE)
  process.exit(0)
}

if (cmd === 'start') start(argv)
else if (cmd === 'list') list(argv)
else if (cmd === 'status') status(argv)
else if (cmd === 'stop') stop(argv)
else if (cmd === 'sweep') sweep(argv)
else {
  console.error(USAGE)
  process.exit(2)
}
