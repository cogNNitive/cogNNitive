#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readdirSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs'
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
  if (existsSync(target)) {
    console.log(target)
    return
  }
  git(['worktree', 'add', '-b', `session/${id}`, target, 'dev'], root)
  junctionNodeModules(root, target)
  console.log(target)
}

function list(argv) {
  const root = repoRoot(argv)
  const out = git(['worktree', 'list', '--porcelain'], root)
  const lines = out.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const w = lines[i].match(/^worktree (.+)$/)
    if (w) {
      const branch = lines[i + 1]?.match(/^branch refs\/heads\/(.+)$/)?.[1] || '(detached)'
      console.log(`${w[1]}  [${branch}]`)
    }
  }
}

function stop(argv) {
  const root = repoRoot(argv)
  const id = sessionId(argv)
  const target = worktreePath(root, id)
  if (!existsSync(target)) {
    console.error(`no worktree at ${target}`)
    process.exit(1)
  }
  const branch = `session/${id}`
  let merged = true
  try {
    git(['merge-base', '--is-ancestor', branch, 'dev'], root)
  } catch {
    merged = false
  }
  if (!merged) {
    const unique = git(['log', '--oneline', `dev..${branch}`], root)
    console.error(`refusing: ${branch} has commits not in dev:\n${unique}`)
    process.exit(1)
  }
  removeNodeModulesLinks(target)
  git(['worktree', 'remove', target], root)
  git(['branch', '-D', branch], root)
  console.log(`removed ${target}`)
}

const cmd = process.argv[2]
if (cmd === 'start') start(process.argv.slice(2))
else if (cmd === 'list') list(process.argv.slice(2))
else if (cmd === 'stop') stop(process.argv.slice(2))
else {
  console.error('usage: nn-session.mjs start|list|stop [--id <id>] [--root <path>]')
  process.exit(2)
}
