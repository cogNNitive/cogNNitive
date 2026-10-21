import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { collectBatchStatus, renderBatchStatus, parseWorktrees } from './batch-status.mjs'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'nn-session.mjs')

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function write(repo, rel, content) {
  const p = join(repo, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
}

/**
 * Builds the baseline fixture ONCE (origin bare + primary clone). Each test clones
 * it via `fs.cpSync` instead of paying for `git init`/`config`/`commit`/`tag`/`push`
 * subprocesses again (design D3).
 */
let TEMPLATE = null

before(() => {
  const base = mkdtempSync(join(tmpdir(), 'nn-batch-tpl-'))
  const origin = join(base, 'origin.git')
  const repo = join(base, 'repo')
  git(['init', '--bare', '-b', 'main', origin], base)
  mkdirSync(repo)
  git(['init', '-b', 'main'], repo)
  git(['config', 'user.email', 't@test'], repo)
  git(['config', 'user.name', 't'], repo)
  git(['remote', 'add', 'origin', origin], repo)
  write(repo, 'skills/a.txt', '1')
  write(repo, 'iNNfo/packages/nn-mcp/package.json', JSON.stringify({ version: '0.1.0' }))
  write(repo, 'iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js', 'v1')
  git(['add', '-A'], repo)
  git(['commit', '-m', 'init'], repo)
  git(['push', 'origin', 'main'], repo)
  for (const t of ['skills-v0.9.0', 'skills-v0.10.0', 'nn-mcp-v0.1.0']) git(['tag', '-a', t, '-m', t], repo)
  git(['push', 'origin', '--tags'], repo)
  git(['switch', '-c', 'dev'], repo)
  write(repo, 'skills/a.txt', '2')
  write(repo, 'iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js', 'v2')
  git(['add', '-A'], repo)
  git(['commit', '-m', 'feat: change'], repo)
  git(['push', 'origin', 'dev'], repo)
  TEMPLATE = {
    base,
    origin,
    repo,
    devSha: git(['rev-parse', 'origin/dev'], repo),
    mainSha: git(['rev-parse', 'origin/main'], repo),
  }
})

after(() => {
  if (TEMPLATE) rmSync(TEMPLATE.base, { recursive: true, force: true })
})

/**
 * Clone of the pristine template for one test. The copied remote URL still points at
 * the template's origin, so it is re-pointed at the clone's own bare origin.
 */
function makeFixture() {
  const base = mkdtempSync(join(tmpdir(), 'nn-batch-'))
  cpSync(TEMPLATE.base, base, { recursive: true })
  const repo = join(base, 'repo')
  const origin = join(base, 'origin.git')
  git(['remote', 'set-url', 'origin', origin], repo)
  return { base, repo, origin, devSha: TEMPLATE.devSha, mainSha: TEMPLATE.mainSha }
}

/** Injectable gh runner: answers `pr list` and the two `run list` shapes. */
function fakeGh(fx, { prs = [], devConclusion = 'success', devStatus = 'completed', active = [] } = {}) {
  return (args) => {
    if (args[0] === 'pr') return JSON.stringify(prs)
    const branch = args[args.indexOf('--branch') + 1]
    if (args.includes('--branch')) {
      const headSha = branch === 'dev' ? fx.devSha : fx.mainSha
      return JSON.stringify([{ headSha, headBranch: branch, status: devStatus, conclusion: devConclusion, url: 'u', name: 'CI & Verify' }])
    }
    const status = args[args.indexOf('--status') + 1]
    return JSON.stringify(active.filter((r) => r.status === status))
  }
}

const noGh = () => {
  throw new Error('gh unavailable')
}

function withFixture(fn) {
  const fx = makeFixture()
  try {
    fn(fx)
  } finally {
    rmSync(fx.base, { recursive: true, force: true })
  }
}

test('READY when dev is ahead, green, and nothing else is active', () => {
  withFixture((fx) => {
    const d = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx) })
    assert.equal(d.verdict, 'READY', d.reasons.join('; '))
    assert.deepEqual(d.counts, { behind: 0, ahead: 1 })
    assert.equal(d.commits.length, 1)
    assert.equal(d.commits[0].subject, 'feat: change')
    assert.ok(renderBatchStatus(d).includes('VERDICT: READY'))
  })
})

test('gh unavailable yields UNKNOWN, never READY, and does not crash', () => {
  withFixture((fx) => {
    const d = collectBatchStatus({ root: fx.repo, runGh: noGh })
    assert.equal(d.verdict, 'UNKNOWN')
    assert.equal(d.openPrs, null)
    assert.ok(renderBatchStatus(d).includes('unknown (gh unavailable)'))
  })
})

test('an open PR makes the batch NOT READY', () => {
  withFixture((fx) => {
    const prs = [{ number: 7, title: 'wip thing', headRefName: 'session/x', author: { login: 'a' } }]
    const d = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx, { prs }) })
    assert.equal(d.verdict, 'NOT READY')
    assert.ok(d.reasons.some((r) => r.includes('#7')))
  })
})

test('a red or pending dev tip is NOT READY', () => {
  withFixture((fx) => {
    const red = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx, { devConclusion: 'failure' }) })
    assert.equal(red.verdict, 'NOT READY')
    const pending = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx, { devStatus: 'in_progress', devConclusion: '' }) })
    assert.equal(pending.verdict, 'NOT READY')
  })
})

test('an in-progress run on another branch signals an active agent', () => {
  withFixture((fx) => {
    const active = [{ name: 'CI & Verify', headBranch: 'session/other', status: 'in_progress', url: 'u' }]
    const d = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx, { active }) })
    assert.equal(d.verdict, 'NOT READY')
    assert.ok(d.reasons.some((r) => r.includes('session/other')))
    const onDev = [{ name: 'CI & Verify', headBranch: 'dev', status: 'in_progress', url: 'u' }]
    assert.equal(collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx, { active: onDev }) }).verdict, 'READY')
  })
})

test('dev not ahead of main is NOT READY', () => {
  withFixture((fx) => {
    git(['push', 'origin', 'dev:main'], fx.repo)
    const d = collectBatchStatus({ root: fx.repo, runGh: fakeGh({ ...fx, mainSha: fx.devSha }) })
    assert.deepEqual(d.counts, { behind: 0, ahead: 0 })
    assert.equal(d.verdict, 'NOT READY')
  })
})

test('sibling worktrees: dirty and unbacked commits block, and are only read', () => {
  withFixture((fx) => {
    const wt = join(fx.base, 'cogNNitive-other')
    git(['worktree', 'add', '-b', 'session/other', wt, 'origin/dev'], fx.repo)
    const clean = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx) })
    assert.equal(clean.verdict, 'READY')
    assert.equal(clean.worktrees.length, 1)

    git(['config', 'user.email', 't@test'], wt)
    git(['config', 'user.name', 't'], wt)
    write(wt, 'new.txt', 'x')
    write(wt, 'new2.txt', 'x')
    git(['add', 'new.txt'], wt)
    git(['commit', '-m', 'local only'], wt)
    const before = git(['status', '--porcelain'], wt)

    const d = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx) })
    const w = d.worktrees[0]
    assert.equal(w.branch, 'session/other')
    assert.equal(w.dirtyFiles, 1)
    assert.equal(w.uniqueCommits, 1)
    assert.equal(w.unbacked, true)
    assert.equal(d.verdict, 'NOT READY')
    assert.ok(d.reasons.some((r) => r.includes('UNBACKED')))
    assert.ok(renderBatchStatus(d).includes('UNBACKED: local commits with no remote branch'))
    assert.equal(git(['status', '--porcelain'], wt), before, 'worktree untouched')

    git(['push', 'origin', 'session/other'], wt)
    const pushed = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx) }).worktrees[0]
    assert.equal(pushed.unbacked, false)
    assert.equal(pushed.onOrigin, true)
  })
})

test('the invoking worktree is not counted against the batch', () => {
  withFixture((fx) => {
    const wt = join(fx.base, 'cogNNitive-self')
    git(['worktree', 'add', '-b', 'session/self', wt, 'origin/dev'], fx.repo)
    write(wt, 'dirty.txt', 'x')
    const d = collectBatchStatus({ root: wt, runGh: fakeGh(fx) })
    assert.equal(d.worktrees.length, 0)
  })
})

test('releases: semver-sorted latest tag, changed files, and bump-needed flag', () => {
  withFixture((fx) => {
    const d = collectBatchStatus({ root: fx.repo, runGh: fakeGh(fx) })
    const by = Object.fromEntries(d.releases.map((r) => [r.key, r]))
    assert.deepEqual(Object.keys(by), ['skills', 'blueprints', 'nn-mcp', 'nn-console'])
    assert.equal(by.skills.latestTag, 'skills-v0.10.0', '0.10.0 sorts above 0.9.0')
    assert.equal(by.skills.changedFiles, 1)
    assert.equal(by.blueprints.latestTag, null)
    assert.equal(by.blueprints.changedFiles, 0)
    assert.equal(by['nn-mcp'].latestTag, 'nn-mcp-v0.1.0')
    assert.equal(by['nn-mcp'].changedFiles, 1)
    assert.equal(by['nn-mcp'].authoredVersion, '0.1.0')
    assert.equal(by['nn-mcp'].bumpNeeded, true)
    assert.equal(by.skills.bumpNeeded, false, 'skills has no authored version to compare')
    assert.ok(renderBatchStatus(d).includes('bump needed'))
  })
})

test('parseWorktrees reads porcelain blocks, detached HEADs included', () => {
  const out = parseWorktrees('worktree C:/a\nHEAD abc\nbranch refs/heads/dev\n\nworktree C:/b\nHEAD def\ndetached\n')
  assert.deepEqual(out.map((w) => w.branch), ['dev', null])
})

test('CLI: unreachable gh prints UNKNOWN and exits 0; --strict exits 1; --json parses', () => {
  withFixture((fx) => {
    const env = { ...process.env, NN_GH_BIN: 'nn-no-such-gh-binary' }
    const run = (extra) => spawnSync(process.execPath, [SCRIPT, 'batch-status', '--root', fx.repo, ...extra], { encoding: 'utf8', env })
    const plain = run([])
    assert.equal(plain.status, 0)
    assert.ok(plain.stdout.includes('VERDICT: UNKNOWN'))
    assert.equal(run(['--strict']).status, 1)
    const json = JSON.parse(run(['--json']).stdout)
    assert.equal(json.verdict, 'UNKNOWN')
    assert.equal(json.releases.length, 4)
  })
})
