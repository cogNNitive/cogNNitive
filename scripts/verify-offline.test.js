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
const { buildSteps, childEnv, runSteps, resolveJobs, SERIAL_SUITES } = require('./verify.js');

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

// 4b. --fast drops only SLOW_SUITES suites; every guard and drift check stays.
{
  const fastIds = new Set(buildSteps(repoRoot, { fast: true }).map((s) => s.id));
  const dropped = steps.filter((s) => !fastIds.has(s.id));
  assert.ok(dropped.length > 0, '--fast skips something');
  assert.ok(dropped.every((s) => s.id.startsWith('test-')), '--fast skips only test suites');
  assert.ok(steps.filter((s) => !s.id.startsWith('test-')).every((s) => fastIds.has(s.id)), '--fast keeps every guard');
}

// 5-5g. Runner semantics (async: the pool). Serial and pooled runs must agree.
const nodeStep = (id, code, parallel = true) => ({ id, desc: id, cmd: process.execPath, args: ['-e', code], parallel });
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

async function testRunner() {
  // 5. All steps run even when an early one fails; failures are summarized.
  {
    const lines = [];
    const ran = [];
    const mk = (id, ok) => ({ id, desc: id, run: () => { ran.push(id); return { ok, output: '' }; } });
    const result = await runSteps([mk('a', true), mk('b', false), mk('c', true), mk('d', false)], {
      logDir: tmp('verify-offline-'),
      write: (l) => lines.push(l),
    });
    assert.deepStrictEqual(ran, ['a', 'b', 'c', 'd'], 'a failing step does not stop the run');
    assert.deepStrictEqual(result.failed.map((f) => f.id), ['b', 'd']);
    assert.strictEqual(result.ok, false);
    assert.ok(/2 of 4 step\(s\) failed/.test(lines.join('\n')), 'summary reports failures');
  }

  // 5b. jobs=1 and jobs=4 agree on results, order and failing set; a failure never stops the run.
  {
    const mkSteps = () => [
      nodeStep('p1', 'process.exit(0)'),
      nodeStep('p2', 'console.log("boom-p2"); process.exit(3)'),
      nodeStep('p3', 'process.exit(0)'),
      nodeStep('p4', 'process.exit(5)'),
      nodeStep('p5', 'process.exit(0)'),
      nodeStep('s1', 'process.exit(0)', false),
      nodeStep('s2', 'process.exit(1)', false),
    ];
    const run = async (jobs) => {
      const lines = [];
      const res = await runSteps(mkSteps(), { jobs, logDir: tmp('verify-pool-'), write: (l) => lines.push(l) });
      return { res, text: lines.join('\n') };
    };
    const serial = await run(1);
    const pooled = await run(4);
    for (const { res, text } of [serial, pooled]) {
      assert.strictEqual(res.ok, false, 'any failing step fails the run');
      assert.deepStrictEqual(res.results.map((r) => r.id), ['p1', 'p2', 'p3', 'p4', 'p5', 's1', 's2'], 'results keep list order');
      assert.deepStrictEqual(res.failed.map((f) => f.id), ['p2', 'p4', 's2']);
      assert.deepStrictEqual(res.failed.map((f) => f.status), [3, 5, 1], 'exit codes propagate');
      assert.ok(/3 of 7 step\(s\) failed/.test(text), 'summary names the failure count');
      assert.ok(text.includes('boom-p2'), 'failing step output is shown');
    }
  }

  // 5c. The pool is bounded, actually concurrent, and each log holds only its own output.
  {
    const dir = tmp('verify-conc-');
    // The first `jobs` children wait for a sibling; later ones (which may run alone) do not.
    const code = (needSibling) => `
      const fs = require('fs'), path = require('path');
      const dir = ${JSON.stringify(dir)};
      const me = path.join(dir, 'run-' + process.pid);
      fs.writeFileSync(me, '');
      const live = () => fs.readdirSync(dir).filter((f) => f.startsWith('run-')).length;
      // Barrier: stay alive until a sibling is running too (or 8s), so overlap does not depend on node start-up speed.
      const until = Date.now() + 8000;
      const wait = () => {
        if (${needSibling} && live() < 2 && Date.now() < until) return setTimeout(wait, 20);
        fs.appendFileSync(path.join(dir, 'peak'), live() + '\\n');
        console.log('L1'); console.log('L2'); console.log('L3');
        setTimeout(() => fs.unlinkSync(me), 150);
      };
      wait();
    `;
    const steps = Array.from({ length: 6 }, (_, i) => nodeStep('c' + i, code(i < 3)));
    const lines = [];
    const res = await runSteps(steps, { jobs: 3, logDir: path.join(dir, 'logs'), write: (l) => lines.push(l) });
    assert.strictEqual(res.ok, true);
    const peaks = fs.readFileSync(path.join(dir, 'peak'), 'utf8').trim().split('\n').map(Number);
    assert.ok(Math.max(...peaks) >= 2, 'steps overlap with jobs=3');
    assert.ok(Math.max(...peaks) <= 3, 'never more than jobs steps at once');
    assert.strictEqual(lines.length, 6, 'a passing step prints exactly one line');
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(fs.readFileSync(path.join(dir, 'logs', `c${i}.log`), 'utf8'), 'L1\nL2\nL3\n');
    }
  }

  // 5d. A failing step's tail is written as one contiguous block, never mixed with another step.
  {
    const lines = [];
    const noisy = (id) => nodeStep(id, `for (let i = 0; i < 3; i++) console.log('${id}-line-' + i); process.exit(1)`);
    await runSteps([noisy('n1'), noisy('n2'), noisy('n3')], { jobs: 3, logDir: tmp('verify-tail-'), write: (l) => lines.push(l) });
    const tails = lines.filter((l) => /-line-/.test(l));
    assert.strictEqual(tails.length, 3);
    for (const t of tails) assert.strictEqual(new Set(t.match(/n\d/g)).size, 1, 'tail lines of one step are not mixed');
  }

  // 5e. A hung pooled step times out and fails instead of stalling the run.
  {
    const previous = process.env.NN_VERIFY_STEP_TIMEOUT_MS;
    process.env.NN_VERIFY_STEP_TIMEOUT_MS = '500';
    try {
      const res = await runSteps([nodeStep('hang', 'setInterval(() => {}, 1000)'), nodeStep('ok', 'process.exit(0)')], {
        jobs: 2, logDir: tmp('verify-hang-'), write: () => {},
      });
      assert.deepStrictEqual(res.failed.map((f) => f.id), ['hang']);
    } finally {
      if (previous === undefined) delete process.env.NN_VERIFY_STEP_TIMEOUT_MS;
      else process.env.NN_VERIFY_STEP_TIMEOUT_MS = previous;
    }
  }

  // 5f. resolveJobs: flag > env > min(8, max(1, floor(cpus*0.75))); junk is rejected.
  assert.strictEqual(resolveJobs([], {}, 12), 8);
  assert.strictEqual(resolveJobs([], {}, 4), 3);
  assert.strictEqual(resolveJobs([], {}, 1), 1);
  assert.strictEqual(resolveJobs([], { VERIFY_JOBS: '6' }, 12), 6);
  assert.strictEqual(resolveJobs(['--jobs=1'], { VERIFY_JOBS: '6' }, 12), 1);
  for (const bad of ['0', 'x', '1.5', '-2']) assert.throws(() => resolveJobs([`--jobs=${bad}`], {}, 12), /invalid job count/);

  // 5g. Test suites and read-only child-process guards are pool-eligible; SERIAL_SUITES and
  //     in-process checks are not.
  const all = buildSteps(repoRoot);
  assert.ok(all.some((s) => s.parallel), 'some steps are pooled');
  assert.ok(all.some((s) => s.parallel && s.id.startsWith('test-')), 'test suites are pooled');
  assert.ok(all.some((s) => s.parallel && !s.id.startsWith('test-')), 'read-only guards are pooled');
  assert.ok(all.filter((s) => s.parallel).every((s) => !s.run), 'in-process steps are never pooled');
  for (const rel of SERIAL_SUITES) assert.ok(all.some((s) => s.desc === 'Test ' + rel && !s.parallel), rel + ' is serial');
}

// 6. check-integrity no longer gates on the staged CDN bundle (release owns it)
//    and fails when the verify.js child exits non-zero.
{
  const ci = fs.readFileSync(path.join(__dirname, 'check-integrity.js'), 'utf8');
  assert.ok(!/cdn-bundle-staged|checkCdnBundleStaged/.test(ci), 'check-integrity must not check CDN staging');
  assert.ok(/verify\.js/.test(ci) && /\.status !== 0\)/.test(ci), 'check-integrity must exit non-zero when verification fails');
}
// 7. Children load the fail-closed preload (existing NODE_OPTIONS are kept), and
//    no suite opts out of offline mode.
{
  const env = childEnv({ NODE_OPTIONS: '--max-old-space-size=512' });
  assert.match(env.NODE_OPTIONS, /--max-old-space-size=512/);
  assert.match(env.NODE_OPTIONS, /--require "[^"]*scripts[/]lib[/]offline-guard[.]js"/);
  assert.strictEqual((childEnv(env).NODE_OPTIONS.match(/offline-guard/g) || []).length, 1, 'preload is not added twice');
  for (const rel of ['lib/shared-libs.test.js', 'manifest/validate-manifest.test.js', 'skills-manager.test.js']) {
    const text = fs.readFileSync(path.join(__dirname, rel), 'utf8');
    assert.ok(!/delete process.env.NN_OFFLINE/.test(text), rel + ' must not disable offline mode');
  }
}

testRunner().then(
  () => console.log('verify-offline tests passed'),
  (err) => { console.error(err); process.exit(1); },
);
