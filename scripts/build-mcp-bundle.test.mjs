#!/usr/bin/env node
/**
 * scripts/build-mcp-bundle.test.mjs
 *
 * Guards the freshness check for the committed MCP CDN bundle: the artifact must
 * announce the version in `package.json`, because `stage-mcp-bundle.mjs` copies
 * it byte-for-byte into the release.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkMcpBundle, readEmbeddedVersion } from './build-mcp-bundle.mjs';

function makeRepo(bundleText, version = '1.2.3') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bundle-freshness-'));
  const mcpDir = path.join(root, 'iNNfo', 'packages', 'nn-mcp');
  fs.mkdirSync(path.join(mcpDir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(mcpDir, 'package.json'), JSON.stringify({ version }), 'utf8');
  if (bundleText !== null) {
    fs.writeFileSync(path.join(mcpDir, 'bin', 'nn-mcp.bundle.js'), bundleText);
  }
  return root;
}

const announce = (version) =>
  `var s=await server({name:"nn-mcp",version:"${version}"},{capabilities:{tools:{}}});`;

// 1. Reads the version out of minified text, and only from the server announcement.
{
  assert.strictEqual(readEmbeddedVersion(announce('9.9.9')), '9.9.9');
  assert.strictEqual(readEmbeddedVersion('const version = "9.9.9"'), null, 'no announcement, no match');
}

// 2. A bundle announcing the package.json version is fresh.
{
  const repo = makeRepo(announce('1.2.3'));
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.embedded, '1.2.3');
}

// 3. The shipped 0.37.0 defect: package.json moved on, the bytes did not.
{
  const repo = makeRepo(announce('0.36.0'), '0.37.1');
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.expected, '0.37.1');
  assert.strictEqual(res.embedded, '0.36.0');
}

// 4. A bundle with no announcement cannot be verified, so it fails instead of passing blind.
{
  const repo = makeRepo('console.log("no server here")');
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /cannot be verified/);
}

// 5. A code-split bundle would break the single-file CDN install.
{
  const repo = makeRepo(`${announce('1.2.3')}\nimport {a} from "./chunk-ABC123.js";`);
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /code-split/);
}

// 6. A missing bundle is reported, not thrown.
{
  const repo = makeRepo(null);
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /MCP bundle not found/);
}

console.log('build-mcp-bundle tests passed');
