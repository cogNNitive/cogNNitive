'use strict';

/**
 * scripts/lib/regen-gate.js
 *
 * The derived-artifact gate behind `npm run check:regen` (`node scripts/regen.js --check`).
 *
 * `npm run regen` rewrites every committed derived artifact from its source. This module
 * answers the only question that matters afterwards: did that pass move a tracked path?
 * A clean pass means the tree reproduces itself; a non-empty diff means a committed
 * artifact no longer follows from its source, which is exactly the drift the twelve
 * per-artifact freshness steps in `scripts/verify.js` used to check one at a time.
 *
 * Why a git diff instead of a per-artifact comparison: the comparison needs an entry per
 * artifact, and every artifact somebody forgot to add was invisible. The diff needs none.
 *
 * The judgement is `git diff --name-only HEAD` (tracked paths only) so an untracked
 * scratch file never reddens the gate, minus the artifacts in `REGEN_EXCLUDED_PATHS`
 * whose generator encodes state a byte diff cannot judge.
 */

const { execFileSync } = require('node:child_process');

/**
 * Committed artifacts the byte diff must not judge, each with the reason.
 *
 * `release_tag` is read from the `blueprints-v*` git tags: the same catalog content
 * renders different bytes under a different tag set, which is why
 * `blueprint-catalog.mjs --check` compares it with that field normalised away and
 * `pre-commit-regen.js` has always left the catalog to a human. Its freshness step stays
 * in `scripts/verify.js`; this gate regenerates it in write mode and ignores it in check
 * mode.
 *
 * @type {Array<{ path: string, reason: string }>}
 */
const REGEN_EXCLUDED_PATHS = [
  {
    path: 'iNNfo/specs/bluepriNNts/catalog.json',
    reason:
      'release_tag comes from the blueprints-v* git tags, so identical content renders different bytes ' +
      'in a different tag set; blueprint-catalog --check compares it with release_tag normalised away',
  },
];

/**
 * Reads the mode out of the command line. `--check` means "run the pass, then compare";
 * anything else (including no arguments) means "write the artifacts", which is what
 * `npm run regen` does.
 *
 * @param {string[]} argv - arguments after the script name.
 * @returns {'write' | 'check'}
 */
function parseRegenMode(argv) {
  return argv.includes('--check') ? 'check' : 'write';
}

/**
 * Runs one git command in `root` and returns its stdout.
 * @param {string} root
 * @param {string[]} args
 * @returns {{ ok: true, stdout: string } | { ok: false, error: string }}
 */
function git(root, args) {
  try {
    return {
      ok: true,
      stdout: execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    };
  } catch (err) {
    const output = `${(err.stdout || '') + (err.stderr || '')}`.trim() || err.message || String(err);
    return { ok: false, error: output };
  }
}

/**
 * The tracked paths the last regen pass moved, oldest path first, with the release-state
 * artifacts removed. Untracked files are ignored on purpose: the gate compares committed
 * content, so a scratch file somebody left in the tree is not drift.
 *
 * @param {{ root: string, excluded?: typeof REGEN_EXCLUDED_PATHS }} options
 * @returns {{ ok: true, paths: string[] } | { ok: false, error: string }}
 */
function listChangedPaths({ root, excluded = REGEN_EXCLUDED_PATHS }) {
  const res = git(root, ['diff', '--name-only', 'HEAD']);
  if (!res.ok) {
    return {
      ok: false,
      error: `could not diff the working tree against HEAD (${root}): ${res.error}`,
    };
  }
  const ignored = new Set(excluded.map((entry) => entry.path));
  const paths = res.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !ignored.has(line));
  return { ok: true, paths: [...new Set(paths)].sort() };
}

/**
 * The failure text: what moved, how many, and the one command that regenerates it.
 * @param {string[]} paths
 * @returns {string}
 */
function formatFailure(paths) {
  return [
    `regen: the pass moved ${paths.length} path(s) that were clean before it ran, so the`,
    'committed artifacts no longer reproduce from their sources:',
    ...paths.map((p) => `  - ${p}`),
    'fix: npm run regen && commit the regenerated files',
    '     (or revert the source change that moved them before committing)',
  ].join('\n');
}

/**
 * Runs the pass (when one is supplied) and reports the paths the pass itself moved.
 *
 * The comparison is a subtraction, not a single diff: the tree is read before and after
 * the pass and only the *newly* dirty tracked paths count. That keeps the command usable
 * in a worktree that already holds the author's edits — `npm run regen` rewrites their
 * artifacts with their own source changes — while staying exact in CI, where the checkout
 * is clean and every path the pass touches shows up.
 *
 * @param {{
 *   root: string,
 *   runPass?: null | (() => { status: number, output?: string }),
 *   listChanged?: typeof listChangedPaths,
 * }} options - `runPass` is injected by callers that own the pass (scripts/regen.js) and
 *   by tests; `listChanged` is injectable so the comparison can be exercised without git.
 * @returns {{ ok: boolean, paths: string[], message: string }}
 */
function checkRegen({ root, runPass = null, listChanged = listChangedPaths }) {
  const before = listChanged({ root });
  if (!before.ok) {
    return { ok: false, paths: [], message: `regen: ${before.error}\nfix: run this inside the git work tree` };
  }
  const alreadyDirty = new Set(before.paths);

  let pass = { status: 0, output: '' };
  if (runPass) pass = runPass();
  if (pass.status !== 0) {
    return {
      ok: false,
      paths: [],
      message: [
        'regen: the regeneration pass failed, so nothing could be compared.',
        (pass.output || '').trim(),
        'fix: npm run regen (the failing generator is named above), then commit the result',
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  const after = listChanged({ root });
  if (!after.ok) {
    return { ok: false, paths: [], message: `regen: ${after.error}\nfix: run this inside the git work tree` };
  }
  const moved = after.paths.filter((p) => !alreadyDirty.has(p));
  if (moved.length > 0) {
    return { ok: false, paths: moved, message: formatFailure(moved) };
  }
  const leading = alreadyDirty.size > 0 ? ` (${alreadyDirty.size} path(s) were already modified and left alone)` : '';
  return {
    ok: true,
    paths: [],
    message: `regen: clean — every committed derived artifact reproduces from its source (nothing moved)${leading}.`,
  };
}

module.exports = {
  REGEN_EXCLUDED_PATHS,
  parseRegenMode,
  listChangedPaths,
  formatFailure,
  checkRegen,
};
