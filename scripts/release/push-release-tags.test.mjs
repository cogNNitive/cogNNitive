import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * scripts/release/push-release-tags.mjs — the tag step of `auto-tag`.
 *
 * The regression this pins (#725): the job pushed the planned tags one at a time
 * in a `bash -e` loop, so a single rejected push aborted the loop, the job failed,
 * and the `release` job that `needs` it was skipped — four tags created, zero
 * releases published, and a green run after a `--failed` rerun.
 *
 * The contract is: one atomic push, so a rejection leaves either every tag or none;
 * an existing tag at the same commit is success (idempotent rerun); an existing tag
 * at another commit is a hard error (never move a published tag).
 */

const SCRIPT = join(import.meta.dirname, 'push-release-tags.mjs')

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function commit(work, message) {
  writeFileSync(join(work, 'file.txt'), `${message}\n`)
  git(work, 'add', '.')
  git(work, 'commit', '-q', '-m', message)
  return git(work, 'rev-parse', 'HEAD').trim()
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'push-release-tags-'))
  const work = join(root, 'work')
  const origin = join(root, 'origin.git')
  mkdirSync(work)
  execFileSync('git', ['init', '-q', '--bare', origin], { stdio: 'ignore' })
  git(work, 'init', '-q')
  git(work, 'config', 'user.email', 'fixture@example.com')
  git(work, 'config', 'user.name', 'Fixture')
  git(work, 'config', 'commit.gpgsign', 'false')
  git(work, 'config', 'tag.gpgsign', 'false')
  git(work, 'remote', 'add', 'origin', origin)
  const sha = commit(work, 'first')
  git(work, 'push', '-q', 'origin', 'HEAD:refs/heads/main')
  return { root, work, origin, sha }
}

/** Rejects any push that carries `refs/tags/<name>`, like a remote refusing that ref. */
function rejectTag(origin, name) {
  const hooks = join(origin, 'hooks')
  mkdirSync(hooks, { recursive: true })
  const hook = join(hooks, 'pre-receive')
  writeFileSync(
    hook,
    [
      '#!/bin/sh',
      'status=0',
      'while read -r old new ref; do',
      `  if [ "$ref" = "refs/tags/${name}" ]; then`,
      `    echo "rejected: ${name}" >&2`,
      '    status=1',
      '  fi',
      'done',
      'exit $status',
      '',
    ].join('\n'),
    { mode: 0o755 },
  )
}

function remoteTags(origin) {
  const out = execFileSync('git', ['ls-remote', '--tags', '--refs', origin], { encoding: 'utf-8' })
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t')[1].replace('refs/tags/', ''))
    .sort()
}

function runScript(fixture, tags, sha = fixture.sha) {
  // The runner exports GITHUB_STEP_SUMMARY to every step, so a child that inherits
  // process.env writes the summary there instead of stdout. Scrub it: the summary
  // path has its own case.
  const env = {
    ...process.env,
    TAGS: JSON.stringify(tags),
    GITHUB_SHA: sha,
    PUSH_RELEASE_TAGS_ATTEMPTS: '1',
    PUSH_RELEASE_TAGS_DELAY_MS: '0',
  }
  delete env.GITHUB_STEP_SUMMARY
  return spawnSync(process.execPath, [SCRIPT], { cwd: fixture.work, encoding: 'utf-8', env })
}

describe('push-release-tags: one atomic push, idempotent, never moves a tag', () => {
  let fixture

  beforeEach(() => {
    fixture = makeFixture()
  })

  afterEach(() => {
    rmSync(fixture.root, { recursive: true, force: true })
  })

  it('pushes every planned tag and reports them', () => {
    const res = runScript(fixture, ['a-v1.0.0', 'b-v0.2.0'])

    assert.equal(res.status, 0, res.stderr)
    assert.deepEqual(remoteTags(fixture.origin), ['a-v1.0.0', 'b-v0.2.0'])
    assert.match(res.stdout, /a-v1\.0\.0/)
    assert.match(res.stdout, /b-v0\.2\.0/)
  })

  it('leaves NO tag behind when the remote rejects one of them (#725)', () => {
    rejectTag(fixture.origin, 'bad-v1')

    const res = runScript(fixture, ['a-v1.0.0', 'bad-v1', 'b-v0.2.0'])

    assert.notEqual(res.status, 0, 'a rejected tag must fail the step')
    // The whole point: the good tags did not land either, so the retry is a clean retry
    // instead of a half-tagged commit with no release run.
    assert.deepEqual(remoteTags(fixture.origin), [])
    assert.match(res.stderr, /bad-v1/)
  })

  it('succeeds on a rerun once the rejection is gone, with the same tag set', () => {
    rejectTag(fixture.origin, 'bad-v1')
    assert.notEqual(runScript(fixture, ['a-v1.0.0', 'bad-v1']).status, 0)

    rmSync(join(fixture.origin, 'hooks', 'pre-receive'))
    const res = runScript(fixture, ['a-v1.0.0', 'bad-v1'])

    assert.equal(res.status, 0, res.stderr)
    assert.deepEqual(remoteTags(fixture.origin), ['a-v1.0.0', 'bad-v1'])
  })

  it('treats a tag already at this commit as success (idempotent rerun)', () => {
    assert.equal(runScript(fixture, ['a-v1.0.0']).status, 0)

    const again = runScript(fixture, ['a-v1.0.0', 'b-v0.2.0'])

    assert.equal(again.status, 0, again.stderr)
    assert.deepEqual(remoteTags(fixture.origin), ['a-v1.0.0', 'b-v0.2.0'])
  })

  it('refuses to move a published tag and pushes nothing of that batch', () => {
    // A tag that already exists elsewhere: the release key was tagged at an older
    // commit, so re-tagging it here would rewrite published history.
    const other = commit(fixture.work, 'second')
    git(fixture.work, 'push', '-q', 'origin', 'HEAD:refs/heads/main')
    git(fixture.work, 'tag', '-a', 'moved-v1', '-m', 'release: moved-v1', other)
    git(fixture.work, 'push', '-q', 'origin', 'refs/tags/moved-v1')
    const before = git(fixture.origin, 'rev-parse', 'refs/tags/moved-v1^{commit}').trim()

    const res = runScript(fixture, ['moved-v1', 'new-v1'], fixture.sha)

    assert.notEqual(res.status, 0)
    assert.equal(git(fixture.origin, 'rev-parse', 'refs/tags/moved-v1^{commit}').trim(), before)
    // Atomic: the other tag in the batch did not land either.
    assert.ok(!remoteTags(fixture.origin).includes('new-v1'))
    assert.match(res.stderr, /moved-v1/)
  })

  it('does nothing on an empty plan', () => {
    const res = runScript(fixture, [])

    assert.equal(res.status, 0, res.stderr)
    assert.deepEqual(remoteTags(fixture.origin), [])
  })

  it('names the manual recovery when the push ultimately fails', () => {
    rejectTag(fixture.origin, 'bad-v1')

    const res = runScript(fixture, ['bad-v1'])

    assert.notEqual(res.status, 0)
    assert.match(res.stderr, /release\.yml/)
    assert.match(res.stderr, /publish=true/)
  })

  it('writes the step summary when the runner provides one', () => {
    const summary = join(fixture.root, 'summary.md')
    writeFileSync(summary, '')
    const res = spawnSync(process.execPath, [SCRIPT], {
      cwd: fixture.work,
      encoding: 'utf-8',
      env: {
        ...process.env,
        TAGS: JSON.stringify(['a-v1.0.0']),
        GITHUB_SHA: fixture.sha,
        GITHUB_STEP_SUMMARY: summary,
        PUSH_RELEASE_TAGS_ATTEMPTS: '1',
        PUSH_RELEASE_TAGS_DELAY_MS: '0',
      },
    })

    assert.equal(res.status, 0, res.stderr)
    assert.match(readFileSync(summary, 'utf-8'), /- `a-v1\.0\.0`/)
  })
})
