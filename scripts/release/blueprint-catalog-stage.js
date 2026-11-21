'use strict';

/**
 * scripts/release/blueprint-catalog-stage.js
 *
 * Generates the Level-2 blueprint catalog into the release staging tree, stamped with the tag
 * being published.
 *
 * The catalog is not tracked in this repository (#774): a tracked copy has no fixed point,
 * because `release_tag` is computed from HEAD's trees and committing changes HEAD. It is
 * produced where it is consumed instead — here, and in the docs build.
 *
 * `--release-tag` also removes the dependency on git tags being present in the release clone,
 * which they are not: `release.yml` fetches the tag it publishes, not the source repository's
 * tag namespace.
 */

const path = require('node:path');
const { execFileSync } = require('node:child_process');

/**
 * @param {string} workDir staged copy of the distribution tree
 * @param {string} tag the release tag, e.g. `blueprints-v0.85.1`
 * @param {{ warn: (message: string) => void }} logger
 */
function generateBlueprintCatalog(workDir, tag, logger) {
  const out = path.join(workDir, 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json');
  try {
    execFileSync(
      process.execPath,
      [
        path.join(__dirname, '..', 'blueprint-catalog.mjs'),
        '--root',
        workDir,
        '--out',
        out,
        '--release-tag',
        tag,
      ],
      { cwd: workDir, stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (e) {
    logger.warn(`Could not generate the blueprint catalog at ${out}: ${e.message}`);
  }
}

module.exports = { generateBlueprintCatalog };
