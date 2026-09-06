#!/usr/bin/env node

/**
 * scripts/template-catalog.test.mjs
 *
 * Unit tests for scripts/template-catalog.mjs (plain node, zero deps —
 * matches the repo's actioNN .test.js convention).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR = path.join(SCRIPT_DIR, 'template-catalog.mjs');

function runGenerator(args) {
  return spawnSync(process.execPath, [GENERATOR, ...args], { encoding: 'utf-8' });
}

function fixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-catalog-test-'));
  const t = path.join(root, 'templates');
  fs.mkdirSync(path.join(t, 'business'), { recursive: true });
  fs.mkdirSync(path.join(t, 'business', 'samples'), { recursive: true });
  fs.mkdirSync(path.join(t, 'documentation', 'V_0-1-0'), { recursive: true });
  fs.mkdirSync(path.join(t, 'cogNNitive'), { recursive: true });
  fs.mkdirSync(path.join(t, 'base'), { recursive: true });

  const spec = (url, level, tv) => `---\nspec_version: "V_0-2-1"\nlevel: ${level}\nspec_url: "${url}"\ntemplate_version: "${tv}"\ntitle: "T"\n---\n`;
  fs.writeFileSync(path.join(t, 'business', 'business_V_0-1-0_NN.md'), spec('https://x/business_V_0-1-0_NN.md', 2, 'V_0-1-0'));
  fs.writeFileSync(path.join(t, 'business', 'business_V_0-2-0_NN.md'), spec('https://x/business_V_0-2-0_NN.md', 2, 'V_0-2-0'));
  // sample model (level 3) must be excluded
  fs.writeFileSync(path.join(t, 'business', 'samples', 'Ghostbusters_V_0-2-0_business_NN.md'), spec('https://x/Ghostbusters_V_0-2-0_business_NN.md', 3, 'V_0-2-0'));
  // package layout (spec_NN.md under <name>/V_x-y-z/)
  fs.writeFileSync(path.join(t, 'documentation', 'V_0-1-0', 'spec_NN.md'), spec('https://x/documentation/V_0-1-0/spec_NN.md', 2, 'V_0-1-0'));
  // unversioned transitional file — must be skipped, not crash
  fs.writeFileSync(path.join(t, 'workspace_spec_NN.md'), spec('https://x/workspace_spec_NN.md', 2, 'V_0-2-0'));
  // frozen lineage templates — cogNNitive + base must land in `frozen`, not `templates`
  fs.writeFileSync(path.join(t, 'cogNNitive', 'cogNNitive_V_0-2-0_NN.md'), spec('https://x/cogNNitive/cogNNitive_V_0-2-0_NN.md', 2, 'V_0-2-0'));
  fs.writeFileSync(path.join(t, 'base', 'base_V_0-1-0_spec_NN.md'), spec('https://x/base/base_V_0-1-0_spec_NN.md', 2, 'V_0-1-0'));
  return root;
}

async function runTests() {
  console.log('Running template-catalog unit tests...');
  const root = fixtureTree();
  const t = path.join(root, 'templates');
  const out = path.join(root, 'catalog.json');
  try {
    // Test 1: generator produces a correct catalog
    {
      const res = runGenerator(['--root', t, '--out', out]);
      assert.strictEqual(res.status, 0, res.stderr);
      const catalog = JSON.parse(fs.readFileSync(out, 'utf-8'));

      assert.deepStrictEqual(
        catalog.templates.business.versions.map((v) => v.template_version),
        ['V_0-1-0', 'V_0-2-0'],
        'business versions sorted ascending',
      );
      assert.strictEqual(catalog.templates.business.adopted, 'V_0-2-0', 'adopted = highest version');
      assert.strictEqual(catalog.templates.business.versions[1].url, 'https://x/business_V_0-2-0_NN.md');
      assert.strictEqual(catalog.templates.business.versions.length, 2, 'level-3 sample excluded');

      assert.deepStrictEqual(
        catalog.templates.documentation.versions.map((v) => v.template_version),
        ['V_0-1-0'],
        'package layout parsed',
      );

      assert.ok(!('workspace_spec_NN' in catalog.templates), 'unversioned file skipped');
      console.log('✔ generator emits correct catalog (versions, adopted, level-3 excluded, package layout)');
    }

    // Test 1a: frozen partition — cogNNitive + base under `frozen`, absent from `templates`
    {
      const catalog = JSON.parse(fs.readFileSync(out, 'utf-8'));
      assert.ok('frozen' in catalog, 'catalog carries a top-level frozen partition');
      assert.ok('cogNNitive' in catalog.frozen, 'cogNNitive recorded under frozen');
      assert.ok('base' in catalog.frozen, 'base recorded under frozen');
      assert.ok(!('cogNNitive' in catalog.templates), 'cogNNitive dropped from templates');
      assert.ok(!('base' in catalog.templates), 'base dropped from templates');
      assert.strictEqual(catalog.frozen.cogNNitive.adopted, 'V_0-2-0', 'frozen cogNNitive adopted version preserved');
      assert.strictEqual(catalog.frozen.base.adopted, 'V_0-1-0', 'frozen base adopted version preserved');
      console.log('✔ frozen partition emits cogNNitive + base and drops them from templates');
    }

    // Test 2: --check passes on a fresh catalog
    {
      const res = runGenerator(['--check', '--root', t, '--out', out]);
      assert.strictEqual(res.status, 0, res.stderr);
      console.log('✔ --check passes when catalog is fresh');
    }

    // Test 3: --check exits 1 on drift
    {
      const before = fs.readFileSync(out, 'utf-8');
      fs.writeFileSync(out, before + '\n// tampered\n');
      const res = runGenerator(['--check', '--root', t, '--out', out]);
      assert.strictEqual(res.status, 1, 'stale catalog must exit 1');
      assert.ok(res.stderr.includes('DRIFT'), 'drift report present');
      console.log('✔ --check exits 1 with a drift report on a stale catalog');
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log('All template-catalog tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});