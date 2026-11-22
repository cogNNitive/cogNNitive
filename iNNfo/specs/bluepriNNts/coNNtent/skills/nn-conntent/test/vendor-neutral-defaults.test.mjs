/**
 * nn-conntent/test/vendor-neutral-defaults.test.mjs
 *
 * Backlog `video-vector-actor-catalog`: the blueprint is vendor-neutral. Its Video Defaults
 * pin no vendor model for the avatar layer (neither the still image model nor the lip-sync
 * model); the vendor id is the domain's plug point, declared in the domain's own
 * `video-defaults_NN.md`, and an avatar job with no resolved model is refused before any
 * spend with an error that names that plug point.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectAvatarJobs } from '../scripts/lib/avatar-jobs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULTS = path.resolve(HERE, '..', '..', '..', 'defaults', 'video-defaults_NN.md');
const SPEC = path.resolve(HERE, '..', '..', '..', 'spec_NN.md');

test('the blueprint Video Defaults pin no vendor model for the avatar layer', () => {
  const text = fs.readFileSync(DEFAULTS, 'utf8');
  assert.doesNotMatch(text, /wavespeed-ai\/z-image\/turbo/);
  assert.doesNotMatch(text, /wavespeed-ai\/infinitetalk-fast/);
  assert.doesNotMatch(text, /^(image_model|avatar_model)::/m, 'no model id at the blueprint level');
});

test('the plug point is documented: the domain defaults declare the model ids', () => {
  const defaults = fs.readFileSync(DEFAULTS, 'utf8');
  assert.match(defaults, /avatar_model::/, 'the defaults document names the avatar_model plug point');
  assert.match(defaults, /image_model::/, 'the defaults document names the image_model plug point');
  const spec = fs.readFileSync(SPEC, 'utf8');
  assert.doesNotMatch(spec, /`avatar_model` is never required: it has a blueprint default/);
});

test('an avatar job with no resolved model is refused before spend and names the plug point', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-neutral-'));
  try {
    const img = path.join(dir, 'a.png');
    const aud = path.join(dir, 'a.mp3');
    fs.writeFileSync(img, 'img');
    fs.writeFileSync(aud, 'aud');
    const cacheManager = { computeHash: (c, o) => JSON.stringify([c, o]), getSync: (k, ext, cat) => (cat === 'tts' ? aud : undefined) };
    const parsed = {
      scenes: [{ id: 's1', narration: 'hi', layers: [{ name: 'host', properties: { layer_type: 'avatar', layer_asset_source: img } }] }],
    };
    const { jobs, problems } = collectAvatarJobs({ parsed, scriptDir: dir, cacheManager, config: {}, models: {}, bags: {} });
    // The job stays listed (its clip is missing, so render refuses), but synthesis refuses on the problem.
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].model, undefined);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /no avatar_model/);
    assert.match(problems[0], /video-defaults_NN\.md/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
