#!/usr/bin/env node
/**
 * scripts/lib/verify-reporter.test.js
 *
 * Tests for the quiet buffered verify reporter (quality-gates spec,
 * "Quiet buffered reporter").
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runStep, tailLines, TAIL_LINES } = require('./verify-reporter.js');

function mkLogDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'verify-reporter-'));
}

function capture() {
  const lines = [];
  return { lines, write: (l) => lines.push(l) };
}

// Runs `node -e <code>` as a step.
function step(id, code) {
  return { id, desc: `Step ${id}`, cmd: process.execPath, args: ['-e', code] };
}

function testQuietPass() {
  const logDir = mkLogDir();
  const out = capture();
  // 5 MB of output: must not reach the console.
  const result = runStep(
    step('quiet', "process.stdout.write('x'.repeat(1024).repeat(5 * 1024))"),
    { logDir, write: out.write },
  );
  assert.strictEqual(result.ok, true);
  assert.strictEqual(out.lines.length, 1, 'a passing step prints exactly one line');
  assert.match(out.lines[0], /^✔ Step quiet \(\d/);
  const log = path.join(logDir, 'quiet.log');
  assert.strictEqual(fs.statSync(log).size, 5 * 1024 * 1024, 'full output is in the log file');
}

function testFailureTail() {
  const logDir = mkLogDir();
  const out = capture();
  const result = runStep(
    step('fail', "for (let i = 1; i <= 100; i++) console.log('line ' + i); process.exit(3)"),
    { logDir, write: out.write },
  );
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 3);
  const text = out.lines.join('\n');
  assert.match(text, /^✖ Step fail → .*fail\.log/m);
  assert.ok(text.includes('line 100'), 'tail includes the last line');
  assert.ok(text.includes('line 41'), 'tail includes the 60th line from the end');
  assert.ok(!text.includes('line 40\n') && !/line 40$/m.test(text), 'tail stops at 60 lines');
  assert.strictEqual(TAIL_LINES, 60);
}

function testVerboseStreams() {
  const logDir = mkLogDir();
  const out = capture();
  const result = runStep(step('verbose', "console.log('streamed-marker')"), {
    logDir,
    verbose: true,
    write: out.write,
  });
  assert.strictEqual(result.ok, true);
  assert.ok(!fs.existsSync(path.join(logDir, 'verbose.log')), 'verbose mode inherits stdio, no log file');
}

function testVerboseReportsSpawnErrors() {
  const out = capture();
  const result = runStep(
    { id: 'missing', desc: 'Missing binary', cmd: path.join(os.tmpdir(), 'definitely-not-a-binary-xyz'), args: [] },
    { logDir: mkLogDir(), verbose: true, write: out.write },
  );
  assert.strictEqual(result.ok, false);
  assert.ok(out.lines.join('\n').includes('spawn error'), 'verbose mode reports spawn errors like quiet mode');
}

function testLargeOutputKeepsExitStatus() {
  const logDir = mkLogDir();
  const out = capture();
  const result = runStep(
    step('big', "process.stdout.write('y'.repeat(3 * 1024 * 1024)); process.exit(7)"),
    { logDir, write: out.write },
  );
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 7, 'exit status survives >1 MB output');
  assert.ok(fs.statSync(path.join(logDir, 'big.log')).size >= 3 * 1024 * 1024);
}

function testStderrGoesToLog() {
  const logDir = mkLogDir();
  const out = capture();
  runStep(step('err', "console.error('boom-on-stderr'); process.exit(1)"), { logDir, write: out.write });
  assert.ok(fs.readFileSync(path.join(logDir, 'err.log'), 'utf8').includes('boom-on-stderr'));
}

function testInlineStep() {
  const logDir = mkLogDir();
  const out = capture();
  const pass = runStep(
    { id: 'inline-ok', desc: 'Inline ok', run: () => ({ ok: true, output: 'all good\n' }) },
    { logDir, write: out.write },
  );
  assert.strictEqual(pass.ok, true);
  assert.match(out.lines[0], /^✔ Inline ok/);
  assert.strictEqual(fs.readFileSync(path.join(logDir, 'inline-ok.log'), 'utf8'), 'all good\n');

  const failOut = capture();
  const fail = runStep(
    { id: 'inline-bad', desc: 'Inline bad', run: () => ({ ok: false, output: 'bad thing\n' }) },
    { logDir, write: failOut.write },
  );
  assert.strictEqual(fail.ok, false);
  assert.ok(failOut.lines.join('\n').includes('bad thing'));

  const thrown = runStep(
    { id: 'inline-throw', desc: 'Inline throw', run: () => { throw new Error('kaboom'); } },
    { logDir, write: capture().write },
  );
  assert.strictEqual(thrown.ok, false, 'a throwing inline step is a failure, not a crash');
  assert.ok(fs.readFileSync(path.join(logDir, 'inline-throw.log'), 'utf8').includes('kaboom'));
}

function testTailLines() {
  assert.strictEqual(tailLines('a\nb\nc\n', 2), 'b\nc');
  assert.strictEqual(tailLines('a\nb', 5), 'a\nb');
}

function testHungStepTimesOut() {
  const previous = process.env.NN_VERIFY_STEP_TIMEOUT_MS;
  process.env.NN_VERIFY_STEP_TIMEOUT_MS = '500';
  try {
    const out = capture();
    const result = runStep(step('hang', 'setInterval(() => {}, 1000)'), { logDir: mkLogDir(), write: out.write });
    assert.strictEqual(result.ok, false, 'a hung step fails instead of stalling the run');
    assert.ok(out.lines.join(' ').includes('ETIMEDOUT'), 'the timeout is reported');
  } finally {
    if (previous === undefined) delete process.env.NN_VERIFY_STEP_TIMEOUT_MS;
    else process.env.NN_VERIFY_STEP_TIMEOUT_MS = previous;
  }
}

testQuietPass();
testHungStepTimesOut();
testFailureTail();
testVerboseStreams();
testVerboseReportsSpawnErrors();
testLargeOutputKeepsExitStatus();
testStderrGoesToLog();
testInlineStep();
testTailLines();
console.log('verify-reporter tests passed');
