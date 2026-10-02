/**
 * scripts/release/smoke.js
 *
 * Post-publish smoke test for tag-driven releases (AD-5).
 * 1. Polls the live manifest URL until byte-equal to staged manifest.
 * 2. Validates the served live manifest.
 * 3. For innfo-mcp releases, asserts served CDN bundle sha256 equals committed bundle.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { fetchString } = require('../lib/github-client.js');
const { validateManifestText } = require('../manifest/validate-manifest.js');

class SmokeTestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SmokeTestError';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Runs post-publish smoke test.
 *
 * @param {object} config
 * @param {string} [config.manifestUrl='https://cognnitive.com/use/manifest.md']
 * @param {string} config.stagedManifestText
 * @param {string} [config.key]
 * @param {string} [config.version]
 * @param {string} [config.cdnBaseUrl='https://cognnitive.com/innfo/cdn']
 * @param {string} [config.repoRoot=process.cwd()]
 * @param {number} [config.pollIntervalMs=30000]
 * @param {number} [config.timeoutMs=900000]
 * @param {Function} [config.fetchFn]
 * @param {Function} [config.validator]
 * @param {object} [config.logger]
 * @param {object} [options]
 * @param {object} [options.logger]
 * @returns {Promise<{ ok: boolean, attempts: number, manifestUrl: string }>}
 */
async function runSmokeTest(config, options = {}) {
  const logger = options.logger || config.logger || console;
  const manifestUrl = config.manifestUrl || 'https://cognnitive.com/use/manifest.md';
  const stagedManifestText = (config.stagedManifestText || '').trim();
  const key = config.key;
  const version = config.version;
  const cdnBaseUrl = config.cdnBaseUrl || 'https://cognnitive.com/innfo/cdn';
  const repoRoot = path.resolve(config.repoRoot || process.cwd());
  const pollIntervalMs = config.pollIntervalMs || 30000;
  const timeoutMs = config.timeoutMs || 900000;
  const fetchFn = config.fetchFn || (async (url) => {
    const text = await fetchString(url);
    return { status: 200, text: async () => text };
  });
  const validator = config.validator || (async (text) => (await validateManifestText(text, 'stable')).ok);

  const startTime = Date.now();
  let attempts = 0;
  let servedText = '';

  logger.log(`smoke-test: polling ${manifestUrl} (timeout: ${timeoutMs / 1000}s)...`);

  while (Date.now() - startTime < timeoutMs) {
    attempts++;
    try {
      const res = await fetchFn(manifestUrl);
      if (res && res.status === 200) {
        servedText = (await res.text()).trim();
        if (servedText === stagedManifestText) {
          logger.log(`smoke-test: manifest reached byte-equality in attempt ${attempts}.`);
          break;
        }
      }
    } catch (err) {
      // transient network / fetch error during propagation, retry
    }
    await sleep(pollIntervalMs);
  }

  if (servedText !== stagedManifestText) {
    throw new SmokeTestError(
      `Smoke test timeout (${timeoutMs}ms) waiting for ${manifestUrl} to serve the staged manifest.`
    );
  }

  // Validate served manifest
  const isValid = await validator(servedText, 'stable');
  if (!isValid) {
    throw new SmokeTestError(`Live manifest at ${manifestUrl} failed validation.`);
  }

  // If innfo-mcp was released, check CDN bundle sha256
  if (key === 'innfo-mcp' && version) {
    const committedBundlePath = path.join(
      repoRoot,
      'iNNfo',
      'packages',
      'innfo-mcp',
      'bin',
      'innfo-mcp.bundle.js'
    );
    if (fs.existsSync(committedBundlePath)) {
      const committedBundle = fs.readFileSync(committedBundlePath, 'utf8');
      const committedSha = sha256(committedBundle);

      const cdnUrl = `${cdnBaseUrl}/innfo-mcp-v${version}.bundle.js`;
      logger.log(`smoke-test: checking CDN bundle integrity at ${cdnUrl}...`);
      const cdnRes = await fetchFn(cdnUrl);
      const servedBundle = await cdnRes.text();
      const servedSha = sha256(servedBundle);

      if (servedSha !== committedSha) {
        throw new SmokeTestError(
          `CDN bundle sha256 mismatch for ${cdnUrl} (served: ${servedSha}, committed: ${committedSha}).`
        );
      }
      logger.log('smoke-test: CDN bundle sha256 verified successfully.');
    }
  }

  logger.log('smoke-test: all post-publish checks passed successfully! ✨');
  return { ok: true, attempts, manifestUrl };
}

module.exports = {
  runSmokeTest,
  SmokeTestError,
};
