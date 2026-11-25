#!/usr/bin/env node
'use strict';

/**
 * Local push gate (called by .githooks/pre-push). Owns the whole pre-push pipeline,
 * fed by git's stdin ref lines (`<local_ref> <local_sha> <remote_ref> <remote_sha>`):
 *   0. fast-path — when every pushed branch targets `refs/heads/session/*`, skip the
 *      heavy build/typecheck/freshness pipeline entirely; CI gates the PR.
 *   1. heavy prerequisites — `npm run typecheck` and the docs-derived-facts check
 *      (after `build:dist`).
 *   2. FRESHNESS_GUARDS run concurrently via `Promise.all`.
 *   3. eslint, scoped to files changed against the integration base.
 * Each failure prints the exact command that fixes it. Exit code 1 on failure.
 *
 * A check whose tooling is missing from this checkout (no `node_modules`, an eslint config
 * that cannot load, a guard script that cannot resolve its modules) produced no verdict. It
 * is reported as NOT verified and named, and the push continues: claiming "eslint reported
 * errors" for a lint that never ran is what trains people to reach for `--no-verify`, which
 * disarms every hook. CI runs those checks on the pull request.
 *
 * `NN_PRE_PUSH_ROOT` overrides the repo root, and `NN_PRE_PUSH_SKIP_HEAVY=1` skips the
 * prerequisites — both used by `pre-push-check.test.js`.
 */

const { execFile, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { FRESHNESS_GUARDS } = require('./lib/freshness-guards.js');

const repoRoot = process.env.NN_PRE_PUSH_ROOT
  ? path.resolve(process.env.NN_PRE_PUSH_ROOT)
  : path.join(__dirname, '..');
const LINTABLE = /^(iNNfo|scripts)\/.*\.(?:[cm]?js|ts|tsx)$/;
const NO_CODE_PATHS = /^openspec\//;
const BASES = ['origin/main'];
const ZERO = /^0+$/;

/** Output of a tool that never ran: module, config or command resolution, never a verdict. */
const CANNOT_RUN =
  /Cannot find (?:package|module)|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|is not recognized as an internal or external command|command not found/i;

/** Runs git in `cwd`; returns trimmed stdout or null on failure. */
function gitIn(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return res.status === 0 ? (res.stdout || '').trim() : null;
}

function git(...args) {
  return gitIn(repoRoot, ...args);
}

/**
 * Parses git's pre-push stdin lines.
 * @param {string} text
 * @returns {Array<{ localRef: string, localSha: string, remoteRef: string, remoteSha: string }>}
 */
function parseRefLines(text) {
  return (text || '')
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 4)
    .map(([localRef, localSha, remoteRef, remoteSha]) => ({ localRef, localSha, remoteRef, remoteSha }));
}

/**
 * True when every pushed branch targets `refs/heads/session/*`. Session branches are
 * integration candidates, not delivered work: CI gates their PR, so the local heavy
 * pipeline (typecheck, docs facts, freshness guards, eslint) would only duplicate it.
 * A brand-new session branch qualifies on purpose — there is nothing to compare, and
 * the same CI run covers it.
 * @param {ReturnType<typeof parseRefLines>} refLines
 * @returns {boolean}
 */
function isSessionBranchPush(refLines) {
  const pushes = refLines.filter((l) => l.remoteRef.startsWith('refs/heads/') && !ZERO.test(l.localSha));
  if (pushes.length === 0) return false;
  return pushes.every((l) => l.remoteRef.startsWith('refs/heads/session/'));
}

/**
 * True when every file changed by every pushed branch lives under `openspec/`, which
 * nothing in the typecheck, docs-facts or freshness pipeline reads. A new branch
 * (all-zero remote sha) never qualifies: there is no remote range to diff against.
 * @param {ReturnType<typeof parseRefLines>} refLines
 * @param {string} [cwd]
 * @returns {boolean}
 */
function isNoCodePush(refLines, cwd = repoRoot) {
  const pushes = refLines.filter((l) => l.remoteRef.startsWith('refs/heads/') && !ZERO.test(l.localSha));
  if (pushes.length === 0) return false;
  return pushes.every((l) => {
    if (ZERO.test(l.remoteSha)) return false;
    const names = (gitIn(cwd, 'diff', '--name-only', l.remoteSha, l.localSha) || '').split('\n').filter(Boolean);
    return names.length > 0 && names.every((n) => NO_CODE_PATHS.test(n));
  });
}

/** Default async runner for one freshness guard. */
function defaultRunGuard(guard) {
  return new Promise((resolve) => {
    execFile(process.execPath, [guard.script, ...guard.args], { cwd: repoRoot, encoding: 'utf8' }, (err, stdout, stderr) => {
      resolve({ status: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

/**
 * Runs every freshness guard concurrently and collects the failures (never stops early).
 * @param {typeof FRESHNESS_GUARDS} [guards]
 * @param {(guard: typeof FRESHNESS_GUARDS[number]) => Promise<{ status: number, stdout?: string, stderr?: string }>} [run]
 * @returns {Promise<Array<{ guard: typeof FRESHNESS_GUARDS[number], res: { status: number, stdout?: string, stderr?: string } }>>}
 */
function collectGuardFailures(guards = FRESHNESS_GUARDS, run = defaultRunGuard) {
  return Promise.all(guards.map((guard) => run(guard).then((res) => ({ guard, res })))).then((results) =>
    results.filter(({ res }) => res.status !== 0),
  );
}

/** Lintable files changed in the pushed ref since the merge-base with the integration branch. */
function changedLintableFiles(pushedSha) {
  const base = BASES.find((b) => git('rev-parse', '--verify', '--quiet', b) !== null);
  if (!base) {
    console.warn(`pre-push: WARNING neither ${BASES.join(' nor ')} resolves (run: git fetch origin). Linting ALL of iNNfo/ and scripts/ instead.`);
    return ['iNNfo/', 'scripts/'];
  }
  const names = new Set();
  const add = (out) => (out || '').split('\n').filter(Boolean).forEach((n) => names.add(n));
  add(git('diff', '--name-only', '--diff-filter=ACMR', `${base}...${pushedSha}`));
  if (pushedSha === 'HEAD') add(git('diff', '--name-only', '--diff-filter=ACMR', 'HEAD'));
  return [...names].filter((n) => LINTABLE.test(n) && !n.includes('node_modules/'));
}

function runLint(files) {
  return lintOutcome(path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js'), files);
}

/** Most informative first: which module/command is missing, never the `throw` that reported it. */
const REASON_PRIORITY = [
  /Cannot find (?:package|module) '[^']+'/i,
  /\b(\S+) not (?:found|installed)\b/i,
  CANNOT_RUN,
];

/**
 * The one line of a tool's output that names why it could not run: the module, config or
 * command it failed to resolve, not the stack frame that happened to come first.
 * @param {string} [output]
 */
function cannotRunReason(output) {
  const lines = String(output || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const re of REASON_PRIORITY) {
    const hit = lines.find((line) => re.test(line));
    if (hit) return hit;
  }
  return lines[0] || 'no output';
}

/**
 * 'unverified' when the check never loaded its tooling (module, config or command resolution,
 * or the guard's own exit-2 "cannot run" contract), 'failed' when it ran and said no.
 * Conflating them is what made a bare checkout report "eslint reported errors in changed files"
 * while eslint could not even load its config -- and a gate that lies is what trains people to
 * reach for --no-verify, which disarms every hook.
 * @param {string} [output]
 * @param {number} [status]
 * @returns {'unverified' | 'failed'}
 */
function classifyFailure(output, status) {
  if (status === 2) return 'unverified';
  return CANNOT_RUN.test(String(output || '')) ? 'unverified' : 'failed';
}

/**
 * Runs eslint over `files`. A missing or unloadable eslint produced no verdict, so it is
 * reported as unverified instead of as lint errors.
 * @returns {{ ok: boolean, output?: string, unverified?: string }}
 */
function lintOutcome(eslintPath, files, spawn = spawnSync, cwd = repoRoot) {
  if (!fs.existsSync(eslintPath)) {
    return { ok: false, unverified: 'eslint is not installed in this checkout (no node_modules)' };
  }
  const res = spawn(process.execPath, [eslintPath, '--no-warn-ignored', '--quiet', ...files], {
    cwd,
    encoding: 'utf8',
  });
  const output = `${res.stdout || ''}${res.stderr || ''}`;
  if (res.status === 0) return { ok: true };
  if (classifyFailure(output, res.status) === 'unverified') {
    return { ok: false, unverified: `eslint could not load its tooling: ${cannotRunReason(output)}` };
  }
  return { ok: false, output };
}

/**
 * Reports checks that produced no verdict. Never phrased as a pass: the push continues, and
 * the report says exactly which checks CI still has to run.
 * @param {Array<{ what: string, why: string }>} list
 * @param {boolean} [blocking]
 */
function printUnverified(list, blocking = false) {
  if (!list || list.length === 0) return;
  console.error(
    `\npre-push: WARNING - ${list.length} check(s) could not run in this checkout, so they are NOT verified here:`,
  );
  for (const item of list) console.error(`  - ${item.what}: ${item.why}`);
  console.error(
    blocking
      ? '  they stay unverified until CI runs them.'
      : '  the push continues; CI runs them on the pull request.',
  );
}

/** Typecheck + docs-derived-facts prerequisites. Returns the failures and the unverifiable ones. */
function runHeavyPrerequisites() {
  if (process.env.NN_PRE_PUSH_SKIP_HEAVY) return { failures: [], unverified: [] };
  // Without an install these two steps cannot produce a verdict at all; saying "failed" would
  // be a lie about a checkout that simply has no toolchain.
  if (!fs.existsSync(path.join(repoRoot, 'node_modules'))) {
    return {
      failures: [],
      unverified: [{ what: 'typecheck and docs-derived facts', why: 'no node_modules in this checkout' }],
    };
  }
  const failures = [];
  const env = { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096' };
  const nodeStep = (args) => spawnSync(process.execPath, args, { cwd: repoRoot, stdio: 'inherit', env });
  const npmStep = (args) => spawnSync('npm', args, { cwd: repoRoot, stdio: 'inherit', env, shell: process.platform === 'win32' });

  if (npmStep(['run', 'typecheck']).status !== 0) {
    failures.push('typecheck failed.\n    fix: the errors above, or bypass with: git push --no-verify');
  }
  npmStep(['--workspace=@cognnitive/nn-mcp', 'run', 'build:dist']);
  if (nodeStep([path.join(repoRoot, 'scripts', 'generate-docs-facts.mjs'), '--check']).status !== 0) {
    failures.push("generated docs facts are stale.\n    fix: npm run regen (or node scripts/generate-docs-facts.mjs) and commit the result");
  }
  return { failures, unverified: [] };
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return '';
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

async function main() {
  const refLines = parseRefLines(readStdin());
  const branchPushes = refLines.filter((l) => l.remoteRef.startsWith('refs/heads/') && !ZERO.test(l.localSha));
  // Tag pushes and pure deletions carry nothing to gate.
  if (branchPushes.length === 0) return 0;

  if (isSessionBranchPush(refLines)) {
    console.log('pre-push: session/* branch push — fast-path (skipping typecheck, docs build and freshness guards; CI gates the PR).');
    return 0;
  }

  if (isNoCodePush(refLines)) {
    console.log('pre-push: no code changed (openspec/ only) — skipping typecheck, docs build and freshness guards.');
    return 0;
  }

  const failures = [];
  /** Checks whose tooling is absent: they produced no verdict, so they are not reported as passes. */
  const unverified = [];
  const t0 = Date.now();

  // The guards read the working tree, but CI sees only committed content (verify.js
  // checks docs-facts against HEAD on purpose). Uncommitted tracked edits can make a
  // guard pass here while the committed file is stale.
  const dirty = (git('status', '--porcelain', '--untracked-files=no') || '').split('\n').filter(Boolean).map((l) => l.trim());
  if (dirty.length > 0) {
    failures.push(
      `uncommitted changes to tracked files, so the guards may pass on content CI will not see:\n      ${dirty.slice(0, 10).join('\n      ')}\n    fix: commit them (e.g. the output of npm run regen), then push again`,
    );
  }

  const heavy = runHeavyPrerequisites();
  failures.push(...heavy.failures);
  unverified.push(...heavy.unverified);

  const guardFailures = await collectGuardFailures();
  for (const { guard, res } of guardFailures) {
    const output = `${res.stdout || ''}${res.stderr || ''}`;
    if (classifyFailure(output, res.status) === 'unverified') {
      unverified.push({ what: guard.desc, why: `could not start: ${cannotRunReason(output)}` });
      continue;
    }
    failures.push(`${guard.desc} is stale.\n    fix: npm run regen   (all generators; or just: ${guard.regen}) then commit the result`);
    process.stderr.write(output);
  }
  console.log(`pre-push: ${FRESHNESS_GUARDS.length} freshness guards in ${Date.now() - t0}ms`);

  const files = changedLintableFiles(branchPushes[0].localSha);
  if (files.length > 0) {
    const t1 = Date.now();
    const lint = runLint(files);
    console.log(`pre-push: eslint on ${files.length} changed file(s) in ${Date.now() - t1}ms`);
    if (lint.unverified) {
      unverified.push({ what: `eslint on ${files.length} changed file(s)`, why: lint.unverified });
    } else if (!lint.ok) {
      process.stderr.write(lint.output || '');
      failures.push('eslint reported errors in changed files.\n    fix: npx eslint --fix <file>  (or npm run lint:fix)');
    }
  }

  if (failures.length > 0) {
    console.error('\npre-push: blocked.');
    failures.forEach((f) => console.error(`  - ${f}`));
    printUnverified(unverified, true);
    console.error('  bypass (discouraged): git push --no-verify');
    return 1;
  }
  printUnverified(unverified);
  return 0;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err && err.stack ? err.stack : err);
      process.exit(1);
    });
}

module.exports = {
  parseRefLines,
  isSessionBranchPush,
  isNoCodePush,
  collectGuardFailures,
  changedLintableFiles,
  runHeavyPrerequisites,
  classifyFailure,
  lintOutcome,
};
