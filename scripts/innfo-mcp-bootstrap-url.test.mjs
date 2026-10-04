#!/usr/bin/env node

/**
 * scripts/innfo-mcp-bootstrap-url.test.mjs
 *
 * Regression guard: the manual bootstrap scripts must request the SAME
 * versioned CDN filename that the release actually publishes.
 *
 * The release stages the MCP bundle as `innfo-mcp-v<version>.bundle.js`
 * (see scripts/release/run-release.js). The CDN manifest only carries the
 * bare version (`{"latest":"0.14.1"}`), so any bootstrap that builds
 * `innfo-mcp-<version>.bundle.js` (missing the `v`) resolves to a 404 and the
 * user cannot install the MCP. This test fails loudly if that drifts back.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VERSIONED_BUNDLE = /innfo-mcp-v\$\{?(latest|LATEST)\}?\.bundle\.js/;

const targets = /** @type {const} */ ([
  { file: 'scripts/innfo-mcp.ps1', pattern: /\$bundleUrl = "([^"]+)"/ },
  { file: 'scripts/innfo-mcp.sh', pattern: /BUNDLE_URL="([^"]+)"/ },
  { file: 'docs/innfo/mcp-setup.md', pattern: /BUNDLE_URL="([^"]+)"/ },
]);

let failures = 0;

for (const { file: rel, pattern } of targets) {
  const full = path.join(repoRoot, rel);
  const text = fs.readFileSync(full, 'utf8');
  const match = text.match(pattern);
  if (!match) {
    console.error(`FAIL ${rel}: no CDN bundle URL found (pattern ${pattern})`);
    failures++;
    continue;
  }
  const url = match[1];
  if (!VERSIONED_BUNDLE.test(url)) {
    console.error(`FAIL ${rel}: URL "${url}" must request innfo-mcp-v<version>.bundle.js`);
    failures++;
  } else {
    console.log(`ok   ${rel}: ${url}`);
  }
}

// The release is the source of truth for the naming convention.
const releaseSrc = fs.readFileSync(
  path.join(repoRoot, 'scripts/release/run-release.js'),
  'utf8',
);
assert.ok(
  /`innfo-mcp-v\$\{version\}\.bundle\.js`/.test(releaseSrc),
  'run-release.js no longer stages innfo-mcp-v<version>.bundle.js — update this guard with it',
);

if (failures > 0) {
  console.error(`\n${failures} bootstrap URL(s) out of sync with the release naming.`);
  process.exit(1);
}

console.log('\nAll bootstrap URLs match the released CDN filename.');
