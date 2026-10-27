import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseFrameTokens, loadFrame, frameCss } from '../scripts/lib/frame-tokens.mjs';
import { renderOverlay } from '../scripts/overlay-blocks.mjs';

const FRAME = `---
version: alpha
name: Demo Frame — video
description: |
  A demo frame with a colon: and a dash - inside prose.
unit: the frame — 1920x1080
colors:
  bg: "#fdfae7"
  primary: "#1e2bfa"
  text: "#111111"
typography:
  body: { fontFamily: "Inter", cqw: 0.85, weight: 400 }
  h4-eyebrow: { fontFamily: "Space Grotesk", weight: 600 }
radii:
  card-lg: "14px"
---

# Demo frame

prose that must be ignored.
`;

test('parseFrameTokens reads palette, type and radii from the frontmatter', () => {
  const tokens = parseFrameTokens(FRAME);
  assert.equal(tokens.colors.bg, '#fdfae7');
  assert.equal(tokens.colors.primary, '#1e2bfa');
  assert.equal(tokens.typography.body.fontFamily, 'Inter');
  assert.equal(tokens.typography.h4_eyebrow, undefined);
  assert.equal(tokens.typography['h4-eyebrow'].fontFamily, 'Space Grotesk');
  assert.equal(tokens.radii['card-lg'], '14px');
  assert.equal(tokens.name, 'Demo Frame — video');
});

test('parseFrameTokens returns null without a frontmatter palette', () => {
  assert.equal(parseFrameTokens('# just prose'), null);
  assert.equal(parseFrameTokens('---\nname: x\n---\n'), null);
});

test('loadFrame reads and parses one frame document', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-frame-'));
  const file = path.join(root, 'brand.md');
  fs.writeFileSync(file, FRAME, 'utf8');

  const loaded = loadFrame(file);
  assert.equal(loaded.path, file);
  assert.equal(loaded.tokens.colors.primary, '#1e2bfa');
  assert.equal(loadFrame(path.join(root, 'missing.md')).tokens, null);
  fs.rmSync(root, { recursive: true, force: true });
});

test('frameCss exposes only type and accent, never layout', () => {
  const frame = frameCss(parseFrameTokens(FRAME));
  assert.match(frame.fontCss, /font-family:'Inter',sans-serif/);
  assert.equal(frame.accent, '#1e2bfa');
  assert.equal(frame.textColor, '#111111');
  assert.equal(frameCss(null).fontCss, '');
});

test('an overlay inherits the frame typeface and accent, keeping its own layout', () => {
  const seriesFrame = { tokens: parseFrameTokens(FRAME) };
  const overlay = {
    id: 'o1',
    type: 'lowerThird',
    fromFrame: 0,
    durationInFrames: 60,
    config: { title: 'Lucas' },
  };

  const html = renderOverlay(overlay, 0, 30, { width: 1080, seriesFrame });

  assert.match(html, /font-family:'Inter'/);
  assert.match(html, /border-left:\d+px solid #1e2bfa/);
  assert.match(html, /left:\d+px/, 'geometry stays the engine default');
  assert.match(html, /Lucas/);
});

test('without a frame the emitter keeps its built-in defaults', () => {
  const overlay = { id: 'o1', type: 'lowerThird', fromFrame: 0, durationInFrames: 30, config: { text: 'x' } };
  const html = renderOverlay(overlay, 0, 30, { width: 1080 });
  assert.match(html, /border-left:\d+px solid #7c3aed/);
  assert.doesNotMatch(html, /font-family/);
});
