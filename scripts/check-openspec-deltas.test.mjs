#!/usr/bin/env node

/**
 * scripts/check-openspec-deltas.test.mjs
 *
 * Unit tests for scripts/check-openspec-deltas.mjs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkDeltaSpecContent,
  checkOpenSpecDeltas,
  findDeltaSpecFiles,
  parseDeltaBlocks,
} from './check-openspec-deltas.mjs';

function fixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'check-openspec-deltas-'));
}

function writeDelta(root, change, spec, body) {
  const dir = path.join(root, change, 'specs', spec);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'spec.md'), body, 'utf8');
}

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error(`not ok ${name}\n  ${err.message}`);
  }
}

function messages(content) {
  return checkDeltaSpecContent(content).map((i) => i.message);
}

function main() {
  console.log('Running check-openspec-deltas unit tests...');

  test('one-line requirement with MUST and a scenario passes', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: Cascade deletion',
      'The engine MUST delete dependent rows in the same transaction.',
      '',
      '#### Scenario: Parent removed',
      '- WHEN a parent row is deleted',
      '- THEN its children are deleted',
      '',
    ].join('\n');
    assert.deepStrictEqual(messages(content), []);
  });

  test('wrapped MUST on line 2 fails and names the wrap', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: Cascade deletion',
      'The engine deletes dependent rows in the same',
      'transaction whenever a parent is removed; this MUST hold.',
      '',
      '#### Scenario: Parent removed',
      '- WHEN a parent row is deleted',
      '',
    ].join('\n');
    const issues = checkDeltaSpecContent(content);
    assert.strictEqual(issues.length, 1, JSON.stringify(issues));
    assert.match(issues[0].message, /not on the first line/);
    assert.match(issues[0].message, /unwrap/);
  });

  test('requirement with no normative word reports the plain rule', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: Cascade deletion',
      'The engine deletes dependent rows in the same transaction.',
      '',
      '#### Scenario: Parent removed',
      '- WHEN a parent row is deleted',
      '',
    ].join('\n');
    const issues = checkDeltaSpecContent(content);
    assert.strictEqual(issues.length, 1, JSON.stringify(issues));
    assert.strictEqual(issues[0].message, 'ADDED "Cascade deletion" must contain SHALL or MUST');
  });

  test('MODIFIED uses the same rule as ADDED', () => {
    const content = [
      '## MODIFIED Requirements',
      '',
      '### Requirement: Cascade deletion',
      'The engine deletes dependent rows.',
      '',
      '#### Scenario: Parent removed',
      '- WHEN a parent row is deleted',
      '',
    ].join('\n');
    assert.match(messages(content)[0], /^MODIFIED "Cascade deletion" must contain SHALL or MUST$/);
  });

  test('missing scenario fails', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: Cascade deletion',
      'The engine SHALL delete dependent rows.',
      '',
    ].join('\n');
    const issues = checkDeltaSpecContent(content);
    assert.strictEqual(issues.length, 1, JSON.stringify(issues));
    assert.match(issues[0].message, /at least one scenario/);
  });

  test('missing requirement text fails', () => {
    const content = ['## ADDED Requirements', '', '### Requirement: Empty', '', '#### Scenario: x', ''].join(
      '\n',
    );
    const issues = checkDeltaSpecContent(content);
    assert.strictEqual(issues.length, 1, JSON.stringify(issues));
    assert.match(issues[0].message, /is missing requirement text/);
  });

  test('metadata lines are skipped before the normative line', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: Cascade deletion',
      '**ID**: R-01',
      '**Priority**: high',
      '',
      'The engine SHALL delete dependent rows.',
      '',
      '#### Scenario: Parent removed',
      '- WHEN a parent row is deleted',
      '',
    ].join('\n');
    assert.deepStrictEqual(messages(content), []);
  });

  test('REMOVED and RENAMED sections are ignored', () => {
    const content = [
      '## REMOVED Requirements',
      '',
      '### Requirement: Old behaviour',
      'No normative word here.',
      '',
      '## RENAMED Requirements',
      '',
      '### Requirement: Another one',
      'Still nothing.',
      '',
    ].join('\n');
    assert.deepStrictEqual(messages(content), []);
  });

  test('blocks stop at the next requirement header', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: First',
      'The engine SHALL do A.',
      '',
      '#### Scenario: a',
      '- WHEN x',
      '',
      '### Requirement: Second',
      'The engine SHALL do B.',
      '',
      '#### Scenario: b',
      '- WHEN y',
      '',
    ].join('\n');
    const blocks = parseDeltaBlocks(content);
    assert.strictEqual(blocks.length, 2);
    assert.deepStrictEqual(
      blocks.map((b) => b.name),
      ['First', 'Second'],
    );
    assert.deepStrictEqual(messages(content), []);
  });

  test('CRLF content is handled like LF', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: Cascade deletion',
      'The engine SHALL delete dependent rows.',
      '',
      '#### Scenario: Parent removed',
      '- WHEN a parent row is deleted',
      '',
    ].join('\r\n');
    assert.deepStrictEqual(messages(content), []);
  });

  test('archive is ignored and active changes are scanned', () => {
    const root = fixtureRoot();
    writeDelta(
      root,
      'archive/2026-01-01-old',
      'thing',
      '## ADDED Requirements\n\n### Requirement: Old\nThe old text.\n\n#### Scenario: x\n- WHEN y\n',
    );
    writeDelta(
      root,
      '2026-10-27-active',
      'thing',
      '## ADDED Requirements\n\n### Requirement: New\nThe new text.\n\n#### Scenario: x\n- WHEN y\n',
    );
    const files = findDeltaSpecFiles(root);
    assert.strictEqual(files.length, 1, JSON.stringify(files));
    assert.match(files[0], /2026-10-27-active/);

    const result = checkOpenSpecDeltas({ changesRoot: root });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.scanned, 1);
    assert.strictEqual(result.issues.length, 1);
    assert.match(result.issues[0].file, /2026-10-27-active\/specs\/thing\/spec\.md$/);
  });

  test('no changes dir is a pass, not a crash', () => {
    const result = checkOpenSpecDeltas({ changesRoot: path.join(fixtureRoot(), 'missing') });
    assert.deepStrictEqual(result, { ok: true, scanned: 0, issues: [] });
  });

  test('UTF-8 BOM is reported as a section-matching failure', () => {
    const content =
      '\uFEFF' +
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Cascade deletion',
        'The engine SHALL delete dependent rows.',
        '',
        '#### Scenario: Parent removed',
        '- WHEN a parent row is deleted',
        '',
      ].join('\n');
    const issues = checkDeltaSpecContent(content);
    assert.strictEqual(issues.length, 1, JSON.stringify(issues));
    assert.match(issues[0].message, /UTF-8 BOM/);
    assert.match(issues[0].message, /No delta sections found/);
  });

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll check-openspec-deltas unit tests passed!');
}

main();
