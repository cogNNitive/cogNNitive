#!/usr/bin/env node

/**
 * scripts/blueprint-catalog.mjs
 *
 * Generates iNNfo/specs/bluepriNNts/catalog.json — the machine-readable Level-2
 * blueprint catalog consumed by the nn-preflight Tier-3 upgrade detection scan
 * (skills/nn-preflight/scripts/upgrade-check.js).
 *
 * Discovery rules:
 *   - Walks the bluepriNNts tree for level-2 documents only (skips samples/).
 *   - Canonical name comes from the containing directory (`<name>/spec_NN.md`),
 *     or from the bare filename for the root workspace spec (`workspace_spec_NN.md`).
 *   - Version is the authoritative frontmatter `blueprint_version` (`V_x-y-z` or
 *     dotted `x.y.z`), NOT the filename — filenames are canonical/unversioned.
 *   - `adopted` is the highest `blueprint_version` discovered for each name. On
 *     `main` only the current canonical spec is on disk, so `versions` carries a
 *     single entry; historical versions live in immutable `templates-v*` tags.
 *
 * Usage:
 *   node scripts/blueprint-catalog.mjs [--check] [--root <dir>] [--out <file>] [--release-tag <tag>]
 *
 *   --check        compare the rendered catalog to the committed file; exit 1 on drift.
 *   --root         override the bluepriNNts tree (default: iNNfo/specs/bluepriNNts).
 *   --out          override the output file (default: iNNfo/specs/bluepriNNts/catalog.json).
 *   --release-tag  override the `release_tag` stamped on every entry (default: newest
 *                  `blueprints-v*` git tag of the repo, or `blueprints-v0.0.0`).
 *
 * Zero external dependencies. LF line endings, stable key ordering.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_ROOT = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts');
const DEFAULT_OUT = path.join(DEFAULT_ROOT, 'catalog.json');

const SKIP_DIRS = new Set(['samples', 'node_modules', '.git', 'dist', '.spec-cache', 'backups', 'archive']);

/**
 * Retired templates that are frozen byte-identical for legacy resolution but no
 * longer part of ACTIVE distribution. They are emitted under a top-level
 * `frozen` object and dropped from `blueprints` (so nn-preflight upgrade-check —
 * which reads only `catalog.blueprints` — gives them no upgrade notices).
 */
const FROZEN_NAMES = ['cogNNitive', 'workspace'];

/**
 * The 7 Core `bluepriNNts` that remain bundled in `manifest/source.yaml` and the
 * offline canonical registry. Every other catalog entry is an optional vertical
 * hydrated on demand (`tier: 'free'`).
 */
const CORE_NAMES = new Set(['domaiNN', 'changes', 'sidecar', 'sources', 'artifacts', 'procedures', 'blank']);

/** Fallback used when git tag resolution fails (offline checkout, no repo). */
const FALLBACK_RELEASE_TAG = 'blueprints-v0.0.0';

/**
 * Newest `blueprints-vX.Y.Z` git tag of the repository, or `FALLBACK_RELEASE_TAG`
 * when git is unavailable or no such tag exists. Injected into every blueprint
 * entry as `release_tag` so on-demand hydration can pin a fetch.
 */
function resolveReleaseTag(override) {
  if (override) return override;
  try {
    const out = execFileSync('git', ['tag', '--list', 'blueprints-v*'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const tags = out
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter((t) => /^blueprints-v\d+\.\d+\.\d+$/.test(t));
    if (tags.length === 0) return FALLBACK_RELEASE_TAG;
    tags.sort((a, b) => compareVersions(a, b));
    return tags[tags.length - 1];
  } catch {
    return FALLBACK_RELEASE_TAG;
  }
}

/**
 * Sorted child directory names of `<rootDir>/<name>/skills/` that contain a
 * `SKILL.md`. Empty array when the package carries no embedded skills.
 */
function embeddedSkills(rootDir, name) {
  const dir = path.join(rootDir, name, 'skills');
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'SKILL.md'))) {
      out.push(entry.name);
    }
  }
  return out.sort();
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

function parseSemVer(v) {
  const m = String(v).match(/(\d+)[-_.](\d+)[-_.](\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compareVersions(a, b) {
  const va = parseSemVer(a);
  const vb = parseSemVer(b);
  if (!va || !vb) return 0;
  return (va.major - vb.major) || (va.minor - vb.minor) || (va.patch - vb.patch);
}

/** Canonical `V_x-y-z` token from an authoritative `blueprint_version` value. */
function normalizeBlueprintVersion(raw) {
  const sv = parseSemVer(raw);
  return sv ? `V_${sv.major}-${sv.minor}-${sv.patch}` : null;
}

/**
 * Canonical template name for a level-2 spec path:
 *   `<name>/spec_NN.md`      -> `<name>`  (subdirectory templates)
 *   `workspace_spec_NN.md`   -> `workspace` (root workspace spec)
 */
function nameFromPath(relPosix) {
  const parts = relPosix.split('/');
  if (parts.length > 1) return parts[parts.length - 2];
  return parts[0]
    .replace(/\.(md|markdown)$/i, '')
    .replace(/_(NN|FORMAT|F)$/i, '')
    .replace(/_spec$/i, '');
}

function walk(rootDir, rel, files) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(rootDir, rel), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      walk(rootDir, path.join(rel, entry.name), files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(rel, entry.name));
    }
  }
}

function generate(rootDir, releaseTag) {
  const files = [];
  walk(rootDir, '', files);

  const byName = new Map();
  const warnings = [];

  for (const rel of files) {
    const abs = path.join(rootDir, rel);
    let content;
    try {
      content = fs.readFileSync(abs, 'utf-8');
    } catch {
      continue;
    }
    const fm = parseFrontmatter(content);
    if (fm.level !== '2' && fm.level !== 2) continue;

    const relPosix = rel.replace(/\\/g, '/');
    const name = nameFromPath(relPosix);
    // Frozen legacy files are byte-identical and predate `blueprint_version`: they carry
    // `template_version`, which is the version they are catalogued under.
    const rawVersion = fm.blueprint_version || (FROZEN_NAMES.includes(name) ? fm.template_version : undefined);
    const version = normalizeBlueprintVersion(rawVersion);
    if (!version) {
      warnings.push(`skipped (no parseable blueprint_version): ${relPosix}`);
      continue;
    }

    const url = fm.spec_url || `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/${relPosix}`;

    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({
      blueprint_version: version,
      spec_version: fm.spec_version || null,
      title: fm.title || null,
      url,
      // Transient: `when_to_use` falls back to `description`. Kept out of the
      // rendered `versions` shape (stripped below) and read from the adopted one.
      _when_to_use: fm.when_to_use || fm.description || null,
    });
  }

  const blueprints = {};
  const frozen = {};
  for (const [name, versions] of byName.entries()) {
    versions.sort((a, b) => compareVersions(a.blueprint_version, b.blueprint_version));
    const adopted = versions[versions.length - 1];
    const whenToUse = adopted._when_to_use;
    const versionsOut = versions.map(({ blueprint_version, spec_version, title, url }) => ({
      blueprint_version,
      spec_version,
      title,
      url,
    }));
    const entry = {
      name,
      adopted: adopted.blueprint_version,
      versions: versionsOut,
    };
    if (FROZEN_NAMES.includes(name)) {
      // Frozen legacy specs are retired from active distribution: their
      // partition shape is intentionally unchanged (no tier/access metadata).
      frozen[name] = entry;
    } else {
      blueprints[name] = {
        name,
        adopted: entry.adopted,
        tier: CORE_NAMES.has(name) ? 'core' : 'free',
        access: 'public',
        when_to_use: whenToUse,
        release_tag: releaseTag,
        embedded_skills: embeddedSkills(rootDir, name),
        versions: versionsOut,
      };
    }
  }

  return {
    generator: 'scripts/blueprint-catalog.mjs',
    blueprints: Object.fromEntries(Object.keys(blueprints).sort().map((k) => [k, blueprints[k]])),
    frozen: Object.fromEntries(Object.keys(frozen).sort().map((k) => [k, frozen[k]])),
    warnings,
  };
}

function render(catalog) {
  return JSON.stringify(catalog, null, 2) + '\n';
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const rootIdx = argv.indexOf('--root');
  const outIdx = argv.indexOf('--out');
  const tagIdx = argv.indexOf('--release-tag');
  const rootDir = rootIdx !== -1 ? argv[rootIdx + 1] : DEFAULT_ROOT;
  const outFile = outIdx !== -1 ? argv[outIdx + 1] : DEFAULT_OUT;
  const releaseTag = resolveReleaseTag(tagIdx !== -1 ? argv[tagIdx + 1] : undefined);

  if (!fs.existsSync(rootDir)) {
    console.error(`blueprint-catalog: bluepriNNts tree not found: ${rootDir}`);
    process.exit(2);
  }

  const catalog = generate(rootDir, releaseTag);
  const rendered = render(catalog);

  if (check) {
    const committed = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf-8') : null;
    if (rendered === committed) {
      console.log(`blueprint-catalog: OK — ${outFile} is up to date.`);
      process.exit(0);
    }
    console.error(`blueprint-catalog: DRIFT — ${outFile} is stale. Re-run without --check.`);
    if (catalog.warnings.length) {
      console.error(catalog.warnings.map((w) => `  - ${w}`).join('\n'));
    }
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, rendered, 'utf-8');
  const count = Object.keys(catalog.blueprints).length;
  console.log(`blueprint-catalog: wrote ${outFile} (${count} blueprints).`);
}

main();