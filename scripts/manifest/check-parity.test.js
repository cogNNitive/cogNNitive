#!/usr/bin/env node

/**
 * scripts/manifest/check-parity.test.js
 *
 * Unit tests for deterministic workspace parity checker.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { checkWorkspaceParity } = require('./check-parity.js');

function createTempWorkspace(sourceYaml, files = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-test-'));
  const manifestDir = path.join(tmpDir, 'manifest');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(manifestDir, 'source.yaml'), sourceYaml, 'utf8');

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  return tmpDir;
}

function main() {
  console.log('Running check-parity unit tests...');

  // 1. Live workspace passes parity check
  {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const result = checkWorkspaceParity(repoRoot);
    assert.strictEqual(result.ok, true, `Live workspace parity should be ok. Errors: ${result.errors.join('; ')}`);
    assert.strictEqual(result.stats.skillsCount > 0, true);
    assert.strictEqual(result.stats.templatesCount > 0, true);
    assert.strictEqual(result.stats.mcpCount, 1);
    console.log('✔ Live workspace parity test passed');
  }

  // 2. Skill version mismatch is detected
  {
    const sourceYaml = `
skills:
  - name: test-skill
    path: actioNN/skills/test-skill
    version: "1.0.0"
`;
    const files = {
      'actioNN/skills/test-skill/SKILL.md': '---\nversion: "0.9.0"\n---\n# Test',
    };
    const tmpDir = createTempWorkspace(sourceYaml, files);
    try {
      const result = checkWorkspaceParity(tmpDir);
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.errors.some(e => e.includes("version mismatch — manifest '1.0.0' vs SKILL.md '0.9.0'")), true);
      console.log('✔ Skill version mismatch detection passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 3. Template version mismatch is detected
  {
    const sourceYaml = `
templates:
  - name: test-tmpl
    path: iNNfo/specs/templates/test_spec.md
    version: "V_0-2-0"
`;
    const files = {
      'iNNfo/specs/templates/test_spec.md': '---\nversion: "V_0-1-0"\n---\n# Spec',
    };
    const tmpDir = createTempWorkspace(sourceYaml, files);
    try {
      const result = checkWorkspaceParity(tmpDir);
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.errors.some(e => e.includes("version mismatch — manifest 'V_0-2-0' vs template 'V_0-1-0'")), true);
      console.log('✔ Template version mismatch detection passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 4. Missing MCP bundle is detected
  {
    const sourceYaml = `
skills:
  - name: nn-innfo
    path: actioNN/skills/nn-innfo
    version: "1.0.0"
    mcp:
      - name: innfo-mcp
        path: iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js
        version: "0.2.4"
`;
    const files = {
      'actioNN/skills/nn-innfo/SKILL.md': '---\nversion: "1.0.0"\n---\n# Innfo',
      'iNNfo/packages/innfo-mcp/package.json': JSON.stringify({ version: '0.2.4' }),
    };
    const tmpDir = createTempWorkspace(sourceYaml, files);
    try {
      const result = checkWorkspaceParity(tmpDir);
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.errors.some(e => e.includes("bundle file not found")), true);
      console.log('✔ Missing MCP bundle detection passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 5. MCP package.json version mismatch is detected
  {
    const sourceYaml = `
skills:
  - name: nn-innfo
    path: actioNN/skills/nn-innfo
    version: "1.0.0"
    mcp:
      - name: innfo-mcp
        path: iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js
        version: "0.2.5"
`;
    const files = {
      'actioNN/skills/nn-innfo/SKILL.md': '---\nversion: "1.0.0"\n---\n# Innfo',
      'iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js': '// bundle content',
      'iNNfo/packages/innfo-mcp/package.json': JSON.stringify({ version: '0.2.4' }),
    };
    const tmpDir = createTempWorkspace(sourceYaml, files);
    try {
      const result = checkWorkspaceParity(tmpDir);
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.errors.some(e => e.includes("version mismatch — manifest '0.2.5' vs package.json '0.2.4'")), true);
      console.log('✔ MCP package version mismatch detection passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log('All check-parity unit tests passed successfully!');
}

main();