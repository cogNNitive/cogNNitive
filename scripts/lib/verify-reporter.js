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
 * @typedef {{ id: string, desc: string, cmd: string, args?: string[] }} Step
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
    write(`\n▶ ${step.desc}`);
    const res = spawnSync(step.cmd, step.args || [], { ...spawnOptions, stdio: 'inherit' });
    const status = res.status === null ? 1 : res.status;
    return { id: step.id, desc: step.desc, ok: status === 0, status, durationMs: Date.now() - started, logPath: null };
  }

  fs.mkdirSync(options.logDir, { recursive: true });
  const logPath = path.join(options.logDir, `${step.id}.log`);
  const fd = fs.openSync(logPath, 'w');
  let res;
  try {
    res = spawnSync(step.cmd, step.args || [], { ...spawnOptions, stdio: ['ignore', fd, fd] });
  } finally {
    fs.closeSync(fd);
  }
  const status = res.status === null ? 1 : res.status;
  const durationMs = Date.now() - started;
  const seconds = (durationMs / 1000).toFixed(1);

  if (status === 0) {
    write(`✔ ${step.desc} (${seconds}s)`);
  } else {
    write(`✖ ${step.desc} → ${logPath}`);
    if (res.error) write(`  spawn error: ${res.error.message}`);
    const tail = tailLines(fs.readFileSync(logPath, 'utf8'), TAIL_LINES);
    if (options.ci) write(`::group::${step.desc} (last ${TAIL_LINES} lines)`);
    write(tail);
    if (options.ci) write('::endgroup::');
  }
  return { id: step.id, desc: step.desc, ok: status === 0, status, durationMs, logPath };
}

module.exports = { runStep, tailLines, TAIL_LINES };
