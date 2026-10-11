#!/usr/bin/env node

/**
 * scripts/check-usage-procedure.test.mjs
 *
 * Unit tests for scripts/check-usage-procedure.mjs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkUsageProcedure, procedureFiles } from './check-usage-procedure.mjs';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'check-usage-procedure-'));
}

const USAGE_FM = `---
level: 3
parent_spec:
  name: "procedures_V_0-3-2"
  url: "https://example.test/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Using the X Blueprint"
---
`;

const WRONG_PARENT_FM = USAGE_FM.replace('procedures_V_0-3-2', 'business_V_0-4-1');

function writeBlueprint(blueprintsRoot, name, files = {}) {
  const dir = path.join(blueprintsRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'spec_NN.md'), `---\ntitle: "X"\nblueprint_version: "V_0-1-0"\n---\n`, 'utf8');
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  }
}

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`✔ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error(`✘ ${name}\n  ${err.message}`);
  }
}

function main() {
  console.log('Running check-usage-procedure unit tests...');

  test('blueprint with procedures and a usage procedure passes', () => {
    const root = fixtureRoot();
    writeBlueprint(root, 'analysis', {
      'procedures/run_coherence_audit_procedures_NN.md': USAGE_FM,
      'procedures/usage_procedures_NN.md': USAGE_FM,
    });
    const res = checkUsageProcedure({ blueprintsRoot: root });
    assert.strictEqual(res.ok, true, JSON.stringify(res.failures));
  });

  test('blueprint with procedures but no usage fails', () => {
    const root = fixtureRoot();
    writeBlueprint(root, 'analysis', { 'procedures/run_coherence_audit_procedures_NN.md': USAGE_FM });
    const res = checkUsageProcedure({ blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'MISSING_USAGE_PROCEDURE');
  });

  test('blueprint without a procedures tree is exempt', () => {
    const root = fixtureRoot();
    writeBlueprint(root, 'blank');
    const res = checkUsageProcedure({ blueprintsRoot: root });
    assert.strictEqual(res.ok, true, JSON.stringify(res.failures));
  });

  test('usage procedure with a non-procedures parent fails', () => {
    const root = fixtureRoot();
    writeBlueprint(root, 'analysis', {
      'procedures/run_coherence_audit_procedures_NN.md': USAGE_FM,
      'procedures/usage_procedures_NN.md': WRONG_PARENT_FM,
    });
    const res = checkUsageProcedure({ blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'USAGE_WRONG_PARENT');
  });

  test('nested procedures (procedures/procedures) are discovered', () => {
    const root = fixtureRoot();
    writeBlueprint(root, 'procedures', { 'procedures/document_sop_procedures_NN.md': USAGE_FM });
    const res = checkUsageProcedure({ blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'MISSING_USAGE_PROCEDURE');
  });

  test('procedureFiles finds files recursively', () => {
    const root = fixtureRoot();
    writeBlueprint(root, 'procedures', {
      'procedures/document_sop_procedures_NN.md': USAGE_FM,
      'procedures/usage_procedures_NN.md': USAGE_FM,
    });
    const found = procedureFiles(path.join(root, 'procedures')).map((p) => path.basename(p)).sort();
    assert.deepStrictEqual(found, ['document_sop_procedures_NN.md', 'usage_procedures_NN.md']);
  });

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll check-usage-procedure unit tests passed! 🎉');
}

main();
