/**
 * scripts/manifest/lib/entry-version.js
 *
 * Single shared reader for reading authored entry versions across skills,
 * blueprints, innfo-mcp, and console.
 */

const { parseFocusedYaml, parseFrontmatter } = require('../../lib/yaml-parser.js');

/**
 * Extracts version from SKILL.md content or parsed meta object.
 * @param {string | object} input
 * @returns {string | null}
 */
function readSkillVersion(input) {
  if (!input) return null;
  let meta = input;
  if (typeof input === 'string') {
    try {
      meta = parseFocusedYaml(parseFrontmatter(input));
    } catch {
      meta = {};
    }
  }
  const version = meta.version !== undefined ? meta.version : (meta.metadata && meta.metadata.version);
  return version !== undefined && version !== null ? String(version) : null;
}

/**
 * Extracts version from blueprint spec content or parsed meta object.
 * @param {string | object} input
 * @returns {string | null}
 */
function readBlueprintVersion(input) {
  if (!input) return null;
  let meta = input;
  if (typeof input === 'string') {
    try {
      meta = parseFocusedYaml(parseFrontmatter(input));
    } catch {
      meta = {};
    }
  }
  const version =
    meta.version !== undefined
      ? meta.version
      : meta.spec_version !== undefined
        ? meta.spec_version
        : meta.metadata && meta.metadata.version;

  if (version !== undefined && version !== null) {
    return String(version);
  }

  if (typeof input === 'string') {
    const versionMatch = input.match(/V_\d+-\d+-\d+/i) || input.match(/version:\s*["']?([^"'\r\n]+)/i);
    if (versionMatch) {
      return versionMatch[1] || versionMatch[0];
    }
  }

  return null;
}

/**
 * Extracts version from innfo-mcp package.json.
 * @param {string | object} input
 * @returns {string | null}
 */
function readMcpVersion(input) {
  if (!input) return null;
  let pkg = input;
  if (typeof input === 'string') {
    try {
      pkg = JSON.parse(input);
    } catch {
      return null;
    }
  }
  return pkg.version ? String(pkg.version) : null;
}

/**
 * Extracts version from console package.json.
 * @param {string | object} input
 * @returns {string | null}
 */
function readConsoleVersion(input) {
  if (!input) return null;
  let pkg = input;
  if (typeof input === 'string') {
    try {
      pkg = JSON.parse(input);
    } catch {
      return null;
    }
  }
  return pkg.version ? String(pkg.version) : null;
}

/**
 * Dispatches version extraction by section / key.
 * @param {object} params
 * @param {string} params.section - 'skills' | 'blueprints' | 'mcp' | 'console' | 'templates'
 * @param {string | object} params.content
 * @returns {string | null}
 */
function readEntryVersion(params) {
  const { section, content } = params;
  if (section === 'skills') {
    return readSkillVersion(content);
  }
  if (section === 'blueprints' || section === 'templates') {
    return readBlueprintVersion(content);
  }
  if (section === 'mcp' || section === 'innfo-mcp') {
    return readMcpVersion(content);
  }
  if (section === 'console' || section === 'innfo-console' || section === 'console_assets') {
    return readConsoleVersion(content);
  }
  return null;
}

module.exports = {
  readSkillVersion,
  readBlueprintVersion,
  readMcpVersion,
  readConsoleVersion,
  readEntryVersion,
};
