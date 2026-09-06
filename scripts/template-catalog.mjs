#!/usr/bin/env node

/**
 * scripts/template-catalog.mjs
 *
 * Generates iNNfo/specs/templates/catalog.json — the machine-readable Level-2
 * template catalog consumed by the nn-preflight Tier-3 upgrade detection scan
 * (actioNN/skills/nn-preflight/scripts/upgrade-check.js).
 *
 * Discovery rules:
 *   - Walks the templates tree for level-2 documents only (skips samples/).
 *   - Canonical name + version come from the filename (<name>_V_x-y-z..._NN.md)
 *     or from the <name>/V_x-y-z/spec_NN.md package layout.
 *   - `adopted` is the highest published template_version for each name.
 *
 * Usage:
 *   node scripts/template-catalog.mjs [--check] [--root <dir>] [--out <file>]
 *
 *   --check   compare the rendered catalog to the committed file; exit 1 on drift.
 *   --root    override the templates tree (default: iNNfo/specs/templates).
 *   --out     override the output file (default: iNNfo/specs/templates/catalog.json).
 *
 * Zero external dependencies. LF line endings, stable key ordering.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_ROOT = path.join(REPO_ROOT, 'iNNfo', 'specs', 'templates');
const DEFAULT_OUT = path.join(DEFAULT_ROOT, 'catalog.json');

const SKIP_DIRS = new Set(['samples', 'node_modules', '.git', 'dist', '.spec-cache', 'backups', 'archive']);

/**
 * Retired templates that are frozen byte-identical for legacy resolution but no
 * longer part of ACTIVE distribution. They are emitted under a top-level
 * `frozen` object and dropped from `templates` (so nn-preflight upgrade-check —
 * which reads only `catalog.templates` — gives them no upgrade notices).
 */
const FROZEN_NAMES = ['cogNNitive', 'base'];

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
  const m = String(v).match(/V_(\d+)-(\d+)-(\d+)/i);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compareVersions(a, b) {
  const va = parseSemVer(a);
  const vb = parseSemVer(b);
  if (!va || !vb) return 0;
  return (va.major - vb.major) || (va.minor - vb.minor) || (va.patch - vb.patch);
}

function versionFromFilename(basename) {
  const m = basename.match(/^(.+?)_V_(\d+)-(\d+)-(\d+)(?:_spec)?_NN\.md$/i);
  if (m) return { name: m[1], version: `V_${m[2]}-${m[3]}-${m[4]}` };
  return null;
}

function versionFromPackageDir(relPath) {
  const m = relPath.match(/^([^/\\]+)[/\\]V_(\d+)-(\d+)-(\d+)[/\\]spec_NN\.md$/i);
  if (m) return { name: m[1], version: `V_${m[2]}-${m[3]}-${m[4]}` };
  return null;
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

function generate(rootDir) {
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

    const basename = path.basename(rel);
    const fromName = versionFromFilename(basename) || versionFromPackageDir(rel.replace(/\\/g, '/'));
    if (!fromName) {
      warnings.push(`skipped (no version in path): ${rel}`);
      continue;
    }

    const relPosix = rel.replace(/\\/g, '/');
    const url = fm.spec_url || `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/${relPosix}`;

    if (!byName.has(fromName.name)) byName.set(fromName.name, []);
    byName.get(fromName.name).push({
      template_version: fromName.version,
      spec_version: fm.spec_version || null,
      title: fm.title || null,
      url,
    });
  }

  const templates = {};
  const frozen = {};
  for (const [name, versions] of byName.entries()) {
    versions.sort((a, b) => compareVersions(a.template_version, b.template_version));
    const entry = {
      name,
      adopted: versions[versions.length - 1].template_version,
      versions,
    };
    if (FROZEN_NAMES.includes(name)) {
      frozen[name] = entry;
    } else {
      templates[name] = entry;
    }
  }

  return {
    generator: 'scripts/template-catalog.mjs',
    templates: Object.fromEntries(Object.keys(templates).sort().map((k) => [k, templates[k]])),
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
  const rootDir = rootIdx !== -1 ? argv[rootIdx + 1] : DEFAULT_ROOT;
  const outFile = outIdx !== -1 ? argv[outIdx + 1] : DEFAULT_OUT;

  if (!fs.existsSync(rootDir)) {
    console.error(`template-catalog: templates tree not found: ${rootDir}`);
    process.exit(2);
  }

  const catalog = generate(rootDir);
  const rendered = render(catalog);

  if (check) {
    const committed = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf-8') : null;
    if (rendered === committed) {
      console.log(`template-catalog: OK — ${outFile} is up to date.`);
      process.exit(0);
    }
    console.error(`template-catalog: DRIFT — ${outFile} is stale. Re-run without --check.`);
    if (catalog.warnings.length) {
      console.error(catalog.warnings.map((w) => `  - ${w}`).join('\n'));
    }
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, rendered, 'utf-8');
  const count = Object.keys(catalog.templates).length;
  console.log(`template-catalog: wrote ${outFile} (${count} templates).`);
}

main();