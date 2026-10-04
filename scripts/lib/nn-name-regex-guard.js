#!/usr/bin/env node
/**
 * scripts/lib/nn-name-regex-guard.js
 *
 * One definition of `_NN.md`: the naming contract in
 * `iNNfo/packages/innfo-core/src/naming/` is the only place that may define the
 * `_NN.md` filename pattern or build a timestamp. Every other consumer imports
 * the contract's predicates. This guard fails when a second definition appears.
 *
 * Forbidden outside the contract (code lines only; pure comment lines are ignored):
 *   - a `_NN.md` regex (the escaped-dot form, also inside a RegExp string)
 *   - a standalone quoted `_NN.md` literal, as in `name.endsWith('_NN.md')`
 *   - an eight-digit stamp pattern (the digits-quantifier `8` form)
 *   - a local-time stamp builder (`getHours()`): stamps are UTC and come from the contract
 *
 * Scan scope: `.ts`, `.js`, `.vue`, `.mjs` runtime source under
 *   iNNfo/packages/<pkg>/src, iNNfo/apps/<app>/src, scripts, skills/<name>/scripts.
 * Out of scope: generated files, tests, `legacy/**` quarantine, docs, openspec,
 * the CDN bundles, and frozen `_V_` files.
 *
 * Every allowlist entry carries a reason; an entry without one fails the guard.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const CONTRACT_DIR = 'iNNfo/packages/innfo-core/src/naming/';

/** `id` is stable, `re` is the match, `label` says what to use instead. */
const PATTERNS = [
  { id: 'nn-md-regex', re: /_NN\\+\.md/, label: 'parseName / isNNName / displayStem from the naming contract' },
  { id: 'nn-md-literal', re: /['"`]_NN\.md['"`]/, label: 'isNNName / ensureNNFilename from the naming contract' },
  { id: 'stamp-8digit', re: /\\d\{8\}/, label: 'parseName / compareMembers (UTC stamp) from the naming contract' },
  { id: 'local-time-stamp', re: /\.getHours\(\)/, label: 'formatUtcStamp from the naming contract' },
];

/**
 * Files allowed to carry a pattern, each with a mandatory reason. Prefix match.
 * @type {Array<{ pattern: string, reason: string }>}
 */
const ALLOWLIST = [
  { pattern: 'scripts/check-spec-version.mjs', reason: 'published-spec URL tooling: identifies the published L0-L2 spec files, not workspace files' },
  { pattern: 'scripts/migrate-spec-urls.mjs', reason: 'historical one-time codemod over published-spec URLs' },
  { pattern: 'scripts/lib/legacy-write-guard.js', reason: 'carries the retired workspace-entrypoint token table; matches a retired name, not the live pattern' },
  { pattern: 'scripts/lib/tag-pin-freshness.js', reason: 'matches the canonical blueprint spec filename (a fixed package asset identity), not the workspace model name pattern' },
  { pattern: 'scripts/lib/nn-name-regex-guard.js', reason: 'this guard carries the pattern table itself' },
  { pattern: 'iNNfo/packages/innfo-core/src/schema/canonical-registry.ts', reason: 'published-spec URL matching in the offline registry (spec identity, not workspace files)' },
  { pattern: 'iNNfo/packages/innfo-core/src/workspace/integrity/versionStatus.ts', reason: 'parses pinned published-spec URLs (spec identity, not workspace files)' },
  { pattern: 'iNNfo/apps/innfo-editor/src/utils/version.ts', reason: 'reads the version out of a legacy `_V_` filename; replaced by frontmatter in slice S6 (task 6.3)' },
  { pattern: 'iNNfo/apps/innfo-editor/src/composables/useBlueprintVersionNotice.ts', reason: 'reads the version out of a legacy `_V_` filename; replaced by frontmatter in slice S6 (task 6.3)' },
  { pattern: 'iNNfo/apps/innfo-editor/src/shared/widgets/TimestampWidget.vue', reason: 'UI widget that displays a user-local date and time; not a file stamp' },
  { pattern: 'iNNfo/apps/innfo-editor/src/services/WorkspacePersistenceService.ts', reason: 'local-time backup file prefix, not a write-once family stamp; revisited with the backup rework' },
  { pattern: 'skills/nn-upgrade/scripts/backup-workspace.js', reason: 'local-time backup folder name, not a write-once family stamp; revisited with the backup rework' },
];

const SCOPE_RE = [
  /^iNNfo\/packages\/[^/]+\/src\//,
  /^iNNfo\/apps\/[^/]+\/src\//,
  /^scripts\//,
  /^skills\/[^/]+\/scripts\//,
];

const CODE_EXT_RE = /\.(ts|js|vue|mjs)$/;

/** @param {string} relPath posix-style relative path */
function inScope(relPath) {
  return CODE_EXT_RE.test(relPath) && SCOPE_RE.some((re) => re.test(relPath));
}

/** @param {string} relPath posix-style relative path */
function isExcluded(relPath) {
  if (relPath.startsWith(CONTRACT_DIR)) return true;
  if (relPath.startsWith('openspec/') || relPath.startsWith('docs/')) return true;
  if (relPath.includes('/cdn/') || relPath.includes('/dist/')) return true;
  if (relPath.startsWith('temp/') || relPath.includes('/temp/')) return true;
  if (/\.generated\./.test(relPath)) return true;
  if (/\.(test|spec)\.(js|mjs|ts|vue)$/.test(relPath)) return true;
  if (/(^|\/)(tests?|__tests__|fixtures|test-fixtures)\//.test(relPath)) return true;
  if (relPath.includes('/src/legacy/')) return true;
  if (/_V_\d+-\d+-\d+/.test(relPath)) return true;
  return false;
}

/** A pure comment line (`//`, block-comment body, HTML comment) is never a definition. */
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--');
}

/**
 * Validates the allowlist itself: every entry must carry a reason.
 * @returns {string[]} errors
 */
function validateAllowlist(allowlist = ALLOWLIST) {
  const errors = [];
  for (const entry of allowlist) {
    if (!entry || typeof entry.pattern !== 'string' || !entry.pattern.trim()) {
      errors.push('Allowlist entry is missing a pattern');
      continue;
    }
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) {
      errors.push(`Allowlist entry "${entry.pattern}" is missing a reason`);
    }
  }
  return errors;
}

/**
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string[]} [options.files]
 * @param {(file: string) => string} [options.readFile]
 * @param {Array<{ pattern: string, reason: string }>} [options.allowlist]
 * @returns {{ ok: boolean, errors: string[], hits: Array<{ file: string, pattern: string, line: number }> }}
 */
function checkNnNameRegexGuard(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
  const readFile = options.readFile || ((f) => fs.readFileSync(f, 'utf8'));
  const allowlist = options.allowlist || ALLOWLIST;
  const errors = validateAllowlist(allowlist);
  const hits = [];

  const injected = Array.isArray(options.files);
  let files = options.files;
  if (!files) {
    try {
      const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      files = output.split(/\r?\n/).filter(Boolean);
    } catch (err) {
      errors.push(`Failed to list files: ${err.message}`);
      files = [];
    }
  }

  for (const raw of files) {
    const relPath = raw.split(path.sep).join('/');
    if (!inScope(relPath) || isExcluded(relPath)) continue;
    if (allowlist.some((e) => e.reason && e.reason.trim() && relPath.startsWith(e.pattern))) continue;

    const fullPath = path.isAbsolute(raw) ? raw : path.join(repoRoot, raw);
    if (!injected && !fs.existsSync(fullPath)) continue;

    let content;
    try {
      content = readFile(injected ? raw : fullPath);
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (isCommentLine(lines[i])) continue;
      for (const pattern of PATTERNS) {
        if (pattern.re.test(lines[i])) hits.push({ file: relPath, pattern: pattern.id, line: i + 1, label: pattern.label });
      }
    }
  }

  for (const hit of hits) {
    errors.push(`Second definition of NN naming (${hit.pattern}) in ${hit.file}:${hit.line}; use ${hit.label}`);
  }

  return { ok: errors.length === 0, errors, hits };
}

if (require.main === module) {
  const result = checkNnNameRegexGuard();
  if (!result.ok) {
    console.error('❌ NN Name Regex Guard failed:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log('▶ NN Name Regex Guard: the naming contract is the only definition of `_NN.md` and stamps.');
}

module.exports = { checkNnNameRegexGuard, inScope, isExcluded, isCommentLine, validateAllowlist, PATTERNS, ALLOWLIST };
