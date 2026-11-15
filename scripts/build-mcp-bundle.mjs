#!/usr/bin/env node
/**
 * scripts/build-mcp-bundle.mjs
 *
 * Owns the committed CDN artifact `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js`:
 * the single file `stage-mcp-bundle.mjs` copies byte-for-byte to
 * `<docs>/innfo/cdn/nn-mcp-v<version>.bundle.js`.
 *
 * Without arguments it rebuilds the bundle from the current source, so `regen`
 * produces a bundle whose embedded version matches `package.json`.
 *
 * With `--check` it verifies the committed bundle without a build: the version
 * tsup injects via `define` (`__INNFO_MCP_VERSION__`) must equal the version in
 * `package.json`, and the bundle must stay a single self-contained file. A stale
 * bundle is exactly what shipped as nn-mcp-v0.37.0 on 2026-11-13: the tag read
 * 0.37.0 while the bytes were 0.36.0, because nothing compared the two.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BUNDLE_REL = path.join('iNNfo', 'packages', 'nn-mcp', 'bin', 'nn-mcp.bundle.js');
const PACKAGE_REL = path.join('iNNfo', 'packages', 'nn-mcp', 'package.json');

/** The server announces itself once; the anchor survives minification. */
const EMBEDDED_VERSION_RE = /name:"nn-mcp",version:"([^"]+)"/;

/**
 * @param {string} text
 * @returns {string | null}
 */
export function readEmbeddedVersion(text) {
  const m = text.match(EMBEDDED_VERSION_RE);
  return m ? m[1] : null;
}

/**
 * @param {{ repoRoot?: string }} [options]
 * @returns {{ ok: boolean, expected?: string, embedded?: string | null, error?: string }}
 */
export function checkMcpBundle(options = {}) {
  const repoRoot = options.repoRoot || defaultRepoRoot;
  const bundlePath = path.join(repoRoot, BUNDLE_REL);
  const packagePath = path.join(repoRoot, PACKAGE_REL);

  if (!fs.existsSync(bundlePath)) {
    return { ok: false, error: `MCP bundle not found at: ${bundlePath}` };
  }
  if (!fs.existsSync(packagePath)) {
    return { ok: false, error: `nn-mcp package.json not found at: ${packagePath}` };
  }

  const expected = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
  if (!expected) {
    return { ok: false, error: `No version in ${packagePath}` };
  }

  const bytes = fs.readFileSync(bundlePath);
  const text = bytes.toString('utf8');

  const splitImport = text.match(/from\s*['"]\.\/(chunk|spec)-[^'"]+['"]/);
  if (splitImport) {
    return {
      ok: false,
      expected,
      error:
        `MCP bundle is code-split (${splitImport[0]}). ` +
        'Set splitting:false on the bin config in iNNfo/packages/nn-mcp/tsup.config.ts.',
    };
  }

  const embedded = readEmbeddedVersion(text);
  if (embedded === null) {
    return {
      ok: false,
      expected,
      embedded,
      error:
        'MCP bundle carries no `name:"nn-mcp",version:"..."` announcement, so its build provenance cannot be verified.',
    };
  }

  if (embedded !== expected) {
    return { ok: false, expected, embedded };
  }

  return { ok: true, expected, embedded };
}

/** @returns {number} exit status */
export function buildMcpBundle(repoRoot = defaultRepoRoot) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const res = spawnSync(npm, ['--workspace=@cognnitive/nn-mcp', 'run', 'build:bundle'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return res.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const repoRoot = process.env.INNFO_REPO_ROOT ? path.resolve(process.env.INNFO_REPO_ROOT) : defaultRepoRoot;

  if (check) {
    const res = checkMcpBundle({ repoRoot });
    if (!res.ok) {
      if (res.expected !== undefined && res.embedded !== null && res.embedded !== undefined) {
        console.error(
          `MCP bundle is stale: package.json is ${res.expected} but the committed bundle announces ${res.embedded}. ` +
            'Rebuild it with `node scripts/build-mcp-bundle.mjs` (or `npm run regen`) before releasing.',
        );
      } else {
        console.error(`MCP bundle freshness: ${res.error}`);
      }
      process.exit(1);
    }
    console.log(`MCP bundle freshness: OK — announces ${res.expected}, matching package.json.`);
    process.exit(0);
  }

  const status = buildMcpBundle(repoRoot);
  if (status !== 0) {
    console.error('build-mcp-bundle: the nn-mcp bundle build failed.');
    process.exit(1);
  }
  const res = checkMcpBundle({ repoRoot });
  if (!res.ok) {
    console.error(
      `build-mcp-bundle: rebuilt bundle still does not match package.json (${res.expected}). ` +
        `${res.error ?? `announces ${res.embedded}`}`,
    );
    process.exit(1);
  }
  console.log(`Rebuilt MCP bundle -> announces ${res.expected} (matches package.json).`);
  process.exit(0);
}
