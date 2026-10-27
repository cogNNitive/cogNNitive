#!/usr/bin/env node
/**
 * scripts/lib/publish-web-guard.test.js
 *
 * Tests for deep source guard and manifest allowlist.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  findSourceOffenders,
  assertNoSource,
  MANIFEST_ALLOWLIST,
} = require('./publish-web-guard.js');

function mkTree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  return dir;
}

function testDeepNodeModules() {
  const root = mkTree({
    'skills/nn-test/index.js': 'console.log(1)',
    'skills/nn-test/node_modules/pkg/index.js': 'bad',
  });
  const offenders = findSourceOffenders(root, ['skills']);
  assert.deepStrictEqual(offenders, ['skills/nn-test/node_modules/']);
  console.log('PASS: deep node_modules detected');
}

function testEnvFiles() {
  const root = mkTree({
    'docs/index.html': '<h1>OK</h1>',
    'docs/.env': 'SECRET=1',
    'docs/sub/.env.local': 'SECRET=2',
  });
  const offenders = findSourceOffenders(root, ['docs']);
  assert.deepStrictEqual(offenders, ['docs/.env', 'docs/sub/.env.local']);
  console.log('PASS: .env and .env.* detected at any depth');
}

function testRootForbidden() {
  const root = mkTree({
    'docs/index.html': '<h1>OK</h1>',
    'docs/src/app.ts': 'source',
    'docs/package.json': '{}',
  });
  const offenders = findSourceOffenders(root, ['docs']);
  assert.deepStrictEqual(offenders, ['docs/package.json', 'docs/src/']);
  console.log('PASS: root forbidden items detected at surface root');
}

function testManifestAllowlist() {
  const root = mkTree({
    'skills/nn-sources/package.json': '{"name":"allowed"}',
    'skills/nn-sources/package-lock.json': '{"lock":true}',
    'skills/nn-other/package.json': '{"name":"forbidden"}',
  });

  const offenders = findSourceOffenders(root, ['skills'], {
    manifestAllowlist: ['skills/nn-sources'],
  });
  assert.deepStrictEqual(offenders, ['skills/nn-other/package.json']);
  console.log('PASS: allowlisted manifests permitted, non-allowlisted flagged');
}

function testDefaultAllowlistCoversVideoScriptSkill() {
  const root = mkTree({
    'iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/package.json': '{"name":"nn-video-script"}',
    'iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/package-lock.json': '{"lock":true}',
  });

  // Default allowlist, no override: the video-script skill manifest is a
  // declared runtime dependency surface, like the console one.
  const offenders = findSourceOffenders(root, ['iNNfo/specs/bluepriNNts/video-script']);
  assert.deepStrictEqual(offenders, []);
  console.log('PASS: default allowlist covers the video-script skill manifest');
}

function testAllowlistDoesNotRelaxNodeModules() {
  const root = mkTree({
    'skills/nn-sources/package.json': '{"name":"allowed"}',
    'skills/nn-sources/node_modules/pkg/index.js': 'forbidden',
  });

  const offenders = findSourceOffenders(root, ['skills'], {
    manifestAllowlist: ['skills/nn-sources'],
  });
  assert.deepStrictEqual(offenders, ['skills/nn-sources/node_modules/']);
  console.log('PASS: allowlist does not relax node_modules restriction');
}

function testSingleFileSurface() {
  const root = mkTree({
    'scripts/safe.mjs': 'export const a = 1;',
    'scripts/.env': 'TOKEN=123',
  });
  const safeOffenders = findSourceOffenders(root, ['scripts/safe.mjs']);
  assert.deepStrictEqual(safeOffenders, []);

  const badOffenders = findSourceOffenders(root, ['scripts/.env']);
  assert.deepStrictEqual(badOffenders, ['scripts/.env']);
  console.log('PASS: single file surface checked correctly');
}

function testAssertNoSourceThrows() {
  const root = mkTree({
    'docs/index.html': 'OK',
    'docs/.env': 'BAD',
  });

  assert.throws(
    () => assertNoSource(root, ['docs']),
    (err) => {
      assert.ok(err.message.includes('docs/.env'));
      assert.deepStrictEqual(err.offenders, ['docs/.env']);
      return true;
    }
  );
  console.log('PASS: assertNoSource throws with all offenders in message');
}

function runAll() {
  try {
    testDeepNodeModules();
    testEnvFiles();
    testRootForbidden();
    testManifestAllowlist();
    testDefaultAllowlistCoversVideoScriptSkill();
    testAllowlistDoesNotRelaxNodeModules();
    testSingleFileSurface();
    testAssertNoSourceThrows();
    console.log('\nAll publish-web-guard tests passed! ✨');
  } catch (err) {
    console.error(`\npublish-web-guard tests FAILED: ${err.message}`);
    process.exit(1);
  }
}

runAll();
