#!/usr/bin/env node
'use strict';

/**
 * Called by .githooks/pre-commit. When a commit stages code or samples, rewrite the
 * committed derived artifacts (scripts/lib/freshness-guards.js) and stage what they
 * changed, so a stale mirror never reaches a push or CI. About 2.5s in total.
 *
 * - The blueprint catalog is left out: it scans every release tag (~9s) and only
 *   changes with blueprint content; pre-push and CI still check it.
 * - Only files the generators made dirty are staged. A file that was already
 *   modified and unstaged before the run stays out of the commit.
 * - A generator that fails stops the commit with its regen command.
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { FRESHNESS_GUARDS } = require('./lib/freshness-guards.js');

const repoRoot = path.join(__dirname, '..');
const PRE_COMMIT_GUARDS = FRESHNESS_GUARDS.filter((g) => g.id !== 'blueprint-catalog');
const INPUTS = /^(iNNfo\/|scripts\/|skills\/|test\/_samples_nn\/)/;

/** @param {string[]} staged */
function touchesGeneratorInputs(staged) {
  return staged.some((p) => INPUTS.test(p));
}

/** Files dirty after the run that were not dirty before it. */
function newlyChanged(before, after) {
  const was = new Set(before);
  return after.filter((p) => !was.has(p));
}

function git(args) {
  const res = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

function main() {
  if (!touchesGeneratorInputs(git(['diff', '--cached', '--name-only']))) return 0;
  const before = git(['diff', '--name-only']);
  for (const g of PRE_COMMIT_GUARDS) {
    const res = spawnSync(process.execPath, [g.script], { cwd: repoRoot, encoding: 'utf8' });
    if (res.status !== 0) {
      process.stderr.write(`pre-commit: ${g.desc} failed.\n${res.stderr || res.stdout}\nFix it, or run: ${g.regen}\n`);
      return 1;
    }
  }
  const regenerated = newlyChanged(before, git(['diff', '--name-only']));
  if (regenerated.length > 0) {
    git(['add', '--', ...regenerated]);
    console.log(`pre-commit: regenerated and staged ${regenerated.join(', ')}`);
  }
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { touchesGeneratorInputs, newlyChanged, PRE_COMMIT_GUARDS };
