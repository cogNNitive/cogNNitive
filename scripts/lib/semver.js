'use strict';

/**
 * scripts/lib/semver.js
 *
 * Minimal `x.y.z` semver helpers shared by freshness.js and the release scripts.
 */

/** `[major, minor, patch]` for `x.y.z` / `vx.y.z`, or `null` when malformed. */
function parseSemver(v) {
  const parts = String(v || '').replace(/^v/, '').split('.').map(Number);
  return parts.length === 3 && parts.every((n) => !isNaN(n)) ? parts : null;
}

/** -1 / 0 / 1; falls back to a string compare when either side is malformed. */
function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (!p1 || !p2) return String(v1).localeCompare(String(v2));
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

module.exports = { parseSemver, compareSemver };
