#!/usr/bin/env node
'use strict';

/**
 * scripts/pre-push-check.test.js
 *
 * Unit + CLI tests for the pre-push gate: git stdin ref parsing, the `wip:`
 * session-branch fast-path decision, and concurrent freshness-guard failure
 * collection.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, 'pre-push-check.js');
const { parseRefLines, isWipFastPath, isNoCodePush, collectGuardFailures } = require('./pre-push-check.js');

let REPO;
let SHA0;
let SHA1;
let SHA2;
let SHA_DOCS;
let SHA_MIXED;

before(() => {
  REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-push-'));
  const g = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });
  g(['init', '-b', 'dev']);
  g(['config', 'user.email', 't@test']);
  g(['config', 'user.name', 't']);
  fs.writeFileSync(path.join(REPO, 'f.txt'), '0');
  g(['add', '-A']);
  g(['commit', '-m', 'init']);
  SHA0 = g(['rev-parse', 'HEAD']).trim();
  fs.writeFileSync(path.join(REPO, 'f.txt'), '1');
  g(['add', '-A']);
  g(['commit', '-m', 'wip:s: first']);
  SHA1 = g(['rev-parse', 'HEAD']).trim();
  fs.writeFileSync(path.join(REPO, 'f.txt'), '2');
  g(['add', '-A']);
  g(['commit', '-m', 'feat: second']);
  SHA2 = g(['rev-parse', 'HEAD']).trim();
  fs.mkdirSync(path.join(REPO, 'openspec', 'changes'), { recursive: true });
  fs.writeFileSync(path.join(REPO, 'openspec', 'changes', 'p.md'), 'plan');
  g(['add', '-A']);
  g(['commit', '-m', 'docs(openspec): plan']);
  SHA_DOCS = g(['rev-parse', 'HEAD']).trim();
  fs.writeFileSync(path.join(REPO, 'openspec', 'changes', 'p.md'), 'plan 2');
  fs.writeFileSync(path.join(REPO, 'f.txt'), '3');
  g(['add', '-A']);
  g(['commit', '-m', 'feat: mixed']);
  SHA_MIXED = g(['rev-parse', 'HEAD']).trim();
});

after(() => {
  if (REPO) fs.rmSync(REPO, { recursive: true, force: true });
});

/** One git pre-push stdin ref line. */
function line(remoteRef, localSha, remoteSha = SHA0, localRef = remoteRef) {
  return `${localRef} ${localSha} ${remoteRef} ${remoteSha}`;
}

test('parseRefLines reads four-field git stdin lines', () => {
  const lines = parseRefLines('refs/heads/s a refs/heads/s b\n\nrefs/tags/v c refs/tags/v d\n');
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], { localRef: 'refs/heads/s', localSha: 'a', remoteRef: 'refs/heads/s', remoteSha: 'b' });
  assert.equal(parseRefLines('').length, 0);
  assert.equal(parseRefLines(undefined).length, 0);
});

test('isWipFastPath is true for an all-wip: session branch push', () => {
  assert.equal(isWipFastPath(parseRefLines(line('refs/heads/session/x', SHA1)), REPO), true);
});

test('isWipFastPath is false when any pushed commit is not wip:', () => {
  assert.equal(isWipFastPath(parseRefLines(line('refs/heads/session/x', SHA2, SHA0)), REPO), false);
  assert.equal(isWipFastPath(parseRefLines(line('refs/heads/session/x', SHA2, SHA1)), REPO), false);
});

test('isWipFastPath is false for dev/main, new branches, and empty input', () => {
  assert.equal(isWipFastPath(parseRefLines(line('refs/heads/dev', SHA1)), REPO), false);
  assert.equal(isWipFastPath(parseRefLines(line('refs/heads/main', SHA1)), REPO), false);
  assert.equal(isWipFastPath(parseRefLines(line('refs/heads/session/x', SHA1, '0'.repeat(40))), REPO), false);
  assert.equal(isWipFastPath(parseRefLines(''), REPO), false);
});

test('isWipFastPath requires every pushed ref to be a wip: session branch', () => {
  const refs = parseRefLines(`${line('refs/heads/session/x', SHA1)}\n${line('refs/heads/dev', SHA1, SHA1)}`);
  assert.equal(isWipFastPath(refs, REPO), false);
});

test('isNoCodePush is true when every changed file is under openspec/', () => {
  assert.equal(isNoCodePush(parseRefLines(line('refs/heads/dev', SHA_DOCS, SHA2)), REPO), true);
});

test('isNoCodePush is false when any changed file is outside openspec/', () => {
  assert.equal(isNoCodePush(parseRefLines(line('refs/heads/dev', SHA_MIXED, SHA2)), REPO), false);
  assert.equal(isNoCodePush(parseRefLines(line('refs/heads/dev', SHA2, SHA1)), REPO), false);
});

test('isNoCodePush is false for new branches, empty diffs, and empty input', () => {
  assert.equal(isNoCodePush(parseRefLines(line('refs/heads/dev', SHA_DOCS, '0'.repeat(40))), REPO), false);
  assert.equal(isNoCodePush(parseRefLines(line('refs/heads/dev', SHA_DOCS, SHA_DOCS)), REPO), false);
  assert.equal(isNoCodePush(parseRefLines(''), REPO), false);
});

test('CLI skips the heavy pipeline for an openspec-only push', () => {
  const res = spawnSync(process.execPath, [SCRIPT, 'origin', 'file:///x'], {
    cwd: REPO,
    input: `${line('refs/heads/dev', SHA_DOCS, SHA2)}\n`,
    encoding: 'utf8',
    env: { ...process.env, NN_PRE_PUSH_ROOT: REPO },
  });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /no code changed/);
  assert.ok(!/freshness guards in \d+ms/.test(res.stdout), 'an openspec-only push must not run the guards');
});

test('collectGuardFailures runs every guard and collects all failures', async () => {
  const guards = [
    { id: 'a', desc: 'A', regen: 'a' },
    { id: 'b', desc: 'B', regen: 'b' },
    { id: 'c', desc: 'C', regen: 'c' },
  ];
  const seen = [];
  const results = await collectGuardFailures(guards, async (g) => {
    seen.push(g.id);
    return { status: g.id === 'b' ? 1 : 0 };
  });
  assert.deepEqual(seen.slice().sort(), ['a', 'b', 'c'], 'all guards ran');
  assert.equal(results.length, 1);
  assert.equal(results[0].guard.id, 'b');
});

test('collectGuardFailures runs the guards concurrently', async () => {
  let started = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const guards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const run = async () => {
    started += 1;
    if (started === 3) release();
    await gate; // a serial runner would deadlock here, so reaching the assertion proves concurrency
    return { status: 0 };
  };
  const results = await collectGuardFailures(guards, run);
  assert.equal(started, 3);
  assert.equal(results.length, 0);
});

test('CLI takes the fast-path for a wip: session push', () => {
  const res = spawnSync(process.execPath, [SCRIPT, 'origin', 'file:///x'], {
    cwd: REPO,
    input: `${line('refs/heads/session/x', SHA1)}\n`,
    encoding: 'utf8',
    env: { ...process.env, NN_PRE_PUSH_ROOT: REPO },
  });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /fast-path/);
});

test('CLI lets tag-only pushes through without the fast-path notice', () => {
  const res = spawnSync(process.execPath, [SCRIPT, 'origin', 'file:///x'], {
    cwd: REPO,
    input: `${line('refs/tags/v1', SHA1, '0'.repeat(40))}\n`,
    encoding: 'utf8',
    env: { ...process.env, NN_PRE_PUSH_ROOT: REPO },
  });
  assert.equal(res.status, 0, res.stderr);
  assert.ok(!/fast-path/.test(res.stdout), 'tag push must not be classified as a WIP fast-path');
});

test('CLI does not fast-path a non-wip session push', () => {
  const res = spawnSync(process.execPath, [SCRIPT, 'origin', 'file:///x'], {
    cwd: REPO,
    input: `${line('refs/heads/session/x', SHA2, SHA0)}\n`,
    encoding: 'utf8',
    env: { ...process.env, NN_PRE_PUSH_ROOT: REPO, NN_PRE_PUSH_SKIP_HEAVY: '1' },
  });
  assert.ok(!/fast-path/.test(res.stdout), 'a non-wip push must run the full pipeline');
  assert.match(res.stdout, /freshness guards/);
});
