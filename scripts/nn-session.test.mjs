import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync, lstatSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(here, 'nn-session.mjs')

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function mergeEnv(env) {
  return env ? { ...process.env, ...env } : process.env
}

function run(args, env) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: mergeEnv(env),
    }).trim()
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

/** Like run(), but keeps stderr too — for the install progress and warnings. */
function runAll(args, env) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: mergeEnv(env) })
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

/**
 * Baseline git repo built ONCE in `before()`; each test clones it via `fs.cpSync`
 * instead of repeating `git init`/`config`/`commit` (design D3).
 */
let TEMPLATE = null

before(() => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-tpl-'))
  const repo = join(base, 'repo')
  mkdirSync(repo, { recursive: true })
  git(['init', '-b', 'dev'], repo)
  git(['config', 'user.email', 't@test'], repo)
  git(['config', 'user.name', 't'], repo)
  writeFileSync(join(repo, 'f.txt'), 'x')
  git(['add', '-A'], repo)
  git(['commit', '-m', 'init'], repo)
  TEMPLATE = base
})

after(() => {
  if (TEMPLATE) rmSync(TEMPLATE, { recursive: true, force: true })
})

function makeRepo(base) {
  cpSync(TEMPLATE, base, { recursive: true })
  return join(base, 'repo')
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

test('start hydrates dependencies in the worktree (root and skills/nn-sources)', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-s3')
  try {
    const skill = join(repo, 'skills', 'nn-sources')
    mkdirSync(skill, { recursive: true })
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'r', version: '1.0.0' }))
    writeFileSync(join(skill, 'package.json'), JSON.stringify({ name: 's', version: '1.0.0' }))
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)

    // No package-lock.json (and no primary node_modules) -> real npm ci fallback, stubbed.
    const s = runAll(['start', '--id', 's3', '--root', repo], { NN_SESSION_TEST_NPM_STUB: '1' })
    assert.equal(s.code, 0)
    assert.ok(existsSync(join(target, 'node_modules')), 'root install ran in the worktree')
    assert.ok(existsSync(join(target, 'skills', 'nn-sources', 'node_modules')), 'nn-sources install ran')
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

test('start reuses matching node_modules via a junction without npm ci', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-j1')
  try {
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'r', version: '1.0.0' }))
    writeFileSync(join(repo, 'package-lock.json'), JSON.stringify({ name: 'r', version: '1.0.0', lockfileVersion: 3 }))
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    mkdirSync(join(repo, 'node_modules'), { recursive: true })
    writeFileSync(join(repo, 'node_modules', 'marker.txt'), 'primary')
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)

    const s = runAll(['start', '--id', 'j1', '--root', repo], { NN_SESSION_TEST_NPM_STUB: '1' })
    assert.equal(s.code, 0)
    assert.ok(lstatSync(join(target, 'node_modules')).isSymbolicLink(), 'junction created on lockfile match')
    assert.ok(s.out.includes('linked node_modules'), 'reports the junction reuse')
    assert.ok(!s.out.includes('npm ci'), 'no npm ci ran')
  } finally {
    run(['stop', '--id', 'j1', '--root', repo])
    rmSync(base, { recursive: true, force: true })
  }
})

test('start falls back to npm ci when the lockfiles differ', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-j2')
  try {
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'r', version: '1.0.0' }))
    writeFileSync(join(repo, 'package-lock.json'), JSON.stringify({ name: 'r', version: '1.0.0', lockfileVersion: 3 }))
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)
    // Primary checkout diverges from the committed lockfile (as after a dependency edit).
    writeFileSync(join(repo, 'package-lock.json'), JSON.stringify({ name: 'r', version: '2.0.0', lockfileVersion: 3 }))
    mkdirSync(join(repo, 'node_modules'), { recursive: true })

    const s = runAll(['start', '--id', 'j2', '--root', repo], { NN_SESSION_TEST_NPM_STUB: '1' })
    assert.equal(s.code, 0)
    assert.ok(!lstatSync(join(target, 'node_modules')).isSymbolicLink(), 'lockfile mismatch -> real install')
    assert.ok(s.out.includes('npm ci'), 'npm ci fallback ran')
  } finally {
    run(['stop', '--id', 'j2', '--root', repo])
    rmSync(base, { recursive: true, force: true })
  }
})

test('start --full-install forces a real npm ci even on a lockfile match', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-j3')
  try {
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'r', version: '1.0.0' }))
    writeFileSync(join(repo, 'package-lock.json'), JSON.stringify({ name: 'r', version: '1.0.0', lockfileVersion: 3 }))
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    mkdirSync(join(repo, 'node_modules'), { recursive: true })
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)

    const s = runAll(['start', '--id', 'j3', '--root', repo, '--full-install'], { NN_SESSION_TEST_NPM_STUB: '1' })
    assert.equal(s.code, 0)
    assert.ok(!lstatSync(join(target, 'node_modules')).isSymbolicLink(), '--full-install -> real install')
    assert.ok(s.out.includes('npm ci'), 'npm ci ran despite matching lockfiles')
    assert.ok(!s.out.includes('linked node_modules'), 'junction was not used')
  } finally {
    run(['stop', '--id', 'j3', '--root', repo])
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
  const srcDir = join(repo, 'iNNfo', 'packages', 'nn-core')
  mkdirSync(srcDir, { recursive: true })
  writeFileSync(join(srcDir, 'keep.txt'), 'keep')
  mkdirSync(join(repo, 'node_modules', '@cognnitive'), { recursive: true })
  symlinkSync(srcDir, join(repo, 'node_modules', '@cognnitive', 'nn-core'), 'junction')
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
