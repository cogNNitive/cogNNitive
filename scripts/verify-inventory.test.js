#!/usr/bin/env node

/**
 * scripts/verify-inventory.test.js
 *
 * Plain-node tests for Template Inventory Guard in scripts/verify.js.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { checkBlueprintInventory, buildSteps } = require('./verify.js');

function main() {
  console.log('Running verify-inventory unit tests...');

  // 1. Skill/mcp/workflow name colliding with unregistered template folder fails guard
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-inventory-'));
    try {
      const sourceYaml = `---
skills:
  - name: colliding-skill
    path: actioNN/skills/colliding-skill
blueprints:
  - name: registered-tmpl
    path: iNNfo/specs/templates/registered-tmpl
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const blueprintsDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(blueprintsDir, 'registered-tmpl'), { recursive: true });
      fs.mkdirSync(path.join(blueprintsDir, 'colliding-skill'), { recursive: true });

      const result = checkBlueprintInventory(blueprintsDir, sourceYamlPath);
      assert.strictEqual(
        result.ok,
        false,
        'Template folder named after a skill must NOT be recognized as a declared template',
      );
      assert.deepStrictEqual(result.missing, ['colliding-skill']);
      console.log('✔ Non-template collision detection passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 2. Normal registered template passes guard
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-inventory-'));
    try {
      const sourceYaml = `---
blueprints:
  - name: registered-tmpl
    path: iNNfo/specs/templates/registered-tmpl
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const blueprintsDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(blueprintsDir, 'registered-tmpl'), { recursive: true });

      const result = checkBlueprintInventory(blueprintsDir, sourceYamlPath);
      assert.strictEqual(result.ok, true);
      assert.deepStrictEqual(result.missing, []);
      console.log('✔ Normal registered template passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 3. Folder declared only under frozen_blueprints: passes guard (frozen partition)
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-inventory-'));
    try {
      const sourceYaml = `---
blueprints:
  - name: registered-tmpl
    path: iNNfo/specs/templates/registered-tmpl
frozen_blueprints:
  - name: cogNNitive
    path: iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md
    version: "V_0-2-1"
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const blueprintsDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(blueprintsDir, 'registered-tmpl'), { recursive: true });
      fs.mkdirSync(path.join(blueprintsDir, 'cogNNitive'), { recursive: true });

      const result = checkBlueprintInventory(blueprintsDir, sourceYamlPath);
      assert.strictEqual(
        result.ok,
        true,
        'frozen-only folder must satisfy the inventory guard via the frozen_blueprints: partition',
      );
      assert.deepStrictEqual(result.missing, []);
      console.log('✔ Frozen-only folder passed via frozen_blueprints: partition');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 4. Folder declared only under seam_dirs: passes guard (shared seam partition)
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-inventory-'));
    try {
      const sourceYaml = `---
blueprints:
  - name: registered-tmpl
    path: iNNfo/specs/templates/registered-tmpl
seam_dirs:
  - name: console
    path: iNNfo/specs/templates/console/
    description: Shared console seam.
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const blueprintsDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(blueprintsDir, 'registered-tmpl'), { recursive: true });
      fs.mkdirSync(path.join(blueprintsDir, 'console'), { recursive: true });

      const result = checkBlueprintInventory(blueprintsDir, sourceYamlPath);
      assert.strictEqual(
        result.ok,
        true,
        'seam folder must satisfy the inventory guard via the seam_dirs: partition',
      );
      assert.deepStrictEqual(result.missing, []);
      console.log('✔ Seam-only folder passed via seam_dirs: partition');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 5. Missing source.yaml path fails guard (replaces check-parity)
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-inventory-'));
    try {
      const sourceYaml = `---
skills:
  - name: missing-skill
    path: skills/missing-skill
blueprints:
  - name: registered-tmpl
    path: iNNfo/specs/templates/registered-tmpl
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const blueprintsDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(blueprintsDir, 'registered-tmpl'), { recursive: true });

      const result = checkBlueprintInventory(blueprintsDir, sourceYamlPath, tmpDir);
      assert.strictEqual(result.ok, false, 'Missing skill path must fail inventory guard');
      assert.ok(result.missingPaths.some((p) => p.includes('missing-skill')), 'error must name missing-skill');
      console.log('✔ Missing source.yaml path is rejected by inventory guard');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 6. Suites embedded in a bluepriNNt package are discovered, not silently dropped.
  {
    const repoRoot = path.resolve(__dirname, '..');
    const ids = buildSteps(repoRoot).map((s) => s.desc);
    const embedded = 'Test iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/test/scene-compiler.test.mjs';
    assert.ok(ids.includes(embedded), `buildSteps must include a step for ${embedded}`);
    assert.strictEqual(
      ids.filter((d) => d === embedded).length,
      1,
      'an embedded suite must be scheduled exactly once',
    );
    console.log('✔ Embedded bluepriNNt skill suites are discovered by verify');
  }

  // 7. Real repo: source.yaml declares exactly the 7 Core bluepriNNts
  {
    const { parseFocusedYaml } = require('./lib/yaml-parser.js');
    const repoRoot = path.resolve(__dirname, '..');
    const sourceText = fs.readFileSync(path.join(repoRoot, 'manifest', 'source.yaml'), 'utf8');
    const doc = parseFocusedYaml(sourceText) || {};
    const names = (doc.blueprints || []).map((b) => b.name).sort();
    assert.deepStrictEqual(
      names,
      ['artifacts', 'blank', 'changes', 'domaiNN', 'procedures', 'sidecar', 'sources'].sort(),
      'manifest/source.yaml must declare exactly the 7 Core bluepriNNts',
    );
    const frozen = (doc.frozen_blueprints || []).map((b) => b.name).sort();
    assert.deepStrictEqual(frozen, ['cogNNitive', 'workspace'], 'frozen_blueprints unchanged');
    console.log('✔ source.yaml declares exactly the 7 Core bluepriNNts');
  }

  // 8. Real repo: catalog.json carries the enriched metadata and Core/free tiers
  {
    const repoRoot = path.resolve(__dirname, '..');
    const catalog = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json'), 'utf8'),
    );
    const CORE = new Set(['domaiNN', 'changes', 'sidecar', 'sources', 'artifacts', 'procedures', 'blank']);
    for (const [name, entry] of Object.entries(catalog.blueprints)) {
      assert.ok('tier' in entry, `${name} carries tier`);
      assert.ok('access' in entry, `${name} carries access`);
      assert.ok('when_to_use' in entry, `${name} carries when_to_use`);
      assert.ok('release_tag' in entry, `${name} carries release_tag`);
      assert.ok(Array.isArray(entry.embedded_skills), `${name} carries embedded_skills`);
      assert.strictEqual(entry.access, 'public', `${name} access is public`);
      assert.strictEqual(
        entry.tier,
        CORE.has(name) ? 'core' : 'free',
        `${name} tier classification`,
      );
    }
    for (const name of CORE) {
      assert.ok(name in catalog.blueprints, `catalog.json must contain Core blueprint ${name}`);
    }
    assert.deepStrictEqual(
      Object.keys(catalog.frozen).sort(),
      ['cogNNitive', 'workspace'],
      'frozen partition unchanged',
    );
    console.log('✔ catalog.json carries tier/access/when_to_use/release_tag/embedded_skills');
  }

  // 9. Real repo: canonical-registry.ts embeds only L0/L1 specs + the 7 Core bluepriNNts
  {
    const repoRoot = path.resolve(__dirname, '..');
    const registryPath = path.join(
      repoRoot,
      'iNNfo',
      'packages',
      'nn-core',
      'src',
      'schema',
      'canonical-registry.ts',
    );
    const text = fs.readFileSync(registryPath, 'utf8');
    const names = [...text.matchAll(/^    name: '([^']*)',$/gm)].map((m) => m[1]).sort();
    assert.deepStrictEqual(
      names,
      ['blank', 'changes', 'defiNNition', 'domaiNN', 'innfo', 'procedures', 'sidecar', 'sources', 'artifacts'].sort(),
      'canonical registry must embed L0/L1 specs plus exactly the 7 Core bluepriNNts',
    );
    for (const removed of ['business', 'business-model', 'organization', 'metrics', 'workspace', 'cogNNitive', 'analysis', 'projects']) {
      assert.ok(
        !new RegExp(`^\\s{4}name: '${removed.replace('-', '-')}',`, 'm').test(text),
        `canonical registry must not embed removed blueprint ${removed}`,
      );
    }
    for (const constName of [
      'DEFINNITION_SPEC_CONTENT',
      'INNFO_SPEC_CONTENT',
      'INNFO_V_0_5_0_SPEC_CONTENT',
      'DOMAINN_SPEC_CONTENT',
      'BLANK_SPEC_CONTENT',
      'PROCEDURES_SPEC_CONTENT',
      'SOURCES_SPEC_CONTENT',
      'ARTIFACTS_SPEC_CONTENT',
      'SIDECAR_SPEC_CONTENT',
      'CHANGES_SPEC_CONTENT',
    ]) {
      assert.ok(text.includes(`const ${constName} = `), `registry embeds ${constName}`);
    }
    console.log('✔ canonical-registry.ts embeds L0/L1 specs and exactly the 7 Core bluepriNNts');
  }

  // 10. Catalog-governed folder satisfies the inventory guard (source.yaml is Core-only)
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-inventory-catalog-'));
    try {
      const sourceYaml = `---
blueprints:
  - name: blank
    path: iNNfo/specs/bluepriNNts/blank/spec_NN.md
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const blueprintsDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(blueprintsDir, 'blank'), { recursive: true });
      fs.mkdirSync(path.join(blueprintsDir, 'business'), { recursive: true });
      fs.writeFileSync(
        path.join(blueprintsDir, 'catalog.json'),
        JSON.stringify({ blueprints: { business: { name: 'business' } }, frozen: {} }),
      );

      const result = checkBlueprintInventory(blueprintsDir, sourceYamlPath);
      assert.strictEqual(
        result.ok,
        true,
        'a folder listed in catalog.json satisfies the inventory guard',
      );
      assert.deepStrictEqual(result.missing, []);
      console.log('✔ catalog-governed vertical folder satisfies the inventory guard');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 11. Without catalog.json the guard falls back to source.yaml only (behavior preserved)
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-inventory-nocatalog-'));
    try {
      const sourceYaml = `---
blueprints:
  - name: blank
    path: iNNfo/specs/bluepriNNts/blank/spec_NN.md
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const blueprintsDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(blueprintsDir, 'blank'), { recursive: true });
      fs.mkdirSync(path.join(blueprintsDir, 'business'), { recursive: true });

      const result = checkBlueprintInventory(blueprintsDir, sourceYamlPath);
      assert.strictEqual(result.ok, false, 'without catalog.json an undeclared folder still fails');
      assert.deepStrictEqual(result.missing, ['business']);
      console.log('✔ missing catalog.json preserves source.yaml-only behavior');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log('All verify-inventory unit tests passed successfully!');
}

main();
