/**
 * scripts/lib/publish-web-tree.js
 *
 * Tree replacement and file preservation for public-web site publication.
 * Preserves public-owned files (.nojekyll, CNAME) and release-owned paths
 * (manifests, snapshots, CDN bundles, CDN manifest).
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PRESERVE = ['.nojekyll', 'CNAME'];

/**
 * Checks if a relative path (relative to docs/ site root) is owned by the release workflow.
 * @param {string} relPath
 * @returns {boolean}
 */
function isReleaseOwnedPath(relPath) {
  const norm = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^innfo\/cdn\/innfo-mcp-v\d+\.\d+\.\d+\.bundle\.js$/.test(norm)) return true;
  if (norm === 'innfo/cdn/manifest.json') return true;
  if (norm === 'use/manifest.md') return true;
  if (norm === 'update/manifest.md') return true;
  if (/^use\/manifests\/[a-z0-9-.]+\.md$/.test(norm)) return true;
  return false;
}

/**
 * Collects all relative file paths under a directory.
 * @param {string} dir
 * @param {string} [base='']
 * @returns {string[]}
 */
function collectFiles(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, rel));
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      results.push(rel);
    }
  }
  return results;
}

/**
 * Enforces that a build artifact does not contain release-owned paths.
 * In PR 2, guards versioned CDN bundles and release snapshots.
 * Upgraded to full strict guard (including stable manifest) in PR 4 (task 4.3).
 * @param {string} srcDir - Built site artifact directory
 */
function assertNoReleaseOwnedInArtifact(srcDir) {
  const files = collectFiles(srcDir);
  for (const file of files) {
    const norm = file.replace(/\\/g, '/').replace(/^\/+/, '');
    if (
      /^innfo\/cdn\/innfo-mcp-v\d+\.\d+\.\d+\.bundle\.js$/.test(norm) ||
      norm === 'innfo/cdn/manifest.json' ||
      /^use\/manifests\/[a-z0-9-.]+\.md$/.test(norm)
    ) {
      throw new Error(
        `Main build artifact contains release-owned path "${file}". Release-owned paths must not be published by push-to-main CI.`
      );
    }
  }
}

/**
 * Replaces the site tree at `dstDir` with content from `srcDir`, preserving
 * specified public-owned files (.nojekyll, CNAME) and release-owned paths unless provided by the artifact.
 *
 * @param {string} srcDir - Built site directory
 * @param {string} dstDir - Destination site directory inside the repo checkout
 * @param {object} [options]
 * @param {string[]} [options.preserve]
 */
function replaceSiteTree(srcDir, dstDir, options = {}) {
  const preserveList = options.preserve || DEFAULT_PRESERVE;
  const savedFiles = new Map();

  if (fs.existsSync(dstDir)) {
    const existingFiles = collectFiles(dstDir);
    for (const relFile of existingFiles) {
      if (preserveList.includes(relFile) || isReleaseOwnedPath(relFile)) {
        const targetPath = path.join(dstDir, relFile);
        savedFiles.set(relFile, fs.readFileSync(targetPath));
      }
    }
    fs.rmSync(dstDir, { recursive: true, force: true });
  }

  fs.mkdirSync(dstDir, { recursive: true });
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, dstDir, { recursive: true });
  }

  // Restore preserved files if not provided by the source artifact
  for (const [file, content] of savedFiles) {
    const srcPath = path.join(srcDir, file);
    const dstPath = path.join(dstDir, file);
    if (!fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.writeFileSync(dstPath, content);
    }
  }
}

/**
 * Copies a distribution path from the repository root into the working clone.
 *
 * @param {string} repoRoot
 * @param {string} relPath
 * @param {string} workDir
 * @returns {boolean} True if copied, false if source did not exist
 */
function copyDistributionPath(repoRoot, relPath, workDir) {
  const from = path.join(repoRoot, relPath);
  if (!fs.existsSync(from)) return false;

  const to = path.join(workDir, relPath);
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, {
    recursive: true,
    filter: (src) => !src.split(path.sep).includes('node_modules'),
  });
  return true;
}

module.exports = {
  DEFAULT_PRESERVE,
  isReleaseOwnedPath,
  assertNoReleaseOwnedInArtifact,
  replaceSiteTree,
  copyDistributionPath,
};
