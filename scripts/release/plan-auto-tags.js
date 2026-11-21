'use strict';

/**
 * scripts/release/plan-auto-tags.js
 *
 * Decides which release tags a push to `main` produces, so nobody cuts tags by hand.
 *
 * - Every key ships when a commit touched its `changePaths` since its latest tag, and the
 *   bump comes from those commits: a breaking change is major, any `feat` is minor, anything
 *   else is patch. No key carries an authored version any more.
 * - `changePaths` is not `repoPaths`: `repoPaths` is what gets copied into the release repo,
 *   `changePaths` is what counts as a change. For `nn-mcp` the only repo path is the generated
 *   bundle, so deriving from it would mean the key never ships.
 * - Generated files and version mirrors inside a key are never a trigger: they belong to the
 *   write-back lane, and counting them makes the release cut itself again.
 * - `blueprints` always ships first: assemble-manifest takes each blueprint's pin from
 *   the previous manifest, so a new blueprint needs its own release before the others.
 *
 * CLI: `node scripts/release/plan-auto-tags.js` prints the plan as JSON and, under
 * GitHub Actions, writes it to $GITHUB_OUTPUT as `tags`.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { RELEASE_KEYS, RELEASE_TABLE } = require('./release-keys.js');
const { sharedArtifactLabel } = require('../lib/shared-artifacts.js');
const { parseSemver, compareSemver } = require('../lib/semver.js');

const ORDER = ['blueprints', 'skills', 'nn-mcp', 'nn-console'];

/**
 * The pathspecs whose commits count as a change of `key`: its distribution paths, minus the
 * generated files and version mirrors inside them. A commit that only moves one of those is
 * bookkeeping — `sync:versions` rewrites the `package.json` mirrors and the regen pass
 * rewrites the bundles — and counting it would cut the release that produced the rewrite,
 * so the lane would never reach a fixed point.
 *
 * @param {string} key
 * @param {string[]} [excluded] generated paths to leave out of the set
 * @returns {string[]}
 */
function pathspecsFor(key, excluded = RELEASE_TABLE[key].ignoredRepoPaths ?? []) {
  return [...RELEASE_TABLE[key].changePaths, ...excluded.map((p) => `:(exclude)${p}`)];
}

/**
 * Every tracked generated file inside `key`'s distribution paths, taken from the one list of
 * what counts as generated (`scripts/lib/shared-artifacts.js`), so a new generator under
 * `skills/` or `iNNfo/specs/` is excluded the moment it is tracked instead of cutting a
 * release nobody asked for.
 *
 * @param {string} key
 * @param {string} cwd
 * @returns {string[]}
 */
function generatedUnder(key, cwd) {
  const tracked = git(['ls-files', '--', ...RELEASE_TABLE[key].changePaths], cwd)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const explicit = RELEASE_TABLE[key].ignoredRepoPaths ?? [];
  return [...new Set([...explicit, ...tracked.filter((f) => sharedArtifactLabel(f) !== null)])].sort();
}

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
 * Every key derives from the commits that touched its change paths: a breaking change is
 * major, any `feat` is minor, anything else is patch. No key carries an authored version any
 * more — a hand bump travelled in 14 of 30 branches and collided with every other one, and it
 * was the only thing that could make a merge release nothing (#650, #670, #683).
 *
 * @param {object} input
 * @param {string[]} input.tags existing release tags
 * @param {Record<string, string[]>} input.commitsSinceTag messages touching each key since its latest tag
 * @returns {Array<{ key: string, version: string, tag: string }>}
 */
function planAutoTags({ tags, commitsSinceTag }) {
  const plan = [];
  for (const key of ORDER) {
    const latest = latestVersion(tags, key);
    const messages = commitsSinceTag[key] ?? [];
    if (messages.length === 0) continue;
    const version = latest ? bump(latest, bumpFor(messages)) : '0.1.0';
    plan.push({ key, version, tag: `${key}-v${version}` });
  }
  return plan;
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Reads the release tags and, per key, the commit messages that touch its change paths. */
function readRepoState(cwd) {
  const tags = git(['tag', '--list'], cwd)
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
  /** @type {Record<string, string[]>} */
  const commitsSinceTag = {};
  for (const key of RELEASE_KEYS) {
    const latest = latestVersion(tags, key);
    const range = latest ? [`${key}-v${latest}..HEAD`] : ['HEAD'];
    const out = git(
      ['log', '--no-merges', '--format=%B%x00', ...range, '--', ...pathspecsFor(key, generatedUnder(key, cwd))],
      cwd,
    );
    commitsSinceTag[key] = out.split('\0').map((m) => m.trim()).filter(Boolean);
  }
  return { tags, commitsSinceTag };
}

if (require.main === module) {
  const plan = planAutoTags(readRepoState(process.cwd()));
  const json = JSON.stringify(plan.map((p) => p.tag));
  console.log(json);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `tags=${json}\n`);
}

module.exports = {
  planAutoTags,
  bumpFor,
  readRepoState,
  latestVersion,
  pathspecsFor,
  generatedUnder,
};
