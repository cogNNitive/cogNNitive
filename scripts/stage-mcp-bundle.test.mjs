#!/usr/bin/env node
/**
 * scripts/stage-mcp-bundle.test.mjs
 *
 * quality-gates spec, "MCP CDN bundle staging is independent of the editor build".
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stageMcpBundle } from './stage-mcp-bundle.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function makeRepo(bundleText, version = '1.2.3') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-mcp-'));
  const mcpDir = path.join(root, 'iNNfo', 'packages', 'innfo-mcp');
  fs.mkdirSync(path.join(mcpDir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(mcpDir, 'package.json'), JSON.stringify({ version }), 'utf8');
  if (bundleText !== null) {
    fs.writeFileSync(path.join(mcpDir, 'bin', 'innfo-mcp.bundle.js'), bundleText);
  }
  return root;
}

// 1. Stages the committed bundle byte-for-byte, no editor build involved.
{
  const bytes = Buffer.from([0x63, 0x6f, 0x6e, 0x73, 0x74, 0x0d, 0x0a, 0xff, 0x00, 0x0a]);
  const root = makeRepo(bytes);
  const docsRoot = path.join(root, 'out-docs');
  const result = stageMcpBundle({ repoRoot: root, docsRoot });
  const staged = path.join(docsRoot, 'innfo', 'cdn', 'innfo-mcp-v1.2.3.bundle.js');
  assert.ok(fs.readFileSync(staged).equals(bytes), 'CDN bytes equal the committed bundle');
  assert.strictEqual(result.version, '1.2.3');
  const manifest = JSON.parse(fs.readFileSync(path.join(docsRoot, 'innfo', 'cdn', 'manifest.json'), 'utf8'));
  assert.strictEqual(manifest.latest, 'v1.2.3');
  console.log('✔ stages the committed bundle byte-for-byte');
}

// 2. A code-split bundle is rejected and nothing is left staged.
{
  const root = makeRepo('import { a } from "./chunk-ABC123.js";\n');
  const docsRoot = path.join(root, 'out-docs');
  assert.throws(() => stageMcpBundle({ repoRoot: root, docsRoot }), /code-split/);
  assert.ok(
    !fs.existsSync(path.join(docsRoot, 'innfo', 'cdn', 'innfo-mcp-v1.2.3.bundle.js')),
    'broken bundle is not left in the CDN dir',
  );
  console.log('✔ fails on code-split output');
}

// 3. A missing bundle fails loudly.
{
  const root = makeRepo(null);
  assert.throws(() => stageMcpBundle({ repoRoot: root, docsRoot: path.join(root, 'o') }), /not found/);
  console.log('✔ fails when the committed bundle is missing');
}

// 4. build-docs.mjs no longer stages the CDN bundle.
{
  const src = fs.readFileSync(path.join(here, 'build-docs.mjs'), 'utf8');
  assert.ok(!src.includes('innfo-mcp.bundle.js'), 'build-docs.mjs must not reference the MCP bundle');
  assert.ok(!/cdnDir|cdn\/manifest\.json/.test(src), 'build-docs.mjs must not stage the CDN dir');
  console.log('✔ build-docs.mjs does not stage the CDN bundle');
}

console.log('stage-mcp-bundle tests passed');
