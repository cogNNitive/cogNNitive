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
  collectTemplateVersions,
  collectSkillVersions,
  syncVersions,
} from './sync-versions.mjs';

function fixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-versions-test-'));
  const templatesDir = path.join(root, 'iNNfo', 'specs', 'templates');
  fs.mkdirSync(templatesDir, { recursive: true });

  fs.mkdirSync(path.join(templatesDir, 'alpha'), { recursive: true });
  fs.writeFileSync(
    path.join(templatesDir, 'alpha', 'spec_NN.md'),
    '---\nspec_version: "V_9-0-0"\ntemplate_version: "V_0-1-0"\n---\n# Alpha\n',
    'utf8'
  );

  fs.mkdirSync(path.join(templatesDir, 'beta'), { recursive: true });
  fs.writeFileSync(
    path.join(templatesDir, 'beta', 'spec_NN.md'),
    '---\nspec_version: V_9-0-0\ntemplate_version: V_0-3-2\n---\n# Beta\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(templatesDir, 'workspace_spec_NN.md'),
    '---\nspec_version: V_9-0-0\ntemplate_version: V_0-4-0\n---\n# Workspace\n',
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

  const editorConfigDir = path.join(root, 'iNNfo', 'apps', 'innfo-editor', 'src', 'config');
  fs.mkdirSync(editorConfigDir, { recursive: true });
  const samplesTsPath = path.join(editorConfigDir, 'samples.ts');
  fs.writeFileSync(
    samplesTsPath,
    [
      "export const SAMPLE_BASE = '/specs/templates'",
      '',
      '// GENERATED — DO NOT EDIT. Source: iNNfo/specs/templates/*/spec_NN.md and',
      '// iNNfo/specs/templates/workspace_spec_NN.md.',
      '// Regenerate with `npm run sync:versions` (scripts/sync-versions.mjs).',
      'export const SHIPPED_TEMPLATE_VERSIONS: Record<string, string> = {',
      "  alpha: 'V_0-0-0',",
      '}',
      '',
    ].join('\n'),
    'utf8'
  );

  const manifestDir = path.join(root, 'manifest');
  fs.mkdirSync(manifestDir, { recursive: true });
  const sourceYamlPath = path.join(manifestDir, 'source.yaml');
  fs.writeFileSync(
    sourceYamlPath,
    [
      'skills:',
      '  - name: nn-alpha',
      '    path: skills/nn-alpha',
      '    version: "V_0-0-0"',
      '  - name: alpha',
      '    path: skills/alpha',
      '    version: "V_0-0-0"',
      '',
      'templates:',
      '  - name: workspace',
      '    repo: cogNNitive/cogNNitive',
      '    path: iNNfo/specs/templates/workspace_spec_NN.md',
      '    version: "V_0-1-0"',
      '    ref_key: templates',
      '  - name: alpha',
      '    repo: cogNNitive/cogNNitive',
      '    path: iNNfo/specs/templates/alpha/spec_NN.md',
      '    version: "V_0-0-0"',
      '    ref_key: templates',
      '',
      'frozen_templates:',
      '  - name: beta',
      '    repo: cogNNitive/cogNNitive',
      '    path: iNNfo/specs/templates/beta/spec_NN.md',
      '    version: "V_0-0-0"',
      '    ref_key: templates',
      '',
      'channels:',
      '  stable:',
      '    refs:',
      '      - key: skills',
      '        repo: cogNNitive/cogNNitive',
      '        version: "2.1.0"',
      '',
    ].join('\n'),
    'utf8'
  );

  return { root, templatesDir, skillsDir, samplesTsPath, sourceYamlPath };
}

async function runTests() {
  console.log('Running sync-versions unit tests...');

  // Test 1: Live repository check passes with zero drift
  {
    const res = syncVersions({ check: true });
    assert.strictEqual(res.ok, true, `Expected zero drift on live repo, got errors: ${res.errors.join(', ')}`);
    console.log('✔ Live repository check passes with zero drift');
  }

  // Test 2: collectTemplateVersions & collectSkillVersions
  {
    const { root, templatesDir, skillsDir } = fixtureTree();
    const tVersions = collectTemplateVersions(templatesDir);
    assert.strictEqual(tVersions.alpha, 'V_0-1-0');
    assert.strictEqual(tVersions.beta, 'V_0-3-2');
    assert.strictEqual(tVersions.workspace, 'V_0-4-0');

    const sVersions = collectSkillVersions(skillsDir);
    assert.strictEqual(sVersions['nn-alpha'], 'V_3-4-0');
    assert.strictEqual(sVersions['alpha'], 'V_7-7-7');
    console.log('✔ collectTemplateVersions and collectSkillVersions read frontmatter');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 3: syncVersions writes template_version, spec_version, and skill versions with cross-write protection
  {
    const { root, samplesTsPath, sourceYamlPath, templatesDir, skillsDir } = fixtureTree();
    const res = syncVersions({
      check: false,
      templatesDir,
      skillsDir,
      samplesTsPath,
      sourceYamlPath,
    });
    assert.strictEqual(res.ok, true, `Expected sync to succeed, got errors: ${res.errors.join(', ')}`);

    const samplesContent = fs.readFileSync(samplesTsPath, 'utf8');
    assert.ok(samplesContent.includes("alpha: 'V_0-1-0'"), 'alpha version should be updated in samples.ts');
    assert.ok(samplesContent.includes("beta: 'V_0-3-2'"), 'beta version should be added to samples.ts');
    assert.ok(!/^\s*workspace:/m.test(samplesContent), 'workspace must remain omitted from SHIPPED_TEMPLATE_VERSIONS');

    const sourceContent = fs.readFileSync(sourceYamlPath, 'utf8');
    // Skill versions
    assert.ok(/name: nn-alpha[\s\S]*?version: "V_3-4-0"/.test(sourceContent), 'nn-alpha skill version updated');
    assert.ok(/skills:[\s\S]*?name: alpha[\s\S]*?version: "V_7-7-7"/.test(sourceContent), 'skill alpha receives skill version V_7-7-7');

    // Template versions
    assert.ok(/templates:[\s\S]*?name: alpha[\s\S]*?version: "V_9-0-0"/.test(sourceContent), 'template alpha receives spec_version V_9-0-0 (no cross-write from skill)');
    assert.ok(/workspace[\s\S]*?version: "V_9-0-0"/.test(sourceContent), 'workspace receives spec_version');
    assert.ok(/beta[\s\S]*?version: "V_9-0-0"/.test(sourceContent), 'frozen_templates receives spec_version');

    // Channels block untouched
    assert.ok(/channels:[\s\S]*?version: "2\.1\.0"/.test(sourceContent), 'channels block must remain byte-identical');

    console.log('✔ syncVersions writes skill and template versions with cross-write isolation');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 4: syncVersions is idempotent — running twice produces no diff
  {
    const { root, samplesTsPath, sourceYamlPath, templatesDir, skillsDir } = fixtureTree();
    syncVersions({ check: false, templatesDir, skillsDir, samplesTsPath, sourceYamlPath });
    const firstSamples = fs.readFileSync(samplesTsPath, 'utf8');
    const firstSource = fs.readFileSync(sourceYamlPath, 'utf8');

    syncVersions({ check: false, templatesDir, skillsDir, samplesTsPath, sourceYamlPath });
    const secondSamples = fs.readFileSync(samplesTsPath, 'utf8');
    const secondSource = fs.readFileSync(sourceYamlPath, 'utf8');

    assert.strictEqual(firstSamples, secondSamples, 'samples.ts must be identical on second run');
    assert.strictEqual(firstSource, secondSource, 'source.yaml must be identical on second run');
    console.log('✔ syncVersions is idempotent');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 5: --check mode reports drift for skill and template entries
  {
    const { root, samplesTsPath, sourceYamlPath, templatesDir, skillsDir } = fixtureTree();
    const res = syncVersions({ check: true, templatesDir, skillsDir, samplesTsPath, sourceYamlPath });
    assert.strictEqual(res.ok, false, 'Expected drift to be detected');
    const joined = res.errors.join('\n');
    assert.ok(joined.includes('nn-alpha'), 'error must name drifted skill');
    assert.ok(joined.includes('beta'), 'error must name drifted template');
    assert.ok(joined.includes('sync:versions'), 'error must name fix command');
    console.log('✔ --check mode reports skill and template drift with fix command');
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log('\nAll sync-versions unit tests passed! 🎉');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
