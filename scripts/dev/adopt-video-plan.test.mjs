#!/usr/bin/env node

/**
 * scripts/dev/adopt-video-plan.test.mjs
 *
 * Tests for scripts/dev/adopt-video-plan.mjs:
 *   - Dry run only, writes nothing to the target directory.
 *   - Tested on GOLD fixture.
 *   - Tested on unadopted fixture: plans domaiNN_NN.md, series scope markers, and procedure/ rename.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CLI = join(HERE, 'adopt-video-plan.mjs');
const FIXTURES = join(REPO, 'iNNfo', 'packages', 'nn-core', 'tests', 'fixtures');
const GOLD = join(FIXTURES, 'video-golden');

const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf-8' });

function hashTree(dir) {
  const h = createHash('sha256');
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else h.update(full.slice(dir.length)).update(readFileSync(full));
    }
  };
  walk(dir);
  return h.digest('hex');
}

const goldDigest = hashTree(GOLD);
after(() => {
  assert.equal(hashTree(GOLD), goldDigest, 'GOLD fixture must not be modified by dry-run plan');
});

test('adopt-video-plan on GOLD: detects already adopted state and writes nothing', () => {
  const res = run(GOLD, '--json');
  assert.equal(res.status, 0, res.stderr);
  const plan = JSON.parse(res.stdout);
  assert.equal(plan.v, 1);
  assert.equal(plan.target, GOLD);
  assert.equal(plan.domaiNN.status, 'already-present');
  assert.ok(Array.isArray(plan.series));
  assert.equal(plan.series.length, 2);
  for (const s of plan.series) {
    assert.equal(s.scopeMarker.status, 'already-present');
  }
  assert.equal(plan.renames.length, 0);
  assert.ok(plan.drift);
});

test('adopt-video-plan on unadopted fixture: plans domaiNN_NN.md, scope markers and procedure rename', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'unadopted-video-'));
  try {
    const seriesDir = join(tempDir, 'series', 'my-series');
    const procDir = join(seriesDir, 'procedure');
    const assetsDir = join(seriesDir, 'assets', 'ep1');
    mkdirSync(procDir, { recursive: true });
    mkdirSync(assetsDir, { recursive: true });

    writeFileSync(
      join(seriesDir, 'series_NN.md'),
      '# NN Series\n\ntitle:: My Series\nvoice_id:: Host01\nmusic:: ../../shared/tune.mp3\n',
      'utf8',
    );
    writeFileSync(
      join(procDir, 'draft_scene_visuals_procedures_NN.md'),
      '---\nlevel: 3\n---\n# NN Procedure\n\nstep 1\n',
      'utf8',
    );
    writeFileSync(
      join(assetsDir, 'ep1_video_NN.md'),
      '---\nscope_elements: [{ concept: Video }, { concept: Scene }]\n---\n# NN Video\n\n## NN Video: Ep 1\nslug:: ep1\n\n# NN Scene\n\n## NN Scene: S1\nslug:: s1\nmusic_volume:: 0.5\n',
      'utf8',
    );

    const initialHash = hashTree(tempDir);

    const res = run(tempDir, '--json');
    assert.equal(res.status, 0, res.stderr);
    const plan = JSON.parse(res.stdout);

    assert.equal(plan.domaiNN.status, 'planned-create');
    assert.equal(plan.domaiNN.path, 'domaiNN_NN.md');

    assert.equal(plan.series.length, 1);
    assert.equal(plan.series[0].slug, 'my-series');
    assert.equal(plan.series[0].scopeMarker.status, 'planned-create');
    assert.equal(plan.series[0].scopeMarker.hoisted.voice_id, 'Host01');
    assert.equal(plan.series[0].scopeMarker.hoisted.music, '../../shared/tune.mp3');

    assert.equal(plan.renames.length, 1);
    assert.equal(plan.renames[0].from, 'series/my-series/procedure');
    assert.equal(plan.renames[0].to, 'series/my-series/procedures');

    // Prove dry run: byte-identical after run
    assert.equal(hashTree(tempDir), initialHash, 'Unadopted fixture must be byte-identical after plan');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
