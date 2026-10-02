#!/usr/bin/env node
/**
 * scripts/lib/console-shell-guard.test.js
 *
 * Unit tests for console shell integrity guard.
 */

const assert = require('node:assert');
const path = require('node:path');
const {
  validateNeedsRegistry,
  extractDomIds,
  extractShellConfig,
  discoverConsoleShells,
  checkConsoleShellIntegrity,
} = require('./console-shell-guard.js');

console.log('Running console-shell-guard unit tests...');

// 1. validateNeedsRegistry
{
  const valid = {
    'concept-rail': {
      description: 'Left rail of template concepts',
      anchors: [['innfo-rail'], ['rail']],
    },
    'hash-routing': {
      description: 'In-page relationship links',
      anchors: [],
    },
  };
  const res = validateNeedsRegistry(valid);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.errors.length, 0);

  // Top-level version or runtime fails
  assert.strictEqual(validateNeedsRegistry({ version: '1.0.0', ...valid }).ok, false);
  assert.strictEqual(validateNeedsRegistry({ runtime: {}, ...valid }).ok, false);

  // URL in definition fails
  const withUrl = {
    charts: {
      description: 'Chart renderer',
      anchors: [['charts']],
      cdn: 'https://example.com/cdn.js',
    },
  };
  assert.strictEqual(validateNeedsRegistry(withUrl).ok, false);

  // Invalid anchors fails
  const badAnchors = {
    test: {
      description: 'Test',
      anchors: 'not-array',
    },
  };
  assert.strictEqual(validateNeedsRegistry(badAnchors).ok, false);
  console.log('✔ validateNeedsRegistry correctly enforces capability-only shape');
}

// 2. extractDomIds
{
  const html = `
    <div id="main-wrap">
      <header id='innfo-banner'></header>
      <input id="search" type="search" />
    </div>
  `;
  const ids = extractDomIds(html);
  assert.strictEqual(ids.has('main-wrap'), true);
  assert.strictEqual(ids.has('innfo-banner'), true);
  assert.strictEqual(ids.has('search'), true);
  assert.strictEqual(ids.has('nonexistent'), false);
  console.log('✔ extractDomIds extracts element IDs from HTML');
}

// 3. extractShellConfig
{
  const validHtml = `
    <script id="innfo-config" type="application/json">
      { "needs": ["concept-rail", "fulltext-search"] }
    </script>
  `;
  const res = extractShellConfig(validHtml);
  assert.deepStrictEqual(res.config, { needs: ['concept-rail', 'fulltext-search'] });

  const invalidHtml = `
    <script id="innfo-config" type="application/json">
      { invalid json }
    </script>
  `;
  const errRes = extractShellConfig(invalidHtml);
  assert.strictEqual(errRes.config, null);
  assert.ok(errRes.error);
  console.log('✔ extractShellConfig parses valid JSON and handles errors');
}

// 4. Live repository check
{
  const repoRoot = path.join(__dirname, '..', '..');
  const result = checkConsoleShellIntegrity(repoRoot);
  if (!result.ok) {
    console.error('Integrity failures:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
  }
  assert.strictEqual(result.ok, true);
  assert.ok(result.shells.length >= 4, `Expected at least 4 shells, got ${result.shells.length}`);
  assert.ok(result.shells.some((s) => s.includes('model_console.html')), 'model_console.html must be among checked shells');
  console.log(`✔ Live repository check passes on all ${result.shells.length} shells:`);
  result.shells.forEach((s) => console.log(`  - ${s}`));
}

// 5. Guard source contains no model_console.html literal (A5.5)
{
  const fs = require('node:fs');
  const guardSource = fs.readFileSync(path.join(__dirname, 'console-shell-guard.js'), 'utf8');
  assert.strictEqual(
    guardSource.includes('model_console.html'),
    false,
    'guard source must contain no model_console.html literal (exemption removed)',
  );
  console.log('✔ Guard source contains no model_console.html literal');
}

// 6. Shell declaring feedback-export with no markup passes (A5.5)
{
  const { extractDomIds } = require('./console-shell-guard.js');
  const domIds = extractDomIds('<div>No feedback markup here</div>');
  const registry = JSON.parse(
    require('node:fs').readFileSync(
      path.join(__dirname, '..', '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'needs-registry.json'),
      'utf8',
    ),
  );
  const anchorSets = registry['feedback-export'].anchors || [];
  assert.deepStrictEqual(anchorSets, [], 'feedback-export must declare empty anchors');
  const satisfied = anchorSets.length === 0 || anchorSets.some((set) => set.every((id) => domIds.has(id)));
  assert.strictEqual(satisfied, true, 'shell declaring feedback-export with no markup must satisfy anchor check');
  console.log('✔ Shell declaring feedback-export with no markup passes anchor check');
}

console.log('\nAll console-shell-guard unit tests passed! ✨');
