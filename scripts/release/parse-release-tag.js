/**
 * scripts/release/parse-release-tag.js
 *
 * Validates and parses release tag shapes, ensuring annotated tag state
 * and reachability from origin/main.
 */

const { execFileSync } = require('node:child_process');
const { RELEASE_KEYS } = require('./release-keys.js');

class TagValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TagValidationError';
  }
}

const TAG_REGEX = /^([a-z][a-z0-9-]*)-v(\d+\.\d+\.\d+)$/;

/**
 * Parses and validates a release tag string.
 *
 * @param {string} tag
 * @param {object} [options]
 * @param {string} [options.repoRoot] - If provided, runs git validation
 * @param {string} [options.mainBranch] - Target main branch (default 'origin/main' with 'main' fallback)
 * @returns {{ key: string, version: string, tag: string }}
 */
function parseReleaseTag(tag, options = {}) {
  if (typeof tag !== 'string' || !tag.trim()) {
    throw new TagValidationError(`Release tag must be a non-empty string, received: ${tag}`);
  }

  const match = tag.trim().match(TAG_REGEX);
  if (!match) {
    throw new TagValidationError(
      `Malformed release tag: "${tag}". Expected shape: <key>-v<semver> (e.g. skills-v2.10.0)`
    );
  }

  const [, key, version] = match;
  if (!RELEASE_KEYS.includes(key)) {
    throw new TagValidationError(
      `Unknown release key: "${key}". Allowed keys: ${RELEASE_KEYS.join(', ')}`
    );
  }

  if (options.repoRoot) {
    validateTagInGit(tag, options.repoRoot, options.mainBranch);
  }

  return {
    key,
    version,
    tag: tag.trim(),
  };
}

function validateTagInGit(tag, repoRoot, targetMain) {
  const git = (args) =>
    execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

  // 1. Check if tag exists and is annotated
  let tagType;
  try {
    tagType = git(['cat-file', '-t', tag]);
  } catch (err) {
    throw new TagValidationError(`Tag "${tag}" does not exist in repository: ${err.message}`);
  }

  if (tagType !== 'tag') {
    throw new TagValidationError(
      `Tag "${tag}" is a lightweight tag (type "${tagType}"). Release tags MUST be annotated (created with git tag -a).`
    );
  }

  // 2. Resolve target main branch
  let mainRef = targetMain || 'origin/main';
  try {
    git(['rev-parse', '--verify', mainRef]);
  } catch {
    if (!targetMain) {
      try {
        git(['rev-parse', '--verify', 'main']);
        mainRef = 'main';
      } catch {}
    }
  }

  // 3. Check reachability from main
  try {
    git(['merge-base', '--is-ancestor', `${tag}^{commit}`, mainRef]);
  } catch {
    throw new TagValidationError(
      `Tag "${tag}" commit is not reachable / not an ancestor of "${mainRef}". Release tags MUST point to commits on main.`
    );
  }
}

module.exports = {
  parseReleaseTag,
  TagValidationError,
};
