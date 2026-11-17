'use strict';

/**
 * scripts/release/check-authored-bump.js
 *
 * Pull-request gate for the authored release keys (`nn-mcp`, `nn-console`). Their
 * tag is cut only when their package.json carries a version with no tag yet
 * (`plan-auto-tags.js`), so a PR that changes their release paths without bumping
 * that version merges into `main` and releases nothing. That is how #650 missed
 * nn-console 0.37.2 and #670/#683 missed 0.37.4: main held the fixes, every
 * consumer kept installing the old tag.
 *
 * Usage: node scripts/release/check-authored-bump.js --base <ref>
 * Compares `<ref>...HEAD`; needs the release tags locally (CI: fetch-depth 0).
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { RELEASE_TABLE } = require('./release-keys.js');
const { latestVersion, AUTHORED_PACKAGES } = require('./plan-auto-tags.js');
const { compareSemver } = require('../lib/semver.js');

/** True when `file` is `root` itself or lies under it. */
function isUnder(file, root) {
  return file === root || file.startsWith(`${root}/`);
}

/**
 * @param {object} input
 * @param {string[]} input.changedPaths repo-relative paths the PR changes
 * @param {string[]} input.tags existing release tags
 * @param {Record<string, string>} input.authored package.json version per authored key, at HEAD
 * @returns {Array<{ key: string, version: string, latest: string, packageJson: string, paths: string[] }>}
 */
function checkAuthoredBumps({ changedPaths, tags, authored }) {
  const violations = [];
  for (const [key, packageJson] of Object.entries(AUTHORED_PACKAGES)) {
    const roots = [...RELEASE_TABLE[key].repoPaths, packageJson];
    const paths = changedPaths.filter((file) => roots.some((root) => isUnder(file, root)));
    if (paths.length === 0) continue;
    const latest = latestVersion(tags, key);
    const version = authored[key];
    if (!latest || !version) continue;
    if (compareSemver(version, latest) > 0) continue;
    violations.push({ key, version, latest, packageJson, paths });
  }
  return violations;
}

/** @param {{ key: string, version: string, latest: string, packageJson: string, paths: string[] }} v */
function describe(v) {
  const shown = v.paths.slice(0, 5).join(', ') + (v.paths.length > 5 ? `, +${v.paths.length - 5} more` : '');
  return (
    `${v.key}: this PR changes ${shown}, but ${v.packageJson} still declares ${v.version} ` +
    `and ${v.key}-v${v.latest} is already released. Bump that version so the merge releases the change.`
  );
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function main(argv, cwd) {
  const at = argv.indexOf('--base');
  const base = at >= 0 ? argv[at + 1] : null;
  if (!base) {
    console.error('Usage: node scripts/release/check-authored-bump.js --base <ref>');
    return 2;
  }
  const changedPaths = git(['diff', '--name-only', `${base}...HEAD`], cwd)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const tags = git(['tag', '--list'], cwd).split('\n').map((t) => t.trim()).filter(Boolean);
  /** @type {Record<string, string>} */
  const authored = {};
  for (const [key, rel] of Object.entries(AUTHORED_PACKAGES)) {
    const file = path.join(cwd, rel);
    if (fs.existsSync(file)) authored[key] = JSON.parse(fs.readFileSync(file, 'utf8')).version;
  }
  const violations = checkAuthoredBumps({ changedPaths, tags, authored });
  for (const v of violations) console.error(describe(v));
  if (violations.length === 0) console.log('Authored release keys: every changed key carries an unreleased version.');
  return violations.length === 0 ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2), process.cwd());

module.exports = { checkAuthoredBumps, describe, main };
