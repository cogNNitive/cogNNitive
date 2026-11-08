import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOverlays } from '../scripts/lib/overlay-qa.mjs';

function fixture() {
  return {
    tracks: {
      scenes: [
        {
          id: 'scene_00',
          slug: '00',
          props: {
            layers: [
              { id: 'layer_bg', layer_type: 'image' },
            ],
          },
        },
      ],
      overlays: [
        { id: 'overlay_title_1', type: 'kineticTitle' },
        { id: 'overlay_watermark_1', type: 'watermark' },
      ],
    },
  };
}

const completeHtml = `<!doctype html>
<html>
  <body>
    <div id="root">
      <div id="scene-00" class="clip"></div>
      <div id="overlay_title_1" class="clip nn-overlay"></div>
      <div id="overlay_watermark_1" class="clip nn-overlay"></div>
    </div>
  </body>
</html>`;

test('checkOverlays returns empty array for complete project', () => {
  const missing = checkOverlays({ manifest: fixture(), indexHtml: completeHtml });
  assert.deepEqual(missing, []);
});

test('checkOverlays returns missing id when host is removed from indexHtml', () => {
  const htmlWithoutTitle = `<!doctype html>
<html>
  <body>
    <div id="root">
      <div id="scene-00" class="clip"></div>
      <div id="overlay_watermark_1" class="clip nn-overlay"></div>
    </div>
  </body>
</html>`;
  const missing = checkOverlays({ manifest: fixture(), indexHtml: htmlWithoutTitle });
  assert.deepEqual(missing, ['overlay_title_1']);
});

test('checkOverlays reports leaked text drawable as missing', () => {
  const manifest = fixture();
  manifest.tracks.scenes[0].props.layers.push({
    id: 'layer_leaked_text',
    layer_type: 'text',
    layer_text_content: 'Unlowered text content',
  });
  const missing = checkOverlays({ manifest, indexHtml: completeHtml });
  assert.deepEqual(missing, ['layer_leaked_text']);
});

test('checkOverlays passes when manifest declares no overlays', () => {
  const manifest = {
    tracks: {
      scenes: [{ id: 'scene_00', props: { layers: [] } }],
      overlays: [],
    },
  };
  const html = '<div id="root"><div id="scene-00" class="clip"></div></div>';
  const missing = checkOverlays({ manifest, indexHtml: html });
  assert.deepEqual(missing, []);
});

test('checkOverlays ignores extra emitted hosts not in manifest', () => {
  const htmlWithExtra = `<!doctype html>
<html>
  <body>
    <div id="root">
      <div id="scene-00" class="clip"></div>
      <div id="overlay_title_1" class="clip nn-overlay"></div>
      <div id="overlay_watermark_1" class="clip nn-overlay"></div>
      <div id="overlay_extra_unregistered" class="clip nn-overlay"></div>
    </div>
  </body>
</html>`;
  const missing = checkOverlays({ manifest: fixture(), indexHtml: htmlWithExtra });
  assert.deepEqual(missing, []);
});
