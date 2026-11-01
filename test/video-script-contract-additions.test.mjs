#!/usr/bin/env node

/**
 * test/video-script-contract-additions.test.mjs
 *
 * Lives outside the embedded skill folder on purpose: files under video-script/skills are
 * guarded by the Template Immutability Guard (any change demands a blueprint_version bump).
 *
 * Guards the video-script contract additions of V_0-14-0: the `Preset` concept, the
 * `presets` field and its shape, the retired Field names, the `presenter`
 * conditional-fields rule, the watermark Layer, the Layer paint order and the TTS
 * cache key staying independent of the avatar model.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SceneCompiler,
  DEFAULT_CONDITIONAL_FIELDS,
} from '../iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/scene-compiler.mjs';
import { buildTtsVoiceOptions, resolveRegisteredVoice } from '../iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/tts-options.mjs';
import { loadPresetIndex } from '../iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/presets.mjs';
import { CacheManager } from '../iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/cache-manager.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP = path.join(ROOT, 'iNNfo/specs/bluepriNNts/video-script');
/** Reads a blueprint file with normalized newlines, so `^…$` assertions work on Windows too. */
const read = (rel) => fs.readFileSync(path.join(BP, rel), 'utf8').replace(/\r\n/g, '\n');
const SPEC = read('spec_NN.md');
const DEFAULTS = read('defaults/video-defaults_NN.md');

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

const compiler = new SceneCompiler({ fps: 30, width: 1920, height: 1080 });

// The blueprint `Video Defaults` level, injected as the compiler receives it at
// runtime (the cascade sources every default from bags, never from engine code).
const BLUEPRINT_BAGS = { blueprint: { fit: 'cover', background_audio_volume: '0.2' } };

function fieldDefinition(name) {
  const m = new RegExp(`^## NN Field Definition: ${name}$\\n([\\s\\S]*?)(?=^## NN |^# )`, 'm').exec(SPEC);
  return m ? m[1] : null;
}

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

    const bad = compiler.checkScript(model({
      scenes: [scene('s1')],
      layers: [layer('wm', 's1', { type: 'watermark' })],
    }));
    assert.strictEqual(bad.ok, false);
    assert.strictEqual(bad.errors[0].code, 'missing-conditional-field');
    console.log('OK watermark Layer compiles to a persistent text overlay and requires text');
  }

  // 2. Presenter avatar model override.
  {
    const lowered = compiler.lowerKnowledgeModel(model({
      scenes: [scene('s1')],
      layers: [
        layer('a', 's1', { type: 'presenter', asset: 'a.png', avatar_model: 'wavespeed-ai/infinitetalk' }),
        layer('b', 's1', { type: 'presenter', asset: 'b.png' }),
      ],
    }));
    const [a, b] = lowered.scenes[0].layers;
    assert.strictEqual(a.properties.layer_avatar_model, 'wavespeed-ai/infinitetalk');
    assert.ok(!('layer_avatar_model' in b.properties), 'a presenter without a model keeps the cascade value');
    console.log('OK presenter avatar_model:: lowers to layer_avatar_model; absent stays unset');
  }

  // 3. b-roll `fit`.
  {
    const manifest = compiler.compile(model({
      scenes: [scene('s1')],
      layers: [
        layer('contain', 's1', { type: 'b-roll', asset: 'media/a.png', fit: 'contain' }),
        layer('plain', 's1', { type: 'b-roll', asset: 'media/b.png' }),
      ],
    }), { bags: BLUEPRINT_BAGS });
    const broll = manifest.tracks.overlays.filter((o) => o.type === 'broll');
    assert.strictEqual(broll.length, 2);
    assert.strictEqual(broll[0].config.fit, 'contain');
    assert.strictEqual(broll[1].config.fit, 'cover');
    console.log('OK b-roll fit:: contain is carried; the blueprint default stays cover');
  }

  // 4. Scene background audio volume.
  {
    const manifest = compiler.compile(model({
      scenes: [
        scene('quiet', 'One two three.', { background_audio: 'audio/bed.mp3', background_audio_volume: '0.06' }),
        scene('default', 'One two three.', { background_audio: 'audio/bed.mp3' }),
        scene('junk', 'One two three.', { background_audio: 'audio/bed.mp3', background_audio_volume: 'loud' }),
      ],
    }), { bags: BLUEPRINT_BAGS });
    const vol = (id) => manifest.tracks.audio.find((t) => t.id === 'bgmusic_scene_' + id).volume;
    assert.strictEqual(vol('quiet'), 0.06);
    assert.strictEqual(vol('default'), 0.2);
    assert.strictEqual(vol('junk'), 0.2);
    console.log('OK background_audio_volume sets the track volume; absent/invalid falls back to the blueprint default');
  }

  // 5. The TTS cache key does not depend on the avatar model.
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-key-'));
    try {
      const cache = new CacheManager({ baseDir: tmp });
      const bags = {
        presetIndex: loadPresetIndex([
          { doc: 'script', elements: { Preset: [{ type: 'Preset', name: 'Voice', slug: 'voice', fields: { voice: 'Ana' } }] } },
        ]),
      };
      const keyFor = (avatarModel, narration = 'Same narration.') => {
        const lowered = compiler.lowerKnowledgeModel(model({
          scenes: [scene('s1', narration, { presets: ['Voice'] })],
          layers: [layer('p', 's1', { type: 'presenter', asset: 'p.png', ...(avatarModel ? { avatar_model: avatarModel } : {}) })],
        }), { bags });
        const sc = lowered.scenes[0];
        const options = resolveRegisteredVoice(buildTtsVoiceOptions(sc, { tts: 'minimax/speech' }), { voices: {} });
        return cache.computeHash(sc.narration, options);
      };
      const base = keyFor(undefined);
      assert.strictEqual(keyFor('wavespeed-ai/infinitetalk'), base);
      assert.strictEqual(keyFor('wavespeed-ai/infinitetalk-fast'), base);
      assert.notStrictEqual(keyFor(undefined, 'Different narration.'), base);
      console.log('OK TTS cache key is identical across avatar models and changes with the narration');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  // 6. The blueprint contract itself (capability video-blueprint and video-presets).
  {
    assert.match(SPEC, /^blueprint_version: "V_0-14-1"$/m, 'the blueprint declares V_0-14-1');
    assert.match(SPEC, /^## NN Concept Definition: Preset$/m, 'Preset is a top-level Concept');
    assert.doesNotMatch(SPEC, /^## NN Concept Definition: Template$/m, 'Template is gone');
    assert.doesNotMatch(SPEC, /^## NN Field Definition: Template$/m);

    // Preset has no Field of its own: no Field Definition lists only `Preset`
    // without also listing a cascade level (the preset parameters are shared).
    for (const name of ['template', 'tool', 'tts_model', 'music', 'music_volume', 'presenter_asset', 'intro_asset', 'level', 'voice_id', 'speed', 'emotion']) {
      assert.strictEqual(fieldDefinition(name), null, `retired Field "${name}" must be absent`);
    }

    const presets = fieldDefinition('presets');
    assert.ok(presets, 'the presets Field Definition exists');
    assert.match(presets, /^concept:: \[Video, Scene, Series, Video Defaults\]$/m);
    assert.match(presets, /^type:: select$/m);
    assert.match(presets, /^multiple:: true$/m);
    assert.doesNotMatch(presets, /^options::/m, 'an open-vocabulary multi-select declares no options');

    for (const name of ['voice', 'voice_model', 'voice_speed', 'voice_emotion', 'voice_tone', 'avatar', 'avatar_model', 'image_model', 'background_audio', 'background_audio_volume', 'transition', 'frame', 'fit', 'components', 'sounds', 'intro']) {
      const def = fieldDefinition(name);
      assert.ok(def, `cascade parameter ${name} is declared`);
      assert.match(def, /Preset/, `${name} lists Preset among its concepts`);
    }
    // avatar and intro are no longer Series-only; z_index replaces level.
    assert.match(fieldDefinition('avatar'), /^concept:: \[Video, Scene, Preset, Series, Video Defaults\]$/m);
    assert.match(fieldDefinition('avatar'), /^type:: file$/m);
    assert.match(fieldDefinition('z_index'), /^concept:: Layer$/m);

    assert.deepStrictEqual(DEFAULT_CONDITIONAL_FIELDS.presenter, ['asset', 'prompt', 'avatar']);
    assert.match(SPEC, /^    presenter: \[asset, prompt, avatar\]$/m, 'the blueprint frontmatter agrees');

    // The blueprint package ships no Preset and no presets default: otherwise a
    // TTS key would gain a value and every narration would be billed again.
    assert.doesNotMatch(DEFAULTS, /^presets::/m);
    assert.doesNotMatch(DEFAULTS, /^## NN Preset:/m);
    assert.doesNotMatch(DEFAULTS, /voice_speed::|voice_emotion::|voice_tone::/);
    assert.match(DEFAULTS, /^voice_model:: minimax\/speech-2\.8-hd$/m);
    assert.match(DEFAULTS, /^background_audio_volume:: 0\.2$/m);
    assert.match(DEFAULTS, /^parent_spec:\n  name: "video-script_V_0-14-1"$/m);

    // One declared master size; every delivery format is derived from it.
    const masterResolution = fieldDefinition('master_resolution');
    assert.ok(masterResolution, 'master_resolution is declared');
    assert.match(masterResolution, /^concept:: Video Defaults$/m);
    assert.match(masterResolution, /^type:: select$/m);
    assert.match(masterResolution, /^options:: \[1920x1920\]$/m);
    assert.match(DEFAULTS, /^master_resolution:: 1920x1920$/m);
    assert.strictEqual(fieldDefinition('resolution'), null, 'resolution stays undeclared');
    assert.strictEqual(fieldDefinition('format'), null, 'format stays undeclared');
    assert.strictEqual(fieldDefinition('fps'), null, 'fps stays undeclared');
    assert.match(fieldDefinition('master'), /square master `<slug>_1920x1920\.mp4`/);
    assert.match(fieldDefinition('position'), /central safe square/);
    assert.doesNotMatch(SPEC, /center 12%/);
    assert.doesNotMatch(SPEC, /\bdual\b/);
    console.log('OK one declared square master; delivery formats are derived, never modeled');
    console.log('OK blueprint contract: Preset concept, presets shape, retired names gone, defaults preset-free');
  }

  // 7. The console template carries no literal blueprint version.
  {
    const template = read('skills/nn-video-script/scripts/draft-template.html');
    assert.doesNotMatch(template, /video-script_V_\d/, 'the version must be substituted at build time');
    assert.match(template, /\{\{BLUEPRINT_VERSION\}\}/);
    console.log('OK the review console template carries no literal blueprint version');
  }

  console.log('\nAll contract-additions tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
