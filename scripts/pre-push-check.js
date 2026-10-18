#!/usr/bin/env node
'use strict';

/**
 * Local push gate (called by .githooks/pre-push). Runs the checks that CI would
 * otherwise be the first to run:
 *   1. the cheap derived-artifact freshness guards (same list verify.js uses),
 *   2. eslint, scoped to files changed against the integration base.
 * Each failure prints the exact command that fixes it. Exit code 1 on failure.
 */

const { spawnSync, execFileSync } = require('child_process');
const path = require('path');
const { FRESHNESS_GUARDS } = require('./lib/freshness-guards.js');

const repoRoot = path.join(__dirname, '..');
const LINTABLE = /^(iNNfo|scripts)\/.*\.(?:[cm]?js|ts|tsx)$/;
const BASES = ['origin/dev', 'origin/main'];

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** The sha being pushed (hook stdin local_sha, passed as argv[2]); HEAD when absent or all zeros. */
const pushedSha = /^[0-9a-f]{40}$/.test(process.argv[2] || '') && !/^0+$/.test(process.argv[2]) ? process.argv[2] : 'HEAD';

/** @returns {string[]} lintable files changed in the pushed ref since the merge-base with the integration branch. */
function changedLintableFiles() {
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

function main() {
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

  for (const g of FRESHNESS_GUARDS) {
    const res = spawnSync(process.execPath, [g.script, ...g.args], { cwd: repoRoot, encoding: 'utf8' });
    if (res.status !== 0) {
      failures.push(`${g.desc} is stale.\n    fix: npm run regen   (all generators; or just: ${g.regen}) then commit the result`);
      process.stderr.write((res.stdout || '') + (res.stderr || ''));
    }
  }
  console.log(`pre-push: ${FRESHNESS_GUARDS.length} freshness guards in ${Date.now() - t0}ms`);

  const files = changedLintableFiles();
  if (files.length > 0) {
    const t1 = Date.now();
    const eslint = path.join(repoRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
    const res = spawnSync(process.execPath, [eslint, '--no-warn-ignored', '--quiet', ...files], { cwd: repoRoot, stdio: 'inherit' });
    console.log(`pre-push: eslint on ${files.length} changed file(s) in ${Date.now() - t1}ms`);
    if (res.status !== 0) failures.push('eslint reported errors in changed files.\n    fix: npx eslint --fix <file>  (or npm run lint:fix)');
  }

  if (failures.length > 0) {
    console.error('\npre-push: blocked.');
    failures.forEach((f) => console.error(`  - ${f}`));
    console.error('  bypass (discouraged): git push --no-verify');
    process.exit(1);
  }
}

main();
