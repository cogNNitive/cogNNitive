#!/usr/bin/env node
/**
 * scripts/verify-offline.test.js
 *
 * quality-gates spec, "Verification is offline and deterministic in every mode"
 * and the run-everything-then-summarize execution model.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSteps, childEnv, runSteps } = require('./verify.js');

const repoRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'verify.js'), 'utf8');

// 1. No GitHub CLI token lookup.
assert.ok(!/gh auth token/.test(source), 'verify.js must not call `gh auth token`');

// 2. Every child process is forced offline.
assert.strictEqual(childEnv({ PATH: 'x' }).NN_OFFLINE, '1');
assert.strictEqual(childEnv({ NN_OFFLINE: '0' }).NN_OFFLINE, '1', 'NN_OFFLINE cannot be overridden off');

// 3. Network- and release-state steps are gone.
const steps = buildSteps(repoRoot);
const flat = steps.filter((s) => !s.id.startsWith('test-')).map((s) => `${s.id} ${s.desc} ${(s.args || []).join(' ')}`).join('\n');
for (const retired of ['check-parity', 'cdn-bundle', 'generate-manifest', 'validate-manifest']) {
  assert.ok(!flat.includes(retired), `step list must not contain ${retired}`);
}
assert.ok(steps.length > 10, 'step list is populated');
assert.strictEqual(new Set(steps.map((s) => s.id)).size, steps.length, 'step ids are unique');

// 4. --release is accepted and builds the same steps (no tag-dependent step).
assert.deepStrictEqual(
  buildSteps(repoRoot, { release: true }).map((s) => s.id),
  steps.map((s) => s.id),
);

// 5. All steps run even when an early one fails; failures are summarized.
{
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-offline-'));
  const lines = [];
  const ran = [];
  const mk = (id, ok) => ({ id, desc: id, run: () => { ran.push(id); return { ok, output: '' }; } });
  const result = runSteps([mk('a', true), mk('b', false), mk('c', true), mk('d', false)], {
    logDir,
    write: (l) => lines.push(l),
  });
  assert.deepStrictEqual(ran, ['a', 'b', 'c', 'd'], 'a failing step does not stop the run');
  assert.deepStrictEqual(result.failed.map((f) => f.id), ['b', 'd']);
  assert.strictEqual(result.ok, false);
  const text = lines.join('\n');
  assert.ok(/2 of 4 step\(s\) failed/.test(text), 'summary reports failures');
}



// 6. check-integrity no longer gates on the staged CDN bundle (release owns it)
//    and honours runVerification's boolean result (it no longer exits itself).
{
  const ci = fs.readFileSync(path.join(__dirname, 'check-integrity.js'), 'utf8');
  assert.ok(!/cdn-bundle-staged|checkCdnBundleStaged/.test(ci), 'check-integrity must not check CDN staging');
  assert.ok(/if \(!runVerification\(/.test(ci), 'check-integrity must exit non-zero when verification fails');
}
console.log('verify-offline tests passed');
