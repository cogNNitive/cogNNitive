#!/usr/bin/env node
'use strict';

/**
 * scripts/lib/regen-gate.test.js
 *
 * Behaviour tests for the derived-artifact gate (`npm run check:regen`): the pass runs
 * first, then a tracked-path diff decides. Every case runs git for real against a
 * throwaway repository in the OS temp dir — never this repository's history — and
 * asserts through the public interface of the module (`checkRegen`, `listChangedPaths`,
 * `parseRegenMode`, `formatFailure`), not its internals.
 *
 * The last block asserts the wiring in `scripts/verify.js`: the twelve per-artifact
 * freshness steps are one gate, the gate is serial, and `--fast` leaves it out.
 */

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const {
  REGEN_EXCLUDED_PATHS,
  checkRegen,
  formatFailure,
  listChangedPaths,
  parseRegenMode,
} = require('./regen-gate.js');
const { FRESHNESS_GUARDS } = require('./freshness-guards.js');
const { buildSteps } = require('../verify.js');

const repoRoot = path.resolve(__dirname, '..', '..');

/** Runs git in `cwd` and returns trimmed stdout. */
function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** Creates a throwaway git repository with `files` committed on `main`. */
function makeRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-gate-test-'));
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.email', 't@test');
  git(root, 'config', 'user.name', 't');
  git(root, 'config', 'commit.gpgsign', 'false');
  writeFiles(root, files);
  git(root, 'add', '-A');
  git(root, 'commit', '-m', 'committed state');
  return root;
}

/** Writes `{ relativePath: content }` under `root`, creating parent directories. */
function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel.split('/').join(path.sep));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
}

const EXCLUDED = REGEN_EXCLUDED_PATHS[0].path;

test('parseRegenMode reads --check as the gate and anything else as a write pass', () => {
  assert.equal(parseRegenMode([]), 'write', 'npm run regen writes');
  assert.equal(parseRegenMode(['--check']), 'check', 'npm run check:regen compares');
  assert.equal(parseRegenMode(['--verbose', '--check']), 'check', '--check wins next to another flag');
  assert.equal(parseRegenMode(['--checker']), 'write', 'only the exact flag counts');
});

test('listChangedPaths reports tracked changes and ignores an untracked file', () => {
  const root = makeRepo({ 'src.ts': 'one\n', 'art.js': 'generated one\n' });
  try {
    assert.deepEqual(listChangedPaths({ root }), { ok: true, paths: [] }, 'a clean tree has no drift');

    writeFiles(root, { 'art.js': 'generated two\n' });
    assert.deepEqual(listChangedPaths({ root }).paths, ['art.js'], 'a rewritten artifact is drift');

    writeFiles(root, { 'notes.txt': 'scratch\n' });
    assert.deepEqual(
      listChangedPaths({ root }).paths,
      ['art.js'],
      'an untracked scratch file is not drift: the gate compares tracked paths only',
    );

    fs.rmSync(path.join(root, 'art.js'));
    assert.deepEqual(listChangedPaths({ root }).paths, ['art.js'], 'a deleted artifact is drift too');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('listChangedPaths leaves the release-state catalog out of the judgement', () => {
  const root = makeRepo({ [EXCLUDED]: '{"release_tag":"blueprints-v1.0.0"}\n', 'other.json': '{}\n' });
  try {
    writeFiles(root, { [EXCLUDED]: '{"release_tag":null}\n' });
    assert.deepEqual(
      listChangedPaths({ root }).paths,
      [],
      'the catalog encodes git tag state, so only its --check can judge it',
    );

    writeFiles(root, { 'other.json': '{"x":1}\n' });
    assert.deepEqual(listChangedPaths({ root }).paths, ['other.json'], 'everything else is judged');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('listChangedPaths reports a clear error outside a git work tree', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-gate-nogit-'));
  try {
    const res = listChangedPaths({ root });
    assert.equal(res.ok, false, 'no git means no comparison');
    assert.match(String(res.error), /git/i, 'the error names the failing tool');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('formatFailure names every path and the command that fixes it', () => {
  const message = formatFailure(['a/b.js', 'c/d.cjs']);
  assert.match(message, /a\/b\.js/, 'first path listed');
  assert.match(message, /c\/d\.cjs/, 'second path listed');
  assert.match(message, /2 path\(s\)/, 'the count is stated');
  assert.match(message, /npm run regen/, 'the fix command is printed');
});

test('checkRegen is green when the pass changes nothing and leaves the tree untouched', () => {
  const root = makeRepo({ 'art.js': 'generated\n' });
  try {
    let ran = 0;
    const res = checkRegen({ root, runPass: () => ((ran += 1), { status: 0, output: '' }) });
    assert.equal(ran, 1, 'the pass runs');
    assert.equal(res.ok, true, 'nothing changed: green');
    assert.deepEqual(res.paths, [], 'no paths reported');
    assert.equal(git(root, 'status', '--porcelain'), '', 'a passing gate leaves the tree clean');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('checkRegen goes red on a stale artifact and names it', () => {
  const root = makeRepo({ 'src.ts': 'v2\n', 'art.js': 'generated from v1\n' });
  try {
    // The pass reproduces the artifact from the source, exactly as `npm run regen` does.
    const res = checkRegen({
      root,
      runPass: () => {
        writeFiles(root, { 'art.js': 'generated from v2\n' });
        return { status: 0, output: '' };
      },
    });
    assert.equal(res.ok, false, 'a pass that moves a tracked path is drift');
    assert.deepEqual(res.paths, ['art.js'], 'the stale artifact is the one named');
    assert.match(res.message, /art\.js/);
    assert.match(res.message, /npm run regen/, 'the reader is told how to fix it');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('checkRegen is green when only the release-state catalog moved', () => {
  const root = makeRepo({ [EXCLUDED]: '{"release_tag":"blueprints-v1.0.0"}\n', 'art.js': 'generated\n' });
  try {
    const res = checkRegen({
      root,
      runPass: () => {
        writeFiles(root, { [EXCLUDED]: '{"release_tag":"blueprints-v1.1.0"}\n' });
        return { status: 0, output: '' };
      },
    });
    assert.equal(res.ok, true, 'tag state alone is not drift');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('checkRegen judges only what the pass moved, not the edits the author already had', () => {
  const root = makeRepo({ 'src.ts': 'v1\n', 'art.js': 'generated from v1\n' });
  try {
    // The author's work in progress: a source edit not committed yet. The pass rewrites
    // the artifact from it. That is the normal `npm run regen` loop, not drift.
    writeFiles(root, { 'src.ts': 'v2\n' });
    const res = checkRegen({
      root,
      runPass: () => {
        writeFiles(root, { 'art.js': 'generated from v2\n' });
        return { status: 0, output: '' };
      },
    });
    assert.equal(res.ok, false, 'the artifact itself is newly dirty: that IS drift');
    assert.deepEqual(res.paths, ['art.js'], 'only the path the pass moved is reported');
    assert.equal(res.paths.includes('src.ts'), false, "the author's own edit is not the gate's business");

    // Now the same artifact is already modified before the pass runs; rewriting it again
    // cannot be attributed to the pass, so it is not reported.
    const again = checkRegen({
      root,
      runPass: () => {
        writeFiles(root, { 'art.js': 'generated from v2, second run\n' });
        return { status: 0, output: '' };
      },
    });
    assert.equal(again.ok, true, 'a path already dirty before the pass is left to its author');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('checkRegen fails the gate when the pass itself fails', () => {
  const root = makeRepo({ 'art.js': 'generated\n' });
  try {
    const res = checkRegen({ root, runPass: () => ({ status: 1, output: 'boom: tsc failed' }) });
    assert.equal(res.ok, false, 'a failed pass is a failed gate');
    assert.match(res.message, /boom: tsc failed/, 'the pass output survives into the message');
    assert.match(res.message, /npm run regen/, 'the fix command is still printed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('verify.js carries one derived-artifact gate instead of the twelve freshness steps', () => {
  const steps = buildSteps(repoRoot, {});
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]));

  const gate = byId['regen-gate'];
  assert.ok(gate, 'the gate step exists in the full gate');
  assert.deepEqual(gate.args, ['scripts/regen.js', '--check'], 'the step runs the gate itself');
  assert.equal(gate.parallel, undefined, 'the gate writes the tree, so it never shares the pool');

  for (const id of [
    'preflight-primitives',
    'skills-manager-bundle',
    'skill-shared-rules',
    'core-mirror',
    'console-payload',
    'console-bundle',
    'mcp-bundle',
    'canonical-registry',
    'samples-parity',
    'version-parity',
    'console-shells-fresh',
  ]) {
    assert.equal(byId[id], undefined, `${id} is replaced by the gate, not kept alongside it`);
  }

  // Kept on purpose: the catalog's --check normalises release_tag, which the gate cannot.
  assert.ok(byId['blueprint-catalog'], 'the release-state catalog keeps its own check');
  // Kept on purpose: a rebuild comparison with the wall-clock stamps masked, plus the
  // first-difference diagnostic the gate's path list cannot give.
  assert.ok(byId['console-fixture'], 'the console fixture keeps its own check');

  const fastIds = buildSteps(repoRoot, { fast: true }).map((s) => s.id);
  assert.equal(fastIds.includes('regen-gate'), false, '--fast stays out of the gate: the pass builds');
});

test('the two unwired generators joined the shared freshness list', () => {
  const ids = FRESHNESS_GUARDS.map((g) => g.id);
  assert.ok(ids.includes('address-module'), 'nn-address.generated.js has a regen step again');
  assert.ok(ids.includes('field-registry'), 'field-registry.generated.json has a regen step again');
});
