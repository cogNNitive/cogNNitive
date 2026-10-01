/**
 * scripts/lib/verify-reporter.js
 *
 * Quiet buffered step runner for `scripts/verify.js` (quality-gates spec,
 * "Quiet buffered reporter"). Each step's stdout and stderr are connected
 * directly to a per-step log file descriptor, so no `maxBuffer` limit applies
 * and a passing step prints a single line. A failing step prints the last
 * {@link TAIL_LINES} lines of its log plus the log path.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TAIL_LINES = 60;

/**
 * @param {string} text
 * @param {number} count
 * @returns {string} the last `count` lines of `text`, without a trailing newline.
 */
function tailLines(text, count) {
  const lines = text.replace(/\r?\n$/, '').split(/\r?\n/);
  return lines.slice(-count).join('\n');
}

/**
 * @typedef {{ id: string, desc: string, cmd?: string, args?: string[], run?: () => { ok: boolean, output?: string } }} Step
 * A step is either a child process (`cmd` + `args`) or an in-process check (`run`).
 * @typedef {{
 *   logDir: string,
 *   verbose?: boolean,
 *   ci?: boolean,
 *   cwd?: string,
 *   env?: NodeJS.ProcessEnv,
 *   write?: (line: string) => void,
 * }} RunOptions
 */

/**
 * Runs one verification step synchronously.
 * @param {Step} step
 * @param {RunOptions} options
 * @returns {{ id: string, desc: string, ok: boolean, status: number|null, durationMs: number, logPath: string|null }}
 */
function runStep(step, options) {
  const write = options.write || ((line) => console.log(line));
  const spawnOptions = { cwd: options.cwd, env: options.env, shell: false };
  const started = Date.now();

  if (options.verbose) {
    write(`
▶ ${step.desc}`);
    let status;
    if (step.run) {
      const res = safeRun(step.run);
      process.stdout.write(res.output);
      status = res.ok ? 0 : 1;
    } else {
      const res = spawnSync(step.cmd, step.args || [], { ...spawnOptions, stdio: 'inherit' });
      status = res.status === null ? 1 : res.status;
      if (res.error) write(`  spawn error: ${res.error.message}`);
    }
    return { id: step.id, desc: step.desc, ok: status === 0, status, durationMs: Date.now() - started, logPath: null };
  }

  fs.mkdirSync(options.logDir, { recursive: true });
  const logPath = path.join(options.logDir, `${step.id}.log`);
  let status;
  let spawnError = null;
  if (step.run) {
    const res = safeRun(step.run);
    fs.writeFileSync(logPath, res.output);
    status = res.ok ? 0 : 1;
  } else {
    const fd = fs.openSync(logPath, 'w');
    let res;
    try {
      res = spawnSync(step.cmd, step.args || [], { ...spawnOptions, stdio: ['ignore', fd, fd] });
    } finally {
      fs.closeSync(fd);
    }
    status = res.status === null ? 1 : res.status;
    spawnError = res.error || null;
  }
  const durationMs = Date.now() - started;
  const seconds = (durationMs / 1000).toFixed(1);

  if (status === 0) {
    write(`✔ ${step.desc} (${seconds}s)`);
  } else {
    write(`✖ ${step.desc} → ${logPath}`);
    if (spawnError) write(`  spawn error: ${spawnError.message}`);
    const tail = tailLines(fs.readFileSync(logPath, 'utf8'), TAIL_LINES);
    if (options.ci) write(`::group::${step.desc} (last ${TAIL_LINES} lines)`);
    write(tail);
    if (options.ci) write('::endgroup::');
  }
  return { id: step.id, desc: step.desc, ok: status === 0, status, durationMs, logPath };
}

/**
 * Runs an in-process step; a throw is a failure (logged), never a crash.
 * @param {() => { ok: boolean, output?: string }} fn
 * @returns {{ ok: boolean, output: string }}
 */
function safeRun(fn) {
  try {
    const res = fn();
    return { ok: res.ok === true, output: res.output || '' };
  } catch (err) {
    return { ok: false, output: `${err && err.stack ? err.stack : err}
` };
  }
}

module.exports = { runStep, tailLines, TAIL_LINES };
