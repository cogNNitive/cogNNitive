#!/usr/bin/env node

/**
 * test/video-script-contract-additions.test.mjs
 *
 * Lives outside the embedded skill folder on purpose: files under video-script/skills are
 * guarded by the Template Immutability Guard (any change demands a blueprint_version bump).
 *
 * Guards the video-script contract additions: the `watermark` Layer type, the Layer fields
 * `model` / `fit`, the Scene field `music_volume`, and the TTS cache key staying independent
 * of the avatar model.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  RemotionSceneCompiler,
  DEFAULT_CONDITIONAL_FIELDS,
  DEFAULT_BG_MUSIC_VOLUME,
} from '../iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/remotion-scene-compiler.mjs';
import { buildTtsVoiceOptions, resolveRegisteredVoice } from '../iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/tts-options.mjs';
import { CacheManager } from '../iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/cache-manager.mjs';

function model({ scenes = [], layers = [] } = {}) {
  return {
    version: 'nn-read-knowledge@1',
    frontmatter: { title: 'Contract' },
    elements: {
      Video: [{ type: 'Video', name: 'Contract', slug: 'contract', fields: { title: 'Contract' } }],
      Scene: scenes,
      Layer: layers,
    },
  };
}
const scene = (slug, narration = 'Some narration words here.', fields = {}) => ({
  type: 'Scene', name: slug, slug, description: narration, fields,
});
const layer = (slug, parentSlug, fields) => ({
  type: 'Layer', name: slug, slug, parentElement: 'Scene', parentSlug, fields,
});

const compiler = new RemotionSceneCompiler({ fps: 30, width: 1920, height: 1080 });

async function runTests() {
  console.log('Running video-script contract-additions tests...');

  // 1. watermark: contract entry, guard and overlay.
  {
    assert.deepStrictEqual(DEFAULT_CONDITIONAL_FIELDS.watermark, ['text']);

    const ok = compiler.compile(model({
      scenes: [scene('s1')],
      layers: [layer('wm', 's1', { type: 'watermark', text: 'Generated with AI', position: 'top' })],
    }));
    const overlay = ok.tracks.overlays.find((o) => o.type === 'watermark');
    assert.ok(overlay, 'a watermark Layer must compile to a watermark overlay');
    assert.strictEqual(overlay.config.text, 'Generated with AI');
    assert.strictEqual(overlay.config.position, 'top');
    assert.strictEqual(overlay.fromFrame, ok.tracks.scenes[0].fromFrame);
    assert.strictEqual(overlay.durationInFrames, ok.tracks.scenes[0].durationInFrames);

    const bad = compiler.checkScript(model({
      scenes: [scene('s1')],
      layers: [layer('wm', 's1', { type: 'watermark' })],
    }));
    assert.strictEqual(bad.ok, false);
    assert.strictEqual(bad.errors[0].code, 'missing-conditional-field');
    console.log('✔ watermark Layer compiles to a persistent text overlay and requires text');
  }

  // 2. Layer `model` reaches the lowered layer (priced and synthesized per presenter).
  {
    const lowered = compiler.lowerKnowledgeModel(model({
      scenes: [scene('s1')],
      layers: [
        layer('a', 's1', { type: 'presenter', asset: 'a.png', model: 'wavespeed-ai/infinitetalk' }),
        layer('b', 's1', { type: 'presenter', asset: 'b.png' }),
      ],
    }));
    const [a, b] = lowered.scenes[0].layers;
    assert.strictEqual(a.properties.layer_avatar_model, 'wavespeed-ai/infinitetalk');
    assert.ok(!('layer_avatar_model' in b.properties), 'a presenter without model keeps the default');
    console.log('✔ presenter Layer model:: lowers to layer_avatar_model; absent stays unset');
  }

  // 3. b-roll `fit`.
  {
    const manifest = compiler.compile(model({
      scenes: [scene('s1')],
      layers: [
        layer('contain', 's1', { type: 'b-roll', asset: 'media/a.png', fit: 'contain' }),
        layer('plain', 's1', { type: 'b-roll', asset: 'media/b.png' }),
      ],
    }));
    const broll = manifest.tracks.overlays.filter((o) => o.type === 'broll');
    assert.strictEqual(broll.length, 2);
    assert.strictEqual(broll[0].config.fit, 'contain');
    assert.strictEqual(broll[1].config.fit, 'cover');
    console.log('✔ b-roll fit:: contain is carried; the default stays cover');
  }

  // 4. Scene `music_volume`.
  {
    const manifest = compiler.compile(model({
      scenes: [
        scene('quiet', 'One two three.', { music: 'audio/bed.mp3', music_volume: '0.06' }),
        scene('default', 'One two three.', { music: 'audio/bed.mp3' }),
        scene('junk', 'One two three.', { music: 'audio/bed.mp3', music_volume: 'loud' }),
      ],
    }));
    const vol = (id) => manifest.tracks.audio.find((t) => t.id === 'bgmusic_scene_' + id).volume;
    assert.strictEqual(vol('quiet'), 0.06);
    assert.strictEqual(vol('default'), DEFAULT_BG_MUSIC_VOLUME);
    assert.strictEqual(vol('junk'), DEFAULT_BG_MUSIC_VOLUME);
    console.log('✔ music_volume sets the scene music track volume; absent/invalid falls back to the default');
  }

  // 5. The TTS cache key does not depend on the avatar model.
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-key-'));
    try {
      const cache = new CacheManager({ baseDir: tmp });
      const keyFor = (avatarModel, narration = 'Same narration.') => {
        const lowered = compiler.lowerKnowledgeModel(model({
          scenes: [scene('s1', narration, { template: '[[Series :: Voice]]' })],
          layers: [layer('p', 's1', { type: 'presenter', asset: 'p.png', ...(avatarModel ? { model: avatarModel } : {}) })],
        }), { templates: { Voice: { tool: 'elevenlabs', voice: 'Ana' } } });
        const sc = lowered.scenes[0];
        const options = resolveRegisteredVoice(buildTtsVoiceOptions(sc, { tts: 'minimax/speech' }), { voices: {} });
        return cache.computeHash(sc.narration, options);
      };
      const base = keyFor(undefined);
      assert.strictEqual(keyFor('wavespeed-ai/infinitetalk'), base);
      assert.strictEqual(keyFor('wavespeed-ai/infinitetalk-fast'), base);
      // Positive control: the key is not constant, it does react to the narration.
      assert.notStrictEqual(keyFor(undefined, 'Different narration.'), base);
      console.log('✔ TTS cache key is identical across avatar models and changes with the narration');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  console.log('\nAll contract-additions tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
