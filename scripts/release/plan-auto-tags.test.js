'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { planAutoTags, bumpFor } = require('./plan-auto-tags.js');

const noChanges = { skills: [], blueprints: [], 'nn-mcp': [], 'nn-console': [] };

test('bumpFor: feat is minor, fix is patch, bang or BREAKING CHANGE is major', () => {
  assert.strictEqual(bumpFor(['fix(x): a', 'docs: b']), 'patch');
  assert.strictEqual(bumpFor(['fix(x): a', 'feat(y): b']), 'minor');
  assert.strictEqual(bumpFor(['feat(y)!: b']), 'major');
  assert.strictEqual(bumpFor(['fix: a\n\nBREAKING CHANGE: gone']), 'major');
});

test('nothing changed and authored versions already tagged: no tags', () => {
  const plan = planAutoTags({
    tags: ['skills-v1.2.0', 'blueprints-v0.5.0', 'nn-mcp-v0.9.0', 'nn-console-v0.3.0'],
    authored: { 'nn-mcp': '0.9.0', 'nn-console': '0.3.0' },
    commitsSinceTag: noChanges,
  });
  assert.deepStrictEqual(plan, []);
});

test('content keys bump from their commits; authored keys tag their package version', () => {
  const plan = planAutoTags({
    tags: ['skills-v1.2.0', 'blueprints-v0.5.0', 'nn-mcp-v0.9.0', 'nn-console-v0.3.0'],
    authored: { 'nn-mcp': '0.10.0', 'nn-console': '0.3.0' },
    commitsSinceTag: { ...noChanges, skills: ['fix(skills): a'], blueprints: ['feat(bp): b'] },
  });
  assert.deepStrictEqual(plan.map((p) => p.tag), [
    'blueprints-v0.6.0',
    'skills-v1.2.1',
    'nn-mcp-v0.10.0',
  ]);
});

test('blueprints always ships first so a new blueprint has a pin before the others', () => {
  const plan = planAutoTags({
    tags: ['skills-v1.0.0', 'blueprints-v1.0.0'],
    authored: {},
    commitsSinceTag: { ...noChanges, skills: ['fix: a'], blueprints: ['fix: b'] },
  });
  assert.strictEqual(plan[0].key, 'blueprints');
});

test('the highest existing tag wins, not the most recent one in the list', () => {
  const plan = planAutoTags({
    tags: ['skills-v2.0.0', 'skills-v10.1.0', 'skills-v9.0.0'],
    authored: {},
    commitsSinceTag: { ...noChanges, skills: ['fix: a'] },
  });
  assert.deepStrictEqual(plan.map((p) => p.tag), ['skills-v10.1.1']);
});

test('an authored version below an existing tag is refused, never re-tagged', () => {
  assert.throws(
    () => planAutoTags({
      tags: ['nn-mcp-v0.9.0'],
      authored: { 'nn-mcp': '0.8.0' },
      commitsSinceTag: noChanges,
    }),
    /nn-mcp 0\.8\.0 is below the released nn-mcp-v0\.9\.0/,
  );
});

test('a content key with no tag yet starts at 0.1.0', () => {
  const plan = planAutoTags({ tags: [], authored: {}, commitsSinceTag: { ...noChanges, skills: ['fix: a'] } });
  assert.deepStrictEqual(plan.map((p) => p.tag), ['skills-v0.1.0']);
});
