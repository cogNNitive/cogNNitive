'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { planAutoTags, bumpFor, readRepoState, pathspecsFor } = require('./plan-auto-tags.js');

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

test('pathspecsFor excludes the tag-derived catalog from the blueprints change set', () => {
  assert.deepStrictEqual(pathspecsFor('blueprints'), [
    'iNNfo/specs',
    ':(exclude)iNNfo/specs/bluepriNNts/catalog.json',
  ]);
  assert.deepStrictEqual(pathspecsFor('skills'), ['skills']);
});

test('a commit that only restamps the generated catalog is not a blueprint change', () => {
  // The catalog's release_tag is read from the tags themselves, so counting a restamp as a
  // blueprint change makes the release a trigger for the next release: restamp, tag, a
  // different restamp, tag. This test is the guard that keeps that lane from existing.
  const repo = mkdtempSync(join(tmpdir(), 'plan-tags-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  git('config', 'user.email', 'plan-tags@example.com');
  git('config', 'user.name', 'plan-tags');

  const specDir = join(repo, 'iNNfo', 'specs', 'bluepriNNts');
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, 'catalog.json'), '{}\n');
  git('add', '-A');
  git('commit', '-qm', 'chore(blueprints): restamp the catalog');

  assert.deepStrictEqual(readRepoState(repo).commitsSinceTag.blueprints, []);

  writeFileSync(join(specDir, 'domaiNN_NN.md'), '# spec\n');
  git('add', '-A');
  git('commit', '-qm', 'feat(blueprints): real content change');

  assert.deepStrictEqual(readRepoState(repo).commitsSinceTag.blueprints, [
    'feat(blueprints): real content change',
  ]);
});
