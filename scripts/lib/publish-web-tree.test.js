#!/usr/bin/env node
/**
 * scripts/lib/publish-web-tree.test.js
 *
 * Tests for replaceSiteTree preservation logic (.nojekyll, CNAME, releaseOwned),
 * and release-owned artifact guards.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  replaceSiteTree,
  copyDistributionPath,
  assertNoReleaseOwnedInArtifact,
  isReleaseOwnedPath,
} = require('./publish-web-tree.js');

function mkTree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  return dir;
}

function testPreservesNojekyll() {
  const src = mkTree({ 'index.html': '<h1>New site</h1>' });
  const dst = mkTree({ 'index.html': '<h1>Old site</h1>', '.nojekyll': '' });

  replaceSiteTree(src, dst);

  assert.strictEqual(fs.readFileSync(path.join(dst, 'index.html'), 'utf8'), '<h1>New site</h1>');
  assert.ok(fs.existsSync(path.join(dst, '.nojekyll')), '.nojekyll must be preserved');
  console.log('PASS: replaceSiteTree preserves .nojekyll');
}

function testPreservesCnameWhenArtifactLacksIt() {
  const src = mkTree({ 'index.html': '<h1>New site</h1>' });
  const dst = mkTree({ 'index.html': '<h1>Old site</h1>', CNAME: 'custom.domain.com' });

  replaceSiteTree(src, dst);

  assert.ok(fs.existsSync(path.join(dst, 'CNAME')));
  assert.strictEqual(fs.readFileSync(path.join(dst, 'CNAME'), 'utf8'), 'custom.domain.com');
  console.log('PASS: replaceSiteTree preserves CNAME when artifact lacks it');
}

function testArtifactCnameWins() {
  const src = mkTree({ 'index.html': '<h1>New</h1>', CNAME: 'new.domain.com' });
  const dst = mkTree({ 'index.html': '<h1>Old</h1>', CNAME: 'old.domain.com' });

  replaceSiteTree(src, dst);

  assert.strictEqual(fs.readFileSync(path.join(dst, 'CNAME'), 'utf8'), 'new.domain.com');
  console.log('PASS: artifact CNAME takes precedence over target CNAME');
}

function testPreservesReleaseOwnedPaths() {
  const src = mkTree({ 'index.html': '<h1>New</h1>' });
  const dst = mkTree({
    'index.html': '<h1>Old</h1>',
    'use/manifest.md': '# Stable Manifest',
    'update/manifest.md': '# Update Manifest',
    'use/manifests/skills-v2.9.0.md': '# Snapshot',
    'innfo/cdn/manifest.json': '{"latest":"0.11.0"}',
    'innfo/cdn/innfo-mcp-v0.11.0.bundle.js': 'console.log("v0.11.0");',
  });

  replaceSiteTree(src, dst);

  assert.ok(fs.existsSync(path.join(dst, 'use/manifest.md')), 'use/manifest.md must be preserved');
  assert.ok(fs.existsSync(path.join(dst, 'update/manifest.md')), 'update/manifest.md must be preserved');
  assert.ok(fs.existsSync(path.join(dst, 'use/manifests/skills-v2.9.0.md')), 'manifest snapshot must be preserved');
  assert.ok(fs.existsSync(path.join(dst, 'innfo/cdn/manifest.json')), 'CDN manifest must be preserved');
  assert.ok(fs.existsSync(path.join(dst, 'innfo/cdn/innfo-mcp-v0.11.0.bundle.js')), 'versioned bundle must be preserved');
  console.log('PASS: replaceSiteTree preserves all release-owned paths');
}

function testAssertNoReleaseOwnedInArtifact() {
  const cleanSrc = mkTree({ 'index.html': '<h1>Clean</h1>', 'use/manifest-next.md': '# Preview' });
  assert.doesNotThrow(() => assertNoReleaseOwnedInArtifact(cleanSrc));

  const dirtySrc1 = mkTree({ 'use/manifest.md': '# Polluted' });
  assert.throws(
    () => assertNoReleaseOwnedInArtifact(dirtySrc1),
    (err) => /release-owned/i.test(err.message)
  );

  const dirtySrc2 = mkTree({ 'innfo/cdn/innfo-mcp-v0.12.0.bundle.js': 'code' });
  assert.throws(
    () => assertNoReleaseOwnedInArtifact(dirtySrc2),
    (err) => /release-owned/i.test(err.message)
  );
  console.log('PASS: assertNoReleaseOwnedInArtifact rejects release-owned paths in build artifact');
}

function testCopyDistributionPath() {
  const repo = mkTree({
    'skills/nn-test/SKILL.md': '# Test Skill',
  });
  const work = mkTree({});

  const copied = copyDistributionPath(repo, 'skills/nn-test', work);
  assert.strictEqual(copied, true);
  assert.ok(fs.existsSync(path.join(work, 'skills/nn-test/SKILL.md')));

  const missing = copyDistributionPath(repo, 'skills/non-existent', work);
  assert.strictEqual(missing, false);
  console.log('PASS: copyDistributionPath copies files and handles missing source cleanly');
}

function runAll() {
  try {
    testPreservesNojekyll();
    testPreservesCnameWhenArtifactLacksIt();
    testArtifactCnameWins();
    testPreservesReleaseOwnedPaths();
    testAssertNoReleaseOwnedInArtifact();
    testCopyDistributionPath();
    console.log('\nAll publish-web-tree tests passed! ✨');
  } catch (err) {
    console.error(`\npublish-web-tree tests FAILED: ${err.message}`);
    process.exit(1);
  }
}

runAll();
