#!/usr/bin/env node

/**
 * skills/nn-preflight/scripts/upgrade-check.js
 *
 * Tier-3 workspace template upgrade detection for the cogNNitive ecosystem.
 * Read-only: it inspects a workspace, classifies every Level-3 model against the
 * published Level-2 template catalog, and reports — it never mutates anything.
 *
 * Classification of a model's pinned template against the catalog `adopted`
 * version (highest published template_version for that template name):
 *
 *   current            — pinned == adopted
 *   upgrade-available  — pinned < adopted (gap reported as major/minor/patch)
 *   ahead              — pinned > adopted
 *   unlisted           — template name or version not in the catalog
 *   unpinned           — model has no resolvable parent_spec.url
 *
 * Consumed by preflight-check.js (--workspace-dir). Available upgrades are
 * informational and NEVER flip the preflight exit code to a blocker.
 *
 * CLI:
 *   node upgrade-check.js --workspace-dir <dir> --catalog-file <catalog.json> [--json]
 */

const fs = require('fs');
const path = require('path');
const { parseFrontmatter, parseFocusedYaml } = require('./lib/yaml-lite');

const SCAN_SKIP_DIRS = new Set([
  '.git', '.backup', '.spec-cache', 'node_modules', 'dist', 'backups', 'archive',
  'sources', 'conversations', 'export', 'artifacts', 'procedures', 'specs', 'templates',
]);

const VERSION_RE = /V_(\d+)-(\d+)-(\d+)/i;

function parseSemVer(v) {
  const m = String(v).match(VERSION_RE);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Gap between two template versions as the SemVer bump of `adopted` over `pinned`.
 * Returns 'same' | 'major' | 'minor' | 'patch' | null (unparseable).
 */
function gapKind(pinned, adopted) {
  const a = parseSemVer(pinned);
  const b = parseSemVer(adopted);
  if (!a || !b) return null;
  if (a.major === b.major && a.minor === b.minor && a.patch === b.patch) return 'same';
  if (a.major !== b.major) return 'major';
  if (a.minor !== b.minor) return 'minor';
  return 'patch';
}

/** Numeric comparison: -1 | 0 | 1. */
function compareVersions(a, b) {
  const va = parseSemVer(a);
  const vb = parseSemVer(b);
  if (!va || !vb) return 0;
  return (va.major - vb.major) || (va.minor - vb.minor) || (va.patch - vb.patch);
}

/**
 * Extract { name, version } from a canonical template URL.
 * Handles both the flat layout (<name>_V_x-y-z..._NN.md) and the package
 * layout (<name>/V_x-y-z/spec_NN.md). Returns null when the URL does not
 * pin a versioned canonical template (e.g. a local specialization).
 */
function parsePinnedUrl(url) {
  const basename = String(url).split('/').pop().replace(/\.md$/i, '');
  const flat = basename.match(/^(.+?)_V_(\d+)-(\d+)-(\d+)(?:_spec)?_NN$/i);
  if (flat) return { name: flat[1], version: `V_${flat[2]}-${flat[3]}-${flat[4]}` };
  const pkg = String(url).match(/templates\/([^/]+)\/V_(\d+)-(\d+)-(\d+)\/spec_NN\.md/i);
  if (pkg) return { name: pkg[1], version: `V_${pkg[2]}-${pkg[3]}-${pkg[4]}` };
  return null;
}

/** Recursive `*_NN.md` walk of the workspace, skipping noise/staging dirs. */
function walkModels(dir, files) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SCAN_SKIP_DIRS.has(entry.name)) continue;
      walkModels(path.join(dir, entry.name), files);
    } else if (entry.isFile() && entry.name.endsWith('_NN.md')) {
      files.push(path.join(dir, entry.name));
    }
  }
}

/** Discover Level-3 models in the workspace (models/ + root, recursively). */
function discoverModels(workspaceDir) {
  const files = [];
  walkModels(workspaceDir, files);
  const models = [];
  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    let fm;
    try {
      fm = parseFocusedYaml(parseFrontmatter(content)) || {};
    } catch {
      fm = {};
    }
    if (String(fm.level) !== '3') continue;
    const parentUrl = (fm.parent_spec && fm.parent_spec.url) || fm.spec_url || null;
    models.push({
      file,
      rel: path.relative(workspaceDir, file).replace(/\\/g, '/'),
      parentUrl,
    });
  }
  return models;
}

/**
 * Classify every workspace model against the catalog.
 * `catalog` shape: { templates: { <name>: { name, adopted, versions: [{template_version}] } } }
 */
function scanWorkspaceUpgrades(workspaceDir, catalog) {
  const models = discoverModels(workspaceDir);
  const items = [];
  const summary = {
    modelsScanned: models.length,
    current: 0,
    upgradeAvailable: 0,
    ahead: 0,
    unlisted: 0,
    unpinned: 0,
  };

  for (const model of models) {
    if (!model.parentUrl) {
      summary.unpinned++;
      items.push({ type: 'template-upgrade', name: model.rel, status: 'unpinned', template: null, detail: 'No parent_spec.url' });
      continue;
    }

    const pinned = parsePinnedUrl(model.parentUrl);
    if (!pinned) {
      summary.unlisted++;
      items.push({
        type: 'template-upgrade', name: model.rel, status: 'unlisted', template: null,
        pinned: null, url: model.parentUrl, detail: 'Not a versioned canonical template URL',
      });
      continue;
    }

    const entry = catalog && catalog.templates && catalog.templates[pinned.name];
    if (!entry) {
      summary.unlisted++;
      items.push({
        type: 'template-upgrade', name: model.rel, status: 'unlisted', template: pinned.name,
        pinned: pinned.version, url: model.parentUrl, detail: 'Template not in catalog',
      });
      continue;
    }

    const known = entry.versions.some((v) => v.template_version === pinned.version);
    if (!known && compareVersions(pinned.version, entry.adopted) > 0) {
      summary.ahead++;
      items.push({
        type: 'template-upgrade', name: model.rel, status: 'ahead', template: pinned.name,
        pinned: pinned.version, adopted: entry.adopted, url: model.parentUrl,
        detail: 'Model is ahead of the catalog adopted version',
      });
      continue;
    }
    if (!known) {
      summary.unlisted++;
      items.push({
        type: 'template-upgrade', name: model.rel, status: 'unlisted', template: pinned.name,
        pinned: pinned.version, adopted: entry.adopted, url: model.parentUrl,
        detail: 'Version not in catalog',
      });
      continue;
    }

    const kind = gapKind(pinned.version, entry.adopted);
    const cmp = compareVersions(pinned.version, entry.adopted);
    let status;
    if (kind === 'same') status = 'current';
    else if (cmp < 0) status = 'upgrade-available';
    else if (cmp > 0) status = 'ahead';
    else status = 'unlisted';

    if (status === 'current') summary.current++;
    else if (status === 'upgrade-available') summary.upgradeAvailable++;
    else if (status === 'ahead') summary.ahead++;
    else summary.unlisted++;

    const item = {
      type: 'template-upgrade',
      name: model.rel,
      status,
      template: pinned.name,
      pinned: pinned.version,
      adopted: entry.adopted,
      url: model.parentUrl,
    };
    if (status === 'upgrade-available') item.kind = kind;
    if (status === 'ahead') item.detail = 'Model is ahead of the catalog adopted version';
    items.push(item);
  }

  return { summary, items, models };
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function main() {
  const isJson = process.argv.includes('--json');
  const workspaceDir = getArg('--workspace-dir');
  const catalogFile = getArg('--catalog-file');

  if (!workspaceDir || !catalogFile) {
    console.error('Usage: node upgrade-check.js --workspace-dir <dir> --catalog-file <catalog.json> [--json]');
    process.exit(2);
  }

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));
  } catch (err) {
    if (isJson) {
      console.log(JSON.stringify({ status: 'ERROR', error: err.message }));
    } else {
      console.error(`upgrade-check: cannot read catalog: ${err.message}`);
    }
    process.exit(2);
  }

  const result = scanWorkspaceUpgrades(workspaceDir, catalog);
  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Templates scanned: ${result.summary.modelsScanned} model(s)`);
    for (const item of result.items) {
      const arrow = item.status === 'upgrade-available'
        ? `${item.pinned} -> ${item.adopted} (${item.kind})`
        : item.status === 'current'
          ? item.pinned
          : item.detail || item.status;
      console.log(`  [${item.status.toUpperCase()}] ${item.name} — ${arrow}`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseSemVer,
  gapKind,
  compareVersions,
  parsePinnedUrl,
  discoverModels,
  scanWorkspaceUpgrades,
};