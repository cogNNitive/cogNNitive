#!/usr/bin/env node
'use strict';

/**
 * scripts/verify.test.js
 *
 * Unit tests for the verify.js worker-pool, `--only` filtering, SLOW_SUITES
 * roster, and the batched `git cat-file --batch` hand-typed-facts scan.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const {
  buildSteps,
  filterSteps,
  resolveJobs,
  SLOW_SUITES,
  SERIAL_SUITES,
  checkHandTypedFactsAtRef,
  runVerification,
} = require('./verify.js');

const SCRIPTS_DIR = __dirname;

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function makeGitRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-test-'));
  git(['init', '-b', 'main'], root);
  git(['config', 'user.email', 't@test'], root);
  git(['config', 'user.name', 't'], root);
  git(['config', 'commit.gpgsign', 'false'], root);
  return root;
}

function commitAll(root, msg) {
  git(['add', '-A'], root);
  git(['commit', '-m', msg], root);
}

/** Read-only child-process guards that must be pool-eligible. */
const READ_ONLY_IDS = [
  'test-nn-sources',
  'test-vocabulary',
  'vocabulary-doc',
  'typecheck-scripts',
  'check-licenses',
  'preflight-primitives',
  'skills-manager-bundle',
  'skill-shared-rules',
  'blueprint-catalog',
  'core-mirror',
  'console-payload',
  'console-bundle',
  'canonical-registry',
  'samples-parity',
  'samples-version',
  'procedures-version',
  'usage-procedure',
  'version-parity',
  'docs-facts-drift',
  'template-immutability',
  'console-shells-fresh',
  'text-encoding',
  'brand-purge',
  'legacy-write',
  'nn-name-regex',
  'nn-name-invariant',
  'lineage-drift',
];

test('resolveJobs scales the default pool to min(8, max(1, floor(cpus*0.75)))', () => {
  assert.equal(resolveJobs([], {}, 8), 6, '8 cpus -> floor(6)');
  assert.equal(resolveJobs([], {}, 16), 8, 'capped at 8');
  assert.equal(resolveJobs([], {}, 12), 8, 'floor(9) capped at 8');
  assert.equal(resolveJobs([], {}, 4), 3);
  assert.equal(resolveJobs([], {}, 2), 1);
  assert.equal(resolveJobs([], {}, 1), 1, 'never below 1');
  assert.equal(resolveJobs(['--jobs=2'], {}, 16), 2, '--jobs wins');
  assert.equal(resolveJobs([], { VERIFY_JOBS: '5' }, 16), 5, 'VERIFY_JOBS next');
  assert.throws(() => resolveJobs(['--jobs=0'], {}, 8), /invalid job count/);
});

test('read-only guards are pool-eligible; mutating and in-process steps stay serial', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-steps-'));
  try {
    const steps = buildSteps(root);
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    for (const id of READ_ONLY_IDS) {
      assert.equal(byId[id]?.parallel, true, `${id} should carry parallel: true`);
    }
    for (const id of ['blueprint-inventory', 'console-shell', 'line-count', 'skill-script-refs']) {
      assert.equal(byId[id]?.parallel, undefined, `${id} should stay serial`);
    }
    // docs-facts-drift must be a child-process step (never an in-process run).
    assert.equal(typeof byId['docs-facts-drift'].run, 'undefined');
    assert.ok(Array.isArray(byId['docs-facts-drift'].args));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('SLOW_SUITES covers the suites that exceed 7s', () => {
  for (const suite of [
    'scripts/check-licenses.test.mjs',
    'scripts/generate-docs-facts.test.mjs',
    'scripts/pre-push-check.test.js',
    'scripts/skills-manager.test.js',
    'scripts/sync-samples.test.mjs',
    'scripts/verify.test.js',
    'test/console-draft-Reconcile.test.mjs',
    'test/console-golden-parity.test.mjs',
    'test/init-domain-blueprints.test.mjs',
  ]) {
    assert.ok(SLOW_SUITES.has(suite), `${suite} missing from SLOW_SUITES`);
  }
});

test('SERIAL_SUITES stay out of the fast pool and out of SLOW_SUITES', () => {
  for (const suite of SERIAL_SUITES) {
    assert.ok(!SLOW_SUITES.has(suite), `${suite} is both serial and fast-skipped`);
  }
});

test('--only filters steps by id and desc, and zero matches yields an empty list', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-only-'));
  try {
    const byId = buildSteps(root, { only: 'lineage-drift' });
    assert.equal(byId.length, 1);
    assert.equal(byId[0].id, 'lineage-drift');

    const byDesc = buildSteps(root, { only: 'Usage Procedure' });
    assert.ok(byDesc.some((s) => s.id === 'usage-procedure'), 'desc substring works');

    assert.deepEqual(buildSteps(root, { only: 'zzz-no-such-step' }), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('filterSteps matches id, desc, script, cmd, and args case-insensitively', () => {
  const steps = [
    { id: 'a', desc: 'Alpha', cmd: 'node', args: ['scripts/x.mjs'] },
    { id: 'b', desc: 'Beta', script: 'scripts/y.mjs', args: ['--check'] },
  ];
  assert.deepEqual(filterSteps(steps, 'ALPHA').map((s) => s.id), ['a']);
  assert.deepEqual(filterSteps(steps, 'y.mjs').map((s) => s.id), ['b']);
  assert.deepEqual(filterSteps(steps, '--check').map((s) => s.id), ['b']);
  assert.equal(filterSteps(steps, undefined).length, 2);
  assert.equal(filterSteps(steps, '').length, 2);
});

test('runVerification with a zero-match --only returns false without running steps', async () => {
  const ok = await runVerification({ only: 'zzz-no-such-step-xyz' });
  assert.equal(ok, false);
});

test('CLI --only with zero matches exits non-zero with a diagnostic', () => {
  const res = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'verify.js'), '--only=zzz-no-match'], {
    cwd: SCRIPTS_DIR,
    encoding: 'utf8',
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /matched no steps/);
});

test('checkHandTypedFactsAtRef detects a hand-typed tool count via batched git reads', () => {
  const root = makeGitRepo();
  try {
    const docs = path.join(root, 'docs', 'innfo', 'documentation');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(path.join(docs, 'innfo-mcp.md'), '# mcp\n\n9 MCP tools\n');
    commitAll(root, 'docs');
    const res = checkHandTypedFactsAtRef(root, 'HEAD', { scriptsDir: SCRIPTS_DIR });
    assert.equal(res.ok, false, res.output);
    assert.match(res.output, /FAIL: hand-typed tool-count/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('checkHandTypedFactsAtRef detects a hand-typed skill version from the manifest', () => {
  const root = makeGitRepo();
  try {
    fs.mkdirSync(path.join(root, 'manifest'), { recursive: true });
    fs.writeFileSync(path.join(root, 'manifest', 'source.yaml'), 'skills:\n  - name: nn-demo\n    description: demo\n');
    const docs = path.join(root, 'docs', 'skills', 'documentation');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(path.join(docs, 'demo.md'), 'nn-demo (V_0-1-2) is documented here\n');
    commitAll(root, 'docs');
    const res = checkHandTypedFactsAtRef(root, 'HEAD', { scriptsDir: SCRIPTS_DIR });
    assert.equal(res.ok, false, res.output);
    assert.match(res.output, /FAIL: hand-typed skill-version/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('checkHandTypedFactsAtRef passes on clean docs', () => {
  const root = makeGitRepo();
  try {
    const docs = path.join(root, 'docs', 'skills');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(path.join(docs, 'x.md'), '# clean\n\nNo counts or versions here.\n');
    commitAll(root, 'docs');
    const res = checkHandTypedFactsAtRef(root, 'HEAD', { scriptsDir: SCRIPTS_DIR });
    assert.equal(res.ok, true, res.output);
    assert.match(res.output, /OK: no hand-typed docs facts/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
