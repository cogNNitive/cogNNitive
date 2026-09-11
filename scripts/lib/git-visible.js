/**
 * scripts/lib/git-visible.js
 *
 * Shared git-visible file selection for repository scans.
 *
 * Returns the set of tracked plus nonignored untracked files — exactly what git
 * considers project content — so a filesystem walk does not flag gitignored
 * local artifacts (caches, scratch copies) that a fresh CI checkout never has.
 * Returns null when git metadata is unavailable so callers can preserve their
 * previous filesystem behavior instead of failing.
 */

const { execSync } = require('node:child_process');
const path = require('node:path');

/**
 * Runs `git ls-files -co --exclude-standard` in the given checkout.
 * @param {string} repoRoot
 * @returns {string} newline-separated repo-relative paths
 */
function defaultRunGit(repoRoot) {
  return execSync('git ls-files -co --exclude-standard', {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/**
 * @param {string} repoRoot
 * @param {{ runGit?: (repoRoot: string) => string }} [options] - `runGit` is an
 *   injectable seam for tests; production uses the real git command.
 * @returns {Set<string> | null} absolute, posix-normalized paths, or null when
 *   git is unavailable / not a checkout.
 */
function collectGitVisible(repoRoot, options = {}) {
  const runGit = options.runGit || defaultRunGit;
  try {
    const out = runGit(repoRoot);
    const set = new Set();
    for (const line of String(out).split('\n')) {
      const rel = line.trim();
      if (rel) set.add(path.resolve(repoRoot, rel).replace(/\\/g, '/'));
    }
    return set;
  } catch {
    return null;
  }
}

module.exports = { collectGitVisible, defaultRunGit };
