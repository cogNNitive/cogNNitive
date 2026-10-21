#!/usr/bin/env node

/**
 * scripts/lib/nn-name-invariant-guard.test.js
 *
 * Plain-node tests for the repository `_NN` name invariant guard. Documents are
 * injected, so no file on disk is touched. Seeded violations prove the guard red.
 */

const assert = require('node:assert');
const {
  checkNnNameInvariantGuard,
  isCarvedOut,
  frozenBlueprintDirs,
  validateAllowlist,
  TEMPORARY_ALLOWLIST,
} = require('./nn-name-invariant-guard.js');

const doc = (bp) => `---\nlevel: 3\nparent_spec:\n  name: "${bp}"\n  url: "https://example.com/${bp}"\n---\n\n# NN Summary\n`;

const MANIFEST = [
  'frozen_blueprints:',
  '  - name: cogNNitive',
  '    repo: cogNNitive/cogNNitive-web',
  '    path: iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md',
  '    ref_key: blueprints',
  '  - name: workspace_spec',
  '    repo: cogNNitive/cogNNitive-web',
  '    path: iNNfo/specs/bluepriNNts/workspace_spec_NN.md',
  '    ref_key: blueprints',
  '',
].join('\n');

function run(files, extra = {}) {
  return checkNnNameInvariantGuard({
    files: Object.keys(files),
    readFile: (f) => files[f],
    manifestText: MANIFEST,
    allowlist: [],
    ...extra,
  });
}

function main() {
  console.log('Running nn-name-invariant-guard unit tests...');

  // 1. A seeded non-frozen violation is an ERROR naming the file and the expected form.
  {
    const r = run({ 'kNNowledge/Client_NN.md': doc('business') });
    assert.strictEqual(r.ok, false, 'a violation must fail');
    assert.ok(r.errors.some((e) => e.includes('kNNowledge/Client_NN.md') && e.includes('Client_business_NN.md')), r.errors.join('; '));
  }
  console.log('✔ a seeded violation is an error with the expected form');

  // 2. Conforming names, structural exceptions, and non-document files pass.
  {
    const r = run({
      'kNNowledge/Client_business_NN.md': doc('business'),
      'kNNowledge/Client_business_NN.md.txt': 'x',
      'sources_NN.md': doc('sources'),
      'domaiNN_NN.md': doc('domaiNN'),
      'bluepriNNts/sidecar/spec_NN.md': doc('sidecar'),
      'sources/import/a.csv_sidecar_NN.md': doc('sidecar'),
      'kNNowledge/Versioned_business_NN.md': doc('business_V_0-2-3'),
    });
    assert.strictEqual(r.ok, true, r.errors.join('; '));
  }
  console.log('✔ conforming names and structural exceptions pass; a versioned parent_spec resolves to its blueprint');

  // 3. A version token in a new name is a violation even when the blueprint ends the stem.
  {
    const r = run({ 'kNNowledge/Client_V_1-0-0_business_NN.md': doc('business') });
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('Client_business_NN.md')), r.errors.join('; '));
  }
  console.log('✔ a _V_ token in a new name fails');

  // 4. Frozen carve-out: samples, use-cases, published specs, frozen blueprints, workspace procedures.
  {
    const files = {
      'docs/innfo/samples/x/Ghostbusters_Operations_V_1-0-0_NN.md': doc('business'),
      'docs/cognitive_nn/use-cases/a/Client_NN.md': doc('business'),
      'iNNfo/specs/bluepriNNts/business/samples/Ghostbusters_V_0-2-3_business_NN.md': doc('business'),
      'iNNfo/specs/bluepriNNts/workspace/procedures/reconcile_artifact_feedback_NN.md': doc('procedures'),
      'iNNfo/specs/bluepriNNts/cogNNitive/samples/workspace_NN.md': doc('workspace_spec'),
    };
    const r = run(files);
    assert.strictEqual(r.ok, true, r.errors.join('; '));
    assert.deepStrictEqual([...r.carvedOut].sort(), Object.keys(files).sort());
  }
  console.log('✔ frozen paths are carved out and reported, not failed');

  // 5. The carve-out names the workspace procedures folder explicitly; a sibling non-frozen procedure still fails.
  {
    assert.strictEqual(isCarvedOut('iNNfo/specs/bluepriNNts/workspace/procedures/a_NN.md', []), true);
    assert.strictEqual(isCarvedOut('iNNfo/specs/bluepriNNts/video/procedures/generate_video_script_NN.md', []), false);
    const r = run({ 'iNNfo/specs/bluepriNNts/video/procedures/generate_video_script_NN.md': doc('procedures') });
    assert.strictEqual(r.ok, false);
  }
  console.log('✔ non-frozen procedures are not carved out');

  // 6. frozen_blueprints is read from the manifest; its folder is carved out.
  {
    // A folder spec carves out its folder; a flat entry carves out only that file (its folder holds live blueprints).
    assert.deepStrictEqual(frozenBlueprintDirs(MANIFEST), [
      'iNNfo/specs/bluepriNNts/cogNNitive/',
      'iNNfo/specs/bluepriNNts/workspace_spec_NN.md',
    ]);
    assert.deepStrictEqual(frozenBlueprintDirs(''), []);
  }
  console.log('✔ the frozen blueprint folders come from manifest/source.yaml');

  // 7. Test directories are out of scope; a file with no parent_spec is only judged on the version rule.
  {
    const r = run({
      'iNNfo/packages/nn-core/tests/fixtures/Client_NN.md': doc('business'),
      'skills/nn-innfo/templates/workspace_spec_NN.md': '---\nlevel: 2\n---\n',
    });
    assert.strictEqual(r.ok, true, r.errors.join('; '));
  }
  console.log('✔ test directories are out of scope; a missing parent_spec is not judged');

  // 8. The temporary allowlist exempts a listed path and reports it; an entry without a reason fails.
  {
    const allowlist = [{ pattern: 'kNNowledge/Client_NN.md', reason: 'renamed in S6 part B' }];
    const r = run({ 'kNNowledge/Client_NN.md': doc('business') }, { allowlist });
    assert.strictEqual(r.ok, true, r.errors.join('; '));
    assert.deepStrictEqual(r.allowlisted, ['kNNowledge/Client_NN.md']);
    const bad = checkNnNameInvariantGuard({ files: [], manifestText: MANIFEST, allowlist: [{ pattern: 'x', reason: '' }] });
    assert.strictEqual(bad.ok, false);
    assert.ok(bad.errors.some((e) => e.includes('missing a reason')));
  }
  console.log('✔ the temporary allowlist exempts listed paths; every entry needs a reason');

  // 9. The shipped allowlist is well formed and every entry is marked for removal.
  assert.deepStrictEqual(validateAllowlist(TEMPORARY_ALLOWLIST), []);
  console.log('✔ the shipped temporary allowlist carries a reason on every entry');

  console.log('All nn-name-invariant-guard unit tests passed successfully!\n');
}

main();
