/**
 * scripts/lib/channel-refs.js
 *
 * Single source of truth for channel reference resolution.
 * Pure read-time derivation: computes `{ key, repo, ref }` rows from `manifest/source.yaml` doc.
 *
 * Rules:
 * - row.ref present -> literal ref (branch refs, preview channel)
 * - row.version present -> `${key}-v${version}` (validates /^\d+\.\d+\.\d+$/)
 * - neither, key in VERSION_SOURCE -> `${key}-v${VERSION_SOURCE[key](doc)}`
 * - both present, or neither with unknown key -> throws error
 */

function findMcpVersion(doc) {
  const skills = Array.isArray(doc.skills) ? doc.skills : [];
  for (const skill of skills) {
    if (Array.isArray(skill.mcp)) {
      const entry = skill.mcp.find((m) => m && m.name === 'innfo-mcp');
      if (entry && entry.version) return String(entry.version);
    }
  }
  return null;
}

function findConsoleVersion(doc) {
  const assets = Array.isArray(doc.console_assets) ? doc.console_assets : [];
  const entry = assets.find((a) => a && a.name === 'innfo-console');
  if (entry && entry.version) return String(entry.version);
  return null;
}

const VERSION_SOURCE = {
  'innfo-mcp': findMcpVersion,
  'innfo-console': findConsoleVersion,
};

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

/**
 * Resolves channel refs for a specific channel from a parsed source.yaml document.
 *
 * @param {object} sourceDoc - Parsed manifest/source.yaml document.
 * @param {string} channel - Channel name (e.g. 'stable', 'preview').
 * @returns {Array<{ key: string, repo: string, ref: string }>}
 */
function resolveChannelRefs(sourceDoc, channel) {
  if (!sourceDoc || !sourceDoc.channels || !sourceDoc.channels[channel]) {
    return [];
  }
  const channelObj = sourceDoc.channels[channel];
  const refsList = Array.isArray(channelObj.refs) ? channelObj.refs : [];

  return refsList.map((row) => {
    const key = row.key;
    const repo = row.repo || 'cogNNitive/cogNNitive';

    const hasRef = typeof row.ref === 'string' && row.ref.length > 0;
    const hasVersion = typeof row.version === 'string' && row.version.length > 0;

    if (hasRef && hasVersion) {
      throw new Error(
        `Ambiguous channel ref for key '${key}' in channel '${channel}': declares both 'ref' and 'version'`,
      );
    }

    if (hasRef) {
      return { key, repo, ref: row.ref };
    }

    let version = null;
    if (hasVersion) {
      version = row.version;
    } else if (VERSION_SOURCE[key]) {
      version = VERSION_SOURCE[key](sourceDoc);
      if (!version) {
        throw new Error(
          `Could not resolve version for key '${key}' in channel '${channel}' from source document`,
        );
      }
    } else {
      throw new Error(
        `Cannot resolve ref for key '${key}' in channel '${channel}': missing 'ref', 'version', or known version source`,
      );
    }

    if (!SEMVER_RE.test(String(version))) {
      throw new Error(
        `Invalid version format '${version}' for key '${key}' in channel '${channel}': expected X.Y.Z`,
      );
    }

    return {
      key,
      repo,
      ref: `${key}-v${version}`,
    };
  });
}

module.exports = {
  resolveChannelRefs,
  VERSION_SOURCE,
};
