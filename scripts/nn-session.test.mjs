import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(here, 'nn-session.mjs')

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function run(args) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

function makeRepo(base) {
  const repo = join(base, 'repo')
  mkdirSync(repo, { recursive: true })
  git(['init', '-b', 'dev'], repo)
  git(['config', 'user.email', 't@test'], repo)
  git(['config', 'user.name', 't'], repo)
  writeFileSync(join(repo, 'f.txt'), 'x')
  git(['add', '-A'], repo)
  git(['commit', '-m', 'init'], repo)
  return repo
}

test('start creates and reuses a session worktree; stop removes it', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s1')
  try {
    const s1 = run(['start', '--id', 's1', '--root', repo])
    assert.equal(s1.code, 0)
    assert.equal(s1.out, target)
    assert.ok(existsSync(join(target, 'f.txt')), 'worktree has tracked files')

    const s2 = run(['start', '--id', 's1', '--root', repo])
    assert.equal(s2.code, 0)
    assert.equal(s2.out, target)

    const st = run(['stop', '--id', 's1', '--root', repo])
    assert.equal(st.code, 0)
    assert.ok(!existsSync(target), 'worktree removed')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('stop refuses an unmerged session branch', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s2')
  try {
    run(['start', '--id', 's2', '--root', repo])
    writeFileSync(join(target, 'g.txt'), 'y')
    git(['add', '-A'], target)
    git(['commit', '-m', 'wip'], target)

    const st = run(['stop', '--id', 's2', '--root', repo])
    assert.notEqual(st.code, 0)
    assert.ok(st.out.includes('refusing'), 'names the refusal')
    assert.ok(existsSync(target), 'worktree NOT removed')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
