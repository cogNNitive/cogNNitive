import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tryHyperframesRender } from '../scripts/hyperframes-render.mjs';
import { renderVideo, splitPassthrough } from '../scripts/video-engine-cli.mjs';

const manifest = {
  version: '1.0.0',
  compositionId: 'demo-video',
  fps: 30,
  width: 1080,
  height: 1080,
  totalDurationInFrames: 90,
  totalDurationInSeconds: 3,
  tracks: {
    scenes: [
      {
        id: 'scene_a',
        slug: 'a',
        fromFrame: 0,
        durationInFrames: 90,
        transition: { type: 'none' },
        props: { layers: [{ layer_type: 'image', layer_asset_source: 'bg.jpg', layer_level: 0 }] },
      },
    ],
    audio: [],
    overlays: [],
  },
  metadata: { generator: 'cogNNitive Video Engine' },
};

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hf-render-'));

test('a non-zero exit carries the stderr tail as detail', async () => {
  const dir = tmp();
  const stderr = 'noise\n'.repeat(1000) + 'Error: chrome crashed';
  const res = await tryHyperframesRender(
    { manifest, outputPath: path.join(dir, 'out.mp4') },
    { run: async () => ({ status: 3, stdout: 'stdout text', stderr }) },
  );
  assert.equal(res.rendered, false);
  assert.equal(res.reason, 'hyperframes-exit-3');
  assert.match(res.detail, /Error: chrome crashed$/);
  assert.ok(res.detail.length <= 2000, 'detail is a bounded tail');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('detail falls back to stdout when stderr is empty', async () => {
  const dir = tmp();
  const res = await tryHyperframesRender(
    { manifest, outputPath: path.join(dir, 'out.mp4') },
    { run: async () => ({ status: 1, stdout: 'only stdout', stderr: '  ' }) },
  );
  assert.equal(res.detail, 'only stdout');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('extraArgs are appended verbatim to the hyperframes render command', async () => {
  const dir = tmp();
  const out = path.join(dir, 'out.mp4');
  let seen;
  const res = await tryHyperframesRender(
    { manifest, outputPath: out, extraArgs: ['--workers', '2', '--low-memory-mode'] },
    {
      run: async (cmd, args) => {
        seen = args;
        fs.writeFileSync(out, 'x');
        return { status: 0 };
      },
    },
  );
  assert.equal(res.rendered, true);
  assert.deepEqual(seen.slice(-3), ['--workers', '2', '--low-memory-mode']);
  assert.ok(seen.includes('render'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('renderVideo surfaces the captured detail in the named error and forwards hyperframesArgs', async () => {
  const dir = tmp();
  const manifestPath = path.join(dir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  let seen;
  await assert.rejects(
    renderVideo({
      manifestPath,
      outputVideoPath: path.join(dir, 'out.mp4'),
      hyperframesArgs: ['--workers', '2'],
      hyperframesRun: async (cmd, args) => {
        seen = args;
        return { status: 1, stdout: '', stderr: 'out of memory' };
      },
    }),
    (err) => err.name === 'VideoRenderError' && /hyperframes-exit-1/.test(err.message) && /out of memory/.test(err.message),
  );
  assert.deepEqual(seen.slice(-2), ['--workers', '2']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('splitPassthrough separates everything after a literal --', () => {
  assert.deepEqual(splitPassthrough(['render', 'm.json', '--output', 'o.mp4', '--', '--workers', '2']), {
    argv: ['render', 'm.json', '--output', 'o.mp4'],
    passthrough: ['--workers', '2'],
  });
  assert.deepEqual(splitPassthrough(['render', 'm.json']), { argv: ['render', 'm.json'], passthrough: [] });
});
