#!/usr/bin/env node

/**
 * scripts/guard-text-encoding.js
 *
 * Deterministic guard: every git-visible text file must be valid UTF-8 and must
 * not contain the Unicode replacement character (U+FFFD). Fails with the file
 * path and a reason so the offending file is fixable in one step.
 *
 * Categories skipped by documented rule:
 *   - binary files (a NUL byte in the content)
 *   - generated bundles (`*.bundle.js`), which are rebuilt from source
 *   - explicit allowlist entries, each carrying a reviewer note
 *
 * File selection is git-visible (tracked + nonignored untracked) so gitignored
 * local artifacts are not flagged. When git metadata is unavailable the guard
 * falls back to a filesystem walk instead of failing.
 *
 * Known limitation: glyph-level mojibake — valid UTF-8 that decodes to the wrong
 * characters (e.g. `â€"` where an em dash `—` was intended, as at
 * `iNNfo/scripts/check-spec-version.mjs:3`) — is OUT OF SCOPE. The guard only
 * catches U+FFFD and undecodable bytes; detecting glyph mojibake is a future
 * extension candidate.
 */

const fs = require('node:fs');
const path = require('node:path');
const { collectGitVisible } = require('./lib/git-visible.js');

const REPO_ROOT = path.resolve(__dirname, '..');

const GENERATED_RE = /\.bundle\.js$/;

const FALLBACK_SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'bin',
  'temp',
  '.playwright-mcp',
  'home-page',
  '.claude',
  'coverage',
]);

// Explicit exceptions. Every entry needs a reviewer note: an allowlist entry is
// not a silent pass, it is a tracked and documented gap. Currently empty: the
// iNNfo/USE_AI.md U+FFFD corruption was repaired, so its entry was removed.
const DEFAULT_ALLOWLIST = new Set([]);

/**
 * Classifies a file buffer.
 * @param {Buffer} buf
 * @returns {string | null} a violation reason, or null when valid/skipped.
 */
function checkTextBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) return null;
  if (buf.includes(0)) return null; // binary content
  const text = buf.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buf)) return 'invalid-utf8 (undecodable bytes)';
  if (text.includes('\uFFFD')) return 'replacement-character (U+FFFD)';
  return null;
}

/**
 * @param {string[]} files - absolute candidate paths.
 * @param {{ repoRoot?: string, allowlist?: Set<string> }} [options]
 * @returns {{ file: string, reason: string }[]}
 */
function scanForEncodingViolations(files, options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const allowlist = options.allowlist || DEFAULT_ALLOWLIST;
  const violations = [];
  for (const file of files) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    if (allowlist.has(rel) || GENERATED_RE.test(rel)) continue;
    let buf;
    try {
      buf = fs.readFileSync(file);
    } catch {
      continue;
    }
    const reason = checkTextBuffer(buf);
    if (reason) violations.push({ file: rel, reason });
  }
  return violations;
}

function walkFiles(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (FALLBACK_SKIP_DIRS.has(entry.name)) continue;
      walkFiles(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/**
 * @param {string} [repoRoot]
 * @returns {string[]} absolute candidate file paths.
 */
function discoverTextCandidates(repoRoot = REPO_ROOT) {
  const visible = collectGitVisible(repoRoot);
  if (visible) {
    return [...visible].filter((p) => {
      try {
        return fs.statSync(p).isFile();
      } catch {
        return false;
      }
    });
  }
  return walkFiles(repoRoot, []);
}

function main() {
  console.log('🔍 [cogNNitive] Guarding tracked text encoding...');
  const files = discoverTextCandidates(REPO_ROOT);
  const violations = scanForEncodingViolations(files, { repoRoot: REPO_ROOT });
  if (violations.length > 0) {
    console.error(`❌ Tracked text encoding violations (${violations.length}):`);
    for (const v of violations) console.error(`  - ${v.file}: ${v.reason}`);
    process.exit(1);
  }
  console.log(`✅ Encoding guard: ${files.length} text file(s) valid UTF-8, no U+FFFD.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  checkTextBuffer,
  scanForEncodingViolations,
  discoverTextCandidates,
  DEFAULT_ALLOWLIST,
  GENERATED_RE,
};
