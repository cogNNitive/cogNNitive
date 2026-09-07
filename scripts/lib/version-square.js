/**
 * scripts/lib/version-square.js
 *
 * Deterministic validator for the MCP Version Square.
 * Ensures strict synchronization across:
 * 1. iNNfo/packages/innfo-mcp/package.json
 * 2. iNNfo/packages/innfo-core/package.json
 * 3. @cognnitive/innfo-core dependency in innfo-mcp
 * 4. manifest/source.yaml channels.stable.refs['innfo-mcp']
 * 5. docs/innfo/cdn/manifest.json (latest version)
 * 6. docs/innfo/cdn/innfo-mcp-v<version>.bundle.js (bundle existence)
 */

const fs = require('fs');
const path = require('path');
const { parseFocusedYaml } = require('./yaml-parser.js');

/**
 * Validates the 6-way version alignment for innfo-mcp.
 * @param {string} repoRoot
 * @returns {{ ok: boolean, errors: string[], version: string }}
 */
function checkVersionSquare(repoRoot = process.cwd()) {
  const errors = [];
  const mcpPkgPath = path.join(repoRoot, 'iNNfo', 'packages', 'innfo-mcp', 'package.json');
  const corePkgPath = path.join(repoRoot, 'iNNfo', 'packages', 'innfo-core', 'package.json');
  const cdnManifestPath = path.join(repoRoot, 'docs', 'innfo', 'cdn', 'manifest.json');
  const sourcePath = path.join(repoRoot, 'manifest', 'source.yaml');

  if (!fs.existsSync(mcpPkgPath)) {
    return { ok: false, errors: [`MCP package.json not found at ${mcpPkgPath}`], version: '' };
  }
  if (!fs.existsSync(corePkgPath)) {
    return { ok: false, errors: [`Core package.json not found at ${corePkgPath}`], version: '' };
  }
  if (!fs.existsSync(cdnManifestPath)) {
    return { ok: false, errors: [`CDN manifest not found at ${cdnManifestPath}`], version: '' };
  }
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, errors: [`manifest/source.yaml not found at ${sourcePath}`], version: '' };
  }

  const mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
  const corePkg = JSON.parse(fs.readFileSync(corePkgPath, 'utf8'));
  const cdnManifest = JSON.parse(fs.readFileSync(cdnManifestPath, 'utf8'));
  const source = parseFocusedYaml(fs.readFileSync(sourcePath, 'utf8'));

  const v = String(mcpPkg.version || '').trim();

  // 1. Core version vs MCP version
  if (String(corePkg.version || '').trim() !== v) {
    errors.push(`innfo-core version (${corePkg.version}) does not match innfo-mcp version (${v})`);
  }

  // 2. Dependency range in innfo-mcp
  const dep = mcpPkg.dependencies && mcpPkg.dependencies['@cognnitive/innfo-core'];
  if (dep !== `^${v}` && dep !== v) {
    errors.push(`innfo-mcp dependency @cognnitive/innfo-core (${dep}) must be ^${v} or ${v}`);
  }

  // 3. CDN manifest.json
  if (cdnManifest.latest !== `v${v}`) {
    errors.push(`docs/innfo/cdn/manifest.json latest (${cdnManifest.latest}) does not match v${v}`);
  }

  // 4. CDN bundle file on disk
  const bundlePath = path.join(repoRoot, 'docs', 'innfo', 'cdn', `innfo-mcp-v${v}.bundle.js`);
  if (!fs.existsSync(bundlePath)) {
    errors.push(`CDN bundle missing on disk: docs/innfo/cdn/innfo-mcp-v${v}.bundle.js`);
  }

  // 5. Stable ref in manifest/source.yaml
  const stableRefs = (source.channels && source.channels.stable && source.channels.stable.refs) || [];
  const mcpRef = stableRefs.find(r => r.key === 'innfo-mcp');
  if (!mcpRef) {
    errors.push('manifest/source.yaml: missing channels.stable.refs entry for innfo-mcp');
  } else if (mcpRef.ref !== `innfo-mcp-v${v}`) {
    errors.push(`manifest/source.yaml stable ref (${mcpRef.ref}) does not match innfo-mcp-v${v}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    version: v
  };
}

module.exports = { checkVersionSquare };
