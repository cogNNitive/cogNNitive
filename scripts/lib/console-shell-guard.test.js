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
  findRootColorDeclarations,
} = require('./console-shell-guard.js');

console.log('Running console-shell-guard unit tests...');

// 1. validateNeedsRegistry
{
  const valid = {
    'concept-rail': {
      description: 'Left rail of template concepts',
      anchors: [['nn-rail'], ['rail']],
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
      <header id='nn-banner'></header>
      <input id="search" type="search" />
    </div>
  `;
  const ids = extractDomIds(html);
  assert.strictEqual(ids.has('main-wrap'), true);
  assert.strictEqual(ids.has('nn-banner'), true);
  assert.strictEqual(ids.has('search'), true);
  assert.strictEqual(ids.has('nonexistent'), false);
  console.log('✔ extractDomIds extracts element IDs from HTML');
}

// 3. extractShellConfig
{
  const validHtml = `
    <script id="nn-config" type="application/json">
      { "needs": ["concept-rail", "fulltext-search"] }
    </script>
  `;
  const res = extractShellConfig(validHtml);
  assert.deepStrictEqual(res.config, { needs: ['concept-rail', 'fulltext-search'] });

  const invalidHtml = `
    <script id="nn-config" type="application/json">
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
  assert.ok(result.shells.length >= 1, `Expected at least 1 shell, got ${result.shells.length}`);
  assert.ok(result.shells.some((s) => s.includes('artifact_shell.html')), 'artifact_shell.html must be among checked shells');
  assert.ok(!result.shells.some((s) => s.includes('model_console.html')), 'the retired model_console.html must not be checked');
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
  console.log('[ok] Shell declaring feedback-export with no markup passes anchor check');
}

// 7. findRootColorDeclarations: flags hard-coded colors in :root, allows layout vars
{
  const fs = require('node:fs');
  const clean = `:root { --sidebar-w: 280px; --nn-bg: var(--nn-surface); }`;
  assert.deepStrictEqual(findRootColorDeclarations(clean), []);

  const hexRoot = `:root { --accent: #1f2937; }`;
  const hexFound = findRootColorDeclarations(hexRoot);
  assert.strictEqual(hexFound.length, 1);
  assert.match(hexFound[0].selector, /:root/);
  assert.strictEqual(hexFound[0].line, 1);

  const mediaRoot = `@media (prefers-color-scheme: dark) {\n  :root {\n    --accent: rgb(15, 23, 42);\n  }\n}`;
  const mediaFound = findRootColorDeclarations(mediaRoot);
  assert.strictEqual(mediaFound.length, 1);
  assert.strictEqual(mediaFound[0].line, 3);

  const hslaRoot = `:root {\n  --x: hsla(210, 40%, 20%, .5);\n}`;
  assert.strictEqual(findRootColorDeclarations(hslaRoot).length, 1);

  // All live shells must be fully tokenized (d1 + d2). The metrics timeline is
  // a registered view now, not a shell, so it is no longer a shell-guard target.
  const repoRoot = path.join(__dirname, '..', '..');
  const liveShells = ['iNNfo/specs/bluepriNNts/console/artifact_shell.html'];
  for (const rel of liveShells) {
    const html = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
    const offenders = findRootColorDeclarations(html);
    assert.deepStrictEqual(offenders, [], `${rel} must carry no :root color literals`);
  }
  console.log('✔ findRootColorDeclarations flags root colors and passes tokenized shells');
}

console.log('\nAll console-shell-guard unit tests passed! ✨');
