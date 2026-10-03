/**
 * scripts/lib/console-shell-sync.test.js
 *
 * Plain-node tests for the generated console-shell pin sync.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const {
  syncShellContent,
  getGeneratedPin,
  discoverGeneratedShells,
  expectedVersion,
  MARKER_START,
  MARKER_END,
} = require('./console-shell-sync.js');

function makeRepo(version) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'console-shell-sync-'));
  const pkgDir = path.join(root, 'iNNfo', 'specs', 'bluepriNNts', 'console');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name: '@cognnitive/innfo-console', version }, null, 2),
  );
  return root;
}

function markedShell(pin, { repo = 'cogNNitive/cogNNitive', subpath = 'templates' } = {}) {
  return [
    '<html><body>',
    MARKER_START,
    `<script src="https://cdn.jsdelivr.net/gh/${repo}@innfo-console-v${pin}/iNNfo/specs/${subpath}/console/innfo-console.bundle.js"></script>`,
    MARKER_END,
    '</body></html>',
  ].join('\n');
}

function runTests() {
  console.log('Running console-shell-sync tests...');

  // 1. expectedVersion derives from console/package.json
  {
    const root = makeRepo('0.7.3');
    assert.strictEqual(expectedVersion(root), '0.7.3');
    console.log('✔ expectedVersion derives from console/package.json');
  }

  // 2. getGeneratedPin reads the marked block only
  {
    assert.strictEqual(getGeneratedPin(markedShell('0.7.2')), 'innfo-console-v0.7.2');
    assert.strictEqual(
      getGeneratedPin('<script src="https://cdn/cogNNitive@innfo-console-v0.9.9/x.js"></script>'),
      null,
      'an unmarked shell has no generated pin',
    );
    console.log('✔ getGeneratedPin reads marked shells only');
  }

  // 3. syncShellContent rewrites ONLY the version token, preserving the CDN path
  {
    const root = makeRepo('0.7.3');
    const src = markedShell('0.7.2', { repo: 'cogNNitive/cogNNitive', subpath: 'templates' });
    const synced = syncShellContent(src, expectedVersion(root));
    assert.strictEqual(getGeneratedPin(synced), 'innfo-console-v0.7.3');
    // the repo/path survive untouched
    assert.ok(synced.includes('cdn.jsdelivr.net/gh/cogNNitive/cogNNitive@innfo-console-v0.7.3/iNNfo/specs/templates/'));
    // idempotent
    assert.strictEqual(syncShellContent(synced, '0.7.3'), synced);
    // unmarked content is left alone
    assert.strictEqual(syncShellContent('<html></html>', '0.7.3'), null);
    console.log('✔ syncShellContent is surgical and idempotent');
  }

  // 4. discoverGeneratedShells finds only marked *.html under bluepriNNts
  {
    const root = makeRepo('0.7.3');
    const bp = path.join(root, 'iNNfo', 'specs', 'bluepriNNts');
    fs.mkdirSync(path.join(bp, 'metrics', 'assets'), { recursive: true });
    fs.writeFileSync(path.join(bp, 'console.html'), markedShell('0.7.3'));
    fs.writeFileSync(path.join(bp, 'metrics', 'assets', 'timeline.html'), markedShell('0.7.3'));
    fs.writeFileSync(path.join(bp, 'plain.html'), '<html></html>');
    assert.deepStrictEqual(discoverGeneratedShells(root), [
      'iNNfo/specs/bluepriNNts/console.html',
      'iNNfo/specs/bluepriNNts/metrics/assets/timeline.html',
    ]);
    console.log('✔ discoverGeneratedShells finds marked shells only');
  }

  console.log('All console-shell-sync tests passed!\n');
}

runTests();
