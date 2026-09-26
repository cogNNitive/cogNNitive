#!/usr/bin/env node

/**
 * skills/nn-video-script/test/vus-parse.test.mjs
 *
 * Unit tests for vus-parse.mjs. Gated on VIDGENN_ROOT: when unset, this suite
 * prints an explicit skip line and passes trivially — it never probes default
 * paths (see the `preflight-tests-leak-real-home-dir` lesson). The real
 * integration parse only runs when VIDGENN_ROOT is set (e.g. during Batch 1
 * spikes or a maintainer's local run against a VidGeNN checkout).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runVusParse } from '../scripts/vus-parse.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vusParsePath = path.join(__dirname, '..', 'scripts', 'vus-parse.mjs');

const VALID_SAMPLE_SCRIPT = `//ANYDEO_SPEC: V_0-3-3
# Intro
@ Scene
This is the narration for the scene.
@@ Visual
- layer_type: image
![media](media/hero.jpg)
`;

async function runTests() {
  console.log('Running vus-parse unit tests...');

  // Test 1: explicit skip line when VIDGENN_ROOT is unset — never probes a default path.
  {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vus-parse-test-'));
    const scriptPath = path.join(tmpDir, 'script.md');
    fs.writeFileSync(scriptPath, VALID_SAMPLE_SCRIPT, 'utf8');

    const env = { ...process.env };
    delete env.VIDGENN_ROOT;

    const res = spawnSync('node', [vusParsePath, scriptPath], { encoding: 'utf8', env });
    assert.strictEqual(res.status, 0, `CLI must exit 0 (skip, not fail) when VIDGENN_ROOT is unset, got stderr: ${res.stderr}`);
    assert.ok(/SKIP/.test(res.stdout), 'CLI must print an explicit SKIP line when VIDGENN_ROOT is unset');
    console.log('✔ Explicit skip line printed and exit 0 when VIDGENN_ROOT is unset');
  }

  // Test 2 (function-level): runVusParse with an explicitly empty vidgennRoot
  // returns skipped: true. Uses '' rather than `undefined` on purpose: the
  // default parameter only substitutes on `undefined`, and this assertion
  // must hold regardless of whether VIDGENN_ROOT happens to be set in the
  // ambient shell running this suite.
  {
    const result = runVusParse({ scriptPath: 'irrelevant.md', vidgennRoot: '' });
    assert.strictEqual(result.skipped, true);
    assert.ok(/VIDGENN_ROOT/.test(result.reason));
    console.log('✔ runVusParse reports skipped: true with no VIDGENN_ROOT');
  }

  // Test 3 (integration, only runs with VIDGENN_ROOT set): zero issues on a valid sample script.
  if (!process.env.VIDGENN_ROOT) {
    console.log('SKIP: VIDGENN_ROOT not set; skipping the real ScriptParser integration test.');
  } else {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vus-parse-test-'));
    const scriptPath = path.join(tmpDir, 'script.md');
    fs.writeFileSync(scriptPath, VALID_SAMPLE_SCRIPT, 'utf8');

    const result = runVusParse({ scriptPath, vidgennRoot: process.env.VIDGENN_ROOT });
    assert.strictEqual(result.skipped, false);
    assert.deepStrictEqual(result.issues, [], `Expected zero issues on a valid sample script, got: ${JSON.stringify(result.issues)}`);
    console.log('✔ Zero issues on a valid sample script (real ScriptParser integration)');
  }

  console.log('\nAll vus-parse unit tests passed! 🎉');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
