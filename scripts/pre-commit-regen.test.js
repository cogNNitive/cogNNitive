'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { touchesGeneratorInputs, newlyChanged, PRE_COMMIT_GUARDS } = require('./pre-commit-regen.js');

test('only code and sample paths trigger the generators', () => {
  assert.strictEqual(touchesGeneratorInputs(['openspec/changes/x/spec.md', 'docs/a.md']), false);
  assert.strictEqual(touchesGeneratorInputs(['iNNfo/packages/nn-core/src/mutate.ts']), true);
  assert.strictEqual(touchesGeneratorInputs(['skills/nn-sources/scripts/scan.js']), true);
  assert.strictEqual(touchesGeneratorInputs(['test/_samples_nn/domaiNN_NN.md']), true);
});

test('stages only files the generators changed, never edits that were already unstaged', () => {
  const before = ['notes.md', 'skills/nn-sources/scripts/lib/nn-core.generated.cjs'];
  const after = ['notes.md', 'skills/nn-sources/scripts/lib/nn-core.generated.cjs', 'iNNfo/specs/bluepriNNts/console/nn-console.bundle.js'];
  assert.deepStrictEqual(newlyChanged(before, after), ['iNNfo/specs/bluepriNNts/console/nn-console.bundle.js']);
});

test('the slow blueprint catalog stays out of the commit hook', () => {
  assert.ok(PRE_COMMIT_GUARDS.length > 0);
  assert.ok(!PRE_COMMIT_GUARDS.some((g) => g.id === 'blueprint-catalog'));
});
