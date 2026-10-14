#!/usr/bin/env node

/**
 * scripts/sync-versions.test.mjs
 *
 * Unit tests for scripts/sync-versions.mjs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectBlueprintVersions,
  collectSkillVersions,
  readMcpPackageVersion,
  syncVersions,
} from './sync-versions.mjs';

function fixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-versions-test-'));
  const blueprintsDir = path.join(root, 'iNNfo', 'specs', 'templates');
  fs.mkdirSync(blueprintsDir, { recursive: true });

  fs.mkdirSync(path.join(blueprintsDir, 'alpha'), { recursive: true });
  fs.writeFileSync(
    path.join(blueprintsDir, 'alpha', 'spec_NN.md'),
    '---\nspec_version: "V_9-0-0"\nblueprint_version: "V_0-1-0"\n---\n# Alpha\n',
    'utf8'
  );

  fs.mkdirSync(path.join(blueprintsDir, 'beta'), { recursive: true });
  fs.writeFileSync(
    path.join(blueprintsDir, 'beta', 'spec_NN.md'),
    '---\nspec_version: V_9-0-0\nblueprint_version: V_0-3-2\n---\n# Beta\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(blueprintsDir, 'workspace_spec_NN.md'),
    '---\nspec_version: V_9-0-0\nblueprint_version: V_0-4-0\n---\n# Workspace\n',
    'utf8'
  );

  const skillsDir = path.join(root, 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  fs.mkdirSync(path.join(skillsDir, 'nn-alpha'), { recursive: true });
  fs.writeFileSync(
    path.join(skillsDir, 'nn-alpha', 'SKILL.md'),
    '---\nversion: "V_3-4-0"\n---\n# Skill Alpha\n',
    'utf8'
  );

  // Cross-write test: a skill sharing the same name as a template ('alpha')
  fs.mkdirSync(path.join(skillsDir, 'alpha'), { recursive: true });
  fs.writeFileSync(
    path.join(skillsDir, 'alpha', 'SKILL.md'),
    '---\nversion: "V_7-7-7"\n---\n# Shared Name Skill\n',
    'utf8'
  );

  // MCP packages
  const mcpDir = path.join(root, 'iNNfo', 'packages', 'innfo-mcp');
  const coreDir = path.join(root, 'iNNfo', 'packages', 'innfo-core');
  fs.mkdirSync(mcpDir, { recursive: true });
  fs.mkdirSync(coreDir, { recursive: true });
  const mcpPkgPath = path.join(mcpDir, 'package.json');
  const corePkgPath = path.join(coreDir, 'package.json');
  fs.writeFileSync(
    mcpPkgPath,
    JSON.stringify(
      {
        name: '@cognnitive/innfo-mcp',
        version: '9.9.9',
        dependencies: {
          '@cognnitive/innfo-core': '^0.0.0',
        },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
  fs.writeFileSync(
    corePkgPath,
    JSON.stringify(
      {
        name: '@cognnitive/innfo-core',
        version: '0.0.0',
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return { root, blueprintsDir, skillsDir, mcpPkgPath, corePkgPath };
}

async function runTests() {
  console.log('Running sync-versions unit tests...');

  // Test 1: Live repository check passes with zero drift
  {
    const res = syncVersions({ check: true });
    assert.strictEqual(res.ok, true, `Expected zero drift on live repo, got errors: ${res.errors.join(', ')}`);
    console.log('✔ Live repository check passes with zero drift');
  }

  // Test 2: collectBlueprintVersions & collectSkillVersions & readMcpPackageVersion
  {
    const { root, blueprintsDir, skillsDir, mcpPkgPath } = fixtureTree();
    const tVersions = collectBlueprintVersions(blueprintsDir);
    assert.strictEqual(tVersions.alpha, 'V_0-1-0');
    assert.strictEqual(tVersions.beta, 'V_0-3-2');
    assert.strictEqual(tVersions.workspace, 'V_0-4-0');

    const sVersions = collectSkillVersions(skillsDir);
    assert.strictEqual(sVersions['nn-alpha'], 'V_3-4-0');
    assert.strictEqual(sVersions['alpha'], 'V_7-7-7');

    const mcpVer = readMcpPackageVersion(mcpPkgPath);
    assert.strictEqual(mcpVer, '9.9.9');

    console.log('✔ collectBlueprintVersions, collectSkillVersions, and readMcpPackageVersion read sources');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 3: syncVersions writes MCP package versions
  {
    const { root, blueprintsDir, skillsDir, mcpPkgPath, corePkgPath } = fixtureTree();
    const res = syncVersions({
      check: false,
      blueprintsDir,
      skillsDir,
      mcpPkgPath,
      corePkgPath,
    });
    assert.strictEqual(res.ok, true, `Expected sync to succeed, got errors: ${res.errors.join(', ')}`);

    // Core package version and dependency range
    const corePkg = JSON.parse(fs.readFileSync(corePkgPath, 'utf8'));
    assert.strictEqual(corePkg.version, '9.9.9', 'core package version must match mcp version');
    const mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
    assert.strictEqual(mcpPkg.dependencies['@cognnitive/innfo-core'], '^9.9.9', 'mcp dep range must be ^9.9.9');

    console.log('✔ syncVersions writes the MCP package targets');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 4: syncVersions is idempotent — running twice produces no diff
  {
    const { root, blueprintsDir, skillsDir, mcpPkgPath, corePkgPath } = fixtureTree();
    syncVersions({ check: false, blueprintsDir, skillsDir, mcpPkgPath, corePkgPath });
    const firstCore = fs.readFileSync(corePkgPath, 'utf8');
    const firstMcp = fs.readFileSync(mcpPkgPath, 'utf8');

    syncVersions({ check: false, blueprintsDir, skillsDir, mcpPkgPath, corePkgPath });
    const secondCore = fs.readFileSync(corePkgPath, 'utf8');
    const secondMcp = fs.readFileSync(mcpPkgPath, 'utf8');

    assert.strictEqual(firstCore, secondCore, 'core package.json must be identical on second run');
    assert.strictEqual(firstMcp, secondMcp, 'mcp package.json must be identical on second run');
    console.log('✔ syncVersions is idempotent');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 5: --check mode reports drift for all targets
  {
    const { root, blueprintsDir, skillsDir, mcpPkgPath, corePkgPath } = fixtureTree();
    const res = syncVersions({ check: true, blueprintsDir, skillsDir, mcpPkgPath, corePkgPath });
    assert.strictEqual(res.ok, false, 'Expected drift to be detected');
    const joined = res.errors.join('\n');
    assert.ok(!joined.includes('samples.ts'), 'the frozen editor samples.ts is not a sync target');
    assert.ok(!joined.includes('SHIPPED_BLUEPRINT_VERSIONS'), 'the frozen editor samples.ts is not a sync target');
    assert.ok(joined.includes('innfo-core package.json'), 'error must name core package drift');
    assert.ok(joined.includes('@cognnitive/innfo-core drift'), 'error must name dep range drift');
    assert.ok(joined.includes('sync:versions'), 'error must name fix command');
    console.log('✔ --check mode reports package drift with fix command');
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log('\nAll sync-versions unit tests passed! 🎉');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
