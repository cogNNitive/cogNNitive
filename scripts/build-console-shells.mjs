#!/usr/bin/env node
/**
 * scripts/build-console-shells.mjs
 *
 * Regenerates the *generated* console shells: every shell marked with the
 * `nn:console-shell` block has the `@innfo-console-v<version>` token in its
 * jsDelivr script tag rewritten to the current console release version (derived
 * from `iNNfo/specs/bluepriNNts/console/package.json`). The rewrite is surgical —
 * only the version token changes; each shell keeps its own CDN path.
 *
 * Run this on every console release. The shell guard
 * (lib/console-shell-guard.js) fails a generated shell whose pin ≠ the package
 * version, so a forgotten regenerate reddens verify.
 *
 * Usage:
 *   node scripts/build-console-shells.mjs          # write
 *   node scripts/build-console-shells.mjs --check  # verify freshness (exit 1 on drift)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { discoverGeneratedShells, syncShellContent, getGeneratedPin, expectedVersion } =
  require('./lib/console-shell-sync.js');

const check = process.argv.includes('--check');
const shells = discoverGeneratedShells(REPO_ROOT);
const version = expectedVersion(REPO_ROOT);

let changed = 0;
const stale = [];
for (const rel of shells) {
  const abs = path.join(REPO_ROOT, rel);
  const before = fs.readFileSync(abs, 'utf8');
  const after = syncShellContent(before, version);
  if (after == null || after === before) continue;
  if (check) stale.push(`${rel} (pin ${getGeneratedPin(before) ?? 'none'} ≠ v${version})`);
  else {
    fs.writeFileSync(abs, after, 'utf8');
    changed++;
  }
}

if (check) {
  if (stale.length > 0) {
    console.error(`console-shells: DRIFT — ${stale.length} generated shell(s) stale (expected v${version}):`);
    for (const s of stale) console.error(`  - ${s}`);
    console.error('Re-run without --check to regenerate.');
    process.exit(1);
  }
  console.log(`console-shells: OK — ${shells.length} generated shell(s) pinned to v${version}.`);
} else {
  console.log(`console-shells: wrote ${changed} of ${shells.length} generated shell(s) (pin v${version}).`);
}
