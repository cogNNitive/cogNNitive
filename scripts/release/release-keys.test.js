/**
 * scripts/release/release-keys.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RELEASE_KEYS,
  RELEASE_TABLE,
  DISTRIBUTION_PATHS,
  RELEASE_OWNED_SITE_PATHS,
  RELEASE_OWNED_GLOBS,
} = require('./release-keys.js');

test('RELEASE_KEYS contains exactly the 4 allowed keys', () => {
  assert.deepEqual(RELEASE_KEYS, ['skills', 'blueprints', 'innfo-mcp', 'innfo-console']);
});

test('RELEASE_TABLE defines copied paths for every key', () => {
  assert.ok(RELEASE_TABLE.skills);
  assert.deepEqual(RELEASE_TABLE.skills.repoPaths, ['skills']);

  assert.ok(RELEASE_TABLE.blueprints);
  assert.deepEqual(RELEASE_TABLE.blueprints.repoPaths, ['iNNfo/specs']);

  assert.ok(RELEASE_TABLE['innfo-mcp']);
  assert.deepEqual(RELEASE_TABLE['innfo-mcp'].repoPaths, [
    'iNNfo/packages/nn-mcp/bin/innfo-mcp.bundle.js',
  ]);

  assert.ok(RELEASE_TABLE['innfo-console']);
  assert.deepEqual(RELEASE_TABLE['innfo-console'].repoPaths, [
    'iNNfo/specs/bluepriNNts/console',
    'scripts/export-console.mjs',
    'scripts/console-views.mjs',
  ]);
});

test('DISTRIBUTION_PATHS is derived from RELEASE_TABLE', () => {
  assert.ok(Array.isArray(DISTRIBUTION_PATHS));
  assert.ok(DISTRIBUTION_PATHS.includes('skills'));
  assert.ok(DISTRIBUTION_PATHS.includes('iNNfo/specs'));
  assert.ok(DISTRIBUTION_PATHS.includes('iNNfo/packages/nn-mcp/bin/innfo-mcp.bundle.js'));
  assert.ok(DISTRIBUTION_PATHS.includes('scripts/export-console.mjs'));
  assert.ok(DISTRIBUTION_PATHS.includes('scripts/console-views.mjs'));
});

test('RELEASE_OWNED_SITE_PATHS includes all release-owned paths relative to docs', () => {
  assert.ok(Array.isArray(RELEASE_OWNED_GLOBS || RELEASE_OWNED_SITE_PATHS));
});
