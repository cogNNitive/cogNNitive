import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  symlinkSync,
  lstatSync,
  cpSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(here, 'nn-session.mjs')

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
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

/** Like run(), but keeps stderr too - for the install progress and warnings. */
function runAll(args, env) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: mergeEnv(env) })
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

/**
 * Runs the script with a chosen working directory, the way a maintainer does when
 * the terminal sits inside a session worktree. Used to prove the DEFAULT_ROOT
 * resolution does not depend on where the script file lives.
 */
function runIn(cwd, args) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
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
  git(['init', '-b', 'main'], repo)
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

/** Commits one file in a session worktree and fast-forwards main to it: a session that landed. */
function landCommit(repo, worktree, file) {
  git(['merge', '-q', '--ff-only', 'main'], worktree)
  writeFileSync(join(worktree, file), file)
  git(['add', '-A'], worktree)
  git(['commit', '-m', `land ${file}`], worktree)
  git(['merge', '-q', '--ff-only', git(['rev-parse', 'HEAD'], worktree)], repo)
}

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

    const st = run(['stop', '--id', 's1', '--root', repo, '--force'])
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
    assert.ok(
      existsSync(join(target, 'skills', 'nn-sources', 'node_modules')),
      'nn-sources install ran',
    )
    assert.ok(
      !lstatSync(join(target, 'node_modules')).isSymbolicLink(),
      'a real directory, not a junction',
    )
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
    writeFileSync(
      join(repo, 'package-lock.json'),
      JSON.stringify({ name: 'r', version: '1.0.0', lockfileVersion: 3 }),
    )
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    mkdirSync(join(repo, 'node_modules'), { recursive: true })
    writeFileSync(join(repo, 'node_modules', 'marker.txt'), 'primary')
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)

    const s = runAll(['start', '--id', 'j1', '--root', repo], { NN_SESSION_TEST_NPM_STUB: '1' })
    assert.equal(s.code, 0)
    assert.ok(
      lstatSync(join(target, 'node_modules')).isSymbolicLink(),
      'junction created on lockfile match',
    )
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
    writeFileSync(
      join(repo, 'package-lock.json'),
      JSON.stringify({ name: 'r', version: '1.0.0', lockfileVersion: 3 }),
    )
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)
    // Primary checkout diverges from the committed lockfile (as after a dependency edit).
    writeFileSync(
      join(repo, 'package-lock.json'),
      JSON.stringify({ name: 'r', version: '2.0.0', lockfileVersion: 3 }),
    )
    mkdirSync(join(repo, 'node_modules'), { recursive: true })

    const s = runAll(['start', '--id', 'j2', '--root', repo], { NN_SESSION_TEST_NPM_STUB: '1' })
    assert.equal(s.code, 0)
    assert.ok(
      !lstatSync(join(target, 'node_modules')).isSymbolicLink(),
      'lockfile mismatch -> real install',
    )
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
    writeFileSync(
      join(repo, 'package-lock.json'),
      JSON.stringify({ name: 'r', version: '1.0.0', lockfileVersion: 3 }),
    )
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    mkdirSync(join(repo, 'node_modules'), { recursive: true })
    git(['add', '-A'], repo)
    git(['commit', '-m', 'deps'], repo)

    const s = runAll(['start', '--id', 'j3', '--root', repo, '--full-install'], {
      NN_SESSION_TEST_NPM_STUB: '1',
    })
    assert.equal(s.code, 0)
    assert.ok(
      !lstatSync(join(target, 'node_modules')).isSymbolicLink(),
      '--full-install -> real install',
    )
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

test('sweep skips a dirty merged worktree and still removes the clean ones', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const dirtyTarget = join(dirname(repo), 'cogNNitive-w1')
  const cleanTarget = join(dirname(repo), 'cogNNitive-w2')
  try {
    run(['start', '--id', 'w1', '--root', repo, '--no-install'])
    run(['start', '--id', 'w2', '--root', repo, '--no-install'])
    landCommit(repo, cleanTarget, 'w1-sibling.txt')
    landCommit(repo, dirtyTarget, 'w1.txt')
    writeFileSync(join(dirtyTarget, 'f.txt'), 'changed')

    const sw = runAll(['sweep', '--root', repo])
    assert.equal(sw.code, 0, sw.out)
    assert.ok(sw.out.includes('skipped session/w1'), 'names the skipped worktree')
    assert.ok(existsSync(dirtyTarget), 'dirty worktree kept')
    assert.ok(!existsSync(cleanTarget), 'clean merged worktree removed after the dirty one')
    assert.equal(git(['branch', '--list', 'session/w2'], repo), '', 'clean branch deleted')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('sweep refuses a session that only rebased and never committed', () => {
  // A rebase moves the ref without creating work, so the branch is still an ancestor of
  // main and reads as merged. Counting those entries as commits made the "no commits yet"
  // guard answer "may have work", and sweep removed a worktree whose agent was still
  // writing. main has to move first: rebasing onto the commit a branch already sits on is
  // a no-op that writes no reflog entry at all.
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-r1')
  try {
    run(['start', '--id', 'r1', '--root', repo, '--no-install'])
    writeFileSync(join(repo, 'main-moves.txt'), 'z')
    git(['add', '-A'], repo)
    git(['commit', '-q', '-m', 'main moves'], repo)
    git(['rebase', '-q', 'main'], target)

    // Precondition: the reflog proves a move and no commit, or this test proves nothing.
    const subjects = git(['reflog', 'show', '--format=%gs', 'refs/heads/session/r1'], repo)
    assert.match(subjects, /^rebase/m, `expected a rebase entry, got: ${subjects}`)
    assert.doesNotMatch(subjects, /^commit/m, `expected no commit entry, got: ${subjects}`)

    const sw = runAll(['sweep', '--root', repo])

    assert.equal(sw.code, 0, sw.out)
    assert.ok(sw.out.includes('skipped session/r1'), `refused: ${sw.out}`)
    assert.ok(existsSync(target), 'worktree kept')
    assert.notEqual(git(['branch', '--list', 'session/r1'], repo), '', 'branch kept')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('sweep removes a merged worktree by the path git reports, not a guessed one', () => {
  // #721: sweep rebuilt the path as `<parent>/cogNNitive-<id>`. A worktree created
  // anywhere else left the directory behind and the branch undeletable, because git
  // refuses to delete a branch that a live worktree has checked out.
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const odd = join(base, 'a-name-nothing-derives')
  try {
    git(['worktree', 'add', '-q', '--no-track', '-b', 'session/x1', odd, 'main'], repo)
    landCommit(repo, odd, 'x1.txt')

    const sw = runAll(['sweep', '--root', repo])

    assert.equal(sw.code, 0, sw.out)
    assert.ok(!existsSync(odd), `removed the reported path: ${sw.out}`)
    assert.equal(git(['branch', '--list', 'session/x1'], repo), '', 'branch deleted')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('sweep deletes a branch merged into main even when the primary is on another branch', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  try {
    git(['branch', 'dev'], repo)
    git(['checkout', '-q', '-b', 'session/m1'], repo)
    writeFileSync(join(repo, 'g.txt'), 'y')
    git(['add', '-A'], repo)
    git(['commit', '-m', 'feature'], repo)
    git(['checkout', '-q', 'main'], repo)
    git(['merge', '-q', '--ff-only', 'session/m1'], repo)
    git(['checkout', '-q', 'dev'], repo) // primary HEAD does not contain session/m1

    const sw = run(['sweep', '--root', repo])
    assert.equal(sw.code, 0, sw.out)
    assert.equal(git(['branch', '--list', 'session/m1'], repo), '', 'merged branch deleted')
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

    const st = run(['stop', '--id', 's5', '--root', repo, '--force'])
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
    assert.ok(s.out.includes('origin/main...main'), 'compares the primary against origin/main')
    assert.ok(!s.out.includes('origin/dev'), 'no dev integration branch')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

/**
 * A session worktree ships its own copy of this script, so running it from inside
 * one used to label that worktree "primary". The primary is the repo's main
 * worktree, which git lists first — not wherever the script happens to live.
 */
test('status names the primary checkout when run from inside a session worktree', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-label')
  try {
    assert.equal(run(['start', '--id', 'label', '--root', repo]).code, 0)
    const s = runIn(target, ['status'])
    assert.equal(s.code, 0)
    const line = s.out.split(/\r?\n/).find((l) => l.startsWith('- primary:'))
    assert.ok(line, 'primary line present')
    assert.ok(line.includes('main'), `primary line names the primary branch: ${line}`)
    assert.ok(!line.includes('session/label'), `primary line is not the worktree itself: ${line}`)
    assert.equal(
      git(['rev-parse', '--short', 'HEAD'], target).length > 0,
      true,
      'worktree is a real checkout',
    )
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

    const st = runAll(['stop', '--id', 's9', '--root', repo, '--force'])
    assert.equal(st.code, 0)
    assert.ok(!st.out.includes('at Object.'), 'no raw stack trace')
    assert.ok(!existsSync(target), 'empty leftover dir cleaned up')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('start cuts the session branch from origin/main, not a stale local main', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const origin = join(base, 'origin.git')
  const other = join(base, 'other')
  const target = join(dirname(repo), 'cogNNitive-b1')
  try {
    git(['init', '--bare', '-b', 'main', origin], base)
    git(['remote', 'add', 'origin', origin], repo)
    git(['push', 'origin', 'main'], repo)
    // Another clone advances origin/main; the primary's local main stays behind.
    git(['clone', origin, other], base)
    git(['config', 'user.email', 't@test'], other)
    git(['config', 'user.name', 't'], other)
    writeFileSync(join(other, 'newer.txt'), 'n')
    git(['add', '-A'], other)
    git(['commit', '-m', 'newer'], other)
    git(['push', 'origin', 'main'], other)
    const tip = git(['rev-parse', 'HEAD'], other)
    assert.notEqual(git(['rev-parse', 'main'], repo), tip, 'precondition: local main is behind')

    const s = run(['start', '--id', 'b1', '--root', repo, '--no-install'])
    assert.equal(s.code, 0)
    assert.equal(
      git(['rev-parse', 'HEAD'], target),
      tip,
      'session HEAD is the fetched origin/main tip',
    )
    assert.ok(existsSync(join(target, 'newer.txt')), 'worktree has the commit local main lacks')
  } finally {
    run(['stop', '--id', 'b1', '--root', repo])
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

test('sweep keeps a clean session that never committed: git reads it as merged, but it is live', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-e1')
  try {
    run(['start', '--id', 'e1', '--root', repo, '--no-install'])

    const sw = runAll(['sweep', '--root', repo])
    assert.equal(sw.code, 0, sw.out)
    assert.ok(sw.out.includes('skipped session/e1'), 'names the skipped session')
    assert.ok(sw.out.includes('no commits yet'), 'says why')
    assert.ok(existsSync(target), 'worktree kept')
    assert.notEqual(git(['branch', '--list', 'session/e1'], repo), '', 'branch kept')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('stop refuses a session that never committed unless --force', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-e2')
  try {
    run(['start', '--id', 'e2', '--root', repo, '--no-install'])

    const st = run(['stop', '--id', 'e2', '--root', repo])
    assert.notEqual(st.code, 0)
    assert.ok(st.out.includes('refusing: session/e2 has no commits yet'), st.out)
    assert.ok(st.out.includes('--force'), 'names the way out')
    assert.ok(existsSync(target), 'worktree NOT removed')

    const forced = run(['stop', '--id', 'e2', '--root', repo, '--force'])
    assert.equal(forced.code, 0, forced.out)
    assert.ok(!existsSync(target), 'worktree removed with --force')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('stop removes a session whose commits landed on main, without --force', () => {
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const target = join(dirname(repo), 'cogNNitive-e3')
  try {
    run(['start', '--id', 'e3', '--root', repo, '--no-install'])
    landCommit(repo, target, 'e3.txt')

    const st = run(['stop', '--id', 'e3', '--root', repo])
    assert.equal(st.code, 0, st.out)
    assert.ok(!existsSync(target), 'landed worktree removed')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('--help prints usage and mutates nothing', () => {
  // #770: `--help` was ignored as an unknown flag, so `start --help` cut a session
  // branch from origin/main and created a worktree named after the host and pid.
  // Asking for help must never run anything.
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  try {
    const worktreesBefore = git(['worktree', 'list', '--porcelain'], repo)
    const invocations = [
      ['--help', '--root', repo],
      ['-h', '--root', repo],
      ['help', '--root', repo],
      ['start', '--help', '--root', repo],
      ['sweep', '--help', '--root', repo],
    ]
    for (const args of invocations) {
      const r = run(args)
      assert.equal(r.code, 0, `${args.join(' ')} must exit 0: ${r.out}`)
      assert.match(r.out, /usage: nn-session\.mjs start\|list\|status\|stop\|sweep/)
    }
    assert.equal(
      git(['worktree', 'list', '--porcelain'], repo),
      worktreesBefore,
      'no worktree created',
    )
    assert.equal(git(['branch', '--list', 'session/*'], repo), '', 'no session branch created')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('stop --id removes the worktree git reports, not a guessed path', () => {
  // #721: `stop --id` rebuilt `<parent>/cogNNitive-<id>`, found nothing, and still
  // printed `removed` while the real directory survived and kept its branch alive.
  const base = mkdtempSync(join(tmpdir(), 'nn-session-'))
  const repo = makeRepo(base)
  const odd = join(base, 'a-name-nothing-derives')
  try {
    git(['worktree', 'add', '-q', '--no-track', '-b', 'session/x2', odd, 'main'], repo)
    landCommit(repo, odd, 'x2.txt')

    const st = runAll(['stop', '--id', 'x2', '--root', repo])

    assert.equal(st.code, 0, st.out)
    assert.ok(!existsSync(odd), `removed the reported path: ${st.out}`)
    assert.match(st.out, /removed /)
    assert.equal(git(['branch', '--list', 'session/x2'], repo), '', 'branch deleted')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
