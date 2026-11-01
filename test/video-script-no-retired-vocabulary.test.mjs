#!/usr/bin/env node

/**
 * test/video-script-no-retired-vocabulary.test.mjs
 *
 * The blueprint, its embedded skill and the video dev tooling speak one
 * vocabulary: the names retired by V_0-14-0/V_0-14-1 never appear outside
 * `openspec/changes/archive/`. This is the repo-level net behind capability
 * video-script-skill "Retired Layout Vocabulary Is Absent" and
 * video-presets "Template Concept Is Retired".
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = [
  path.join(ROOT, 'iNNfo/specs/bluepriNNts/video-script'),
  path.join(ROOT, 'scripts/dev'),
];
const SKIP_DIRS = new Set(['node_modules', 'archive', '.git', 'dist']);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.mp3', '.mp4', '.webp', '.ico', '.svg']);

/** Field-and-flag shapes that name the retired mechanism, never free prose. */
const BANNED = [
  'template::',
  'tts_model::',
  'presenter_asset::',
  'intro_asset::',
  'music_volume::',
  'voice_id::',
  '# NN Template',
  '## NN Template',
  'FORMAT_PRESETS',
  'isHorizontal',
  'SERIES_MARKERS',
  'master_vertical',
  'descripcion_youtube',
  '_draft_<version>.html',
  '--format 9:16',
];

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (!SKIP_EXT.has(path.extname(entry.name).toLowerCase())) yield full;
  }
}

test('no retired field, flag or file name survives in the blueprint, the skill or dev tooling', () => {
  const offenders = [];
  for (const root of ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const file of walk(root)) {
      // The scan's own fixtures and the test suites legitimately feed retired
      // documents in to prove they are rejected, so tests are out of scope.
      if (file.endsWith('video-script-no-retired-vocabulary.test.mjs')) continue;
      if (/\.test\.(mjs|js)$/.test(file)) continue;
      if (file.includes(`${path.sep}test${path.sep}`)) continue;
      // A tool that must interpret the frozen legacy domain declares it once.
      if (fs.readFileSync(file, 'utf8').startsWith('// nn-retired-vocabulary: legacy-read')) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const token of BANNED) {
        if (text.includes(token)) {
          const rel = path.relative(ROOT, file);
          const line = text.split('\n').findIndex((l) => l.includes(token)) + 1;
          offenders.push(`${rel}:${line}  ${token}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `retired vocabulary found:\n  ${offenders.join('\n  ')}`);
});

test('the blueprint declares the current field names only', () => {
  const spec = fs
    .readFileSync(path.join(ROOT, 'iNNfo/specs/bluepriNNts/video-script/spec_NN.md'), 'utf8')
    .replace(/\r\n/g, '\n');
  for (const retired of ['template', 'tool', 'tts_model', 'music', 'music_volume', 'presenter_asset', 'intro_asset', 'level', 'speed', 'emotion', 'voice_id']) {
    assert.doesNotMatch(
      spec,
      new RegExp(`^## NN Field Definition: ${retired}$`, 'm'),
      `retired Field Definition "${retired}" must be gone`,
    );
  }
  for (const current of ['presets', 'voice_model', 'voice_speed', 'voice_emotion', 'voice_tone', 'avatar', 'intro', 'background_audio', 'background_audio_volume', 'z_index', 'master_resolution']) {
    assert.match(spec, new RegExp(`^## NN Field Definition: ${current}$`, 'm'), `${current} is declared`);
  }
});
