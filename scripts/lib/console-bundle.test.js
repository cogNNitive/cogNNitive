#!/usr/bin/env node

/**
 * scripts/lib/console-bundle.test.js
 *
 * Drift suite and unit tests for console bundle composition and drift detection.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const {
  SOURCES,
  composeConsoleBundle,
  buildConsoleBundle,
  checkConsoleBundle,
} = require('./console-bundle.js');

function createTempConsoleFixture(repoRoot) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-bundle-test-'));
  const srcConsole = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console');
  const targetConsole = path.join(tmpDir, 'iNNfo', 'specs', 'bluepriNNts', 'console');
  fs.mkdirSync(targetConsole, { recursive: true });

  // Recursive: SOURCES now includes vendor/*.umd.js (preact, htm).
  fs.cpSync(srcConsole, targetConsole, { recursive: true });

  return { tmpDir, targetConsole };
}

function main() {
  console.log('Running console-bundle unit tests...');

  // 1. checkConsoleBundle(repoRoot) on the real repo: committed bundle equals a fresh build.
  {
    const result = checkConsoleBundle(repoRoot);
    assert.strictEqual(
      result.ok,
      true,
      `Committed console bundle must match fresh build. Errors: ${result.errors.join(', ')}`,
    );
    console.log('✔ Real repo checkConsoleBundle passes');
  }

  // 2. SOURCES lists the expected source files in exact dependency order.
  {
    const expectedSources = [
      'nn-slug.generated.js',
  'nn-address.generated.js',
      'vendor/preact.umd.js',
      'vendor/htm.umd.js',
      'nn-preact-init.js',
      'uplot.iife.min.js',
      'visuals.js',
      'nn-icons.js',
      'ui-kit.js',
      'review.js',
      'studio.js',
      'nn-runtime.js',
      'render-procedure-stepper.js',
    ];
    const actualFiles = SOURCES.map(([f]) => f);
    assert.deepStrictEqual(
      actualFiles,
      expectedSources,
      `SOURCES must match expected files in order`,
    );
    console.log('✔ SOURCES matches expected order');
  }

  // 3. One altered byte in the bundle fails checkConsoleBundle and names the file.
  {
    const { tmpDir, targetConsole } = createTempConsoleFixture(repoRoot);
    try {
      const bundlePath = path.join(targetConsole, 'nn-console.bundle.js');
      const original = fs.readFileSync(bundlePath, 'utf8');
      fs.writeFileSync(bundlePath, original + '\n/* altered byte */\n', 'utf8');

      const result = checkConsoleBundle(tmpDir);
      assert.strictEqual(result.ok, false, 'Altered bundle must fail checkConsoleBundle');
      const namesFile = result.errors.some(e => e.includes('nn-console.bundle.js'));
      assert.strictEqual(namesFile, true, 'Error message must name nn-console.bundle.js');
      console.log('✔ Altered byte in bundle fails and names the file');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 4. A changed source in a tmp copy fails checkConsoleBundle.
  {
    const { tmpDir, targetConsole } = createTempConsoleFixture(repoRoot);
    try {
      const runtimePath = path.join(targetConsole, 'nn-runtime.js');
      fs.appendFileSync(runtimePath, '\n// test change\n', 'utf8');

      const result = checkConsoleBundle(tmpDir);
      assert.strictEqual(result.ok, false, 'Changed source file must cause drift failure');
      console.log('✔ Changed source file fails checkConsoleBundle');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 5. Bundle has no `fetch(` and no `type=module`.
  {
    const bundleContent = buildConsoleBundle(repoRoot);
    assert.strictEqual(
      bundleContent.includes('fetch('),
      false,
      'Bundle must not contain fetch(',
    );
    assert.strictEqual(
      /type=["']?module["']?/.test(bundleContent),
      false,
      'Bundle must not contain type=module',
    );
    console.log('✔ Bundle contains no fetch( and no type=module');
  }

  console.log('All console-bundle unit tests passed successfully!');
}

main();
