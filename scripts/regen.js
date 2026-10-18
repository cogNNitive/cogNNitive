#!/usr/bin/env node
'use strict';

/**
 * `npm run regen`: rewrites every committed derived artifact in one command, so
 * a stale-mirror push failure (or CI "... Fresh" / "Docs-Derived Facts" guard)
 * is fixed by a single step instead of hunting for the right generator.
 *
 * Order: build innfo-core and the innfo-mcp dist (generators read them), run each
 * freshness-guard generator (scripts/lib/freshness-guards.js), then the docs
 * facts. The generators are repeated until the --check guards pass (max 3
 * passes), because some generated files feed others.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const { FRESHNESS_GUARDS } = require('./lib/freshness-guards.js');

const repoRoot = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/** @returns {number} exit status */
function run(cmd, args, quiet = false) {
  const res = spawnSync(cmd, args, { cwd: repoRoot, stdio: quiet ? 'ignore' : 'inherit', shell: process.platform === 'win32' && cmd === npm });
  return res.status ?? 1;
}

function fail(what) {
  console.error(`regen: ${what} failed.`);
  process.exit(1);
}

if (run(npm, ['--workspace=@cognnitive/innfo-core', 'run', 'build']) !== 0) fail('innfo-core build');
if (run(npm, ['--workspace=@cognnitive/innfo-mcp', 'run', 'build:dist']) !== 0) fail('innfo-mcp build:dist');

const generate = [
  ...FRESHNESS_GUARDS.map((g) => [g.script]),
  ['scripts/generate-docs-facts.mjs'],
];
const check = [
  ...FRESHNESS_GUARDS.map((g) => [g.script, ...g.args]),
  ['scripts/generate-docs-facts.mjs', '--check'],
];

for (let pass = 1; pass <= 3; pass++) {
  for (const args of generate) {
    if (run(process.execPath, args, true) !== 0) fail(args[0]);
  }
  const stale = check.filter((args) => run(process.execPath, args, true) !== 0);
  if (stale.length === 0) {
    console.log(`regen: all derived artifacts fresh (pass ${pass}). Review with: git status --short`);
    process.exit(0);
  }
  console.log(`regen: pass ${pass} left ${stale.length} stale: ${stale.map((a) => a[0]).join(', ')}`);
}
fail('convergence (still stale after 3 passes)');
