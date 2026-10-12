import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync, lstatSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
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

/** Like run(), but keeps stderr too — for the install progress and warnings. */
function runAll(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
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

test('start installs real dependencies in the worktree (root and skills/nn-sources)', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s3')
  try {
    // A file: dependency keeps `npm ci` offline while still producing node_modules.
    const lib = join(repo, 'lib')
    mkdirSync(lib, { recursive: true })
    writeFileSync(join(lib, 'package.json'), JSON.stringify({ name: 'nn-test-lib', version: '1.0.0' }))
    const skill = join(repo, 'skills', 'nn-sources')
    mkdirSync(skill, { recursive: true })
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'r', version: '1.0.0', dependencies: { 'nn-test-lib': 'file:./lib' } }))
    writeFileSync(join(skill, 'package.json'), JSON.stringify({ name: 's', version: '1.0.0', dependencies: { 'nn-test-lib': 'file:../../lib' } }))
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    for (const dir of [repo, skill]) execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: dir, stdio: 'ignore', shell: process.platform === 'win32' })
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)

    const s = run(['start', '--id', 's3', '--root', repo])
    assert.equal(s.code, 0)
    assert.ok(existsSync(join(target, 'node_modules', 'nn-test-lib')), 'root install ran in the worktree')
    assert.ok(existsSync(join(target, 'skills', 'nn-sources', 'node_modules', 'nn-test-lib')), 'nn-sources install ran')
    assert.ok(!lstatSync(join(target, 'node_modules')).isSymbolicLink(), 'a real directory, not a junction')
  } finally {
    run(['stop', '--id', 's3', '--root', repo])
    rmSync(base, { recursive: true, force: true })
  }
})

test('start --no-install skips the install', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s4')
  try {
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'r', version: '1.0.0' }))
    git(['add', '-A'], repo)
    git(['commit', '-m', 'pkg'], repo)

    const s = runAll(['start', '--id', 's4', '--root', repo, '--no-install'])
    assert.equal(s.code, 0)
    assert.ok(!s.out.includes('npm ci'), 'no install attempted')
    assert.ok(!existsSync(join(target, 'node_modules')), 'no node_modules created')
  } finally {
    run(['stop', '--id', 's4', '--root', repo])
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

test('list shows the branch of each session worktree, not (detached)', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  try {
    run(['start', '--id', 's6', '--root', repo])
    const l = run(['list', '--root', repo])
    assert.equal(l.code, 0)
    assert.ok(l.out.includes('[session/s6]'), 'session branch listed')
    assert.ok(!l.out.includes('(detached)'), 'nothing reported as detached')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('stop refuses a dirty worktree with an explanation instead of crashing', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s7')
  try {
    run(['start', '--id', 's7', '--root', repo])
    writeFileSync(join(target, 'f.txt'), 'changed')

    const st = run(['stop', '--id', 's7', '--root', repo])
    assert.notEqual(st.code, 0)
    assert.ok(st.out.includes('uncommitted changes'), 'names the dirty-tree refusal')
    assert.ok(!st.out.includes('at genericNodeError'), 'no raw stack trace')
    assert.ok(existsSync(target), 'worktree NOT removed')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('stop removes a legacy node_modules junction without deleting primary sources', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  // Mimic npm workspaces: a primary source dir, and a symlink to it inside
  // node_modules. A recursive worktree delete that followed the junction into
  // the primary's node_modules would then follow this symlink and delete the
  // source dir (the data-loss bug this test guards).
  const srcDir = join(repo, 'iNNfo', 'packages', 'innfo-core')
  mkdirSync(srcDir, { recursive: true })
  writeFileSync(join(srcDir, 'keep.txt'), 'keep')
  mkdirSync(join(repo, 'node_modules', '@cognnitive'), { recursive: true })
  symlinkSync(srcDir, join(repo, 'node_modules', '@cognnitive', 'innfo-core'), 'junction')
  writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
  git(['add', '.gitignore'], repo)
  git(['commit', '-m', 'ignore node_modules'], repo)

  const target = join(dirname(repo), 'cogNNitive-s5')
  try {
    const s = run(['start', '--id', 's5', '--root', repo, '--no-install'])
    assert.equal(s.code, 0)
    // Legacy worktree: node_modules is a junction into the primary (pre-real-install era).
    symlinkSync(join(repo, 'node_modules'), join(target, 'node_modules'), 'junction')
    assert.ok(existsSync(join(target, 'node_modules')), 'junction in place')

    const st = run(['stop', '--id', 's5', '--root', repo])
    assert.equal(st.code, 0)
    assert.ok(!existsSync(target), 'worktree removed')
    assert.ok(existsSync(join(srcDir, 'keep.txt')), 'primary source survived the worktree removal')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('status prints a one-block health report and exits 0', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  try {
    const s = run(['status', '--root', repo])
    assert.equal(s.code, 0)
    assert.ok(s.out.includes('nn-session status'), 'header')
    assert.ok(s.out.includes('primary:'), 'primary line')
    assert.ok(s.out.includes('worktrees:'), 'worktree block')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('stop tolerates a deregistered, empty leftover dir without crashing', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s9')
  try {
    run(['start', '--id', 's9', '--root', repo])
    // Simulate #1982: the worktree is deregistered and removed, but a Windows
    // process lock leaves an empty directory behind.
    git(['worktree', 'remove', target], repo)
    mkdirSync(target, { recursive: true })

    const st = runAll(['stop', '--id', 's9', '--root', repo])
    assert.equal(st.code, 0)
    assert.ok(!st.out.includes('at Object.'), 'no raw stack trace')
    assert.ok(!existsSync(target), 'empty leftover dir cleaned up')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('start leaves an existing worktree alone (no reinstall)', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s10')
  try {
    run(['start', '--id', 's10', '--root', repo, '--no-install'])
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'r', version: '1.0.0' }))
    const s = runAll(['start', '--id', 's10', '--root', repo])
    assert.equal(s.code, 0)
    assert.equal(s.out.trim(), target)
    assert.ok(!s.out.includes('npm ci'), 'second start does not install')
  } finally {
    run(['stop', '--id', 's10', '--root', repo])
    rmSync(base, { recursive: true, force: true })
  }
})
