/**
 * scripts/lib/cdn-bundle-staged.js
 *
 * Asserts the staged CDN bundle for the current innfo-mcp version exists on disk:
 *   docs/innfo/cdn/innfo-mcp-v<iNNfo/packages/innfo-mcp/package.json version>.bundle.js
 *
 * Not a version comparison — a build-ordering check. The file is gitignored
 * (.gitignore:12) and produced by scripts/build-docs.mjs:76-78, so a red result
 * means `npm run build:docs` has not run at the current version in this workspace.
 */

const fs = require('fs');
const path = require('path');

/**
 * Asserts that the staged CDN bundle file exists on disk for the current innfo-mcp package version.
 * @param {string} repoRoot
 * @returns {{ ok: boolean, errors: string[], version: string }}
 */
function checkCdnBundleStaged(repoRoot = process.cwd()) {
  const mcpPkgPath = path.join(repoRoot, 'iNNfo', 'packages', 'innfo-mcp', 'package.json');
  if (!fs.existsSync(mcpPkgPath)) {
    return { ok: false, errors: [`MCP package.json not found at ${mcpPkgPath}`], version: '' };
  }

  let mcpPkg;
  try {
    mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
  } catch (err) {
    return { ok: false, errors: [`Error parsing ${mcpPkgPath}: ${err.message}`], version: '' };
  }

  const v = String(mcpPkg.version || '').trim();
  if (!v) {
    return { ok: false, errors: [`No version declared in ${mcpPkgPath}`], version: '' };
  }

  const bundlePath = path.join(repoRoot, 'docs', 'innfo', 'cdn', `innfo-mcp-v${v}.bundle.js`);
  if (!fs.existsSync(bundlePath)) {
    return {
      ok: false,
      errors: [`Staged CDN bundle missing on disk: docs/innfo/cdn/innfo-mcp-v${v}.bundle.js (run \`npm run build:docs\` to generate)`],
      version: v,
    };
  }

  return { ok: true, errors: [], version: v };
}

module.exports = { checkCdnBundleStaged };
