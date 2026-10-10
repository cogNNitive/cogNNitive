/**
 * Keeps the four lists that describe the innfo-console release surface in step:
 *   manifest/source.yaml console_assets  (what is pinned and installed)
 *   RELEASE_TABLE['innfo-console'].repoPaths  (what a console release copies)
 *   DISTRIBUTION_PATHS  (what reaches cogNNitive-web)
 *   SUBSYSTEM_PATHS['innfo-console']  (what the freshness report watches)
 * Adding a console asset to one and forgetting another ships a release that is
 * missing a file, or a freshness report that never notices it changed.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseFocusedYaml } = require('../lib/yaml-parser.js');
const { RELEASE_TABLE, DISTRIBUTION_PATHS } = require('./release-keys.js');
const { SUBSYSTEM_PATHS } = require('../freshness.js');

const repoRoot = path.resolve(__dirname, '..', '..');
const assetFiles = parseFocusedYaml(fs.readFileSync(path.join(repoRoot, 'manifest', 'source.yaml'), 'utf8'))
  .console_assets.map((a) => a.file);

const covers = (entry, file) => {
  const dir = entry.replace(/\/+$/, '');
  return file === dir || file.startsWith(`${dir}/`);
};

function assertSameSurface(label, entries) {
  for (const file of assetFiles) {
    assert.ok(
      entries.some((e) => covers(e, file)),
      `${label} does not cover console asset ${file}`
    );
  }
  for (const entry of entries) {
    assert.ok(
      assetFiles.some((f) => covers(entry, f)),
      `${label} lists ${entry}, which holds no console asset`
    );
  }
}

test('console_assets is non-empty and every file exists', () => {
  assert.ok(assetFiles.length > 0);
  for (const file of assetFiles) assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} is missing`);
});

test('console_assets basenames are unique (the installer places them flat)', () => {
  const names = assetFiles.map((f) => path.basename(f));
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual(dupes, []);
});

test('RELEASE_TABLE innfo-console repoPaths match the console_assets files', () => {
  assertSameSurface('RELEASE_TABLE[innfo-console].repoPaths', RELEASE_TABLE['innfo-console'].repoPaths);
});

test('DISTRIBUTION_PATHS covers every console asset', () => {
  for (const file of assetFiles) {
    assert.ok(
      DISTRIBUTION_PATHS.some((e) => covers(e, file)),
      `DISTRIBUTION_PATHS does not cover console asset ${file}`
    );
  }
});

test('every innfo-console repoPath is distributed', () => {
  for (const entry of RELEASE_TABLE['innfo-console'].repoPaths) {
    assert.ok(
      DISTRIBUTION_PATHS.some((d) => covers(d, entry)),
      `DISTRIBUTION_PATHS does not cover repoPath ${entry}`
    );
  }
});

test('freshness SUBSYSTEM_PATHS innfo-console matches the console_assets files', () => {
  assertSameSurface('SUBSYSTEM_PATHS[innfo-console]', SUBSYSTEM_PATHS['innfo-console']);
});
