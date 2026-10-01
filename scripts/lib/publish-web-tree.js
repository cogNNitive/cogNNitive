/**
 * scripts/lib/publish-web-tree.js
 *
 * Tree replacement and file preservation for public-web site publication.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PRESERVE = ['.nojekyll', 'CNAME'];

/**
 * Replaces the site tree at `dstDir` with content from `srcDir`, preserving
 * specified public-owned files (.nojekyll, CNAME) unless provided by the artifact.
 *
 * @param {string} srcDir - Built site directory
 * @param {string} dstDir - Destination site directory inside the repo checkout
 * @param {object} [options]
 * @param {string[]} [options.preserve]
 */
function replaceSiteTree(srcDir, dstDir, options = {}) {
  const preserve = options.preserve || DEFAULT_PRESERVE;
  const savedFiles = new Map();

  if (fs.existsSync(dstDir)) {
    for (const file of preserve) {
      const targetPath = path.join(dstDir, file);
      if (fs.existsSync(targetPath)) {
        savedFiles.set(file, fs.readFileSync(targetPath));
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
  fs.cpSync(from, to, { recursive: true });
  return true;
}

module.exports = {
  DEFAULT_PRESERVE,
  replaceSiteTree,
  copyDistributionPath,
};
