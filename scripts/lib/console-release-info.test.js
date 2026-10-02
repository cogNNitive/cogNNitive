#!/usr/bin/env node

/**
 * scripts/lib/console-release-info.test.js
 *
 * Unit tests for the console release-info derivation
 * (scripts/lib/console-release-info.js): the bundle version and CDN URL must
 * come from `iNNfo/specs/bluepriNNts/console/package.json`. Uses a disposable
 * fixture in a temp dir — never the repo's real file.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getConsoleReleaseInfo } = require('./console-release-info.js');

function makeRepoWithConsolePackage(version) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-release-info-'));
  const pkgDir = path.join(dir, 'iNNfo', 'specs', 'bluepriNNts', 'console');
  fs.mkdirSync(pkgDir, { recursive: true });
  if (version !== undefined) {
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@cognnitive/innfo-console', version, private: true }, null, 2),
      'utf8'
    );
  }
  return dir;
}

function main() {
  console.log('Running console-release-info unit tests...');

  // 1. Derives version and CDN URL matching the console package.json.
  {
    const dir = makeRepoWithConsolePackage('0.2.0');
    try {
      const info = getConsoleReleaseInfo(dir);
      assert.strictEqual(info.version, '0.2.0');
      assert.strictEqual(info.cdnRef, 'innfo-console-v0.2.0');
      assert.strictEqual(
        info.cdnUrl,
        'https://cdn.jsdelivr.net/gh/cogNNitive/cogNNitive-web@innfo-console-v0.2.0/iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js',
      );
      console.log('✔ Derives version and CDN URL from console package.json');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 2. A bumped package.json changes both derived values.
  {
    const dir = makeRepoWithConsolePackage('0.3.0');
    try {
      const info = getConsoleReleaseInfo(dir);
      assert.strictEqual(info.version, '0.3.0');
      assert.match(info.cdnUrl, /innfo-console-v0\.3\.0/);
      console.log('✔ Bumped package.json is reflected without code changes');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 3. Missing package.json throws instead of silently defaulting.
  {
    const dir = makeRepoWithConsolePackage(undefined);
    try {
      assert.throws(() => getConsoleReleaseInfo(dir), /package\.json/);
      console.log('✔ Missing package.json throws');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log('All console-release-info unit tests passed successfully!');
}

main();
