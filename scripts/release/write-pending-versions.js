#!/usr/bin/env node
'use strict';

/**
 * scripts/release/write-pending-versions.js
 *
 * Writes the version the next push will cut into the `package.json` of every package key, on
 * `main`, in the same commit that regenerates the derived artifacts. It runs BEFORE `auto-tag`
 * plans, because `version-agreement` refuses to publish a tag that does not match the
 * package.json of the tree it ships, and because the release copies the tag's tree.
 *
 * The version itself is not chosen here: `plan-auto-tags.js` derives it from the commits that
 * touched the key's `changePaths`. This script only materializes it, so a change branch never
 * has to touch a version — the hand bump used to travel in 14 of 30 branches.
 *
 * `npm run sync:versions` must run afterwards: it propagates the `nn-mcp` version into
 * `nn-core` and the dependency range, and the regeneration pass rebuilds the bundles that
 * embed it.
 *
 * Usage: node scripts/release/write-pending-versions.js [--root <dir>]
 */

const fs = require('node:fs');
const path = require('node:path');
const { planAutoTags, readRepoState } = require('./plan-auto-tags.js');

/** The package keys and the file that carries their version. */
const PACKAGE_JSON = {
  'nn-mcp': 'iNNfo/packages/nn-mcp/package.json',
  'nn-console': 'iNNfo/specs/bluepriNNts/console/package.json',
};

/**
 * Plans the next release and writes each planned package version into its `package.json`.
 *
 * @param {string} root repository root
 * @returns {{ plan: Array<{ key: string, version: string, tag: string }>, written: Array<{ key: string, version: string, file: string }> }}
 */
function writePendingVersions(root) {
  const plan = planAutoTags(readRepoState(root));
  const written = [];
  for (const { key, version } of plan) {
    const rel = PACKAGE_JSON[key];
    if (!rel) continue;
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pkg.version === version) continue;
    pkg.version = version;
    fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    written.push({ key, version, file: rel });
  }
  return { plan, written };
}

if (require.main === module) {
  const at = process.argv.indexOf('--root');
  const root = at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : process.cwd();
  const { plan, written } = writePendingVersions(root);
  if (plan.length === 0) console.log('write-pending-versions: nothing to release');
  for (const entry of plan) console.log(`write-pending-versions: planned ${entry.tag}`);
  for (const entry of written) {
    console.log(`write-pending-versions: wrote ${entry.key} ${entry.version} into ${entry.file}`);
  }
}

module.exports = { writePendingVersions, PACKAGE_JSON };
