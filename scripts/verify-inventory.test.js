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
const { checkTemplateInventory } = require('./verify.js');

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
templates:
  - name: registered-tmpl
    path: iNNfo/specs/templates/registered-tmpl
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const templatesDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(templatesDir, 'registered-tmpl'), { recursive: true });
      fs.mkdirSync(path.join(templatesDir, 'colliding-skill'), { recursive: true });

      const result = checkTemplateInventory(templatesDir, sourceYamlPath);
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
templates:
  - name: registered-tmpl
    path: iNNfo/specs/templates/registered-tmpl
`;
      const sourceYamlPath = path.join(tmpDir, 'source.yaml');
      fs.writeFileSync(sourceYamlPath, sourceYaml, 'utf8');

      const templatesDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(path.join(templatesDir, 'registered-tmpl'), { recursive: true });

      const result = checkTemplateInventory(templatesDir, sourceYamlPath);
      assert.strictEqual(result.ok, true);
      assert.deepStrictEqual(result.missing, []);
      console.log('✔ Normal registered template passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log('All verify-inventory unit tests passed successfully!');
}

main();
