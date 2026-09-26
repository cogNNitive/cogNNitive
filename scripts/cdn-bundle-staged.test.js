#!/usr/bin/env node

/**
 * scripts/cdn-bundle-staged.test.js
 *
 * Plain-node tests for scripts/lib/cdn-bundle-staged.js (checkCdnBundleStaged).
 * Build-ordering presence check for docs/innfo/cdn/innfo-mcp-v<version>.bundle.js.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { checkCdnBundleStaged } = require('./lib/cdn-bundle-staged.js');

function makeRepo({ mcpVersion = '1.2.3', bundlePresent = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-bundle-staged-'));
  const mcpDir = path.join(root, 'iNNfo', 'packages', 'innfo-mcp');
  const cdnDir = path.join(root, 'docs', 'innfo', 'cdn');
  fs.mkdirSync(mcpDir, { recursive: true });
  fs.mkdirSync(cdnDir, { recursive: true });

  fs.writeFileSync(
    path.join(mcpDir, 'package.json'),
    JSON.stringify({ name: '@cognnitive/innfo-mcp', version: mcpVersion }, null, 2),
    'utf8',
  );

  if (bundlePresent) {
    fs.writeFileSync(path.join(cdnDir, `innfo-mcp-v${mcpVersion}.bundle.js`), '// bundle\n', 'utf8');
  }

  return root;
}

function withRepo(opts, fn) {
  const root = makeRepo(opts);
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  console.log('Running cdn-bundle-staged unit tests...');

  // 1. Staged bundle is present on disk → passes
  withRepo({ mcpVersion: '1.2.3', bundlePresent: true }, (root) => {
    const r = checkCdnBundleStaged(root);
    assert.strictEqual(r.ok, true, 'present bundle must pass');
    assert.strictEqual(r.version, '1.2.3');
    assert.deepStrictEqual(r.errors, []);
    console.log('✔ Staged CDN bundle present on disk passes');
  });

  // 2. Staged bundle missing on disk → fails with named path
  withRepo({ mcpVersion: '1.2.3', bundlePresent: false }, (root) => {
    const r = checkCdnBundleStaged(root);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.version, '1.2.3');
    assert.ok(r.errors.some((e) => e.includes('innfo-mcp-v1.2.3.bundle.js')), r.errors.join('; '));
    console.log('✔ Missing staged CDN bundle fails with expected filename');
  });

  // 3. Missing package.json → fails
  {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cdn-bundle-empty-'));
    try {
      const r = checkCdnBundleStaged(emptyRoot);
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some((e) => e.includes('package.json not found')));
      console.log('✔ Missing MCP package.json fails gracefully');
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  }

  console.log('All cdn-bundle-staged unit tests passed successfully!');
}

main();
