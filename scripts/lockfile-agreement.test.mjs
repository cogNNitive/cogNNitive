#!/usr/bin/env node
/**
 * scripts/lockfile-agreement.test.mjs
 *
 * The committed `package-lock.json` must agree with the workspace packages it
 * pins. A stale entry is not cosmetic: `npm ci` installs what the lockfile says,
 * so a drifted `bin` map or dependency range silently disagrees with the package
 * the workspace actually declares.
 *
 * Guards the `nn-prefix-rename` PR 1 first commit (regenerate the stale lockfile).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const lock = readJson('package-lock.json');

/** Lockfile entries that are workspace packages (a directory under iNNfo/packages). */
const workspaceDirs = Object.keys(lock.packages).filter((p) => /^iNNfo\/packages\/[^/]+$/.test(p));

assert.ok(workspaceDirs.length > 0, 'the lockfile pins at least one workspace package');

// 1. Each pinned workspace entry carries the package's real version.
for (const dir of workspaceDirs) {
  const pinned = lock.packages[dir];
  const manifest = readJson(path.join(dir, 'package.json'));
  assert.strictEqual(
    pinned.version,
    manifest.version,
    `${dir}: the lockfile pins version ${pinned.version} but package.json declares ${manifest.version}`,
  );
  console.log(`\u2714 ${dir}: lockfile version agrees with package.json`);
}

// 2. The lockfile's `bin` map equals the package's, so `npm ci` installs the same commands.
for (const dir of workspaceDirs) {
  const pinned = lock.packages[dir];
  const manifest = readJson(path.join(dir, 'package.json'));
  const normalize = (bin) => Object.fromEntries(
    Object.entries(bin || {})
      .map(([name, target]) => [name, target.replace(/^\.\//, '')])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  assert.deepStrictEqual(
    normalize(pinned.bin),
    normalize(manifest.bin),
    `${dir}: the lockfile bin map disagrees with package.json`,
  );
  console.log(`\u2714 ${dir}: lockfile bin map agrees with package.json`);
}

// 3. Every workspace-to-workspace dependency range matches the declared one.
for (const dir of workspaceDirs) {
  const pinned = lock.packages[dir];
  const manifest = readJson(path.join(dir, 'package.json'));
  const declared = Object.entries(manifest.dependencies || {}).filter(([name]) => name.startsWith('@cognnitive/'));
  for (const [name, range] of declared) {
    assert.strictEqual(
      (pinned.dependencies || {})[name],
      range,
      `${dir}: the lockfile records ${name}@${(pinned.dependencies || {})[name]} but package.json declares ${range}`,
    );
  }
  if (declared.length > 0) console.log(`\u2714 ${dir}: workspace dependency ranges agree with package.json`);
}
