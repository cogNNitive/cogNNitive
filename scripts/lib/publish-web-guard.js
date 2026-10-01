/**
 * scripts/lib/publish-web-guard.js
 *
 * Source-leak guard for the public-web publishing pipeline.
 *
 * Scans directories and files intended for public distribution to ensure
 * no private monorepo source, credentials, or node_modules leak into
 * public repositories.
 */

const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_ALLOWLIST = ['skills/nn-trannsform'];

const ROOT_FORBIDDEN = new Set([
  'src',
  'packages',
  'apps',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
]);

/**
 * Walks a surface and returns a list of repo-relative offender paths.
 * Never follows symlinks.
 *
 * @param {string} repoRoot - Absolute path to repo root
 * @param {string[]} surfaces - Repo-relative paths or directory names to check
 * @param {object} [options]
 * @param {string[]} [options.manifestAllowlist]
 * @returns {string[]}
 */
function findSourceOffenders(repoRoot, surfaces, options = {}) {
  const allowlist = options.manifestAllowlist || MANIFEST_ALLOWLIST;
  const offenders = [];

  for (const surface of surfaces) {
    const absSurface = path.isAbsolute(surface) ? surface : path.join(repoRoot, surface);
    if (!fs.existsSync(absSurface)) continue;

    const surfaceStat = fs.lstatSync(absSurface);
    const relSurface = path.relative(repoRoot, absSurface).replace(/\\/g, '/');

    if (!surfaceStat.isDirectory()) {
      // Single file check
      const baseName = path.basename(absSurface);
      if (baseName.startsWith('.env') || ROOT_FORBIDDEN.has(baseName)) {
        offenders.push(relSurface);
      }
      continue;
    }

    // Directory walk
    const walk = (absDir, isRoot) => {
      let entries;
      try {
        entries = fs.readdirSync(absDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(absDir, entry.name);
        const relPath = path.relative(repoRoot, fullPath).replace(/\\/g, '/');
        const isDir = entry.isDirectory();

        // 1. Deep forbidden at ANY depth
        if (entry.name === 'node_modules') {
          offenders.push(`${relPath}/`);
          continue; // Don't descend into node_modules
        }
        if (entry.name === '.env' || entry.name.startsWith('.env.')) {
          offenders.push(isDir ? `${relPath}/` : relPath);
          continue;
        }

        // 2. Root-only forbidden at surface root
        if (isRoot && ROOT_FORBIDDEN.has(entry.name)) {
          offenders.push(isDir ? `${relPath}/` : relPath);
          if (isDir) continue;
        }

        // 3. Nested package.json / package-lock.json
        if (!isRoot && (entry.name === 'package.json' || entry.name === 'package-lock.json')) {
          const entryDir = path.dirname(relPath);
          if (!allowlist.includes(entryDir)) {
            offenders.push(relPath);
          }
        }

        if (isDir) {
          walk(fullPath, false);
        }
      }
    };

    walk(absSurface, true);
  }

  offenders.sort();
  return offenders;
}

class SourceOffenderError extends Error {
  /**
   * @param {string} message
   * @param {string[]} [offenders]
   */
  constructor(message, offenders = []) {
    super(message);
    this.name = 'SourceOffenderError';
    /** @type {string[]} */
    this.offenders = offenders;
  }
}

/**
 * Asserts that no forbidden source paths are present across the given surfaces.
 * Throws an error with all offenders listed if any are found.
 *
 * @param {string} repoRoot
 * @param {string[]} surfaces
 * @param {object} [options]
 */
function assertNoSource(repoRoot, surfaces, options = {}) {
  const offenders = findSourceOffenders(repoRoot, surfaces, options);
  if (offenders.length > 0) {
    throw new SourceOffenderError(
      `publish-web: refusing to publish — the artifact carries source-like paths that must never be public: ${offenders.join(', ')}`,
      offenders
    );
  }
}

module.exports = {
  MANIFEST_ALLOWLIST,
  ROOT_FORBIDDEN,
  SourceOffenderError,
  findSourceOffenders,
  assertNoSource,
};
