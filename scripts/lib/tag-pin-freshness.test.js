#!/usr/bin/env node
/**
 * scripts/lib/tag-pin-freshness.test.js
 *
 * Unit tests for scripts/lib/tag-pin-freshness.js (Group 1c guard).
 * Uses Node.js test runner / assert. Zero external dependencies.
 */

const assert = require('node:assert');
const { checkTagPinFreshness, structuralChanges, MANIFEST_PATH } = require('./tag-pin-freshness.js');

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
  const r = checkTagPinFreshness(['README.md', 'iNNfo/packages/nn-core/src/types.ts']);
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

function testSkillContentEditIsNotStructural() {
  // 36 files edited inside an existing skill: no inventory change, no re-pin needed
  const changed = ['skills/nn-fixture-skill/SKILL.md', 'skills/nn-fixture-skill/scripts/a.mjs'];
  const structural = structuralChanges('M\tskills/nn-fixture-skill/SKILL.md\nA\tskills/nn-fixture-skill/scripts/a.mjs');
  const r = checkTagPinFreshness(changed, structural);
  assert.strictEqual(r.ok, true, 'content edits and new files inside a skill must pass');
  assert.strictEqual(r.triggered.skills.length, 0);
}

function testAddedSkillWithoutManifestFails() {
  const structural = structuralChanges('A\tskills/nn-new/SKILL.md');
  const r = checkTagPinFreshness(['skills/nn-new/SKILL.md'], structural);
  assert.strictEqual(r.ok, false, 'a new skill must be inventoried in the manifest');
  assert.deepStrictEqual(r.triggered.skills, ['skills/nn-new/SKILL.md']);
}

function testRenamedAndDeletedSkillsAreStructural() {
  const structural = structuralChanges('R100\tskills/old/SKILL.md\tskills/new/SKILL.md\nD\tskills/gone/SKILL.md');
  assert.deepStrictEqual(structural, ['skills/old/SKILL.md', 'skills/new/SKILL.md', 'skills/gone/SKILL.md']);
  const r = checkTagPinFreshness(['skills/new/SKILL.md'], structural);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.triggered.skills.length, 3);
}

function testAddedSkillWithManifestPasses() {
  const structural = structuralChanges('A\tskills/nn-new/SKILL.md');
  const r = checkTagPinFreshness(['skills/nn-new/SKILL.md', MANIFEST_PATH], structural);
  assert.strictEqual(r.ok, true);
}

function runAll() {
  testSkillContentEditIsNotStructural();
  testAddedSkillWithoutManifestFails();
  testRenamedAndDeletedSkillsAreStructural();
  testAddedSkillWithManifestPasses();
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
