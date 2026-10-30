#!/usr/bin/env node

/**
 * scripts/dev/series-values.test.mjs
 *
 * The shared series-values reader: source precedence (scope marker > JSON >
 * template), voice majority from the `## NN Video` blocks, and tolerance for a
 * series folder that carries only some of those sources.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { seriesValues } from './lib/series-values.mjs';

const TEMPLATE = [
  '---',
  'level: 3',
  '---',
  '',
  '# NN Scene',
  '',
  '## NN Scene: 00 Gancho',
  'music:: ../../shared/template.mp3',
  'music_volume:: 0.35',
  'transition:: fade',
  '',
].join('\n');

function withDomain(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'series-values-'));
  try {
    const dir = join(root, 'series', 'demo');
    mkdirSync(dir, { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text, 'utf8');
    fn(root, dir);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const VOICES = (voices) =>
  ['# NN Video', '', ...voices.map((v, i) => `## NN Video: Ep ${i}\nslug:: ep-${i}\nvoice_id:: ${v}\n`)].join('\n');

test('reads music, volume and transition from script_template.md when no marker or JSON exists', () => {
  withDomain({ 'script_template.md': TEMPLATE }, (root) => {
    const v = seriesValues(root, 'demo');
    assert.equal(v.music, '../../shared/template.mp3');
    assert.equal(v.volume, 0.35);
    assert.equal(v.transition, 'fade');
    assert.equal(v.source, 'script_template.md');
  });
});

test('video.series.json wins over the template', () => {
  withDomain(
    {
      'script_template.md': TEMPLATE,
      'video.series.json': JSON.stringify({
        defaultMusic: '../../shared/json.mp3',
        defaultMusicVolume: '0.1',
        defaultTransition: 'slide-left',
      }),
    },
    (root) => {
      const v = seriesValues(root, 'demo');
      assert.equal(v.music, '../../shared/json.mp3');
      assert.equal(v.volume, 0.1);
      assert.equal(v.transition, 'slide-left');
      assert.equal(v.source, 'video.series.json');
    },
  );
});

test('the scope marker wins over JSON and template', () => {
  withDomain(
    {
      'script_template.md': TEMPLATE,
      'video.series.json': JSON.stringify({ defaultMusic: '../../shared/json.mp3', defaultMusicVolume: '0.1' }),
      'demo_scope_NN.md': '---\nlevel: 3\nscope: true\n---\n\n# NN Series\n\n## NN Series: demo\nmusic:: ../../shared/marker.mp3\nmusic_volume:: 0.06\ntransition:: none\nvoice_id:: MarkerVoice\n',
    },
    (root) => {
      const v = seriesValues(root, 'demo');
      assert.equal(v.music, '../../shared/marker.mp3');
      assert.equal(v.volume, 0.06);
      assert.equal(v.transition, 'none');
      assert.equal(v.voice, 'MarkerVoice');
      assert.equal(v.source, 'scope marker');
    },
  );
});

test('the voice is the majority of the voice_id fields of the series document', () => {
  withDomain({ 'script_template.md': TEMPLATE, 'demo_video_NN.md': VOICES(['Host01', 'Host02', 'Host02']) }, (root) => {
    const v = seriesValues(root, 'demo');
    assert.equal(v.voice, 'Host02');
    assert.deepEqual(v.voiceCounts, { Host01: 1, Host02: 2 });
  });
});

test('a series folder with no sources returns nulls instead of throwing', () => {
  withDomain({}, (root) => {
    const v = seriesValues(root, 'demo');
    assert.equal(v.music, null);
    assert.equal(v.volume, null);
    assert.equal(v.transition, null);
    assert.equal(v.voice, null);
    assert.equal(v.source, null);
  });
});
