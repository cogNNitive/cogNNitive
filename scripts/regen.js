#!/usr/bin/env node
'use strict';

/**
 * `npm run regen`: rewrites every committed derived artifact in one command, so a
 * stale-mirror push failure (or CI drift) is fixed by a single step instead of
 * hunting for the right generator.
 *
 * Order: build nn-core and the nn-mcp dist (generators read them), then run each
 * freshness-guard generator (scripts/lib/freshness-guards.js), the docs facts, and
 * the staged copies (catalog, manifest-next, the testlab console fixture). The docs
 * master document runs last, because it concatenates the pages the docs generators
 * just rewrote. The generators are repeated until the `--check` guards pass (max 3
 * passes), because some generated files feed others.
 *
 * `npm run check:regen` (`--check`): runs that same pass and then fails when it moved a
 * tracked path that was clean before it ran, which means the committed artifacts no
 * longer reproduce from their sources. That is the single gate the twelve per-artifact
 * freshness steps in `scripts/verify.js` were replaced by.
 *
 * One entry the diff cannot judge, by construction rather than by omission:
 *  - `test/fixtures/testlab/domaiNN_console.html` carries the export wall clock in
 *    `meta.generated`, so the pass restores the committed bytes when only the stamped
 *    fields moved (`withoutStamps`, shared with scripts/lib/console-fixture-freshness.js).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { FRESHNESS_GUARDS } = require('./lib/freshness-guards.js');
const { checkRegen, parseRegenMode } = require('./lib/regen-gate.js');
const { withoutStamps, FIXTURE_DOMAIN, CONSOLE_FILE } = require('./lib/console-fixture-freshness.js');

const repoRoot = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const mode = parseRegenMode(process.argv.slice(2));
const isCheck = mode === 'check';

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

/**
 * Exports the testlab console fixture, then puts the committed bytes back when the
 * only difference is a wall-clock stamp, so the pass is idempotent and the gate can
 * judge the fixture's content.
 * @returns {{ status: number, output: string }}
 */
function syncConsoleFixture() {
  const fixture = path.join(repoRoot, FIXTURE_DOMAIN.split('/').join(path.sep), CONSOLE_FILE);
  const before = fs.existsSync(fixture) ? fs.readFileSync(fixture, 'utf8') : null;
  const res = exec(process.execPath, ['scripts/export-console.mjs', FIXTURE_DOMAIN, '--domain', '--no-open'], true);
  if (res.status !== 0) return { status: 1, output: `regen: console fixture export failed.\n${res.output}` };
  if (before === null) return { status: 0, output: '' };
  const after = fs.readFileSync(fixture, 'utf8');
  // `meta.generated`, `citationsResolvedAt` and each swept file's `mtime` move on every
  // export and carry no content: the fixture's own freshness check masks them for the
  // same reason, and restamping here would dirty a 1.3 MB file on every run.
  if (withoutStamps(before) === withoutStamps(after)) fs.writeFileSync(fixture, before);
  return { status: 0, output: '' };
}

/** Staged copies of generated or authored sources that live in a second location. */
function syncCopies() {
  const catalogSrc = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json');
  const catalogDst = path.join(repoRoot, 'docs', 'innfo', 'blueprints', 'catalog.json');
  if (fs.existsSync(catalogSrc)) {
    fs.mkdirSync(path.dirname(catalogDst), { recursive: true });
    fs.copyFileSync(catalogSrc, catalogDst);
  }
  const manifestNextSrc = path.join(repoRoot, 'docs', 'use', 'manifest-next.md');
  const manifestNextDst = path.join(repoRoot, 'docs', 'update', 'manifest-next.md');
  if (fs.existsSync(manifestNextSrc)) {
    fs.mkdirSync(path.dirname(manifestNextDst), { recursive: true });
    fs.copyFileSync(manifestNextSrc, manifestNextDst);
  }
}

const guards = FRESHNESS_GUARDS;
const generate = [
  ...guards.map((g) => [g.script]),
  ['scripts/generate-docs-facts.mjs'],
  ['scripts/generate-vocabulary-doc.mjs'],
  ['scripts/generate-video-parameters-doc.mjs'],
  // Last: it concatenates the pages those two generators just rewrote.
  ['scripts/generate-docs-master.mjs'],
];
const check = [
  ...guards.map((g) => [g.script, ...g.args]),
  ['scripts/generate-docs-facts.mjs', '--check'],
  ['scripts/generate-vocabulary-doc.mjs', '--check'],
  ['scripts/generate-video-parameters-doc.mjs', '--check'],
  ['scripts/generate-docs-master.mjs', '--check'],
];

/**
 * One full pass: every generator, then every `--check`, repeated until they agree.
 * Returns the status instead of exiting so the gate can read the tree before it runs.
 * @returns {{ status: number, output: string }}
 */
function runPass() {
  for (let pass = 1; pass <= 3; pass++) {
    for (const args of generate) {
      const res = exec(process.execPath, args, true);
      if (res.status !== 0) return { status: 1, output: `regen: ${args[0]} failed.\n${res.output}` };
    }
    const results = check.map((args) => ({ args, ...exec(process.execPath, args, true) }));
    const stale = results.filter((r) => r.status !== 0);
    if (stale.length === 0) {
      syncCopies();
      const fixture = syncConsoleFixture();
      if (fixture.status !== 0) return fixture;
      return { status: 0, output: `regen: all derived artifacts fresh (pass ${pass}).` };
    }
    const details = stale.map((r) => `--- ${r.args[0]}\n${r.output.trim()}`).join('\n');
    if (pass === 3) {
      return { status: 1, output: `regen: 3 stale after 3 passes:\n${details}` };
    }
    console.log(`regen: pass ${pass} left ${stale.length} stale:\n${details}`);
  }
  return { status: 1, output: 'regen: convergence (still stale after 3 passes).' };
}

if (run(npm, ['--workspace=@cognnitive/nn-core', 'run', 'build']) !== 0) fail('nn-core build');
if (run(npm, ['--workspace=@cognnitive/nn-mcp', 'run', 'build:dist']) !== 0) fail('nn-mcp build:dist');

if (isCheck) {
  console.log('regen: regenerating every derived artifact, then diffing against HEAD...');
  const gate = checkRegen({
    root: repoRoot,
    runPass,
    tolerant: process.argv.includes('--tolerant'),
  });
  console.log(gate.message);
  process.exit(gate.ok ? 0 : 1);
}

const pass = runPass();
if (pass.status !== 0) {
  console.error(pass.output);
  process.exit(1);
}
console.log(`${pass.output} Review with: git status --short`);
