/**
 * skills/nn-preflight/scripts/domain-probe.test.js
 *
 * Unit tests for domain-probe.js.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { runProbe } = require('./domain-probe');

async function runTests() {
  console.log('Running domain-probe unit tests...');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✔ ${name}`);
      passed++;
    } catch (err) {
      console.error(`✖ ${name}`);
      console.error(err);
      failed++;
    }
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'domain-probe-test-'));

  try {
    await test('probes an empty workspace cleanly', async () => {
      const ws = path.join(tmpDir, 'empty-ws');
      fs.mkdirSync(ws, { recursive: true });
      const res = await runProbe({ workspaceDir: ws, skipPreflight: true });
      assert.strictEqual(res.version, '1.0.0');
      assert.strictEqual(res.knowledge.count, 0);
      assert.strictEqual(res.sources.pending_count, 0);
      assert.strictEqual(res.procedures.domain_count, 0);
      assert.strictEqual(res.procedures.blueprint_count, 0);
    });

    await test('probes a canonical workspace layout with knowledge items and sources', async () => {
      const ws = path.join(tmpDir, 'canonical-ws');
      fs.mkdirSync(path.join(ws, 'kNNowledge'), { recursive: true });
      fs.mkdirSync(path.join(ws, 'sources', 'import'), { recursive: true });
      fs.mkdirSync(path.join(ws, 'procedures'), { recursive: true });
      fs.mkdirSync(path.join(ws, 'specs', 'bluepriNNts', 'bp1', 'procedures'), { recursive: true });

      fs.writeFileSync(path.join(ws, 'domaiNN_NN.md'), '---\nlevel: 3\n---\n');
      fs.writeFileSync(path.join(ws, 'kNNowledge', 'Item_V_1-0-0_NN.md'), '---\nlevel: 3\n---\n');
      fs.writeFileSync(path.join(ws, 'sources', 'import', 'doc.pdf'), 'binary');
      fs.writeFileSync(path.join(ws, 'procedures', 'proc1.md'), '# Proc 1');
      fs.writeFileSync(path.join(ws, 'specs', 'bluepriNNts', 'bp1', 'procedures', 'bp_proc.md'), '# BP Proc');

      const res = await runProbe({ workspaceDir: ws, skipPreflight: true });
      assert.strictEqual(res.layout, 'current');
      assert.strictEqual(res.knowledge.count, 1);
      assert.deepStrictEqual(res.knowledge.items, ['Item_V_1-0-0_NN.md']);
      assert.strictEqual(res.sources.pending_count, 1);
      assert.strictEqual(res.procedures.domain_count, 1);
      assert.strictEqual(res.procedures.blueprint_count, 1);
    });

    await test('detects legacy layout when models/ exists', async () => {
      const ws = path.join(tmpDir, 'legacy-ws');
      fs.mkdirSync(path.join(ws, 'models'), { recursive: true });
      fs.writeFileSync(path.join(ws, 'workspace_NN.md'), '---\nlevel: 3\n---\n');
      fs.writeFileSync(path.join(ws, 'models', 'Old_V_1-0-0_NN.md'), '---\nlevel: 3\n---\n');

      const res = await runProbe({ workspaceDir: ws, skipPreflight: true });
      assert.strictEqual(res.layout, 'legacy');
      assert.strictEqual(res.knowledge.count, 1);
    });

    console.log(`\nAll domain-probe tests finished: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
