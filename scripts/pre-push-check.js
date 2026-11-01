#!/usr/bin/env node
'use strict';

/**
 * Local push gate (called by .githooks/pre-push). Owns the whole pre-push pipeline,
 * fed by git's stdin ref lines (`<local_ref> <local_sha> <remote_ref> <remote_sha>`):
 *   0. fast-path — when every pushed branch commit is a `wip:` checkpoint on
 *      `refs/heads/session/*`, skip the heavy build/typecheck/freshness pipeline
 *      entirely (design D5).
 *   1. heavy prerequisites — `npm run typecheck` and the docs-derived-facts check
 *      (after `build:dist`).
 *   2. FRESHNESS_GUARDS run concurrently via `Promise.all`.
 *   3. eslint, scoped to files changed against the integration base.
 * Each failure prints the exact command that fixes it. Exit code 1 on failure.
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
const BASES =['origin/dev', 'origin/main'];
const ZERO = /^0+$/;

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
 * True when every non-deletion push targets `refs/heads/session/*` and every commit
 * in `<remote_sha>..<local_sha>` has a subject starting with `wip:`. A brand-new
 * branch (all-zero remote sha) never qualifies: there is no upstream range to prove.
 * @param {ReturnType<typeof parseRefLines>} refLines
 * @param {string} [cwd]
 * @returns {boolean}
 */
function isWipFastPath(refLines, cwd = repoRoot) {
  const pushes = refLines.filter((l) => l.remoteRef.startsWith('refs/heads/') && !ZERO.test(l.localSha));
  if (pushes.length === 0) return false;
  return pushes.every((l) => {
    if (!l.remoteRef.startsWith('refs/heads/session/')) return false;
    if (ZERO.test(l.remoteSha)) return false;
    const subjects = (gitIn(cwd, 'log', '--format=%s', `${l.remoteSha}..${l.localSha}`) || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return subjects.length > 0 && subjects.every((s) => s.startsWith('wip:'));
  });
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
  const eslint = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
  const res = spawnSync(process.execPath, [eslint, '--no-warn-ignored', '--quiet', ...files], { cwd: repoRoot, stdio: 'inherit' });
  return res.status === 0;
}

/** Typecheck + docs-derived-facts prerequisites. Returns failure messages. */
function runHeavyPrerequisites() {
  if (process.env.NN_PRE_PUSH_SKIP_HEAVY) return [];
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
  return failures;
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

  if (isWipFastPath(refLines)) {
    console.log('pre-push: wip: checkpoint push on session/* — fast-path (skipping typecheck, docs build and freshness guards).');
    return 0;
  }

  if (isNoCodePush(refLines)) {
    console.log('pre-push: no code changed (openspec/ only) — skipping typecheck, docs build and freshness guards.');
    return 0;
  }

  const failures = [];
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

  failures.push(...runHeavyPrerequisites());

  const guardFailures = await collectGuardFailures();
  for (const { guard, res } of guardFailures) {
    failures.push(`${guard.desc} is stale.\n    fix: npm run regen   (all generators; or just: ${guard.regen}) then commit the result`);
    process.stderr.write((res.stdout || '') + (res.stderr || ''));
  }
  console.log(`pre-push: ${FRESHNESS_GUARDS.length} freshness guards in ${Date.now() - t0}ms`);

  const files = changedLintableFiles(branchPushes[0].localSha);
  if (files.length > 0) {
    const t1 = Date.now();
    const ok = runLint(files);
    console.log(`pre-push: eslint on ${files.length} changed file(s) in ${Date.now() - t1}ms`);
    if (!ok) failures.push('eslint reported errors in changed files.\n    fix: npx eslint --fix <file>  (or npm run lint:fix)');
  }

  if (failures.length > 0) {
    console.error('\npre-push: blocked.');
    failures.forEach((f) => console.error(`  - ${f}`));
    console.error('  bypass (discouraged): git push --no-verify');
    return 1;
  }
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
  isWipFastPath,
  isNoCodePush,
  collectGuardFailures,
  changedLintableFiles,
  runHeavyPrerequisites,
};
