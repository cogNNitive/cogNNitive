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

/** Runs a command; `quiet` captures its output instead of inheriting it. */
function exec(cmd, args, quiet = false) {
  const res = spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit', shell: process.platform === 'win32' && cmd === npm });
  return { status: res.status ?? 1, output: (res.stdout || '') + (res.stderr || '') + (res.error ? String(res.error) : '') };
}

/** @returns {number} exit status */
function run(cmd, args) {
  return exec(cmd, args).status;
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
    const res = exec(process.execPath, args, true);
    if (res.status !== 0) {
      console.error(res.output);
      fail(args[0]);
    }
  }
  const results = check.map((args) => ({ args, ...exec(process.execPath, args, true) }));
  const stale = results.filter((r) => r.status !== 0);
  if (stale.length === 0) {
    // Keep testlab domain console fixture synchronized with fresh console bundle
    exec(process.execPath, ['scripts/export-console.mjs', '--domain', '--no-open'], true);
    console.log(`regen: all derived artifacts fresh (pass ${pass}). Review with: git status --short`);
    process.exit(0);
  }
  console.log(`regen: pass ${pass} left ${stale.length} stale:`);
  for (const r of stale) console.log(`--- ${r.args[0]}
${r.output.trim()}`);
}
fail('convergence (still stale after 3 passes)');
