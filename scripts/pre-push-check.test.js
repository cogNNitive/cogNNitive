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
const { parseRefLines, isSessionBranchPush, isNoCodePush, collectGuardFailures, classifyFailure, lintOutcome } =
  require('./pre-push-check.js');

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

test('isSessionBranchPush is true for any session branch push, wip: or not', () => {
  assert.equal(isSessionBranchPush(parseRefLines(line('refs/heads/session/x', SHA1))), true);
  assert.equal(isSessionBranchPush(parseRefLines(line('refs/heads/session/x', SHA2, SHA1))), true);
});

test('isSessionBranchPush is false for dev, main, and empty input', () => {
  assert.equal(isSessionBranchPush(parseRefLines(line('refs/heads/dev', SHA1))), false);
  assert.equal(isSessionBranchPush(parseRefLines(line('refs/heads/main', SHA1))), false);
  assert.equal(isSessionBranchPush(parseRefLines('')), false);
});

test('isSessionBranchPush requires every pushed ref to be a session branch', () => {
  const refs = parseRefLines(`${line('refs/heads/session/x', SHA1)}\n${line('refs/heads/dev', SHA1, SHA1)}`);
  assert.equal(isSessionBranchPush(refs), false);
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

test('CLI fast-paths a session push whatever the commit message', () => {
  const res = spawnSync(process.execPath, [SCRIPT, 'origin', 'file:///x'], {
    cwd: REPO,
    input: `${line('refs/heads/session/x', SHA2, SHA0)}\n`,
    encoding: 'utf8',
    env: { ...process.env, NN_PRE_PUSH_ROOT: REPO },
  });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /fast-path/);
});

test('CLI runs the full pipeline for a dev push', () => {
  const res = spawnSync(process.execPath, [SCRIPT, 'origin', 'file:///x'], {
    cwd: REPO,
    input: `${line('refs/heads/dev', SHA2, SHA0)}\n`,
    encoding: 'utf8',
    env: { ...process.env, NN_PRE_PUSH_ROOT: REPO, NN_PRE_PUSH_SKIP_HEAVY: '1' },
  });
  assert.ok(!/fast-path/.test(res.stdout), 'a dev push must run the full pipeline');
  assert.match(res.stdout, /freshness guards/);
});

test('classifyFailure separates "could not run" from "ran and said no"', () => {
  assert.equal(
    classifyFailure("Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@eslint/js' imported from eslint.config.mjs"),
    'unverified',
  );
  assert.equal(classifyFailure("Error: Cannot find module './lib/freshness-guards.js'"), 'unverified');
  assert.equal(classifyFailure("'tsc' is not recognized as an internal or external command"), 'unverified');
  assert.equal(
    classifyFailure('esbuild not found. Run `npm ci` in iNNfo/ so the hoisted esbuild/tsup dependency is available.', 2),
    'unverified',
    "a guard's exit-2 'cannot run' contract is not a verdict",
  );
  assert.equal(classifyFailure('blueprint-catalog: DRIFT - catalog.json is stale.', 1), 'failed');
  assert.equal(classifyFailure(' 3:1  error  no-unused-vars  foo is assigned a value but never used'), 'failed');
  assert.equal(classifyFailure(''), 'failed', 'a silent non-zero exit is still a failure');
  assert.equal(classifyFailure(undefined), 'failed');
});

test('lintOutcome reports a missing eslint as unverified, never as lint errors', () => {
  const missing = lintOutcome(path.join(REPO, 'node_modules', 'eslint', 'bin', 'eslint.js'), ['scripts/x.js']);
  assert.equal(missing.ok, false);
  assert.match(missing.unverified, /not installed/);
  assert.equal(missing.output, undefined, 'nothing is reported as a lint error');
});

test('lintOutcome reports lint errors when eslint actually ran', () => {
  const eslintPath = path.join(REPO, 'eslint-stub.js');
  fs.writeFileSync(eslintPath, '');
  const fakeSpawn = () => ({ status: 1, stdout: '', stderr: '1:1  error  no-undef\n' });
  const outcome = lintOutcome(eslintPath, ['scripts/x.js'], fakeSpawn);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.unverified, undefined);
  assert.match(outcome.output, /no-undef/);
});

test('lintOutcome reports a broken eslint config as unverified, naming the module it could not load', () => {
  const eslintPath = path.join(REPO, 'eslint-stub.js');
  fs.writeFileSync(eslintPath, '');
  const fakeSpawn = () => ({ status: 1, stdout: '', stderr: "Cannot find package '@eslint/js'\n  at file:///x/eslint.config.mjs" });
  const outcome = lintOutcome(eslintPath, ['scripts/x.js'], fakeSpawn);
  assert.equal(outcome.ok, false);
  assert.match(outcome.unverified, /could not/);
  assert.match(outcome.unverified, /@eslint\/js/, 'the reason names the module, not a stack frame');
  assert.equal(outcome.output, undefined);
});

test('lintOutcome picks the missing-module line over the throw that reported it', () => {
  const eslintPath = path.join(REPO, 'eslint-stub.js');
  fs.writeFileSync(eslintPath, '');
  const fakeSpawn = () => ({
    status: 1,
    stdout: '',
    stderr:
      'node:internal/modules/esm/utils:363\n    throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);\n' +
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsup' imported from /x/eslint.config.mjs",
  });
  const outcome = lintOutcome(eslintPath, ['scripts/x.js'], fakeSpawn);
  assert.match(outcome.unverified, /Cannot find package 'tsup'/);
  assert.doesNotMatch(outcome.unverified, /throw new ERR_MODULE_NOT_FOUND/);
});

test('CLI warns instead of failing when its tooling is absent from the checkout', () => {
  // A bare checkout: no node_modules, no installed eslint, no guard scripts. Every check here
  // is unverifiable, and none of them may claim a verdict.
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-push-bare-'));
  try {
    const g = (args) => execFileSync('git', args, { cwd: bare, encoding: 'utf8' });
    g(['init', '-b', 'dev']);
    g(['config', 'user.email', 't@test']);
    g(['config', 'user.name', 't']);
    fs.mkdirSync(path.join(bare, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(bare, 'scripts', 'x.js'), '// x\n');
    g(['add', '-A']);
    g(['commit', '-m', 'init']);
    const base = g(['rev-parse', 'HEAD']).trim();
    fs.writeFileSync(path.join(bare, 'scripts', 'x.js'), '// x2\n');
    g(['add', '-A']);
    g(['commit', '-m', 'fix: x']);
    const head = g(['rev-parse', 'HEAD']).trim();

    const res = spawnSync(process.execPath, [SCRIPT, 'origin', 'file:///x'], {
      cwd: bare,
      input: `${line('refs/heads/dev', head, base)}\n`,
      encoding: 'utf8',
      env: { ...process.env, NN_PRE_PUSH_ROOT: bare, NN_PRE_PUSH_SKIP_HEAVY: '' },
    });
    assert.equal(res.status, 0, `a bare checkout must not block on unverifiable checks: ${res.stderr}`);
    assert.match(res.stderr, /could not run/, 'it says the checks did not run');
    assert.match(res.stderr, /NOT verified/, 'it does not claim they passed');
    assert.match(res.stderr, /eslint/, 'it names the check that produced no verdict');
    assert.ok(!/eslint reported errors/.test(res.stderr), 'it never invents a lint verdict');
    assert.ok(!/is stale/.test(res.stderr), 'it never invents a staleness verdict');
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
  }
});
