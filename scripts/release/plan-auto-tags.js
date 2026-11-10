'use strict';

/**
 * scripts/release/plan-auto-tags.js
 *
 * Decides which release tags a push to `main` produces, so nobody cuts tags by hand.
 *
 * - Authored keys (`nn-mcp`, `nn-console`) ship when their package.json version has no
 *   tag yet. Bumping that version (plus `npm run sync:versions` and the bundles) is the
 *   only release decision left to a human.
 * - Content keys (`skills`, `blueprints`) ship when a commit touched their paths since
 *   their latest tag. The bump comes from those commits: a breaking change is major,
 *   any `feat` is minor, anything else is patch.
 * - `blueprints` always ships first: assemble-manifest takes each blueprint's pin from
 *   the previous manifest, so a new blueprint needs its own release before the others.
 *
 * CLI: `node scripts/release/plan-auto-tags.js` prints the plan as JSON and, under
 * GitHub Actions, writes it to $GITHUB_OUTPUT as `tags`.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { RELEASE_KEYS, RELEASE_TABLE } = require('./release-keys.js');
const { parseSemver, compareSemver } = require('../lib/semver.js');

const ORDER = ['blueprints', 'skills', 'nn-mcp', 'nn-console'];
const AUTHORED_PACKAGES = {
  'nn-mcp': 'iNNfo/packages/nn-mcp/package.json',
  'nn-console': 'iNNfo/specs/bluepriNNts/console/package.json',
};

/** @param {string[]} messages full commit messages @returns {'major'|'minor'|'patch'} */
function bumpFor(messages) {
  if (messages.some((m) => /^[a-z]+(\([^)]*\))?!:/.test(m) || /^BREAKING[ -]CHANGE:/m.test(m))) {
    return 'major';
  }
  if (messages.some((m) => /^feat(\([^)]*\))?:/.test(m))) return 'minor';
  return 'patch';
}

function bump(version, kind) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Highest released version of `key`, or null. */
function latestVersion(tags, key) {
  const prefix = `${key}-v`;
  return tags
    .filter((t) => t.startsWith(prefix))
    .map((t) => t.slice(prefix.length))
    .filter((v) => parseSemver(v) !== null)
    .sort(compareSemver)
    .pop() ?? null;
}

/**
 * @param {object} input
 * @param {string[]} input.tags existing release tags
 * @param {Record<string, string>} input.authored package.json version per authored key
 * @param {Record<string, string[]>} input.commitsSinceTag messages touching each content key since its latest tag
 * @returns {Array<{ key: string, version: string, tag: string }>}
 */
function planAutoTags({ tags, authored, commitsSinceTag }) {
  const plan = [];
  for (const key of ORDER) {
    const latest = latestVersion(tags, key);
    let version = null;
    if (key in AUTHORED_PACKAGES) {
      const wanted = authored[key];
      if (!wanted) continue;
      if (latest && compareSemver(wanted, latest) < 0) {
        throw new Error(`${key} ${wanted} is below the released ${key}-v${latest}; bump package.json`);
      }
      if (wanted !== latest) version = wanted;
    } else {
      const messages = commitsSinceTag[key] ?? [];
      if (messages.length === 0) continue;
      version = latest ? bump(latest, bumpFor(messages)) : '0.1.0';
    }
    if (version) plan.push({ key, version, tag: `${key}-v${version}` });
  }
  return plan;
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Reads tags, authored versions and per-key commit messages from the repo at `cwd`. */
function readRepoState(cwd) {
  const tags = git(['tag', '--list'], cwd).split('\n').map((t) => t.trim()).filter(Boolean);
  const authored = {};
  for (const [key, rel] of Object.entries(AUTHORED_PACKAGES)) {
    const file = path.join(cwd, rel);
    if (fs.existsSync(file)) authored[key] = JSON.parse(fs.readFileSync(file, 'utf8')).version;
  }
  const commitsSinceTag = {};
  for (const key of RELEASE_KEYS) {
    if (key in AUTHORED_PACKAGES) continue;
    const latest = latestVersion(tags, key);
    const range = latest ? [`${key}-v${latest}..HEAD`] : ['HEAD'];
    const out = git(['log', '--no-merges', '--format=%B%x00', ...range, '--', ...RELEASE_TABLE[key].repoPaths], cwd);
    commitsSinceTag[key] = out.split('\0').map((m) => m.trim()).filter(Boolean);
  }
  return { tags, authored, commitsSinceTag };
}

if (require.main === module) {
  const plan = planAutoTags(readRepoState(process.cwd()));
  const json = JSON.stringify(plan.map((p) => p.tag));
  console.log(json);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `tags=${json}\n`);
}

module.exports = { planAutoTags, bumpFor, readRepoState };
