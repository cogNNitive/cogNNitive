/**
 * scripts/release/version-agreement.js
 *
 * Verifies version agreement before publishing a release (AD-6):
 * 1. For nn-mcp, tag version MUST match iNNfo/packages/nn-mcp/package.json.
 * 2. For nn-console, tag version MUST match iNNfo/specs/bluepriNNts/console/package.json.
 * 3. For all keys, tag version MUST be >= highest existing tag for that key.
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseReleaseTag } = require('./parse-release-tag.js');
const { parseSemver, compareSemver } = require('../lib/semver.js');

class VersionAgreementError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VersionAgreementError';
  }
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
  if (key === 'nn-mcp') {
    const pkgPath = path.join(repoRoot, 'iNNfo', 'packages', 'nn-mcp', 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version && pkg.version !== version) {
        throw new VersionAgreementError(
          `Authored version mismatch: release tag is '${releaseTag}' (v${version}) but nn-mcp package.json has '${pkg.version}'.`
        );
      }
    }
  } else if (key === 'nn-console') {
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
