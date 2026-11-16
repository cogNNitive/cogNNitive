#!/usr/bin/env node
/**
 * scripts/build-mcp-bundle.test.mjs
 *
 * Guards the freshness check for the committed MCP CDN bundle: the artifact must
 * announce the version in `package.json`, because `stage-mcp-bundle.mjs` copies
 * it byte-for-byte into the release.
 *
 * It also pins the reproducibility contract (backlog item
 * `nn-mcp-bundle-reproducibility`): the committed bundle must BE a fresh build of
 * this tree, byte for byte, so `--check` catches a divergent artifact that still
 * announces the right version — the case that shipped a bundle which could not
 * report a new status.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLE_REL, buildMcpBundle, checkMcpBundle, readEmbeddedVersion } from './build-mcp-bundle.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NN_MCP_DIR = path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-mcp');
const NN_CORE_DIR = path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core');

function makeRepo(bundleText, version = '1.2.3') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bundle-freshness-'));
  const mcpDir = path.join(root, 'iNNfo', 'packages', 'nn-mcp');
  fs.mkdirSync(path.join(mcpDir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(mcpDir, 'package.json'), JSON.stringify({ version }), 'utf8');
  if (bundleText !== null) {
    fs.writeFileSync(path.join(mcpDir, 'bin', 'nn-mcp.bundle.js'), bundleText);
  }
  return root;
}

const announce = (version) =>
  `var s=await server({name:"nn-mcp",version:"${version}"},{capabilities:{tools:{}}});`;

// 1. Reads the version out of minified text, and only from the server announcement.
{
  assert.strictEqual(readEmbeddedVersion(announce('9.9.9')), '9.9.9');
  assert.strictEqual(readEmbeddedVersion('const version = "9.9.9"'), null, 'no announcement, no match');
}

// 2. The shipped 0.37.0 defect: package.json moved on, the bytes did not.
{
  const repo = makeRepo(announce('0.36.0'), '0.37.1');
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.expected, '0.37.1');
  assert.strictEqual(res.embedded, '0.36.0');
}

// 3. A bundle with no announcement cannot be verified, so it fails instead of passing blind.
{
  const repo = makeRepo('console.log("no server here")');
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /cannot be verified/);
}

// 4. A code-split bundle would break the single-file CDN install.
{
  const repo = makeRepo(`${announce('1.2.3')}\nimport {a} from "./chunk-ABC123.js";`);
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /code-split/);
}

// 5. A missing bundle is reported, not thrown.
{
  const repo = makeRepo(null);
  const res = checkMcpBundle({ repoRoot: repo });
  assert.strictEqual(res.ok, false);
  assert.match(res.error, /MCP bundle not found/);
}

/**
 * A complete project tree at whatever absolute path the caller names: the two
 * packages' SOURCES plus a link to the repository's installed dependencies, which
 * is all the bundle build reads. Two of these at different paths are how the
 * "the checkout path never reaches the artifact" rule is reproduced.
 */
function makeCheckout(name) {
  const root = path.join(scratch, name);
  const mcp = path.join(root, 'iNNfo', 'packages', 'nn-mcp');
  const core = path.join(root, 'iNNfo', 'packages', 'nn-core');

  fs.mkdirSync(path.join(mcp, 'bin'), { recursive: true });
  fs.cpSync(path.join(NN_MCP_DIR, 'src'), path.join(mcp, 'src'), { recursive: true });
  for (const file of ['package.json', 'tsup.config.ts', 'tsconfig.json']) {
    fs.copyFileSync(path.join(NN_MCP_DIR, file), path.join(mcp, file));
  }

  fs.mkdirSync(core, { recursive: true });
  fs.cpSync(path.join(NN_CORE_DIR, 'src'), path.join(core, 'src'), { recursive: true });
  fs.copyFileSync(path.join(NN_CORE_DIR, 'package.json'), path.join(core, 'package.json'));

  fs.symlinkSync(
    path.join(REPO_ROOT, 'node_modules'),
    path.join(root, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  scratchRoots.push(root);
  return root;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bundle-repro-'));
const scratchRoots = [];
process.on('exit', () => {
  for (const root of scratchRoots) {
    const link = path.join(root, 'node_modules');
    if (fs.existsSync(link)) fs.unlinkSync(link);
  }
  fs.rmSync(scratch, { recursive: true, force: true });
});

const firstPath = makeCheckout('checkout-one');
const secondPath = makeCheckout('checkout-two-with-a-longer-name');

assert.strictEqual(buildMcpBundle(firstPath), 0, 'the first checkout must build');
const firstBuild = fs.readFileSync(path.join(firstPath, BUNDLE_REL));
assert.strictEqual(buildMcpBundle(secondPath), 0, 'the second checkout must build');
const secondBuild = fs.readFileSync(path.join(secondPath, BUNDLE_REL));
assert.strictEqual(buildMcpBundle(firstPath), 0, 'the first checkout must rebuild');
const rebuilt = fs.readFileSync(path.join(firstPath, BUNDLE_REL));

// 6. Two consecutive builds of one tree are byte-identical.
{
  assert.ok(firstBuild.equals(rebuilt), 'two builds of the same tree must produce the same bytes');
}

// 7. A checkout at a different path produces the same bytes.
{
  assert.ok(
    firstBuild.equals(secondBuild),
    `${firstPath} and ${secondPath} must build the same bundle, so the artifact encodes no checkout path`,
  );
}

// 8. The committed artifact IS the build of the current sources.
{
  const committed = fs.readFileSync(path.join(REPO_ROOT, BUNDLE_REL));
  assert.ok(
    committed.equals(firstBuild),
    'bin/nn-mcp.bundle.js must equal a clean build of the tree; rebuild it with `node scripts/build-mcp-bundle.mjs`',
  );
}

// 9. A bundle whose bytes drift passes the version rule and must still fail.
{
  const offset = 400;
  const drifted = Buffer.from(firstBuild);
  drifted[offset] = drifted[offset] === 0x20 ? 0x21 : 0x20;
  fs.writeFileSync(path.join(firstPath, BUNDLE_REL), drifted);

  const res = checkMcpBundle({ repoRoot: firstPath });

  assert.strictEqual(res.ok, false, 'a bundle whose bytes differ from a fresh build must not pass');
  assert.strictEqual(res.embedded, res.expected, 'the version must still match, so only the bytes can fail');
  assert.strictEqual(res.drift.offset, offset, 'the reported offset must be the first differing byte');
  assert.strictEqual(res.drift.committedSize, drifted.length);
  assert.strictEqual(res.drift.freshSize, firstBuild.length);
  assert.ok(
    fs.readFileSync(path.join(firstPath, BUNDLE_REL)).equals(drifted),
    '--check must not write to the working tree',
  );
}

// 10. A bundle that is exactly a fresh build passes, and checking does not change it.
{
  fs.writeFileSync(path.join(firstPath, BUNDLE_REL), firstBuild);
  const res = checkMcpBundle({ repoRoot: firstPath });
  assert.strictEqual(res.ok, true, res.error ?? '');
  assert.ok(fs.readFileSync(path.join(firstPath, BUNDLE_REL)).equals(firstBuild));
}

console.log('build-mcp-bundle tests passed');
