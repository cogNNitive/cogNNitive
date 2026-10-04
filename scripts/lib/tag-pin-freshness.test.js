#!/usr/bin/env node
/**
 * scripts/lib/tag-pin-freshness.test.js
 *
 * Unit tests for scripts/lib/tag-pin-freshness.js (Group 1c guard).
 * Uses Node.js test runner / assert. Zero external dependencies.
 */

const assert = require('node:assert');
const { checkTagPinFreshness, MANIFEST_PATH } = require('./tag-pin-freshness.js');

function testSkillsChangeWithoutManifestFails() {
  const r = checkTagPinFreshness(['skills/nn-innfo/SKILL.md', 'docs/x.md']);
  assert.strictEqual(r.ok, false, 'skills change without manifest must fail');
  assert.deepStrictEqual(r.triggered.skills, ['skills/nn-innfo/SKILL.md']);
  assert.match(r.errors[0], /skills/);
}

function testBlueprintSpecChangeWithoutManifestFails() {
  const r = checkTagPinFreshness(['iNNfo/specs/bluepriNNts/business/spec_NN.md']);
  assert.strictEqual(r.ok, false, 'blueprint spec change without manifest must fail');
  assert.deepStrictEqual(r.triggered.blueprints, ['iNNfo/specs/bluepriNNts/business/spec_NN.md']);
}

function testLegacyTemplatesRootStillCovered() {
  const r = checkTagPinFreshness(['iNNfo/specs/templates/business/spec_NN.md']);
  assert.strictEqual(r.ok, false, 'legacy templates/ root must still be covered');
}

function testManifestTouchedPasses() {
  const r = checkTagPinFreshness([
    'skills/nn-innfo/SKILL.md',
    'iNNfo/specs/bluepriNNts/business/spec_NN.md',
    MANIFEST_PATH,
  ]);
  assert.strictEqual(r.ok, true, 're-pinned manifest must pass');
  assert.strictEqual(r.manifestTouched, true);
}

function testUnrelatedChangePasses() {
  const r = checkTagPinFreshness(['README.md', 'iNNfo/packages/innfo-core/src/types.ts']);
  assert.strictEqual(r.ok, true, 'unrelated change must pass');
  assert.strictEqual(r.triggered.skills.length, 0);
  assert.strictEqual(r.triggered.blueprints.length, 0);
}

function testBackslashPathsNormalized() {
  const r = checkTagPinFreshness(['skills\\nn-innfo\\SKILL.md']);
  assert.strictEqual(r.ok, false, 'windows-style paths must be normalized and matched');
  assert.deepStrictEqual(r.triggered.skills, ['skills/nn-innfo/SKILL.md']);
}

function testBlueprintNestedSpecExcluded() {
  // a sample or nested spec must NOT trigger; only the top-level spec_NN.md does
  const r = checkTagPinFreshness(['iNNfo/specs/bluepriNNts/business/samples/Ghostbusters_business_NN.md']);
  assert.strictEqual(r.ok, true, 'sample files are not blueprint specs');
}

function testEmptyInputPasses() {
  const r = checkTagPinFreshness([]);
  assert.strictEqual(r.ok, true);
}

function runAll() {
  testSkillsChangeWithoutManifestFails();
  testBlueprintSpecChangeWithoutManifestFails();
  testLegacyTemplatesRootStillCovered();
  testManifestTouchedPasses();
  testUnrelatedChangePasses();
  testBackslashPathsNormalized();
  testBlueprintNestedSpecExcluded();
  testEmptyInputPasses();
  console.log('\nAll tag/pin freshness guard tests passed successfully.');
}

runAll();
