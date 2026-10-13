#!/usr/bin/env node

/**
 * scripts/check-procedures-version.test.mjs
 *
 * Unit tests for scripts/check-procedures-version.mjs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkProceduresVersion, discoverProcedureFiles } from './check-procedures-version.mjs';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'check-procedures-version-'));
}

function writeProceduresBlueprint(blueprintsRoot, version) {
  const dir = path.join(blueprintsRoot, 'procedures');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'spec_NN.md'),
    `---\nblueprint_version: "${version}"\n---\n# procedures blueprint\n`,
    'utf8',
  );
}

function writeProcedure(blueprintsRoot, bp, fileName, parentName) {
  const filePath = path.join(blueprintsRoot, bp, 'procedures', fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---\nlevel: 3\nparent_spec:\n  name: "${parentName}"\n---\n# Procedure\n`,
    'utf8',
  );
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
  console.log('Running check-procedures-version unit tests...');

  test('in-sync procedures pass', () => {
    const root = fixtureRoot();
    writeProceduresBlueprint(root, 'V_0-3-2');
    writeProcedure(root, 'analysis', 'run_coherence_audit_procedures_NN.md', 'procedures_V_0-3-2');
    writeProcedure(root, 'workspace', 'reconcile_feedback_NN.md', 'procedures_V_0-3-2');
    const res = checkProceduresVersion({ blueprintsRoot: root });
    assert.strictEqual(res.ok, true, JSON.stringify(res.failures));
  });

  test('stale pin fails with STALE_PIN', () => {
    const root = fixtureRoot();
    writeProceduresBlueprint(root, 'V_0-3-2');
    writeProcedure(root, 'analysis', 'run_coherence_audit_procedures_NN.md', 'procedures_V_0-2-1');
    const res = checkProceduresVersion({ blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'STALE_PIN');
  });

  test('ahead pin fails with AHEAD_PIN', () => {
    const root = fixtureRoot();
    writeProceduresBlueprint(root, 'V_0-3-2');
    writeProcedure(root, 'analysis', 'run_coherence_audit_procedures_NN.md', 'procedures_V_0-4-0');
    const res = checkProceduresVersion({ blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'AHEAD_PIN');
  });

  test('versionless pin fails with MALFORMED_PIN', () => {
    const root = fixtureRoot();
    writeProceduresBlueprint(root, 'V_0-3-2');
    writeProcedure(root, 'visual-catalog', 'ingest_visual_catalog_procedures_NN.md', 'procedures');
    const res = checkProceduresVersion({ blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.match(res.failures[0].reason, /^MALFORMED_PIN/);
  });

  test('missing procedures blueprint spec fails with MISSING_BLUEPRINT_SPEC', () => {
    const root = fixtureRoot();
    writeProcedure(root, 'analysis', 'run_coherence_audit_procedures_NN.md', 'procedures_V_0-3-2');
    const res = checkProceduresVersion({ blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'MISSING_BLUEPRINT_SPEC');
  });

  test('discovery only picks *_NN.md directly under a procedures/ dir', () => {
    const root = fixtureRoot();
    writeProceduresBlueprint(root, 'V_0-3-2');
    writeProcedure(root, 'analysis', 'run_coherence_audit_procedures_NN.md', 'procedures_V_0-3-2');
    writeProcedure(root, 'analysis', 'nested_not_a_procedure.md', 'procedures_V_0-3-2');
    // A sample outside procedures/ must be ignored.
    fs.mkdirSync(path.join(root, 'analysis', 'samples'), { recursive: true });
    fs.writeFileSync(path.join(root, 'analysis', 'samples', 'Ghostbusters_NN.md'), `---\nparent_spec:\n  name: "analysis_V_0-3-3"\n---\n`, 'utf8');
    const found = discoverProcedureFiles(root).map((p) => path.relative(root, p).split(path.sep).join('/'));
    assert.deepStrictEqual(found, ['analysis/procedures/run_coherence_audit_procedures_NN.md']);
  });

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll check-procedures-version unit tests passed! 🎉');
}

main();
