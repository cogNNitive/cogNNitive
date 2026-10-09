#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs'
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

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function parseSemver(value) {
  const m = String(value).match(/(\d+)\.(\d+)\.(\d+)/)
  return m ? { major: Number(m[1]), minor: Number(m[2]) } : null
}

function installedDepVersion(root, relDir, name) {
  const parts = relDir ? relDir.split('/') : []
  for (let i = parts.length; i >= 0; i--) {
    const pkg = readJson(join(root, ...parts.slice(0, i), 'node_modules', name, 'package.json'))
    if (pkg && pkg.version) return pkg.version
  }
  return null
}

function workspaceManifests(root) {
  const rels = []
  const push = (rel) => {
    if (existsSync(join(root, rel, 'package.json'))) rels.push(rel)
  }
  push('')
  push('iNNfo')
  for (const group of ['packages', 'apps']) {
    const dir = join(root, 'iNNfo', group)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) push(join('iNNfo', group, entry.name))
    }
  }
  return rels
}

/**
 * A session worktree inherits the primary's installed tree through junctions.
 * If the primary install is stale (installed version below the declared range),
 * every test/gate run in the worktree is a silent false baseline — the exact
 * trap of issue #122 / observation #2009. Compare declared vs installed so the
 * trap is loud instead of silent.
 * ponytail: major/minor floor only, not full semver — enough for the known trap.
 */
function checkDependencyFreshness(root) {
  const stale = []
  for (const rel of workspaceManifests(root)) {
    const pkg = readJson(join(root, rel, 'package.json'))
    if (!pkg) continue
    for (const field of [pkg.dependencies, pkg.devDependencies]) {
      if (!field) continue
      for (const [name, range] of Object.entries(field)) {
        const floor = parseSemver(range)
        const installed = installedDepVersion(root, rel, name)
        const iv = installed && parseSemver(installed)
        if (!floor || !iv) continue
        if (iv.major < floor.major || (iv.major === floor.major && iv.minor < floor.minor)) {
          stale.push({ pkg: rel || '(root)', name, declared: range, installed })
        }
      }
    }
  }
  return stale
}

function reportFreshness(stale, root) {
  if (!stale.length) return
  const common = tryGit(['rev-parse', '--path-format=absolute', '--git-common-dir'], root).out
  const primary = common && common.includes('.git') ? dirname(common) : root
  console.error('')
  console.error('⚠ STALE DEPENDENCIES — this worktree is NOT a valid test baseline')
  for (const s of stale) console.error(`  - ${s.name}: installed ${s.installed}, declared ${s.declared}  (${s.pkg})`)
  console.error(`  Fix: run "npm install" in ${primary} (the primary checkout), then re-enter.`)
  console.error('')
}

/**
 * Every node_modules a session worktree needs, as repo-relative paths: the root
 * one, the `iNNfo/` aggregate, and each npm workspace (`iNNfo/packages/*`,
 * `iNNfo/apps/*`) plus each skill that ships its own deps (`skills/*`).
 */
function candidateNodeModules(root) {
  const rels = ['node_modules', join('iNNfo', 'node_modules')]
  for (const group of [join('iNNfo', 'packages'), join('iNNfo', 'apps'), 'skills']) {
    const groupDir = join(root, group)
    if (!existsSync(groupDir)) continue
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (entry.isDirectory()) rels.push(join(group, entry.name, 'node_modules'))
    }
  }
  return rels
}

function junctionNodeModules(root, target) {
  for (const rel of candidateNodeModules(root)) {
    const src = join(root, rel)
    const dst = join(target, rel)
    if (existsSync(dst) || !existsSync(src)) continue
    try {
      mkdirSync(dirname(dst), { recursive: true })
      symlinkSync(src, dst, 'junction')
    } catch {
      console.error(`WARNING: could not junction ${src}; run "npm install" in ${target}`)
    }
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
 * Remove every junctioned node_modules inside a session worktree BEFORE git
 * deletes it. `git worktree remove` recurses through those junctions into the
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

function start(argv) {
  const root = repoRoot(argv)
  const id = sessionId(argv)
  const target = worktreePath(root, id)
  const fresh = argv.includes('--fresh')
  if (!existsSync(target)) {
    git(['worktree', 'add', '-b', `session/${id}`, target, 'dev'], root)
    if (fresh) {
      // A real install makes @cognnitive/* resolve to THIS worktree's source,
      // so tests and gates exercise the session's own edits. Junctions resolve
      // them to the primary instead — a silent stale-source baseline. (#1624/#2009)
      console.error(`nn-session: installing a real dependency tree in ${target} (npm ci)…`)
      execFileSync('npm', ['ci'], { cwd: target, stdio: 'inherit', shell: process.platform === 'win32' })
    } else {
      junctionNodeModules(root, target)
    }
  } else if (fresh) {
    console.error(`nn-session: --fresh ignores an existing worktree; use a new id or remove ${target} first.`)
  }
  // Junctions inherit the primary's install; a stale primary poisons every test
  // and gate here. Warn loudly, never silently. (§1a/#2009)
  if (!fresh) reportFreshness(checkDependencyFreshness(target), root)
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
  const stale = checkDependencyFreshness(root)

  console.log('🌿 nn-session status')
  console.log(`- primary: ${branch} @ ${head} · ${dirtyCount === 0 ? 'clean' : `${dirtyCount} dirty`}`)
  console.log(`- origin/dev...dev: ${dev[0]} behind · ${dev[1]} ahead`)
  console.log(`- pending (origin/main..origin/dev): ${main[1]} commit(s)`)
  console.log('- worktrees:')
  for (const line of (worktrees || '').split(/\r?\n/).filter(Boolean)) console.log(`    ${line}`)
  console.log(`- stash: ${stash ? `${stash.split(/\r?\n/).filter(Boolean).length} entry(ies)` : 'none'}`)
  console.log(`- deps: ${stale.length === 0 ? 'fresh' : `${stale.length} stale (NOT a valid test baseline)`}`)
  reportFreshness(stale, root)
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

  // A leftover dir a process still holds: drop it if empty, else leave for the maintainer.
  if (dirExists) {
    try {
      rmdirSync(target)
      dirExists = false
    } catch {
      // non-empty or locked — leave it
    }
  }

  if (branchExists) tryGit(['branch', '-D', branch], root)

  if (!registered && !branchExists && !dirExists) {
    console.log(`nothing to stop for session/${id}`)
    return
  }
  console.log(`removed ${target}`)
  if (dirExists) {
    console.error(`note: ${target} still exists (locked or non-empty); delete it once the lock holder closes.`)
  }
}

const cmd = process.argv[2]
if (cmd === 'start') start(process.argv.slice(2))
else if (cmd === 'list') list(process.argv.slice(2))
else if (cmd === 'status') status(process.argv.slice(2))
else if (cmd === 'stop') stop(process.argv.slice(2))
else {
  console.error('usage: nn-session.mjs start|list|status|stop [--id <id>] [--fresh] [--root <path>]')
  process.exit(2)
}
