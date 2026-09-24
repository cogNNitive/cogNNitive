/**
 * scripts/lib/console-release-info.js
 *
 * Single source of truth for the innfo-console release identity (bundle
 * version + CDN pin), derived from `manifest/source.yaml` instead of
 * duplicated as hardcoded literals.
 *
 * Before this change, `scripts/build-console-bundle.mjs` hardcoded
 * `BUNDLE_VERSION = '0.1.0'` and `scripts/export-console.mjs` hardcoded the
 * jsDelivr CDN URL pinned to `innfo-console-v0.1.0`. Both had drifted behind
 * `manifest/source.yaml` (`console_assets[0].version` = `0.2.0`,
 * `channels.stable.refs` key `innfo-console` = `innfo-console-v0.2.0`), so
 * every exported console artifact fetched a runtime a full minor behind the
 * one actually shipped. Deriving both from the manifest removes the
 * duplication instead of adding a drift checker for it.
 */

const fs = require('fs');
const path = require('path');
const { parseFocusedYaml } = require('./yaml-parser.js');

/**
 * @param {string} repoRoot
 * @returns {{ version: string, cdnRef: string, cdnUrl: string }}
 */
function getConsoleReleaseInfo(repoRoot = process.cwd()) {
  const sourcePath = path.join(repoRoot, 'manifest', 'source.yaml');
  const source = parseFocusedYaml(fs.readFileSync(sourcePath, 'utf8'));

  const consoleAssets = Array.isArray(source.console_assets) ? source.console_assets : [];
  const asset = consoleAssets.find((a) => a && a.name === 'innfo-console');
  if (!asset || !asset.version) {
    throw new Error(
      `manifest/source.yaml: missing console_assets entry for "innfo-console" at ${sourcePath}`,
    );
  }
  const version = String(asset.version);

  const stableRefs = (source.channels && source.channels.stable && source.channels.stable.refs) || [];
  const ref = stableRefs.find((r) => r && r.key === 'innfo-console');
  if (!ref || !ref.ref) {
    throw new Error(
      `manifest/source.yaml: missing channels.stable.refs entry keyed "innfo-console" at ${sourcePath}`,
    );
  }
  const repoSlug = ref.repo || 'cogNNitive/cogNNitive';
  const cdnUrl = `https://cdn.jsdelivr.net/gh/${repoSlug}@${ref.ref}/iNNfo/specs/templates/console/innfo-console.bundle.js`;

  return { version, cdnRef: ref.ref, cdnUrl };
}

module.exports = { getConsoleReleaseInfo };
