/**
 * scripts/lib/node-engine-check.js
 *
 * Deterministic, zero-dependency guard against the "CI Node pin excludes an
 * installed dependency's own engines.node floor" failure mode (expediente:
 * 2026-09-24 — jsdom@30.1.1 declares `engines.node: "^22.22.2 || ^24.15.0 ||
 * >=26.0.0"`; CI was pinned to Node 20 in all 3 jobs of
 * `.github/workflows/ci.yml` and root `package.json` had no
 * `engine-strict`, so the mismatch only surfaced as opaque install/runtime
 * failures rather than a clear signal. Reactive fix already landed
 * (`448ae6f`): CI now pins Node 22 everywhere, `.npmrc` has
 * `engine-strict=true`, and root `package.json` `engines.node` matches
 * jsdom's own floor. This module is the *proactive* check that would catch
 * the next such mismatch before it reaches CI.
 *
 * No `semver` dependency — this repo is zero-dependency by convention (see
 * `scripts/lib/yaml-lite.js`, `scripts/lib/yaml-parser.js`); the range
 * satisfier below hand-rolls just enough of node-semver's grammar for
 * realistic `engines.node` fields: `^x.y.z`, `~x.y.z`, `>=`, `>`, `<=`, `<`,
 * bare/`=x.y.z`, space-separated AND within one comparator set, and `||` for
 * OR between comparator sets.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Real-world `engines.node` fields sometimes put a space between an
 * operator and its version (e.g. `">= 8"`, `"^12 || ^14 || >= 16"`). The AND
 * tokenizer below splits a comparator set on whitespace, so that space would
 * otherwise split one comparator into two meaningless tokens. Collapse it
 * before any parsing happens.
 */
function normalizeRange(range) {
  return String(range).replace(/(\^|~|>=|<=|>|<|=)\s+(?=v?\d)/g, '$1');
}

/** Parses "18", "18.2", "18.2.3", "v18.2.3" into a [major, minor, patch] tuple, or null. */
function parseVersion(v) {
  const m = String(v).trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]), m[2] !== undefined ? Number(m[2]) : 0, m[3] !== undefined ? Number(m[3]) : 0];
}

/** > 0 if a > b, < 0 if a < b, 0 if equal. */
function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Does `version` ([major,minor,patch]) satisfy one comparator token (e.g. "^22.22.2")? */
function satisfiesComparator(version, token) {
  const trimmed = token.trim();
  if (!trimmed) return true;
  const m = trimmed.match(/^(\^|~|>=|<=|>|<|=)?\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return true; // unparsable token — don't block the whole gate on it
  const op = m[1] || '=';
  const parts = [Number(m[2]), m[3] !== undefined ? Number(m[3]) : 0, m[4] !== undefined ? Number(m[4]) : 0];
  const cmp = compareVersions(version, parts);
  switch (op) {
    case '>=':
      return cmp >= 0;
    case '>':
      return cmp > 0;
    case '<=':
      return cmp <= 0;
    case '<':
      return cmp < 0;
    case '=':
      return cmp === 0;
    case '^': {
      // Node major versions are always > 0, so ^x.y.z == >=x.y.z <(x+1).0.0.
      const upper = [parts[0] + 1, 0, 0];
      return compareVersions(version, parts) >= 0 && compareVersions(version, upper) < 0;
    }
    case '~': {
      const upper = [parts[0], parts[1] + 1, 0];
      return compareVersions(version, parts) >= 0 && compareVersions(version, upper) < 0;
    }
    default:
      return true;
  }
}

/** AND of every space-separated comparator inside one `||`-delimited set. */
function satisfiesComparatorSet(version, set) {
  const tokens = set.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => satisfiesComparator(version, t));
}

/**
 * Does the Node version string `versionStr` satisfy the `engines.node`-style
 * range `range` (e.g. `"^22.22.2 || ^24.15.0 || >=26.0.0"`)?
 * @param {string} versionStr
 * @param {string} range
 * @returns {boolean}
 */
function satisfiesRange(versionStr, range) {
  const version = parseVersion(versionStr);
  if (!version) return false;
  const orSets = normalizeRange(range).split('||');
  return orSets.some((set) => satisfiesComparatorSet(version, set));
}

/** True for a bare major-only CI pin like `"22"` (no minor/patch). */
function isMajorOnly(versionStr) {
  return /^v?\d+$/.test(String(versionStr).trim());
}

/** [lower, upper) bounds (each a [maj,min,patch] triple or null = unbounded) for one comparator. */
function comparatorBounds(token) {
  const m = token
    .trim()
    .match(/^(\^|~|>=|<=|>|<|=)?\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return { lower: null, upper: null };
  const op = m[1] || '=';
  const parts = [Number(m[2]), m[3] !== undefined ? Number(m[3]) : 0, m[4] !== undefined ? Number(m[4]) : 0];
  switch (op) {
    case '^':
      return { lower: parts, upper: [parts[0] + 1, 0, 0] };
    case '~':
      return { lower: parts, upper: [parts[0], parts[1] + 1, 0] };
    case '>=':
    case '>':
      return { lower: parts, upper: null };
    case '<=':
    case '<':
      return { lower: null, upper: parts };
    case '=':
    default:
      return { lower: parts, upper: parts };
  }
}

/** Combined (AND) [lower, upper) bounds for one `||`-branch (space-separated comparators). */
function setBounds(set) {
  let lower = null;
  let upper = null;
  for (const token of set.trim().split(/\s+/).filter(Boolean)) {
    const b = comparatorBounds(token);
    if (b.lower && (lower === null || compareVersions(b.lower, lower) > 0)) lower = b.lower;
    if (b.upper && (upper === null || compareVersions(b.upper, upper) < 0)) upper = b.upper;
  }
  return { lower, upper };
}

/**
 * Does `range` include ANY version within major `major` (e.g. does
 * `"^22.22.2 || ^24.15.0 || >=26.0.0"` include any 22.x version)?
 *
 * Used for bare major-only CI pins (`node-version: 22`), where the actual
 * resolved patch (whatever `actions/setup-node` installs as "latest 22.x")
 * is unknown to us — treating the bare pin as the literal floor `22.0.0`
 * would false-positive against ranges like jsdom's, which only exclude the
 * *early* 22.x patches, not the whole major.
 */
function rangeOverlapsMajor(range, major) {
  const majorLower = [major, 0, 0];
  const majorUpper = [major + 1, 0, 0];
  return normalizeRange(range)
    .split('||')
    .some((set) => {
      const { lower, upper } = setBounds(set);
      const overlapsBelow = upper === null || compareVersions(upper, majorLower) > 0;
      const overlapsAbove = lower === null || compareVersions(lower, majorUpper) < 0;
      return overlapsBelow && overlapsAbove;
    });
}

/**
 * Does the CI-pinned Node version `ciVersion` (as it literally appears in
 * `node-version:`) satisfy dependency `range`? A fully-specified CI version
 * (e.g. an exact `22.22.2`) is checked exactly via `satisfiesRange`; a bare
 * major-only pin (e.g. `22`) is checked via major-overlap (see
 * `rangeOverlapsMajor`), since `actions/setup-node` resolves it to whatever
 * the latest patch of that major is at run time.
 */
function ciVersionSatisfiesRange(ciVersion, range) {
  if (isMajorOnly(ciVersion)) {
    const version = parseVersion(ciVersion);
    return version ? rangeOverlapsMajor(range, version[0]) : false;
  }
  return satisfiesRange(ciVersion, range);
}

/** Extracts every `node-version:` value from a CI workflow YAML's raw text. */
function extractCiNodeVersions(ciYamlText) {
  const versions = [];
  const re = /node-version:\s*['"]?([^\s'"]+)['"]?/g;
  let m;
  while ((m = re.exec(ciYamlText))) {
    versions.push(m[1]);
  }
  return versions;
}

/** Reads one node_modules package's `engines.node`, or null if absent/unreadable. */
function readEngineNode(pkgJsonPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const engineNode = pkg.engines && pkg.engines.node;
    if (!engineNode) return null;
    return { name: pkg.name || path.basename(path.dirname(pkgJsonPath)), engineNode };
  } catch {
    return null;
  }
}

/**
 * Lists every installed package directly under `nodeModulesDir` that
 * declares `engines.node`, descending one level into `@scope` directories.
 * @returns {Array<{name: string, engineNode: string}> | null} null when the
 *   directory doesn't exist (workspace not installed).
 */
function listInstalledPackages(nodeModulesDir) {
  if (!fs.existsSync(nodeModulesDir)) return null;
  let entries;
  try {
    entries = fs.readdirSync(nodeModulesDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(nodeModulesDir, entry.name);
      let subEntries;
      try {
        subEntries = fs.readdirSync(scopeDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const sub of subEntries) {
        if (!sub.isDirectory()) continue;
        const info = readEngineNode(path.join(scopeDir, sub.name, 'package.json'));
        if (info) results.push(info);
      }
    } else {
      const info = readEngineNode(path.join(nodeModulesDir, entry.name, 'package.json'));
      if (info) results.push(info);
    }
  }
  return results;
}

/** Glob-expands `<dir>/*` workspace patterns from root package.json `workspaces`. */
function expandWorkspaces(repoRoot, patterns) {
  const dirs = [];
  for (const pattern of patterns || []) {
    if (pattern.endsWith('/*')) {
      const base = path.join(repoRoot, ...pattern.slice(0, -2).split('/'));
      if (!fs.existsSync(base)) continue;
      let entries;
      try {
        entries = fs.readdirSync(base, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) dirs.push(path.join(base, entry.name));
      }
    } else {
      dirs.push(path.join(repoRoot, ...pattern.split('/')));
    }
  }
  return dirs;
}

/**
 * Checks every CI-pinned Node version (from `.github/workflows/ci.yml`)
 * against the `engines.node` declared by every installed dependency across
 * the repo root and each npm workspace.
 * @param {string} repoRoot
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
function checkNodeEngines(repoRoot = process.cwd()) {
  const warnings = [];
  const errors = [];

  const ciPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
  if (!fs.existsSync(ciPath)) {
    warnings.push(`CI workflow not found at ${ciPath}; skipping node-engine check.`);
    return { ok: true, errors, warnings };
  }

  const ciText = fs.readFileSync(ciPath, 'utf8');
  const ciVersionsRaw = extractCiNodeVersions(ciText);
  if (ciVersionsRaw.length === 0) {
    warnings.push(`No "node-version:" entries found in ${ciPath}; skipping node-engine check.`);
    return { ok: true, errors, warnings };
  }

  const uniqueCiVersions = [...new Set(ciVersionsRaw)];
  if (uniqueCiVersions.length > 1) {
    warnings.push(`CI "node-version:" values disagree with each other: ${uniqueCiVersions.join(', ')}`);
  }

  let pkgJson;
  try {
    pkgJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  } catch (e) {
    errors.push(`Could not read root package.json: ${e.message}`);
    return { ok: false, errors, warnings };
  }

  const workspaceDirs = expandWorkspaces(repoRoot, pkgJson.workspaces);
  const scanDirs = [repoRoot, ...workspaceDirs];

  for (const dir of scanDirs) {
    const label = path.relative(repoRoot, dir) || '.';
    const nodeModulesDir = path.join(dir, 'node_modules');
    const pkgs = listInstalledPackages(nodeModulesDir);
    if (pkgs === null) {
      warnings.push(`node_modules not found under ${label}; skipping (not installed).`);
      continue;
    }
    for (const pkg of pkgs) {
      for (const ciVersion of uniqueCiVersions) {
        if (!ciVersionSatisfiesRange(ciVersion, pkg.engineNode)) {
          errors.push(
            `${pkg.name} (under ${label}) declares engines.node "${pkg.engineNode}", which excludes CI-pinned Node ${ciVersion}.`,
          );
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { checkNodeEngines, satisfiesRange };
