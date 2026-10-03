/**
 * scripts/release/publish-decision.js
 *
 * Pure decision engine for tag-driven releases (AD-3).
 * Evaluates the target web repository state and staged index to determine
 * whether content commit C, mirror tag, and manifest commit M are required.
 */

class PublishDecisionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PublishDecisionError';
  }
}

/**
 * Evaluates release publish actions based on web repo state.
 *
 * @param {object} state
 * @param {boolean} state.tagExists - Does the mirror tag already exist on remote/clone?
 * @param {boolean} [state.tagTreeMatches] - If tag exists, does its tree equal the staged release paths?
 * @param {boolean} [state.headTreeMatches] - If no tag, does web HEAD already equal the staged release paths?
 * @param {boolean} [state.versionedCdnConflict] - Does a versioned CDN file exist with different bytes?
 * @param {boolean} [state.stagedManifestMatches] - Is the staged manifest identical to the published manifest?
 * @returns {{
 *   action: 'TAG_HEAD' | 'COMMIT_AND_TAG' | 'SKIP_CONTENT',
 *   needCommit: boolean,
 *   needTag: boolean,
 *   needManifest: boolean
 * }}
 */
function decidePublish(state) {
  if (state.versionedCdnConflict) {
    throw new PublishDecisionError(
      'Append-only violation: a versioned CDN file already exists in destination with different bytes.'
    );
  }

  const stagedManifestMatches = Boolean(state.stagedManifestMatches);
  const needManifest = !stagedManifestMatches;

  if (state.tagExists) {
    if (state.tagTreeMatches === false) {
      throw new PublishDecisionError(
        'Mirror tag already exists in web repository but points to divergent content. Published mirror tags cannot be moved or mutated.'
      );
    }
    return {
      action: 'SKIP_CONTENT',
      needCommit: false,
      needTag: false,
      needManifest,
    };
  }

  // Tag does not exist yet
  if (state.headTreeMatches) {
    return {
      action: 'TAG_HEAD',
      needCommit: false,
      needTag: true,
      needManifest,
    };
  }

  return {
    action: 'COMMIT_AND_TAG',
    needCommit: true,
    needTag: true,
    needManifest,
  };
}

module.exports = {
  decidePublish,
  PublishDecisionError,
};
