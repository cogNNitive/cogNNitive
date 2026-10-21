/**
 * scripts/lib/console-release-info.js
 *
 * Single source of truth for the nn-console release identity (bundle
 * version + CDN pin), derived from `iNNfo/specs/bluepriNNts/console/package.json`
 * instead of duplicated as hardcoded literals (AD-6).
 */

const fs = require('fs');
const path = require('path');

/**
 * @param {string} repoRoot
 * @returns {{ version: string, cdnRef: string, cdnUrl: string }}
 */
function getConsoleReleaseInfo(repoRoot = process.cwd()) {
  const pkgPath = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      `console package.json not found at ${pkgPath}`,
    );
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse ${pkgPath}: ${err.message}`);
  }

  if (!pkg.version) {
    throw new Error(`console package.json missing "version" field at ${pkgPath}`);
  }

  const version = String(pkg.version);
  const cdnRef = `nn-console-v${version}`;
  const repoSlug = 'cogNNitive/cogNNitive-web';
  const cdnUrl = `https://cdn.jsdelivr.net/gh/${repoSlug}@${cdnRef}/iNNfo/specs/bluepriNNts/console/nn-console.bundle.js`;

  return { version, cdnRef, cdnUrl };
}

module.exports = { getConsoleReleaseInfo };
