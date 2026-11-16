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
 * With `--check` it verifies the committed bundle WITHOUT writing to the tree:
 * the version tsup injects via `define` (`__INNFO_MCP_VERSION__`) must equal the
 * version in `package.json`, the bundle must stay a single self-contained file,
 * and a build into a throwaway directory must reproduce the committed BYTES.
 * A stale bundle is exactly what shipped as nn-mcp-v0.37.0 on 2026-11-13: the tag
 * read 0.37.0 while the bytes were 0.36.0, because nothing compared the two. The
 * version comparison alone is not enough either: while the build inlined
 * whichever `nn-core` build `node_modules/@cognnitive/nn-core` happened to name,
 * the bytes drifted by design and a bundle that did not match its source still
 * announced the right version (backlog item `nn-mcp-bundle-reproducibility`).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const BUNDLE_REL = path.join('iNNfo', 'packages', 'nn-mcp', 'bin', 'nn-mcp.bundle.js');
const PACKAGE_REL = path.join('iNNfo', 'packages', 'nn-mcp', 'package.json');
const PACKAGE_DIR_REL = path.join('iNNfo', 'packages', 'nn-mcp');

/** Read by iNNfo/packages/nn-mcp/tsup.config.ts: build the bin bundle only, into this directory. */
const BUNDLE_ONLY_ENV = 'INNFO_MCP_BUNDLE_ONLY';
const BUNDLE_OUT_DIR_ENV = 'INNFO_MCP_BUNDLE_OUT_DIR';

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
 * The tsup CLI this repository installs. Spawning it directly (instead of
 * `npm --workspace ... run build:bundle`) keeps the build and the check on one
 * command, avoids npm's shell hop on Windows, and saves the ~0.7s npm start-up.
 * @returns {string} absolute path to the CLI entry point
 */
function tsupCli() {
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve('tsup/package.json');
  const { bin } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return path.join(path.dirname(pkgPath), bin.tsup);
}

/**
 * Builds the bundle-only tsup config into `outDir`.
 * @param {string} repoRoot
 * @param {string} outDir absolute directory that receives `nn-mcp.bundle.js`
 * @param {{ quiet?: boolean }} [options]
 * @returns {number} exit status
 */
export function buildBundle(repoRoot, outDir, options = {}) {
  const res = spawnSync(process.execPath, [tsupCli()], {
    cwd: path.join(repoRoot, PACKAGE_DIR_REL),
    stdio: options.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    env: {
      ...process.env,
      [BUNDLE_ONLY_ENV]: '1',
      [BUNDLE_OUT_DIR_ENV]: outDir,
    },
  });
  if (options.quiet && res.status !== 0) {
    process.stderr.write(`${res.stdout ?? ''}${res.stderr ?? ''}`);
  }
  return res.status ?? 1;
}

/**
 * The first byte at which two buffers disagree, or -1 when they are equal.
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {number}
 */
function firstDifference(a, b) {
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    if (a[i] !== b[i]) return i;
  }
  return a.length === b.length ? -1 : shared;
}

/**
 * The rules that can be read off the committed bytes alone: single-file, an
 * announcement, and the version authored in `package.json`. They fail before any
 * build, which keeps the common drift (a version bump) fast to diagnose.
 *
 * @param {Buffer} bytes
 * @param {string} expected
 * @returns {{ ok: boolean, embedded?: string | null, error?: string }}
 */
function checkBundleShape(bytes, expected) {
  const text = bytes.toString('utf8');

  const splitImport = text.match(/from\s*['"]\.\/(chunk|spec)-[^'"]+['"]/);
  if (splitImport) {
    return {
      ok: false,
      error:
        `MCP bundle is code-split (${splitImport[0]}). ` +
        'Set splitting:false on the bin config in iNNfo/packages/nn-mcp/tsup.config.ts.',
    };
  }

  const embedded = readEmbeddedVersion(text);
  if (embedded === null) {
    return {
      ok: false,
      embedded,
      error:
        'MCP bundle carries no `name:"nn-mcp",version:"..."` announcement, so its build provenance cannot be verified.',
    };
  }

  if (embedded !== expected) {
    return { ok: false, embedded };
  }

  return { ok: true, embedded };
}

/**
 * Verifies the committed bundle. The version, announcement and single-file rules
 * are read from the committed bytes and fail before any build; the byte rule needs
 * a fresh build, which goes to a throwaway directory so the working tree is never
 * touched.
 *
 * @param {{ repoRoot?: string }} [options]
 * @returns {{
 *   ok: boolean,
 *   expected?: string,
 *   embedded?: string | null,
 *   error?: string,
 *   drift?: { offset: number, committedSize: number, freshSize: number },
 * }}
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
  const shape = checkBundleShape(bytes, expected);
  if (!shape.ok) {
    return { ok: false, expected, embedded: shape.embedded, error: shape.error };
  }

  const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-mcp-bundle-check-'));
  try {
    const status = buildBundle(repoRoot, freshDir, { quiet: true });
    if (status !== 0) {
      return {
        ok: false,
        expected,
        embedded: shape.embedded,
        error: 'the bundle did not build, so its bytes cannot be compared with the committed artifact',
      };
    }
    const fresh = fs.readFileSync(path.join(freshDir, 'nn-mcp.bundle.js'));
    const offset = firstDifference(bytes, fresh);
    if (offset !== -1) {
      return {
        ok: false,
        expected,
        embedded: shape.embedded,
        drift: { offset, committedSize: bytes.length, freshSize: fresh.length },
      };
    }
    return { ok: true, expected, embedded: shape.embedded };
  } finally {
    fs.rmSync(freshDir, { recursive: true, force: true });
  }
}

/** @returns {number} exit status */
export function buildMcpBundle(repoRoot = defaultRepoRoot) {
  return buildBundle(repoRoot, path.join(repoRoot, PACKAGE_DIR_REL, 'bin'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const repoRoot = process.env.INNFO_REPO_ROOT ? path.resolve(process.env.INNFO_REPO_ROOT) : defaultRepoRoot;

  if (check) {
    const res = checkMcpBundle({ repoRoot });
    if (!res.ok) {
      if (res.drift) {
        const { offset, committedSize, freshSize } = res.drift;
        console.error(
          `MCP bundle does not match a fresh build of its source: it announces ${res.embedded} (matching ` +
            `package.json) but the bytes diverge at offset ${offset} ` +
            `(committed ${committedSize} bytes, fresh build ${freshSize} bytes). ` +
            'Rebuild it with `node scripts/build-mcp-bundle.mjs` (or `npm run regen`) before releasing.',
        );
      } else if (res.expected !== undefined && res.embedded !== null && res.embedded !== undefined) {
        console.error(
          `MCP bundle is stale: package.json is ${res.expected} but the committed bundle announces ${res.embedded}. ` +
            'Rebuild it with `node scripts/build-mcp-bundle.mjs` (or `npm run regen`) before releasing.',
        );
      } else {
        console.error(`MCP bundle freshness: ${res.error}`);
      }
      process.exit(1);
    }
    console.log(`MCP bundle freshness: OK — announces ${res.expected} and matches a fresh build byte for byte.`);
    process.exit(0);
  }

  const status = buildMcpBundle(repoRoot);
  if (status !== 0) {
    console.error('build-mcp-bundle: the nn-mcp bundle build failed.');
    process.exit(1);
  }
  // The bundle on disk IS the fresh build, so only the rules readable from its
  // bytes need re-checking here; a byte comparison against a second build would
  // double the cost of every `regen` for no new information.
  const expected = JSON.parse(fs.readFileSync(path.join(repoRoot, PACKAGE_REL), 'utf8')).version;
  const shape = checkBundleShape(fs.readFileSync(path.join(repoRoot, BUNDLE_REL)), expected);
  if (!shape.ok) {
    console.error(`build-mcp-bundle: rebuilt bundle still does not match package.json (${expected}). ${shape.error ?? `announces ${shape.embedded}`}`);
    process.exit(1);
  }
  console.log(`Rebuilt MCP bundle -> announces ${expected} (matches package.json).`);
  process.exit(0);
}
