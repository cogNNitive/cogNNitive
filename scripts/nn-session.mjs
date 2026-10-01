#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, symlinkSync } from 'node:fs'
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

function junctionNodeModules(root, target) {
  const links = [
    { src: join(root, 'node_modules'), dst: join(target, 'node_modules') },
    { src: join(root, 'skills', 'nn-trannsform', 'node_modules'), dst: join(target, 'skills', 'nn-trannsform', 'node_modules') },
  ]
  for (const { src, dst } of links) {
    if (existsSync(dst) || !existsSync(src)) continue
    try {
      symlinkSync(src, dst, 'junction')
    } catch {
      console.error(`WARNING: could not junction ${src}; run "npm install" in ${target}`)
    }
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
