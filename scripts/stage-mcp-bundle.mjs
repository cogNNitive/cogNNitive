#!/usr/bin/env node
/**
 * scripts/stage-mcp-bundle.mjs
 *
 * Stages the innfo-mcp CDN bundle into `<docsRoot>/innfo/cdn/`. It copies the
 * COMMITTED `bin/innfo-mcp.bundle.js` byte-for-byte, so CDN bytes equal the
 * raw-pinned bytes, and it needs neither the editor build nor `build-docs.mjs`
 * (quality-gates spec, "MCP CDN bundle staging is independent of the editor
 * build"). The release workflow and the CI `site` job run it.
 *
 * The CDN bundle must be a single self-contained file: a code-split build
 * would emit `import ... from "./chunk-XXXX.js"` (the chunk name is a
 * per-build content hash) and silently ship a broken bundle. Fail loudly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {{ repoRoot?: string, docsRoot?: string }} [options]
 * @returns {{ version: string, target: string }}
 */
export function stageMcpBundle(options = {}) {
  const repoRoot = options.repoRoot || defaultRepoRoot;
  const docsRoot = options.docsRoot || path.join(repoRoot, 'docs');
  const mcpDir = path.join(repoRoot, 'iNNfo', 'packages', 'innfo-mcp');

  const version = JSON.parse(fs.readFileSync(path.join(mcpDir, 'package.json'), 'utf8')).version;
  if (!version) throw new Error('Could not determine version from innfo-mcp package.json');

  const srcBundle = path.join(mcpDir, 'bin', 'innfo-mcp.bundle.js');
  if (!fs.existsSync(srcBundle)) throw new Error(`MCP bundle not found at: ${srcBundle}`);

  const bytes = fs.readFileSync(srcBundle);
  const splitImport = bytes.toString('utf8').match(/from\s*['"]\.\/(chunk|spec)-[^'"]+['"]/);
  if (splitImport) {
    throw new Error(
      `MCP bundle is code-split (${splitImport[0]}). ` +
        'docs/innfo/cdn/ only publishes innfo-mcp.bundle.js, so this would break the install. ' +
        'Set splitting:false on the bin config in iNNfo/packages/innfo-mcp/tsup.config.ts.',
    );
  }

  const cdnDir = path.join(docsRoot, 'innfo', 'cdn');
  fs.mkdirSync(cdnDir, { recursive: true });
  const target = path.join(cdnDir, `innfo-mcp-v${version}.bundle.js`);
  fs.writeFileSync(target, bytes);

  const manifest = { latest: `v${version}`, updated: new Date().toISOString().split('T')[0] };
  fs.writeFileSync(path.join(cdnDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { version, target };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const docsRoot = process.env.INNFO_DOCS_OUT ? path.resolve(process.env.INNFO_DOCS_OUT) : undefined;
  try {
    const { version, target } = stageMcpBundle({ docsRoot });
    console.log(`Staged MCP bundle v${version} -> ${target}`);
  } catch (err) {
    console.error(`stage-mcp-bundle: ${err.message}`);
    process.exit(1);
  }
}
