import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync } from 'node:fs'
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

test('start junctions the primary node_modules', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  mkdirSync(join(repo, 'node_modules'), { recursive: true })
  const target = join(dirname(repo), 'cogNNitive-s3')
  try {
    const s = run(['start', '--id', 's3', '--root', repo])
    assert.equal(s.code, 0)
    // best-effort: either the junction exists, or the script warned and named npm install
    assert.ok(
      existsSync(join(target, 'node_modules')) || s.out.includes('WARNING'),
      'junction created or a WARNING was printed',
    )
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('start junctions workspace node_modules', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  mkdirSync(join(repo, 'iNNfo', 'packages', 'innfo-mcp', 'node_modules'), { recursive: true })
  mkdirSync(join(repo, 'iNNfo', 'apps', 'innfo-editor', 'node_modules'), { recursive: true })
  const target = join(dirname(repo), 'cogNNitive-s4')
  try {
    const s = run(['start', '--id', 's4', '--root', repo])
    assert.equal(s.code, 0)
    assert.ok(
      existsSync(join(target, 'iNNfo', 'packages', 'innfo-mcp', 'node_modules')),
      'package workspace node_modules junctioned',
    )
    assert.ok(
      existsSync(join(target, 'iNNfo', 'apps', 'innfo-editor', 'node_modules')),
      'app workspace node_modules junctioned',
    )
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

test('stop removes the node_modules junction without deleting primary sources', () => {
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
    const s = run(['start', '--id', 's5', '--root', repo])
    assert.equal(s.code, 0)
    assert.ok(existsSync(join(target, 'node_modules')), 'junction created')

    const st = run(['stop', '--id', 's5', '--root', repo])
    assert.equal(st.code, 0)
    assert.ok(!existsSync(target), 'worktree removed')
    assert.ok(existsSync(join(srcDir, 'keep.txt')), 'primary source survived the worktree removal')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
