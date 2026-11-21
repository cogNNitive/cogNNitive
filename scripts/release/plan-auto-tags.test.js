'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const {
  planAutoTags,
  bumpFor,
  readRepoState,
  pathspecsFor,
  generatedUnder,
} = require('./plan-auto-tags.js');

const repoRoot = resolve(__dirname, '..', '..');

const noChanges = { skills: [], blueprints: [], 'nn-mcp': [], 'nn-console': [] };

test('bumpFor: feat is minor, fix is patch, bang or BREAKING CHANGE is major', () => {
  assert.strictEqual(bumpFor(['fix(x): a', 'docs: b']), 'patch');
  assert.strictEqual(bumpFor(['fix(x): a', 'feat(y): b']), 'minor');
  assert.strictEqual(bumpFor(['feat(y)!: b']), 'major');
  assert.strictEqual(bumpFor(['fix: a\n\nBREAKING CHANGE: gone']), 'major');
});

test('nothing changed: no tags', () => {
  const plan = planAutoTags({
    tags: ['skills-v1.2.0', 'blueprints-v0.5.0', 'nn-mcp-v0.9.0', 'nn-console-v0.3.0'],
    commitsSinceTag: noChanges,
  });
  assert.deepStrictEqual(plan, []);
});

test('every key bumps from its commits, blueprints first', () => {
  const plan = planAutoTags({
    tags: ['skills-v1.2.0', 'blueprints-v0.5.0', 'nn-mcp-v0.9.0', 'nn-console-v0.3.0'],
    commitsSinceTag: {
      ...noChanges,
      skills: ['fix(skills): a'],
      blueprints: ['feat(bp): b'],
      'nn-mcp': ['feat(nn-mcp): c'],
      'nn-console': ['fix(console): d'],
    },
  });
  assert.deepStrictEqual(plan.map((p) => p.tag), [
    'blueprints-v0.6.0',
    'skills-v1.2.1',
    'nn-mcp-v0.10.0',
    'nn-console-v0.3.1',
  ]);
});

test('no key carries an authored version: a silent package.json cannot skip a release', () => {
  // The hand bump used to be the only trigger for nn-mcp and nn-console, and a PR that forgot
  // it merged and released nothing (#650, #670, #683). Deriving from commits removes the choice.
  const plan = planAutoTags({
    tags: ['nn-mcp-v0.49.4'],
    commitsSinceTag: { ...noChanges, 'nn-mcp': ['fix(nn-mcp): a fix'] },
  });
  assert.deepStrictEqual(plan.map((p) => p.tag), ['nn-mcp-v0.49.5']);
});

test('blueprints always ships first so a new blueprint has a pin before the others', () => {
  const plan = planAutoTags({
    tags: ['skills-v1.0.0', 'blueprints-v1.0.0'],
    commitsSinceTag: { ...noChanges, skills: ['fix: a'], blueprints: ['fix: b'] },
  });
  assert.strictEqual(plan[0].key, 'blueprints');
});

test('the highest existing tag wins, not the most recent one in the list', () => {
  const plan = planAutoTags({
    tags: ['skills-v2.0.0', 'skills-v10.1.0', 'skills-v9.0.0'],
    commitsSinceTag: { ...noChanges, skills: ['fix: a'] },
  });
  assert.deepStrictEqual(plan.map((p) => p.tag), ['skills-v10.1.1']);
});

test('generatedUnder finds every generated file inside a content key', () => {
  const bp = generatedUnder('blueprints', repoRoot)
  assert.ok(bp.includes('iNNfo/specs/bluepriNNts/catalog.json'), 'the tag-derived catalog');
  assert.ok(bp.includes('iNNfo/specs/bluepriNNts/console/nn-console.bundle.js'), 'the console bundle');
  assert.ok(bp.includes('iNNfo/specs/bluepriNNts/console/package.json'), 'the console version mirror');
  assert.ok(
    bp.includes('iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/nn-core.generated.cjs'),
    'a core mirror nested inside the blueprints tree',
  );

  const skills = generatedUnder('skills', repoRoot)
  assert.ok(skills.includes('skills/nn-sources/scripts/lib/nn-core.generated.cjs'), 'a skill core mirror');
  assert.equal(
    skills.some((p) => p.startsWith('iNNfo/')),
    false,
    'a key only excludes what lives inside its own distribution paths',
  );
});

test('a commit that only rewrites generated files plans nothing for any content key', () => {
  // The lane this guards: regen and sync:versions rewrite the mirrors on `main`, and if a
  // rewrite counted as a change, the release it belongs to would be cut again on every pass.
  const repo = mkdtempSync(join(tmpdir(), 'plan-tags-generated-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  git('config', 'user.email', 'plan-tags@example.com');
  git('config', 'user.name', 'plan-tags');

  const skillDir = join(repo, 'skills', 'nn-demo', 'scripts', 'lib');
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'nn-core.generated.cjs'), 'module.exports = 1\n');
  writeFileSync(join(repo, 'skills', 'nn-demo', 'package.json'), '{"name":"nn-demo"}\n');
  git('add', '-A');
  git('commit', '-qm', 'chore(skills): sync the generated mirrors');

  const state = readRepoState(repo)
  assert.deepStrictEqual(state.commitsSinceTag.skills, []);

  writeFileSync(join(repo, 'skills', 'nn-demo', 'SKILL.md'), '# demo\n');
  git('add', '-A');
  git('commit', '-qm', 'feat(skills): a real skill change');

  assert.deepStrictEqual(readRepoState(repo).commitsSinceTag.skills, [
    'feat(skills): a real skill change',
  ]);
});

test('a content key with no tag yet starts at 0.1.0', () => {
  const plan = planAutoTags({ tags: [], commitsSinceTag: { ...noChanges, skills: ['fix: a'] } });
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
