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
  fs.mkdirSync(path.join(t, 'legacy'), { recursive: true });
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
  fs.writeFileSync(path.join(t, 'workspace_spec_NN.md'), spec('https://x/workspace_spec_NN.md', 2, 'V_0-3-0'));
  // a level-2 file that still carries the retired `template_version` field only is not
  // catalogued: `blueprint_version` is the single accepted version source.
  fs.writeFileSync(path.join(t, 'legacy', 'spec_NN.md'), spec('https://x/legacy/spec_NN.md', 2, 'V_0-1-0', 'template_version'));
  // level-2 template with no frontmatter blueprint_version — skipped with a warning
  fs.writeFileSync(path.join(t, 'draft', 'spec_NN.md'), spec('https://x/draft/spec_NN.md', 2, null));
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

      assert.strictEqual(catalog.blueprints.workspace.adopted, 'V_0-3-0', 'root workspace_spec_NN.md catalogued as a normal blueprint');
      assert.ok(!('frozen' in catalog), 'the retired frozen partition is never emitted');

      assert.ok(!('draft' in catalog.blueprints), 'level-2 file without blueprint_version is not catalogued');
      assert.ok(
        catalog.warnings.some((w) => w.includes('draft/spec_NN.md')),
        'missing blueprint_version produces a warning',
      );
      assert.ok(
        !('legacy' in catalog.blueprints) && catalog.warnings.some((w) => w.includes('legacy/spec_NN.md')),
        'the retired template_version field is not a version source',
      );
      console.log('✔ generator emits correct catalog (frontmatter versions, adopted, level-3 excluded, canonical names)');
    }

    // Test 1a: `blueprint_version` is the single version source for every entry
    {
      const catalog = JSON.parse(fs.readFileSync(out, 'utf-8'));
      assert.ok(!('frozen' in catalog), 'catalog carries no frozen partition');
      assert.strictEqual(catalog.blueprints.workspace.adopted, 'V_0-3-0', 'workspace is an ordinary catalog entry');
      assert.strictEqual(catalog.blueprints.workspace.tier, 'free', 'workspace carries the ordinary entry shape');
      console.log('✔ no frozen partition: workspace is an ordinary catalog entry');
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

  // Test 4: per-entry `release_tag` is the newest `blueprints-v*` tag whose tree
  // for the entry equals HEAD's; an entry changed after the last tag is `null`.
  {
    const gitCwd = (cwd, args) => {
      const res = spawnSync('git', args, { cwd, encoding: 'utf-8' });
      assert.strictEqual(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
      return res.stdout;
    };
    const commit = (cwd, message) =>
      gitCwd(cwd, ['-c', 'user.email=test@example.com', '-c', 'user.name=Test', '-c', 'commit.gpgsign=false', 'commit', '-m', message]);

    const gitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprint-catalog-git-'));
    const gt = path.join(gitRoot, 'templates');
    const spec = (v) => `---\nlevel: 2\nblueprint_version: "${v}"\ntitle: "T"\n---\n`;
    try {
      gitCwd(gitRoot, ['init']);
      for (const name of ['business', 'changes', 'documentation']) {
        fs.mkdirSync(path.join(gt, name), { recursive: true });
        fs.writeFileSync(path.join(gt, name, 'spec_NN.md'), spec('V_0-1-0'));
      }
      gitCwd(gitRoot, ['add', '-A']);
      commit(gitRoot, 'one');
      gitCwd(gitRoot, ['tag', 'blueprints-v1.0.0']);

      fs.writeFileSync(path.join(gt, 'business', 'spec_NN.md'), spec('V_0-2-0'));
      gitCwd(gitRoot, ['add', '-A']);
      commit(gitRoot, 'two');
      gitCwd(gitRoot, ['tag', 'blueprints-v1.1.0']);

      // documentation changes AFTER the last tag → unreleased.
      fs.writeFileSync(path.join(gt, 'documentation', 'spec_NN.md'), spec('V_0-3-0'));
      gitCwd(gitRoot, ['add', '-A']);
      commit(gitRoot, 'three');

      const out2 = path.join(gitRoot, 'catalog.json');
      const res = spawnSync(process.execPath, [GENERATOR, '--root', gt, '--out', out2], { encoding: 'utf-8' });
      assert.strictEqual(res.status, 0, res.stderr);
      const c = JSON.parse(fs.readFileSync(out2, 'utf-8'));
      assert.strictEqual(c.blueprints.business.release_tag, 'blueprints-v1.1.0', 'a changed-and-tagged entry pins its newest matching tag');
      assert.strictEqual(c.blueprints.changes.release_tag, 'blueprints-v1.1.0', 'an unchanged entry pins the newest matching tag');
      assert.strictEqual(c.blueprints.documentation.release_tag, null, 'an entry changed after the last tag is unreleased (null)');
      console.log('✔ per-entry release_tag pins the newest matching tag and nulls an unreleased entry');
    } finally {
      fs.rmSync(gitRoot, { recursive: true, force: true });
    }
  }

  console.log('All blueprint-catalog tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});