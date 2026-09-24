#!/usr/bin/env node

/**
 * scripts/node-engine-check.test.js
 *
 * Plain-node tests for scripts/lib/node-engine-check.js:
 * 1. Unit tests of the hand-rolled range satisfier against jsdom's real
 *    `engines.node` range.
 * 2. Integration-style tests against a synthetic repo tree (fake CI
 *    workflow, root package.json, and node_modules) asserting the top-level
 *    checkNodeEngines() function reports mismatches, warnings, and skips
 *    correctly.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkNodeEngines, satisfiesRange } = require('./lib/node-engine-check.js');

const JSDOM_RANGE = '^22.22.2 || ^24.15.0 || >=26.0.0';

function makeSyntheticRepo({
  ciNodeVersions = ['22', '22', '22'],
  rootPkg = { name: 'cognnitive', workspaces: ['pkgs/*'] },
  workspacePackages = {}, // { 'pkgs/foo': { 'some-dep': '^22.22.2 || ^24.15.0 || >=26.0.0' } }
  rootNodeModules = null, // { 'some-dep': '^22.22.2 || ^24.15.0 || >=26.0.0' } or null to omit node_modules entirely
} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-engine-check-'));

  const ciDir = path.join(dir, '.github', 'workflows');
  fs.mkdirSync(ciDir, { recursive: true });
  const ciLines = ciNodeVersions
    .map(
      (v, i) => `  job${i}:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: ${v}\n`,
    )
    .join('\n');
  fs.writeFileSync(path.join(ciDir, 'ci.yml'), `name: CI\njobs:\n${ciLines}`, 'utf8');

  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(rootPkg, null, 2), 'utf8');

  if (rootNodeModules) {
    for (const [depName, engineNode] of Object.entries(rootNodeModules)) {
      const depDir = path.join(dir, 'node_modules', depName);
      fs.mkdirSync(depDir, { recursive: true });
      fs.writeFileSync(
        path.join(depDir, 'package.json'),
        JSON.stringify({ name: depName, version: '1.0.0', engines: { node: engineNode } }, null, 2),
        'utf8',
      );
    }
  }

  for (const [wsRelPath, deps] of Object.entries(workspacePackages)) {
    const wsDir = path.join(dir, ...wsRelPath.split('/'));
    fs.mkdirSync(wsDir, { recursive: true });
    for (const [depName, engineNode] of Object.entries(deps)) {
      const depDir = path.join(wsDir, 'node_modules', depName);
      fs.mkdirSync(depDir, { recursive: true });
      fs.writeFileSync(
        path.join(depDir, 'package.json'),
        JSON.stringify({ name: depName, version: '1.0.0', engines: { node: engineNode } }, null, 2),
        'utf8',
      );
    }
  }

  return dir;
}

function withRepo(options, fn) {
  const dir = makeSyntheticRepo(options);
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  console.log('Running node-engine-check unit tests...');

  // --- Range satisfier unit tests (jsdom's real range) ---
  assert.strictEqual(satisfiesRange('22.22.2', JSDOM_RANGE), true, '22.22.2 must satisfy jsdom range');
  assert.strictEqual(satisfiesRange('20.0.0', JSDOM_RANGE), false, '20.0.0 must NOT satisfy jsdom range');
  assert.strictEqual(satisfiesRange('24.15.0', JSDOM_RANGE), true, '24.15.0 must satisfy jsdom range');
  assert.strictEqual(satisfiesRange('26.0.1', JSDOM_RANGE), true, '26.0.1 must satisfy jsdom range');
  assert.strictEqual(satisfiesRange('21.0.0', JSDOM_RANGE), false, '21.0.0 must NOT satisfy jsdom range');
  console.log('✔ Range satisfier matches jsdom real-world range for all 5 cases');

  // Extra comparator coverage: ~ and bare/= and >=.
  // ~18.4.0 == >=18.4.0 <18.5.0 (patch-level only, upper bound exclusive).
  assert.strictEqual(satisfiesRange('18.4.9', '~18.4.0'), true);
  assert.strictEqual(satisfiesRange('18.5.0', '~18.4.0'), false);
  assert.strictEqual(satisfiesRange('18.0.0', '18.0.0'), true);
  assert.strictEqual(satisfiesRange('18.0.1', '18.0.0'), false);
  assert.strictEqual(satisfiesRange('20.0.0', '>=18'), true);
  console.log('✔ Range satisfier handles ~, bare/=, and >= comparators');

  // Real-world engines.node fields put a space between operator and version
  // (e.g. express: ">= 18", postcss-js: "^12 || ^14 || >= 16").
  assert.strictEqual(satisfiesRange('22.0.0', '>= 18'), true);
  assert.strictEqual(satisfiesRange('16.0.0', '>= 18'), false);
  assert.strictEqual(satisfiesRange('22.0.0', '^12 || ^14 || >= 16'), true);
  console.log('✔ Range satisfier handles a space between operator and version');

  // --- Integration tests ---

  // 1. No node_modules anywhere -> ok, with a skip warning, no errors.
  withRepo({}, (dir) => {
    const r = checkNodeEngines(dir);
    assert.strictEqual(r.ok, true, r.errors.join('; '));
    assert.deepStrictEqual(r.errors, []);
    assert.ok(r.warnings.some((w) => w.includes('not found under .')), r.warnings.join('; '));
    console.log('✔ Missing node_modules is a warning, not a failure');
  });

  // 2. Root node_modules has an incompatible package -> fails, names it.
  withRepo(
    {
      ciNodeVersions: ['20', '20', '20'],
      rootNodeModules: { jsdom: JSDOM_RANGE },
    },
    (dir) => {
      const r = checkNodeEngines(dir);
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some((e) => e.includes('jsdom') && e.includes('20')), r.errors.join('; '));
      console.log('✔ Incompatible root dependency vs CI-pinned Node fails');
    },
  );

  // 3. Compatible package at the pinned CI version -> ok.
  withRepo(
    {
      ciNodeVersions: ['22', '22', '22'],
      rootNodeModules: { jsdom: JSDOM_RANGE },
    },
    (dir) => {
      const r = checkNodeEngines(dir);
      assert.strictEqual(r.ok, true, r.errors.join('; '));
      console.log('✔ Compatible root dependency vs CI-pinned Node passes');
    },
  );

  // 4. Workspace package (under expanded pkgs/*) incompatible -> fails.
  withRepo(
    {
      ciNodeVersions: ['20', '20', '20'],
      rootPkg: { name: 'cognnitive', workspaces: ['pkgs/*'] },
      workspacePackages: { 'pkgs/foo': { jsdom: JSDOM_RANGE } },
    },
    (dir) => {
      const r = checkNodeEngines(dir);
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some((e) => e.includes('jsdom') && e.includes('pkgs')), r.errors.join('; '));
      console.log('✔ Incompatible workspace dependency fails and names the workspace');
    },
  );

  // 5. Real-world spaced range (">= 18") against a bare major CI pin ("22")
  //    must pass, not false-positive (regression: the AND tokenizer used to
  //    split "op<space>version" into two meaningless tokens).
  withRepo(
    {
      ciNodeVersions: ['22', '22', '22'],
      rootNodeModules: { express: '>= 18' },
    },
    (dir) => {
      const r = checkNodeEngines(dir);
      assert.strictEqual(r.ok, true, r.errors.join('; '));
      console.log('✔ Spaced ">= 18" range vs bare major "22" CI pin passes');
    },
  );

  // 6. CI node-version values disagree with each other -> warning, not a failure.
  withRepo({ ciNodeVersions: ['20', '22', '22'] }, (dir) => {
    const r = checkNodeEngines(dir);
    assert.strictEqual(r.ok, true, r.errors.join('; '));
    assert.ok(r.warnings.some((w) => w.includes('disagree')), r.warnings.join('; '));
    console.log('✔ Disagreeing CI node-version values produce a warning');
  });

  console.log('All node-engine-check unit tests passed successfully!');
}

main();
