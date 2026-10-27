#!/usr/bin/env node
/**
 * scripts/lib/nn-name-invariant-guard.js
 *
 * Repository gate for the universal `_NN` invariant: the stem of every
 * `*_NN.md` document equals `<bp>` or ends with `_<bp>` (case-insensitive) and
 * carries no `_V_<version>` token. The rule itself is `checkNameInvariant` in
 * the naming contract (read through the committed trannsform mirror, which a
 * separate verify step keeps fresh). In a user domaiNN the same rule is only a
 * validator warning (`NN_NAME_INVARIANT`); here a violation is an ERROR.
 *
 * Carve-out (frozen content is reported, never failed, never renamed):
 *   - published specs `iNNfo/specs/**` whose name carries `_V_`
 *   - the folder of every blueprint in `manifest/source.yaml` `frozen_blueprints`
 *   - `iNNfo/specs/bluepriNNts/workspace/procedures/**`, named explicitly because
 *     the manifest's frozen workspace entry points only at the flat spec file
 *
 * Out of scope: test directories (deliberately legacy inputs), `openspec/`,
 * `temp/`, `node_modules/`.
 *
 * TEMPORARY_ALLOWLIST lists the non-frozen violators that slice S6 part B (task
 * 6.5) renames. It must be empty once those renames land.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { parseFocusedYaml, parseFrontmatter } = require('./yaml-parser.js');

const MANIFEST_PATH = 'manifest/source.yaml';

/** Fixed carve-out prefixes (posix, repo-relative). */
const FROZEN_PREFIXES = [
  'iNNfo/specs/bluepriNNts/workspace/procedures/',
];

/**
 * Violators that part B of slice S6 renames. Prefix match; a reason is mandatory.
 * @type {Array<{ pattern: string, reason: string }>}
 */
const TEMPORARY_ALLOWLIST = [];

/**
 * Carve-out prefixes of the frozen blueprints: the folder of a `spec_NN.md` entry,
 * or the exact file of a flat entry (e.g. `bluepriNNts/workspace_spec_NN.md`,
 * whose folder holds live blueprints).
 * @param {string} manifestText contents of manifest/source.yaml
 * @returns {string[]}
 */
function frozenBlueprintDirs(manifestText) {
  let doc;
  try {
    doc = parseFocusedYaml(manifestText);
  } catch {
    return [];
  }
  const dirs = [];
  for (const entry of doc.frozen_blueprints || []) {
    if (!entry || typeof entry.path !== 'string') continue;
    const p = entry.path.replace(/\\/g, '/');
    if (path.posix.basename(p) === 'spec_NN.md') dirs.push(`${path.posix.dirname(p)}/`);
    else dirs.push(p);
  }
  return dirs;
}

/** @param {string} relPath posix path @param {string[]} frozenDirs */
function isCarvedOut(relPath, frozenDirs) {
  if (FROZEN_PREFIXES.some((p) => relPath.startsWith(p))) return true;
  if (frozenDirs.some((p) => relPath.startsWith(p))) return true;
  // Package-level blueprint `defaults/` baseline documents (e.g.
  // `bluepriNNts/video-script/defaults/video-defaults_NN.md`) are blueprint-internal
  // data named by the blueprint spec, not user kNNowledge; the universal `_NN`
  // name invariant does not apply to them.
  if (relPath.startsWith('iNNfo/specs/bluepriNNts/') && relPath.includes('/defaults/')) return true;
  return relPath.startsWith('iNNfo/specs/') && /_V_/.test(path.posix.basename(relPath));
}

/** @param {string} relPath posix path */
function isOutOfScope(relPath) {
  if (relPath.startsWith('openspec/') || relPath.startsWith('temp/')) return true;
  if (relPath.includes('node_modules/')) return true;
  return /(^|\/)(tests?|__tests__|test-fixtures)\//.test(relPath);
}

/** @returns {string[]} errors */
function validateAllowlist(allowlist = TEMPORARY_ALLOWLIST) {
  const errors = [];
  for (const entry of allowlist) {
    if (!entry || typeof entry.pattern !== 'string' || !entry.pattern.trim()) {
      errors.push('Allowlist entry is missing a pattern');
    } else if (typeof entry.reason !== 'string' || !entry.reason.trim()) {
      errors.push(`Allowlist entry "${entry.pattern}" is missing a reason`);
    }
  }
  return errors;
}

/** `parent_spec.name` of a document, or undefined (no frontmatter, no parent_spec). */
function parentSpecNameOfText(text, parentSpecNameOf) {
  try {
    return parentSpecNameOf(parseFocusedYaml(parseFrontmatter(text)));
  } catch {
    return undefined;
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.repoRoot]
 * @param {string[]} [options.files] repo-relative paths (default: git-visible files)
 * @param {(file: string) => string} [options.readFile]
 * @param {string} [options.manifestText]
 * @param {Array<{ pattern: string, reason: string }>} [options.allowlist]
 * @returns {{ ok: boolean, errors: string[], violations: Array<{ file: string, expected: string }>, carvedOut: string[], allowlisted: string[] }}
 */
function checkNnNameInvariantGuard(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
  const allowlist = options.allowlist || TEMPORARY_ALLOWLIST;
  const errors = validateAllowlist(allowlist);
  const violations = [];
  const carvedOut = [];
  const allowlisted = [];

  const core = require(path.join(repoRoot, 'skills', 'nn-sources', 'scripts', 'lib', 'nn-core.generated.cjs'));
  const readFile = options.readFile || ((f) => fs.readFileSync(path.join(repoRoot, f), 'utf8'));
  const manifestText =
    options.manifestText !== undefined
      ? options.manifestText
      : fs.readFileSync(path.join(repoRoot, MANIFEST_PATH), 'utf8');
  const frozenDirs = frozenBlueprintDirs(manifestText);

  let files = options.files;
  if (!files) {
    try {
      files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
        .split(/\r?\n/)
        .filter(Boolean);
    } catch (err) {
      errors.push(`Failed to list files: ${err.message}`);
      files = [];
    }
  }

  for (const raw of files) {
    const relPath = raw.split(path.sep).join('/');
    if (!core.isNNName(relPath) || isOutOfScope(relPath)) continue;
    if (isCarvedOut(relPath, frozenDirs)) {
      carvedOut.push(relPath);
      continue;
    }
    let text;
    try {
      text = readFile(relPath);
    } catch {
      continue;
    }
    const parent = parentSpecNameOfText(text, core.parentSpecNameOf);
    const bp = parent ? core.blueprintNameOf(parent) : undefined;
    const result = core.checkNameInvariant(relPath, bp);
    if (!result) continue;
    if (allowlist.some((e) => e.reason && e.reason.trim() && relPath.startsWith(e.pattern))) {
      allowlisted.push(relPath);
      continue;
    }
    violations.push({ file: relPath, expected: result.expected });
    errors.push(`NN_NAME_INVARIANT: ${relPath} (blueprint: ${bp ?? 'unknown'}) must be named ${result.expected}`);
  }

  return { ok: errors.length === 0, errors, violations, carvedOut, allowlisted };
}

if (require.main === module) {
  const result = checkNnNameInvariantGuard();
  if (!result.ok) {
    console.error('❌ NN Name Invariant Guard failed:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  console.log(
    `▶ NN Name Invariant Guard: every non-frozen _NN.md name satisfies the invariant ` +
      `(${result.carvedOut.length} frozen path(s) carved out, ${result.allowlisted.length} temporarily allowlisted).`,
  );
}

module.exports = {
  checkNnNameInvariantGuard,
  isCarvedOut,
  isOutOfScope,
  frozenBlueprintDirs,
  validateAllowlist,
  TEMPORARY_ALLOWLIST,
  FROZEN_PREFIXES,
};
