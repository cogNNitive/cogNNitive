#!/usr/bin/env node

/**
 * test/blueprint-rename.test.mjs
 *
 * Slice R: the bluepriNNt `video-script` is renamed `coNNtent` (folder and catalog id) and the
 * skill `nn-video-script` is renamed `nn-conntent`, with no alias and no redirect. OpenSpec
 * capability names keep `video-*` (maintainer decision 9).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the blueprint folder and skill are renamed with no alias', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'iNNfo/specs/bluepriNNts/video-script')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'iNNfo/specs/bluepriNNts/coNNtent/skills/nn-video-script')), false);
});

test('the blueprint identity is coNNtent in its frontmatter and in both catalogs', () => {
  const spec = read('iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md');
  assert.match(spec, /^blueprint_name: "coNNtent"$/m);
  for (const rel of ['iNNfo/specs/bluepriNNts/catalog.json', 'docs/innfo/blueprints/catalog.json']) {
    const catalog = JSON.parse(read(rel)).blueprints;
    assert.ok(catalog.coNNtent, `${rel} lists coNNtent`);
    assert.equal(catalog['video-script'], undefined, `${rel} has no video-script alias`);
    assert.deepEqual(catalog.coNNtent.embedded_skills, ['nn-conntent']);
  }
});

test('the skill is named nn-conntent with its own triggers', () => {
  const skill = read('iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/SKILL.md');
  assert.match(skill, /^name: nn-conntent$/m);
  assert.match(skill, /nn-conntent/);
});

test('the core mirror target is coNNtent', () => {
  const build = read('scripts/build-core-mirrors.mjs');
  assert.match(build, /name: 'coNNtent'/);
  assert.equal(read('scripts/core-mirrors/coNNtent.ts').includes('nn-core'), true);
});

test('no live file still points at the retired blueprint path or skill name', () => {
  // Accepted residuals: this guard names the retired tokens it forbids; a cross-blueprint prose
  // sentence in design-presets cannot change without bumping that blueprint and refreshing its
  // samples (out of Slice R's mechanical scope); the video-golden corpus is a frozen fixture.
  const SELF = 'test/blueprint-rename.test.mjs';
  const ACCEPTED = [
    'iNNfo/specs/bluepriNNts/design-presets/spec_NN.md',
    'iNNfo/packages/nn-core/tests/fixtures/video-golden/',
    'iNNfo/packages/nn-core/tests/fixtures/video-golden-blueprint/',
  ];
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'temp') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.(md|json|mjs|js|ts|yaml|yml|html)$/.test(entry.name)) {
        const text = fs.readFileSync(abs, 'utf8');
        const rel = path.relative(ROOT, abs).split(path.sep).join('/');
        if (rel.startsWith('openspec/') || rel === SELF) continue;
        if (ACCEPTED.some((p) => rel === p || rel.startsWith(p))) continue;
        if (/bluepriNNts\/video-script|nn-video-script/.test(text)) offenders.push(rel);
      }
    }
  };
  walk(ROOT);
  assert.deepEqual(offenders, []);
});
