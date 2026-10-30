/**
 * scripts/lib/blueprint-version.mjs
 *
 * Shared helpers for the blueprint-version coupling guards
 * (check-procedures-version.mjs, check-samples-version.mjs).
 */

import fs from 'node:fs';

/** YAML frontmatter body of `filePath`, or `null` when unreadable or absent. */
export function readFrontmatter(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return fmMatch ? fmMatch[1] : null;
}

export function parseVersionParts(version) {
  const m = String(version).match(/V_(\d+)-(\d+)-(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** -1 / 0 / 1, or `null` when either side is not a `V_x-y-z` version. */
export function compareVersions(a, b) {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}
