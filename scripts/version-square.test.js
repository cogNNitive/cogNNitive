#!/usr/bin/env node

/**
 * scripts/version-square.test.js
 *
 * Plain-node tests for the 6-way MCP Version Square
 * (scripts/lib/version-square.js): mcp/core package.json versions, the
 * innfo-core dependency range, the CDN manifest, the CDN bundle file, and the
 * stable ref in manifest/source.yaml must all agree.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { checkVersionSquare } = require('./lib/version-square.js');

/**
 * Writes a synthetic repo root holding the five artifacts the square reads,
 * then returns it. Caller removes it. Per-case overrides inject one drift.
 */
function makeRepo(overrides = {}) {
  const {
    mcpVersion = '1.2.3',
    coreVersion = '1.2.3',
    dep = '^1.2.3',
    cdnLatest = 'v1.2.3',
    bundleVersion = '1.2.3', // null → no bundle file on disk
    ref = 'innfo-mcp-v1.2.3',
    writeSource = true,
  } = overrides;

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'version-square-'));
  const mcpDir = path.join(root, 'iNNfo', 'packages', 'innfo-mcp');
  const coreDir = path.join(root, 'iNNfo', 'packages', 'innfo-core');
  const cdnDir = path.join(root, 'docs', 'innfo', 'cdn');
  fs.mkdirSync(mcpDir, { recursive: true });
  fs.mkdirSync(coreDir, { recursive: true });
  fs.mkdirSync(cdnDir, { recursive: true });

  fs.writeFileSync(
    path.join(mcpDir, 'package.json'),
    JSON.stringify(
      { name: '@cognnitive/innfo-mcp', version: mcpVersion, dependencies: { '@cognnitive/innfo-core': dep } },
      null,
      2,
    ),
    'utf8',
  );
  fs.writeFileSync(
    path.join(coreDir, 'package.json'),
    JSON.stringify({ name: '@cognnitive/innfo-core', version: coreVersion }, null, 2),
    'utf8',
  );
  fs.writeFileSync(path.join(cdnDir, 'manifest.json'), JSON.stringify({ latest: cdnLatest }, null, 2), 'utf8');
  if (bundleVersion !== null) {
    fs.writeFileSync(path.join(cdnDir, `innfo-mcp-v${bundleVersion}.bundle.js`), '// bundle\n', 'utf8');
  }
  if (writeSource) {
    fs.mkdirSync(path.join(root, 'manifest'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'manifest', 'source.yaml'),
      `channels:\n  stable:\n    refs:\n      - key: innfo-mcp\n        repo: cogNNitive/cogNNitive\n        ref: ${ref}\n`,
      'utf8',
    );
  }
  return root;
}

function withRepo(overrides, fn) {
  const root = makeRepo(overrides);
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function main() {
  console.log('Running version-square unit tests...');

  // 1. All six values aligned → ok
  withRepo({}, (root) => {
    const r = checkVersionSquare(root);
    assert.strictEqual(r.ok, true, 'aligned repo must pass the version square');
    assert.strictEqual(r.version, '1.2.3');
    assert.deepStrictEqual(r.errors, []);
    console.log('✔ Aligned 6-way version square passes');
  });

  // 2. Core version drift
  withRepo({ coreVersion: '1.2.2' }, (root) => {
    const r = checkVersionSquare(root);
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('innfo-core version')), r.errors.join('; '));
    console.log('✔ Core version drift fails');
  });

  // 3. innfo-core dependency range drift
  withRepo({ dep: '^1.0.0' }, (root) => {
    const r = checkVersionSquare(root);
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('dependency @cognnitive/innfo-core')), r.errors.join('; '));
    console.log('✔ innfo-core dependency range drift fails');
  });

  // 4. CDN manifest drift
  withRepo({ cdnLatest: 'v1.2.2' }, (root) => {
    const r = checkVersionSquare(root);
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('manifest.json latest')), r.errors.join('; '));
    console.log('✔ CDN manifest drift fails');
  });

  // 5. CDN bundle missing on disk
  withRepo({ bundleVersion: null }, (root) => {
    const r = checkVersionSquare(root);
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('CDN bundle missing on disk')), r.errors.join('; '));
    console.log('✔ Missing CDN bundle fails');
  });

  // 6. Stable ref drift
  withRepo({ ref: 'innfo-mcp-v1.2.2' }, (root) => {
    const r = checkVersionSquare(root);
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('stable ref')), r.errors.join('; '));
    console.log('✔ Stable ref drift fails');
  });

  // 7. Missing manifest/source.yaml
  withRepo({ writeSource: false }, (root) => {
    const r = checkVersionSquare(root);
    assert.strictEqual(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('manifest/source.yaml not found')), r.errors.join('; '));
    console.log('✔ Missing manifest/source.yaml fails');
  });

  console.log('All version-square unit tests passed successfully!');
}

main();
