#!/usr/bin/env node

/**
 * scripts/sync-template-versions.test.mjs
 *
 * Unit tests for scripts/sync-template-versions.mjs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectTemplateVersions,
  syncTemplateVersions,
} from './sync-template-versions.mjs';

function fixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-template-versions-test-'));
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
      '// Regenerate with `npm run sync:versions` (scripts/sync-template-versions.mjs).',
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
    ].join('\n'),
    'utf8'
  );

  return { root, templatesDir, samplesTsPath, sourceYamlPath };
}

async function runTests() {
  console.log('Running sync-template-versions unit tests...');

  // Test 1: Live repository check passes with zero drift
  {
    const res = syncTemplateVersions({ check: true });
    assert.strictEqual(res.ok, true, `Expected zero drift on live repo, got errors: ${res.errors.join(', ')}`);
    console.log('✔ Live repository check passes with zero drift');
  }

  // Test 2: collectTemplateVersions reads template_version frontmatter from spec_NN.md files
  {
    const { root, templatesDir } = fixtureTree();
    const versions = collectTemplateVersions(templatesDir);
    assert.strictEqual(versions.alpha, 'V_0-1-0');
    assert.strictEqual(versions.beta, 'V_0-3-2');
    assert.strictEqual(versions.workspace, 'V_0-4-0');
    console.log('✔ collectTemplateVersions reads template_version frontmatter');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 3: syncTemplateVersions writes both copies and omits workspace from samples.ts
  {
    const { root, samplesTsPath, sourceYamlPath, templatesDir } = fixtureTree();
    const res = syncTemplateVersions({
      check: false,
      templatesDir,
      samplesTsPath,
      sourceYamlPath,
    });
    assert.strictEqual(res.ok, true, `Expected sync to succeed, got errors: ${res.errors.join(', ')}`);

    const samplesContent = fs.readFileSync(samplesTsPath, 'utf8');
    assert.ok(samplesContent.includes("alpha: 'V_0-1-0'"), 'alpha version should be updated in samples.ts');
    assert.ok(samplesContent.includes("beta: 'V_0-3-2'"), 'beta version should be added to samples.ts');
    assert.ok(!/^\s*workspace:/m.test(samplesContent), 'workspace must remain omitted from SHIPPED_TEMPLATE_VERSIONS');
    assert.ok(samplesContent.includes('GENERATED'), 'generated header must be present');

    // manifest/source.yaml tracks spec_version, NOT template_version: the two
    // are different axes and the release gate compares against spec_version.
    const sourceContent = fs.readFileSync(sourceYamlPath, 'utf8');
    assert.ok(/workspace[\s\S]*?version: "V_9-0-0"/.test(sourceContent), 'workspace must carry its spec_version in manifest/source.yaml');
    assert.ok(/alpha[\s\S]*?version: "V_9-0-0"/.test(sourceContent), 'alpha must carry its spec_version in manifest/source.yaml');
    assert.ok(/beta[\s\S]*?version: "V_9-0-0"/.test(sourceContent), 'frozen_templates entries must also carry spec_version');
    assert.ok(!sourceContent.includes('V_0-3-2') && !sourceContent.includes('V_0-4-0'), 'template_version must never leak into manifest/source.yaml');

    console.log('✔ syncTemplateVersions writes template_version to samples.ts and spec_version to source.yaml');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 4: syncTemplateVersions is idempotent — running twice produces no further diff
  {
    const { root, samplesTsPath, sourceYamlPath, templatesDir } = fixtureTree();
    syncTemplateVersions({ check: false, templatesDir, samplesTsPath, sourceYamlPath });
    const firstSamples = fs.readFileSync(samplesTsPath, 'utf8');
    const firstSource = fs.readFileSync(sourceYamlPath, 'utf8');

    syncTemplateVersions({ check: false, templatesDir, samplesTsPath, sourceYamlPath });
    const secondSamples = fs.readFileSync(samplesTsPath, 'utf8');
    const secondSource = fs.readFileSync(sourceYamlPath, 'utf8');

    assert.strictEqual(firstSamples, secondSamples, 'samples.ts must be identical on second run');
    assert.strictEqual(firstSource, secondSource, 'source.yaml must be identical on second run');
    console.log('✔ syncTemplateVersions is idempotent');
    fs.rmSync(root, { recursive: true, force: true });
  }

  // Test 5: --check mode exits non-zero on drift, naming the slug and expected version
  {
    const { root, samplesTsPath, sourceYamlPath, templatesDir } = fixtureTree();
    const res = syncTemplateVersions({ check: true, templatesDir, samplesTsPath, sourceYamlPath });
    assert.strictEqual(res.ok, false, 'Expected drift to be detected');
    const joined = res.errors.join('\n');
    assert.ok(joined.includes('beta'), 'error must name the drifted slug');
    assert.ok(joined.includes('V_9-0-0'), 'error must name the expected spec_version');
    assert.ok(joined.includes('sync:versions'), 'error must name the fix command');
    console.log('✔ --check mode reports drift with slug, expected version and fix command');
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log('\nAll sync-template-versions unit tests passed! 🎉');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
