/**
 * scripts/release/version-agreement.js
 *
 * Verifies version agreement before publishing a release (AD-6):
 * 1. For innfo-mcp, tag version MUST match iNNfo/packages/innfo-mcp/package.json.
 * 2. For innfo-console, tag version MUST match iNNfo/specs/bluepriNNts/console/package.json.
 * 3. For all keys, tag version MUST be >= highest existing tag for that key.
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseReleaseTag } = require('./parse-release-tag.js');

class VersionAgreementError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VersionAgreementError';
  }
}

function parseSemver(v) {
  const parts = String(v || '').replace(/^v/, '').split('.').map(Number);
  return parts.length === 3 && parts.every((n) => !isNaN(n)) ? parts : null;
}

function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (!p1 || !p2) return String(v1).localeCompare(String(v2));
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

/**
 * Checks version agreement and monotonic progression.
 *
 * @param {object} params
 * @param {string} params.releaseTag
 * @param {string} [params.repoRoot=process.cwd()]
 * @param {string[]} [params.existingTags=[]]
 */
function checkVersionAgreement(params) {
  const { releaseTag, repoRoot = process.cwd(), existingTags = [] } = params;
  const { key, version } = parseReleaseTag(releaseTag);

  // 1. Check authored version agreement for package-sourced keys
  if (key === 'innfo-mcp') {
    const pkgPath = path.join(repoRoot, 'iNNfo', 'packages', 'innfo-mcp', 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version && pkg.version !== version) {
        throw new VersionAgreementError(
          `Authored version mismatch: release tag is '${releaseTag}' (v${version}) but innfo-mcp package.json has '${pkg.version}'.`
        );
      }
    }
  } else if (key === 'innfo-console') {
    const pkgPath = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version && pkg.version !== version) {
        throw new VersionAgreementError(
          `Authored version mismatch: release tag is '${releaseTag}' (v${version}) but console package.json has '${pkg.version}'.`
        );
      }
    }
  }

  // 2. Check monotonic progression against existing tags for this key
  const prefix = `${key}-v`;
  const relevantVersions = existingTags
    .filter((t) => t.startsWith(prefix))
    .map((t) => t.slice(prefix.length))
    .filter((v) => parseSemver(v) !== null);

  for (const existingVersion of relevantVersions) {
    const cmp = compareSemver(version, existingVersion);
    if (cmp < 0) {
      throw new VersionAgreementError(
        `Version below existing tag: new release version '${version}' is not greater than existing tag '${key}-v${existingVersion}'.`
      );
    }
  }
}

module.exports = {
  checkVersionAgreement,
  VersionAgreementError,
};
