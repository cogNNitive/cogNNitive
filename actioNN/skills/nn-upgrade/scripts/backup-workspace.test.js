#!/usr/bin/env node

/**
 * skills/nn-upgrade/scripts/backup-workspace.test.js
 *
 * Unit tests for backup-workspace.js. Zero external test framework deps.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { backupWorkspace, isInside } = require('./backup-workspace');

function buildWorkspace() {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-ws-'));
  fs.mkdirSync(path.join(ws, 'models'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'sources', 'nn'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'procedures'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'backups'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'models', 'node_modules'), { recursive: true });
  fs.writeFileSync(path.join(ws, 'models', 'A_V_0-1-0_business_NN.md'), '# model');
  fs.writeFileSync(path.join(ws, 'models', 'node_modules', 'X.md'), '# noise');
  fs.writeFileSync(path.join(ws, 'specs', 'business_V_0-2-0_NN.md'), '# spec');
  fs.writeFileSync(path.join(ws, 'sources', 'nn', 'doc.md'), '# norm');
  fs.writeFileSync(path.join(ws, 'index.md'), '# index');
  fs.writeFileSync(path.join(ws, 'backups', 'old.zip'), 'junk');
  return ws;
}

async function runTests() {
  console.log('Running backup-workspace unit tests...');

  // Test 1: real backup copies the declared files outside the workspace
  {
    const ws = buildWorkspace();
    const target = path.join(path.dirname(ws), `backup-test-${Date.now()}`);
    try {
      const manifest = backupWorkspace(ws, { target });
      assert.deepStrictEqual(manifest.dirs, ['models', 'specs', 'sources/nn', 'procedures']);
      assert.deepStrictEqual(manifest.files, ['index.md']);
      assert.ok(fs.existsSync(path.join(target, 'models', 'A_V_0-1-0_business_NN.md')), 'model copied');
      assert.ok(fs.existsSync(path.join(target, 'specs', 'business_V_0-2-0_NN.md')), 'spec copied');
      assert.ok(fs.existsSync(path.join(target, 'sources', 'nn', 'doc.md')), 'normalized source copied');
      assert.ok(fs.existsSync(path.join(target, 'index.md')), 'index copied');
      assert.ok(!fs.existsSync(path.join(target, 'models', 'node_modules')), 'noise dir skipped');
      assert.ok(!fs.existsSync(path.join(target, 'backups')), 'backups dir skipped');
      console.log('✔ backup copies declared dirs outside the workspace and skips noise');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  // Test 2: missing dirs are skipped, not fatal
  {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-min-'));
    const target = path.join(path.dirname(ws), `backup-min-${Date.now()}`);
    try {
      fs.writeFileSync(path.join(ws, 'index.md'), '# index');
      const manifest = backupWorkspace(ws, { target });
      assert.deepStrictEqual(manifest.dirs, [], 'no dirs existed');
      assert.deepStrictEqual(manifest.files, ['index.md']);
      assert.ok(manifest.missing.includes('models'), 'models reported missing');
      console.log('✔ missing dirs are reported and skipped');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  // Test 3: dry-run writes nothing
  {
    const ws = buildWorkspace();
    const target = path.join(path.dirname(ws), `backup-dry-${Date.now()}`);
    try {
      const manifest = backupWorkspace(ws, { target, dryRun: true });
      assert.strictEqual(manifest.dirs.length, 4, 'dry-run still reports the plan');
      assert.ok(!fs.existsSync(target), 'dry-run creates nothing');
      console.log('✔ dry-run reports without creating anything');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  // Test 4: target inside the workspace is rejected
  {
    const ws = buildWorkspace();
    try {
      assert.throws(() => backupWorkspace(ws, { target: path.join(ws, 'backups') }), /outside the workspace/);
      assert.throws(() => backupWorkspace(ws, { target: ws }), /outside the workspace/);
      console.log('✔ in-workspace backup targets are rejected');
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  }

  // Test 5: isInside helper
  {
    assert.strictEqual(isInside('C:/a/b/c', 'C:/a/b'), true);
    assert.strictEqual(isInside('C:/a', 'C:/a'), true);
    assert.strictEqual(isInside('C:/a/b', 'C:/a/b/c'), false);
    console.log('✔ isInside enforces containment');
  }

  console.log('All backup-workspace tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});