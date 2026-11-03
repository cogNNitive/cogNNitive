#!/usr/bin/env node

/**
 * test/core-mirror-coNNtent.test.mjs
 *
 * The video engine reaches nn-core and the apply engine through ONE generated,
 * drift-guarded mirror (design A10, capability video-script-skill "Skill Reaches
 * nn-core And The Apply Engine Through A Mirror"). This test pins the target name,
 * the export surface and the `--check` freshness gate.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIRROR = path.join(
  ROOT,
  'iNNfo',
  'specs',
  'bluepriNNts',
  'coNNtent',
  'skills',
  'nn-conntent',
  'scripts',
  'lib',
  'nn-core.generated.cjs',
);

const REQUIRED_EXPORTS = [
  'findDomainRoot',
  'loadChain',
  'resolve',
  'parseKnowledge',
  'parseChangeset',
  'serializeChangeset',
  'computeProposalSha',
  'executeChangesetApply',
  'writeProposedChangeset',
];

test('the mirror target exists and the generated file exports the contract', () => {
  const mirror = require(MIRROR);
  for (const name of REQUIRED_EXPORTS) {
    assert.equal(typeof mirror[name], 'function', `the mirror exports ${name}`);
  }
});

test('the mirror is fresh against its nn-core sources', () => {
  const res = spawnSync(process.execPath, ['scripts/build-core-mirrors.mjs', '--check', '--target', 'coNNtent'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, res.stderr || res.stdout);
});
