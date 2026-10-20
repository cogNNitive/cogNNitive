#!/usr/bin/env node

/**
 * scripts/blueprint-catalog.test.mjs
 *
 * Unit tests for scripts/blueprint-catalog.mjs (plain node, zero deps —
 * matches the repo's actioNN .test.js convention).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR = path.join(SCRIPT_DIR, 'blueprint-catalog.mjs');
const FIXTURE_RELEASE_TAG = 'blueprints-v9.9.9';

function runGenerator(args) {
  // Pin the release tag so the fixture is deterministic regardless of the host
  // repo's git tags (or absence of git).
  return spawnSync(process.execPath, [GENERATOR, '--release-tag', FIXTURE_RELEASE_TAG, ...args], { encoding: 'utf-8' });
}

function fixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprint-catalog-test-'));
  const t = path.join(root, 'templates');
  fs.mkdirSync(path.join(t, 'business', 'skills', 'nn-business'), { recursive: true });
  fs.mkdirSync(path.join(t, 'business', 'samples'), { recursive: true });
  fs.mkdirSync(path.join(t, 'documentation'), { recursive: true });
  fs.mkdirSync(path.join(t, 'draft'), { recursive: true });
  fs.mkdirSync(path.join(t, 'cogNNitive'), { recursive: true });
  fs.mkdirSync(path.join(t, 'blank', 'skills', 'nn-blank'), { recursive: true });
  fs.mkdirSync(path.join(t, 'blank', 'skills', 'ignored-no-skill-md'), { recursive: true });

  const spec = (url, level, tv, field = 'blueprint_version') =>
    `---\nspec_version: "V_0-2-1"\nlevel: ${level}\nspec_url: "${url}"\n` +
    (tv == null ? '' : `${field}: "${tv}"\n`) +
    `title: "T"\ndescription: "Use when testing."\n---\n`;

  // Canonical unversioned filenames; version is the authoritative frontmatter
  // `blueprint_version`, not the path.
  fs.writeFileSync(path.join(t, 'business', 'spec_NN.md'), spec('https://x/business/spec_NN.md', 2, 'V_0-2-1'));
  // an embedded skill child (must be collected); a skills child without SKILL.md is ignored
  fs.writeFileSync(path.join(t, 'business', 'skills', 'nn-business', 'SKILL.md'), '# skill');
  // a leftover historical file in the same dir still aggregates by frontmatter version
  fs.writeFileSync(path.join(t, 'business', 'business_V_0-1-0_NN.md'), spec('https://x/business/business_V_0-1-0_NN.md', 2, 'V_0-1-0'));
  // sample model (level 3) must be excluded
  fs.writeFileSync(path.join(t, 'business', 'samples', 'Ghostbusters_V_0-2-0_business_NN.md'), spec('https://x/Ghostbusters_V_0-2-0_business_NN.md', 3, 'V_0-2-0'));
  // flat canonical subdir template
  fs.writeFileSync(path.join(t, 'documentation', 'spec_NN.md'), spec('https://x/documentation/spec_NN.md', 2, 'V_0-2-0'));
  // a Core blueprint (tier: core) carrying one embedded skill
  fs.writeFileSync(path.join(t, 'blank', 'spec_NN.md'), spec('https://x/blank/spec_NN.md', 2, 'V_0-4-0'));
  fs.writeFileSync(path.join(t, 'blank', 'skills', 'nn-blank', 'SKILL.md'), '# skill');
  // root workspace spec — canonical bare filename, discovered as `workspace`
  fs.writeFileSync(path.join(t, 'workspace_spec_NN.md'), spec('https://x/workspace_spec_NN.md', 2, 'V_0-3-0', 'template_version'));
  // level-2 template with no frontmatter blueprint_version — skipped with a warning
  fs.writeFileSync(path.join(t, 'draft', 'spec_NN.md'), spec('https://x/draft/spec_NN.md', 2, null));
  // frozen lineage templates — cogNNitive must land in `frozen`, not `blueprints`.
  // The real frozen files carry `template_version` (never `blueprint_version`) and are
  // byte-frozen, so the generator must read the field they actually have.
  fs.writeFileSync(path.join(t, 'cogNNitive', 'spec_NN.md'), spec('https://x/cogNNitive/spec_NN.md', 2, 'V_0-2-0', 'template_version'));
  return root;
}

async function runTests() {
  console.log('Running blueprint-catalog unit tests...');
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
        catalog.blueprints.business.versions.map((v) => v.blueprint_version),
        ['V_0-1-0', 'V_0-2-1'],
        'business versions come from frontmatter blueprint_version, sorted ascending',
      );
      assert.strictEqual(catalog.blueprints.business.adopted, 'V_0-2-1', 'adopted = highest version');
      assert.strictEqual(catalog.blueprints.business.versions[1].url, 'https://x/business/spec_NN.md');
      assert.strictEqual(catalog.blueprints.business.versions.length, 2, 'level-3 sample excluded');

      assert.deepStrictEqual(
        catalog.blueprints.documentation.versions.map((v) => v.blueprint_version),
        ['V_0-2-0'],
        'flat canonical subdir template discovered by frontmatter version',
      );

      assert.ok('workspace' in catalog.frozen, 'root workspace_spec_NN.md discovered as a frozen workspace blueprint');
      assert.strictEqual(catalog.frozen.workspace.adopted, 'V_0-3-0');

      assert.ok(!('draft' in catalog.blueprints), 'level-2 file without blueprint_version is not catalogued');
      assert.ok(
        catalog.warnings.some((w) => w.includes('draft/spec_NN.md')),
        'missing blueprint_version produces a warning',
      );
      console.log('✔ generator emits correct catalog (frontmatter versions, adopted, level-3 excluded, canonical names)');
    }

    // Test 1a: frozen partition — cogNNitive + workspace under `frozen`, absent from `blueprints`
    {
      const catalog = JSON.parse(fs.readFileSync(out, 'utf-8'));
      assert.ok('frozen' in catalog, 'catalog carries a top-level frozen partition');
      assert.ok('cogNNitive' in catalog.frozen, 'cogNNitive recorded under frozen');
      assert.ok('workspace' in catalog.frozen, 'workspace recorded under frozen');
      assert.ok(!('cogNNitive' in catalog.blueprints), 'cogNNitive dropped from blueprints');
      assert.ok(!('workspace' in catalog.blueprints), 'workspace dropped from blueprints');
      assert.strictEqual(catalog.frozen.cogNNitive.adopted, 'V_0-2-0', 'frozen cogNNitive adopted version preserved');
      console.log('✔ frozen partition emits cogNNitive and drops it from blueprints');
    }

    // Test 1b: enriched catalog metadata — tier/access/when_to_use/release_tag/embedded_skills
    {
      const catalog = JSON.parse(fs.readFileSync(out, 'utf-8'));
      const bp = catalog.blueprints;

      for (const entry of Object.values(bp)) {
        assert.ok('tier' in entry, `${entry.name} carries tier`);
        assert.ok('access' in entry, `${entry.name} carries access`);
        assert.ok('when_to_use' in entry, `${entry.name} carries when_to_use`);
        assert.ok('release_tag' in entry, `${entry.name} carries release_tag`);
        assert.ok(Array.isArray(entry.embedded_skills), `${entry.name} carries embedded_skills`);
        assert.strictEqual(entry.access, 'public', `${entry.name} access is public`);
        assert.strictEqual(entry.release_tag, FIXTURE_RELEASE_TAG, `${entry.name} release_tag is the override`);
      }

      assert.strictEqual(bp.business.tier, 'free', 'business is a free vertical');
      assert.strictEqual(bp.documentation.tier, 'free', 'documentation is a free vertical');
      assert.strictEqual(bp.blank.tier, 'core', 'blank is a Core blueprint');

      assert.strictEqual(
        bp.business.when_to_use,
        'Use when testing.',
        'when_to_use falls back to the frontmatter description when when_to_use is absent',
      );

      assert.deepStrictEqual(
        bp.blank.embedded_skills,
        ['nn-blank'],
        'embedded_skills lists only child dirs carrying a SKILL.md',
      );
      assert.deepStrictEqual(bp.business.embedded_skills, ['nn-business'], 'business embedded skill discovered');
      assert.deepStrictEqual(bp.documentation.embedded_skills, [], 'no skills dir yields an empty array');

      // Frozen partition keeps its original shape (no tier/access metadata).
      assert.ok(!('tier' in catalog.frozen.cogNNitive), 'frozen entries keep their unchanged shape');
      console.log('✔ enriched metadata (tier/access/when_to_use/release_tag/embedded_skills) is emitted');
    }

    // Test 2: --check passes on a fresh catalog
    {
      const res = runGenerator(['--check', '--root', t, '--out', out]);
      assert.strictEqual(res.status, 0, res.stderr);
      console.log('✔ --check passes when catalog is fresh');
    }

    // Test 2b: --check ignores `release_tag` — it is release state, not catalog
    // content, and verify.js must stay deterministic without release tags (see its
    // header). A different tag alone must not be reported as drift.
    {
      const res = spawnSync(
        process.execPath,
        [GENERATOR, '--release-tag', 'blueprints-v1.2.3', '--check', '--root', t, '--out', out],
        { encoding: 'utf-8' },
      );
      assert.strictEqual(res.status, 0, `a differing release_tag alone is not drift: ${res.stderr}`);
      console.log('✔ --check ignores release_tag drift (gate stays deterministic without release tags)');
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

  console.log('All blueprint-catalog tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});