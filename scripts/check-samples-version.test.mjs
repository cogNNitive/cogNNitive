#!/usr/bin/env node

/**
 * scripts/check-samples-version.test.mjs
 *
 * Unit tests for scripts/check-samples-version.mjs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkSamplesVersion } from './check-samples-version.mjs';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'check-samples-version-'));
}

function writeBlueprint(blueprintsRoot, bp, version) {
  const dir = path.join(blueprintsRoot, bp);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'spec_NN.md'),
    `---\nblueprint_version: "${version}"\n---\n# ${bp} blueprint\n`,
    'utf8',
  );
}

function writeSample(blueprintsRoot, target, parentName) {
  const filePath = path.join(blueprintsRoot, target);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---\nparent_spec:\n  name: "${parentName}"\n---\n# Sample\n`,
    'utf8',
  );
}

function mapping(bp, fileName) {
  return { source: `${bp}_NN.md`, target: path.join(bp, 'samples', fileName) };
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

async function main() {
  console.log('Running check-samples-version unit tests...');

  test('in-sync sample passes', () => {
    const root = fixtureRoot();
    const m = mapping('business', 'Ghostbusters_V_0-4-0_business_NN.md');
    writeBlueprint(root, 'business', 'V_0-4-0');
    writeSample(root, m.target, 'business_V_0-4-0');
    const res = checkSamplesVersion({ mappings: [m], blueprintsRoot: root });
    assert.strictEqual(res.ok, true, JSON.stringify(res.failures));
  });

  test('drift with no current sibling fails with NO_CURRENT_SAMPLE', () => {
    const root = fixtureRoot();
    const m = mapping('business', 'Ghostbusters_V_0-2-3_business_NN.md');
    writeBlueprint(root, 'business', 'V_0-4-0');
    writeSample(root, m.target, 'business_V_0-2-3');
    const res = checkSamplesVersion({ mappings: [m], blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'NO_CURRENT_SAMPLE');
  });

  test('historical sample + current sibling passes', () => {
    const root = fixtureRoot();
    const historical = mapping('business', 'Ghostbusters_V_0-1-0_business_NN.md');
    const current = mapping('business', 'Ghostbusters_V_0-4-0_business_NN.md');
    writeBlueprint(root, 'business', 'V_0-4-0');
    writeSample(root, historical.target, 'business_V_0-1-0');
    writeSample(root, current.target, 'business_V_0-4-0');
    const res = checkSamplesVersion({ mappings: [historical, current], blueprintsRoot: root });
    assert.strictEqual(res.ok, true, JSON.stringify(res.failures));
  });

  test('versionless pin fails with MALFORMED_PIN', () => {
    const root = fixtureRoot();
    const m = mapping('video', 'Ghostbusters_V_0-1-0_video_NN.md');
    writeBlueprint(root, 'video', 'V_0-7-1');
    writeSample(root, m.target, 'video');
    const res = checkSamplesVersion({ mappings: [m], blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.match(res.failures[0].reason, /^MALFORMED_PIN/);
  });

  test('missing blueprint_version fails with MISSING_BLUEPRINT_SPEC', () => {
    const root = fixtureRoot();
    const m = mapping('ghost', 'Ghostbusters_V_0-1-0_ghost_NN.md');
    const dir = path.join(root, 'ghost');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'spec_NN.md'), `---\ntitle: "no version"\n---\n`, 'utf8');
    writeSample(root, m.target, 'ghost_V_0-1-0');
    const res = checkSamplesVersion({ mappings: [m], blueprintsRoot: root });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.failures[0].reason, 'MISSING_BLUEPRINT_SPEC');
  });

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll check-samples-version unit tests passed! 🎉');
}

main();
