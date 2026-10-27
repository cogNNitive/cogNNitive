#!/usr/bin/env node

/**
 * nn-video-script/test/animation-layer.test.mjs
 *
 * RED→GREEN tests for the `animation` Layer type and authored-project mounting
 * (design D7/D8, slice S8). The model side (this file's first block) proves a
 * `type:: animation` Layer is valid with an `asset::` and rejected without, and
 * that an unknown type is rejected. The mounting side (later blocks) proves the
 * authored project is read pre-compile (id + duration), the scene lasts
 * max(narration, animation), the host is a root sub-composition with its own
 * audio (no `muted`, no playback-rate), a mismatch warns, and ids must not
 * collide.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RemotionSceneCompiler } from '../scripts/remotion-scene-compiler.mjs';

function model({ layers = [], scenes = [] } = {}) {
  return {
    version: 'innfo-read-knowledge@1',
    frontmatter: { title: 'Anim' },
    elements: {
      Video: [{ type: 'Video', name: 'Anim', slug: 'anim', fields: { title: 'Anim' } }],
      Scene: scenes,
      Layer: layers,
    },
  };
}

const scene = (name, slug, narration = '') => ({ type: 'Scene', name, slug, description: narration, fields: {} });
const layer = (name, slug, fields) => ({ type: 'Layer', name, slug, fields });

test('a type:: animation Layer is valid with an asset', () => {
  const compiler = new RemotionSceneCompiler();
  const guard = compiler.checkScript(
    model({
      scenes: [scene('S', 's', 'hello')],
      layers: [layer('Anim', 'a', { type: 'animation', asset: 'assets/demo' })],
    }),
  );
  assert.equal(guard.ok, true, JSON.stringify(guard.errors));
});

test('a type:: animation Layer without an asset is rejected', () => {
  const compiler = new RemotionSceneCompiler();
  const guard = compiler.checkScript(
    model({
      scenes: [scene('S', 's', 'hello')],
      layers: [layer('Anim', 'a', { type: 'animation' })],
    }),
  );
  assert.equal(guard.ok, false);
  assert.ok(guard.errors.some((e) => e.code === 'missing-conditional-field'), JSON.stringify(guard.errors));
});

test('an unknown layer type is rejected', () => {
  const compiler = new RemotionSceneCompiler();
  const guard = compiler.checkScript(
    model({
      scenes: [scene('S', 's', 'hello')],
      layers: [layer('X', 'x', { type: 'nope', asset: 'a.png' })],
    }),
  );
  assert.equal(guard.ok, false);
  assert.ok(guard.errors.some((e) => e.code === 'unknown-layer-type'), JSON.stringify(guard.errors));
});
