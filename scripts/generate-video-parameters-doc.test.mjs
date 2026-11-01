#!/usr/bin/env node

/**
 * scripts/generate-video-parameters-doc.test.mjs
 *
 * Unit tests for the video-script parameter reference generator (plain node,
 * zero deps) plus a drift guard: the committed references/parameters.md must
 * equal the render of the real spec_NN.md.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
  parseFieldDefinitions,
  parseConditionalFields,
  renderParametersDoc,
  SPEC_PATH,
  DOC_PATH,
} from './generate-video-parameters-doc.mjs';

const SPEC = `---
validation:
  conditional_fields:
    title: [text]
    presenter: [asset, prompt, avatar]
---

# NN Field Definition

## NN Field Definition: tags
concept:: *
type:: select
multiple:: true
description:: Open vocabulary tags.

## NN Field Definition: fit
concept:: [Layer, Scene, Video Defaults]
type:: select
options:: [cover, contain]
description:: How a media Layer fits its box | with a pipe.

## NN Field Definition: title
concept:: Video
type:: string
description:: Human title.

# Video Script Blueprint
`;

// parseFieldDefinitions
{
  const fields = parseFieldDefinitions(SPEC);
  assert.deepStrictEqual(fields.map((f) => f.name), ['tags', 'fit', 'title'], 'spec order is preserved');
  assert.deepStrictEqual(fields[0].concepts, ['*']);
  assert.strictEqual(fields[0].multiple, true);
  assert.deepStrictEqual(fields[1].concepts, ['Layer', 'Scene', 'Video Defaults']);
  assert.deepStrictEqual(fields[1].options, ['cover', 'contain']);
  assert.strictEqual(fields[1].multiple, false);
  assert.deepStrictEqual(fields[2].concepts, ['Video'], 'a bare concept becomes a one-item list');
  assert.deepStrictEqual(fields[2].options, []);
  assert.strictEqual(fields[2].description, 'Human title.');
}

// parseConditionalFields
{
  assert.deepStrictEqual(parseConditionalFields(SPEC), {
    title: ['text'],
    presenter: ['asset', 'prompt', 'avatar'],
  });
}

// renderParametersDoc
{
  const doc = renderParametersDoc(parseFieldDefinitions(SPEC), parseConditionalFields(SPEC));
  const row = (name) => doc.split('\n').find((l) => l.startsWith(`| \`${name}\` |`));

  assert.match(doc, /^<!-- GENERATED/, 'starts with the do-not-edit marker');
  assert.ok(doc.endsWith('\n'), 'ends with a newline');

  // Columns: Parameter | Type | Values | Defaults | Series | Preset | Video | Scene | Layer
  assert.strictEqual(row('tags'), '| `tags` | select (multi) | — | ● | ● | ● | ● | ● | ● |', '`*` marks every scope');
  assert.strictEqual(row('fit'), '| `fit` | select | `cover`, `contain` | ● | · | · | · | ● | ● |');
  assert.strictEqual(row('title'), '| `title` | string | — | · | · | · | ● | · | · |');

  // Descriptions live in the details section (outside any table), verbatim.
  assert.match(doc, /### `fit`\n\nHow a media Layer fits its box \| with a pipe\.\n\nSettable at: `Layer`, `Scene`, `Video Defaults`\./);

  // Conditional fields render as a per-Layer-type table.
  assert.match(doc, /\| `presenter` \| `asset`, `prompt`, `avatar` \|/);

  // Deterministic.
  assert.strictEqual(doc, renderParametersDoc(parseFieldDefinitions(SPEC), parseConditionalFields(SPEC)));
}

// Every concept named by the real spec maps to a column (an unknown one must fail loudly).
{
  assert.throws(
    () => renderParametersDoc([{ name: 'x', concepts: ['Nonsense'], type: 'string', options: [], multiple: false, description: '' }], {}),
    /unknown concept/i,
  );
}

// Drift guard against the real spec and the committed reference.
{
  const fields = parseFieldDefinitions(fs.readFileSync(SPEC_PATH, 'utf8'));
  assert.ok(fields.length > 30, `expected the real spec to declare >30 fields, got ${fields.length}`);
  for (const name of ['presets', 'voice_model', 'background_audio', 'z_index', 'master_resolution']) {
    assert.ok(fields.some((f) => f.name === name), `real spec must declare ${name}`);
  }
  assert.ok(fs.existsSync(DOC_PATH), `${DOC_PATH} is missing; run node scripts/generate-video-parameters-doc.mjs`);
  const expected = renderParametersDoc(fields, parseConditionalFields(fs.readFileSync(SPEC_PATH, 'utf8')));
  assert.strictEqual(
    fs.readFileSync(DOC_PATH, 'utf8').replace(/\r\n/g, '\n'),
    expected,
    'references/parameters.md is out of sync; run node scripts/generate-video-parameters-doc.mjs',
  );
}

console.log('✔ video parameter reference generator');
