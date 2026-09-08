#!/usr/bin/env node

/**
 * skills/nn-preflight/scripts/preflight-check.js
 *
 * Lightweight, zero-dependency environment readiness and integrity auditor
 * for the cogNNitive ecosystem.
 *
 * Checks:
 *   1. Node.js runtime (>= 18 required)
 *   2. Installed skills vs manifest pinned commits (~/.agents/skills/ and bootstrap-state.json)
 *   3. MCP server bundle and version vs manifest pins (~/.agents/mcp/ or .cogNNitive/)
 *   4. Level 2 templates vs manifest pins (~/.agents/templates/)
 *
 * Exit Codes:
 *   0: All components are installed and up-to-date (or non-blocking warning).
 *   1: Components are missing or outdated; user confirmation required before proceeding.
 *   2: Fatal runtime blocker (e.g. Node.js < 18).
 *
 * Flags:
 *   --json          Emit machine-readable JSON output
 *   --manifest-url  Override default manifest URL
 *   --skills-dir    Override ~/.agents/skills directory
 *   --templates-dir Override ~/.agents/templates directory
 *   --state-file    Override ~/.agents/bootstrap-state.json
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { parseFocusedYaml, parseFrontmatter } = require('./lib/yaml-lite');
const { discoverModels, scanWorkspaceUpgrades } = require('./upgrade-check');

const DEFAULT_MANIFEST_URL = process.env.SM_MANIFEST_URL ||
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/docs/use/manifest.md';

const DEFAULT_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');
const DEFAULT_TEMPLATES_DIR = path.join(os.homedir(), '.agents', 'templates');
const DEFAULT_MCP_DIR = path.join(os.homedir(), '.agents', 'mcp');
const DEFAULT_STATE_FILE = path.join(os.homedir(), '.agents', 'bootstrap-state.json');
const LEGACY_STATE_FILE = path.join(os.homedir(), '.agents', 'skills-state.json');

/**
 * Canonical Level-2 template catalog. Wired in as a Tier-3 workspace check:
 * an available template upgrade is informational and never blocks.
 *
 * Resolution is remote-first (AD-3): the Pages copy is canonical
 * (same-origin for the editor), the raw.githubusercontent copy is the
 * fallback. When both fail, upgrade detection degrades to offline.
 */
const DEFAULT_TEMPLATE_CATALOG_URL =
  'https://cognnitive.com/innfo/templates/catalog.json';
const FALLBACK_TEMPLATE_CATALOG_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/catalog.json';

function requestFor(url) {
  return url.startsWith('https:') ? https.request : http.request;
}

function fetchString(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const req = requestFor(url)(url, {
      headers: { 'User-Agent': 'cogNNitive-preflight-auditor' },
      timeout: timeoutMs,
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} while fetching ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching manifest after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.end();
  });
}

function loadState(file) {
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, ''));
      return {
        manifest: data.manifest || DEFAULT_MANIFEST_URL,
        skills: data.skills || {},
        templates: data.templates || {},
        mcp: data.mcp || {},
      };
    } catch {
      // ignore corrupt JSON and return empty
    }
  }

  const siblingLegacy = path.join(path.dirname(file), 'skills-state.json');
  const legacyToUse = fs.existsSync(siblingLegacy) ? siblingLegacy : LEGACY_STATE_FILE;
  if (fs.existsSync(legacyToUse)) {
    try {
      const legacyData = JSON.parse(fs.readFileSync(legacyToUse, 'utf-8').replace(/^\uFEFF/, ''));
      return {
        manifest: legacyData.manifest || DEFAULT_MANIFEST_URL,
        skills: legacyData.skills || {},
        templates: {},
        mcp: {},
      };
    } catch {
      // ignore corrupt JSON
    }
  }

  return { manifest: DEFAULT_MANIFEST_URL, skills: {}, templates: {}, mcp: {} };
}

function parseManifest(text) {
  const doc = parseFocusedYaml(parseFrontmatter(text));
  const bootstrap = doc['agent-bootstrap'];
  if (!bootstrap || typeof bootstrap !== 'object') {
    throw new Error('agent-bootstrap block missing from manifest');
  }
  return {
    version: bootstrap.version || 'unknown',
    skills: Array.isArray(bootstrap.skills) ? bootstrap.skills : [],
    templates: Array.isArray(bootstrap.templates) ? bootstrap.templates : [],
  };
}

/* ── Workspace spec freshness scan (--workspace-dir) ───────────────── */

const SPEC_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.spec-cache', 'backups', 'archive']);

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

/** Node native fetch with an AbortController timeout (mirrors `fetchString`). */
async function fetchWithTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} while fetching ${url}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Recursive `.md` walk of `<workspace>/specs/`, skipping staging and cache dirs. */
function walkSpecs(dir, files) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.staging-')) continue;
      if (SPEC_SKIP_DIRS.has(entry.name)) continue;
      walkSpecs(path.join(dir, entry.name), files);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.join(dir, entry.name));
    }
  }
}

/**
 * Content-hash freshness scan of a workspace's `specs/` tree against each
 * file's canonical remote (`spec_url`, fallback `parent_spec.url`). Files
 * without a resolvable URL are skipped silently; unreachable remotes are
 * recorded as `offline` (warning only, never a blocker).
 */
async function scanWorkspaceSpecs(workspaceDir) {
  const files = [];
  walkSpecs(path.join(workspaceDir, 'specs'), files);

  let stale = 0;
  let fresh = 0;
  let offline = 0;
  const items = [];

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    let fm;
    try {
      fm = parseFocusedYaml(parseFrontmatter(content));
    } catch {
      continue; // no frontmatter → not an iNNfo spec, skip silently
    }
    const url = fm.spec_url || (fm.parent_spec && fm.parent_spec.url);
    if (!url) continue;

    const relPath = path.relative(workspaceDir, file).replace(/\\/g, '/');
    const localHash = sha256(content);
    let status;
    let detail;
    try {
      const remote = await fetchWithTimeout(url);
      status = sha256(remote) === localHash ? 'fresh' : 'stale';
    } catch (err) {
      status = 'offline';
      detail = err.message;
    }

    if (status === 'stale') stale++;
    else if (status === 'fresh') fresh++;
    else offline++;

    const item = { type: 'spec-freshness', name: relPath, url, status };
    if (detail) item.detail = detail;
    items.push(item);
  }

  return { stale, fresh, offline, items };
}

/* ── Workspace source integrity scan (--workspace-dir) ─────────────── */

const SOURCE_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.spec-cache', 'backups', 'archive', 'staging']);

function walkSourceDir(dir, onFile) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('~$') || entry.name === 'desktop.ini') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.staging-')) continue;
      if (SOURCE_SKIP_DIRS.has(entry.name)) continue;
      walkSourceDir(fullPath, onFile);
    } else if (entry.isFile()) {
      onFile(fullPath, entry.name);
    }
  }
}

/**
 * Universal source integrity audit across sources/import/, sources/conversations/,
 * sources/export/, and legacy sources/original/ against sources/nn/.
 */
function scanWorkspaceSources(workspaceDir) {
  const sourcesDir = path.join(workspaceDir, 'sources');
  const nnDir = path.join(sourcesDir, 'nn');

  const subtrees = {
    import: { total: 0, normalized: 0, unnormalized: 0 },
    export: { total: 0, normalized: 0, unnormalized: 0 },
    conversations: { total: 0, normalized: 0, unnormalized: 0 },
  };

  const unnormalizedList = [];
  const orphanedList = [];
  const items = [];
  let totalCount = 0;
  let normalizedCount = 0;
  let unnormalizedCount = 0;
  let danglingCount = 0;

  // 1. Discover all normalized Markdown files in sources/nn/ (excluding index.md)
  const nnFiles = [];
  if (fs.existsSync(nnDir)) {
    walkSourceDir(nnDir, (filePath, name) => {
      if (name.endsWith('.md')) {
        const relToNn = path.relative(nnDir, filePath).replace(/\\/g, '/');
        if (relToNn !== 'index.md') {
          nnFiles.push(filePath);
        }
      }
    });
  }

  // 2. Parse frontmatter and map source_file -> normalized file & hash
  const sourceIndex = new Map();

  for (const nnFile of nnFiles) {
    const relNnPath = path.relative(workspaceDir, nnFile).replace(/\\/g, '/');
    let content;
    try {
      content = fs.readFileSync(nnFile, 'utf-8');
    } catch {
      continue;
    }
    let fm;
    try {
      fm = parseFocusedYaml(parseFrontmatter(content)) || {};
    } catch {
      fm = {};
    }

    const rawRef = fm.source_file || fm.file;
    const storedHash = (fm.sha256 || fm.hash || '').trim();

    if (!rawRef) {
      danglingCount++;
      orphanedList.push({ path: relNnPath, missing_source: 'missing_source_file_field' });
      items.push({
        type: 'source-integrity',
        name: relNnPath,
        status: 'dangling',
        detail: 'Normalized file missing source_file field in frontmatter',
      });
      continue;
    }

    const normRawRef = String(rawRef).replace(/\\/g, '/');
    const candidatePaths = [
      path.resolve(workspaceDir, normRawRef),
      path.resolve(workspaceDir, 'sources', normRawRef),
      path.resolve(path.dirname(nnFile), normRawRef),
    ];

    let resolvedRawPath = null;
    for (const cand of candidatePaths) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        resolvedRawPath = cand;
        break;
      }
    }

    if (!resolvedRawPath) {
      danglingCount++;
      orphanedList.push({ path: relNnPath, missing_source: normRawRef });
      items.push({
        type: 'source-integrity',
        name: relNnPath,
        status: 'dangling',
        detail: `Referenced source file does not exist: ${normRawRef}`,
      });
    } else {
      const relSource = path.relative(workspaceDir, resolvedRawPath).replace(/\\/g, '/');
      const entry = { nnPath: relNnPath, storedHash };
      sourceIndex.set(relSource, entry);
      sourceIndex.set(normRawRef, entry);
    }
  }

  // 3. Scan active source trees (import, conversations, export, original)
  const sourceTreesToCheck = [
    { name: 'import', dir: path.join(sourcesDir, 'import') },
    { name: 'conversations', dir: path.join(sourcesDir, 'conversations') },
    { name: 'export', dir: path.join(sourcesDir, 'export') },
    { name: 'original', dir: path.join(sourcesDir, 'original') },
  ];

  for (const tree of sourceTreesToCheck) {
    if (!fs.existsSync(tree.dir)) continue;

    if (!subtrees[tree.name]) {
      subtrees[tree.name] = { total: 0, normalized: 0, unnormalized: 0 };
    }

    const treeFiles = [];
    walkSourceDir(tree.dir, (filePath) => {
      treeFiles.push(filePath);
    });

    for (const file of treeFiles) {
      const relPath = path.relative(workspaceDir, file).replace(/\\/g, '/');
      subtrees[tree.name].total++;
      totalCount++;

      let currentHash = null;
      try {
        const buf = fs.readFileSync(file);
        currentHash = crypto.createHash('sha256').update(buf).digest('hex');
      } catch {
        // cannot read file
      }

      const match = sourceIndex.get(relPath);
      if (!match) {
        unnormalizedCount++;
        subtrees[tree.name].unnormalized++;
        unnormalizedList.push({ path: relPath, subtree: tree.name, reason: 'missing' });
        items.push({
          type: 'source-integrity',
          name: relPath,
          status: 'unnormalized',
          detail: 'Source has not been normalized into sources/nn/. Run `node scripts/index.js --scan`.',
        });
      } else if (match.storedHash !== currentHash) {
        unnormalizedCount++;
        subtrees[tree.name].unnormalized++;
        unnormalizedList.push({ path: relPath, subtree: tree.name, reason: 'hash_mismatch' });
        items.push({
          type: 'source-integrity',
          name: relPath,
          status: 'stale',
          detail: 'Source content has changed since normalization. Run `node scripts/index.js --scan`.',
        });
      } else {
        normalizedCount++;
        subtrees[tree.name].normalized++;
      }
    }
  }

  return {
    total: totalCount,
    normalized: normalizedCount,
    unnormalized: unnormalizedCount,
    dangling: danglingCount,
    sources_integrity: {
      ok: unnormalizedCount === 0 && danglingCount === 0,
      subtrees,
      unnormalized: unnormalizedList,
      orphaned: orphanedList,
    },
    items,
  };
}

async function runCheck(options = {}) {
  const isJson = options.json || process.argv.includes('--json');
  const manifestUrl = options.manifestUrl || process.env.SM_MANIFEST_URL || DEFAULT_MANIFEST_URL;
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const templatesDir = options.templatesDir || DEFAULT_TEMPLATES_DIR;
  const mcpDir = options.mcpDir || DEFAULT_MCP_DIR;
  const stateFile = options.stateFile || DEFAULT_STATE_FILE;
  const workspaceDir = options.workspaceDir || null;
  const templateCatalogUrl = options.templateCatalogUrl || null;

  const results = {
    timestamp: new Date().toISOString(),
    status: 'OK',
    exitCode: 0,
    node: {
      version: process.versions.node,
      major: parseInt(process.versions.node.split('.')[0], 10),
      ok: true,
    },
    manifest: {
      url: manifestUrl,
      reachable: true,
      error: null,
    },
    summary: {
      skillsTotal: 0,
      skillsOutdated: 0,
      skillsMissing: 0,
      mcpTotal: 0,
      mcpOutdated: 0,
      mcpMissing: 0,
      templatesTotal: 0,
      templatesOutdated: 0,
      templatesMissing: 0,
      specsStale: 0,
      specsFresh: 0,
      specsOffline: 0,
      sourcesTotal: 0,
      sourcesNormalized: 0,
      sourcesUnnormalized: 0,
      sourcesDangling: 0,
      templateModelsScanned: 0,
      templateUpgradesAvailable: 0,
      templateModelsCurrent: 0,
      templateModelsAhead: 0,
      templateModelsUnlisted: 0,
      templateModelsUnpinned: 0,
      templateCatalogOffline: 0,
    },
    sources_integrity: {
      ok: true,
      subtrees: {
        import: { total: 0, normalized: 0, unnormalized: 0 },
        export: { total: 0, normalized: 0, unnormalized: 0 },
        conversations: { total: 0, normalized: 0, unnormalized: 0 },
      },
      unnormalized: [],
      orphaned: [],
    },
    items: [],
  };

  // 1. Node.js check
  if (results.node.major < 18) {
    results.node.ok = false;
    results.status = 'BLOCKER';
    results.exitCode = 2;
    results.items.push({
      type: 'runtime',
      name: 'node',
      status: 'blocker',
      detail: `Node.js >= 18 required, detected v${process.versions.node}`,
    });
    return results;
  }

  // 1b. Workspace scans (opt-in via --workspace-dir). Runs
  // before the manifest fetch so the manifest-offline early return below can
  // still fold staleness or unnormalized sources into ACTION_REQUIRED / exit 1.
  if (workspaceDir) {
    const specResults = await scanWorkspaceSpecs(workspaceDir);
    results.summary.specsStale = specResults.stale;
    results.summary.specsFresh = specResults.fresh;
    results.summary.specsOffline = specResults.offline;
    results.items.push(...specResults.items);

    const sourceResults = scanWorkspaceSources(workspaceDir);
    results.summary.sourcesTotal = sourceResults.total;
    results.summary.sourcesNormalized = sourceResults.normalized;
    results.summary.sourcesUnnormalized = sourceResults.unnormalized;
    results.summary.sourcesDangling = sourceResults.dangling;
    results.sources_integrity = sourceResults.sources_integrity;
    results.items.push(...sourceResults.items);

    // Tier 3 — workspace template upgrade detection (read-only, informational).
    // Only queries the catalog when the workspace actually contains Level-3 models.
    if (discoverModels(workspaceDir).length > 0) {
      const catalogUrls = options.templateCatalogUrl
        ? [options.templateCatalogUrl]
        : [DEFAULT_TEMPLATE_CATALOG_URL, FALLBACK_TEMPLATE_CATALOG_URL];
      let catalog = null;
      for (const catalogUrl of catalogUrls) {
        try {
          catalog = JSON.parse(await fetchWithTimeout(catalogUrl, 4000));
          break;
        } catch {
          // try the next catalog URL
        }
      }
      if (!catalog) {
        results.summary.templateCatalogOffline = 1;
        results.items.push({
          type: 'template-catalog',
          name: 'catalog.json',
          status: 'offline',
          detail: `Template catalog unreachable (${catalogUrls.join(' / ')}); upgrade detection skipped.`,
        });
      }
      if (catalog) {
        const upgrade = scanWorkspaceUpgrades(workspaceDir, catalog);
        results.summary.templateModelsScanned = upgrade.summary.modelsScanned;
        results.summary.templateUpgradesAvailable = upgrade.summary.upgradeAvailable;
        results.summary.templateModelsCurrent = upgrade.summary.current;
        results.summary.templateModelsAhead = upgrade.summary.ahead;
        results.summary.templateModelsUnlisted = upgrade.summary.unlisted;
        results.summary.templateModelsUnpinned = upgrade.summary.unpinned;
        results.items.push(...upgrade.items);
      }
    }
  }

  // 2. Fetch Manifest
  let manifest;
  try {
    const raw = await fetchString(manifestUrl);
    manifest = parseManifest(raw);
  } catch (err) {
    results.manifest.reachable = false;
    results.manifest.error = err.message;
    results.items.push({
      type: 'network',
      name: 'manifest',
      status: 'warning',
      detail: `Could not verify remote manifest (${err.message}). Using local state offline.`,
    });
    // Offline mode: do not block if local files exist — but stale workspace
    // specs or unnormalized sources are still a hard failure and must not be masked by the early return.
    if (results.summary.specsStale > 0 || results.summary.sourcesUnnormalized > 0 || results.summary.sourcesDangling > 0) {
      results.status = 'ACTION_REQUIRED';
      results.exitCode = 1;
    }
    return results;
  }

  const state = loadState(stateFile);

  // 3. Audit Skills & declared MCPs
  for (const skill of manifest.skills) {
    results.summary.skillsTotal++;
    const skillDir = path.join(skillsDir, skill.name);
    const dirExists = fs.existsSync(skillDir);
    const recorded = state.skills[skill.name];
    let skillStatus = 'up-to-date';

    if (!dirExists) {
      skillStatus = 'missing';
      results.summary.skillsMissing++;
    } else if (!recorded || recorded.commit !== skill.commit) {
      skillStatus = 'outdated';
      results.summary.skillsOutdated++;
    }

    results.items.push({
      type: 'skill',
      name: skill.name,
      version: skill.version,
      installedCommit: recorded ? recorded.commit.slice(0, 7) : null,
      pinnedCommit: skill.commit ? skill.commit.slice(0, 7) : null,
      status: skillStatus,
    });

    // Audit MCP declared inside skill
    if (Array.isArray(skill.mcp)) {
      for (const mcp of skill.mcp) {
        results.summary.mcpTotal++;
        const bundlePath = path.join(mcpDir, `${mcp.name}.bundle.js`);
        const localRepoBundle = path.join(process.cwd(), '.cogNNitive', 'mcp-bundle.js');
        const bundleExists = fs.existsSync(bundlePath) || fs.existsSync(localRepoBundle);
        const recordedMcp = state.mcp[mcp.name];
        let mcpStatus = 'up-to-date';

        if (!bundleExists) {
          mcpStatus = 'missing';
          results.summary.mcpMissing++;
        } else if (mcp.version && recordedMcp && recordedMcp.version && recordedMcp.version !== mcp.version) {
          mcpStatus = 'outdated';
          results.summary.mcpOutdated++;
        }

        results.items.push({
          type: 'mcp',
          name: mcp.name,
          version: mcp.version,
          installedVersion: recordedMcp ? recordedMcp.version : (bundleExists ? 'local-bundle' : null),
          status: mcpStatus,
        });
      }
    }
  }

  // 4. Audit Templates
  for (const tmpl of manifest.templates) {
    results.summary.templatesTotal++;
    const fileName = tmpl.name.endsWith('.md') ? tmpl.name : `${tmpl.name}.md`;
    const tmplPath = path.join(templatesDir, fileName);
    const tmplExists = fs.existsSync(tmplPath) || fs.existsSync(path.join(templatesDir, tmpl.name));
    const recorded = state.templates[tmpl.name];
    let tmplStatus = 'up-to-date';

    if (!tmplExists) {
      tmplStatus = 'missing';
      results.summary.templatesMissing++;
    } else if (!recorded || recorded.commit !== tmpl.commit) {
      tmplStatus = 'outdated';
      results.summary.templatesOutdated++;
    }

    results.items.push({
      type: 'template',
      name: tmpl.name,
      version: tmpl.version,
      installedCommit: recorded ? recorded.commit.slice(0, 7) : null,
      pinnedCommit: tmpl.commit ? tmpl.commit.slice(0, 7) : null,
      status: tmplStatus,
    });
  }

  // Determine overall status
  const hasOutdated = results.summary.skillsOutdated > 0 ||
                      results.summary.mcpOutdated > 0 ||
                      results.summary.templatesOutdated > 0;
  const hasMissing = results.summary.skillsMissing > 0 ||
                     results.summary.mcpMissing > 0 ||
                     results.summary.templatesMissing > 0;
  const hasStaleSpecs = results.summary.specsStale > 0;
  const hasSourceIssues = results.summary.sourcesUnnormalized > 0 ||
                          results.summary.sourcesDangling > 0;

  if (hasOutdated || hasMissing || hasStaleSpecs || hasSourceIssues) {
    results.status = 'ACTION_REQUIRED';
    results.exitCode = 1;
  } else {
    results.status = 'OK';
    results.exitCode = 0;
  }

  return results;
}

function printHumanReport(results) {
  console.log('=== cogNNitive Environment & Integrity Gate ===');
  console.log(`Node.js: v${results.node.version} (${results.node.ok ? 'OK' : 'BLOCKER'})`);

  if (results.summary.specsStale > 0) {
    console.log(`\n⚠️  Stale workspace spec(s) detected (${results.summary.specsStale}):`);
    for (const item of results.items) {
      if (item.type === 'spec-freshness' && item.status === 'stale') {
        console.log(`  - [STALE] ${item.name}`);
        console.log(`    canonical: ${item.url}`);
      }
    }
    console.log('  Remediation: delete/replace the local cached copy under specs/ and re-resolve from the canonical URL.\n');
  }

  if (results.summary.sourcesUnnormalized > 0 || results.summary.sourcesDangling > 0) {
    console.log(`\n⚠️  Workspace source integrity issue(s) detected:`);
    for (const item of results.items) {
      if (item.type === 'source-integrity') {
        if (item.status === 'unnormalized') {
          console.log(`  - [UNNORMALIZED] ${item.name}`);
          console.log(`    ${item.detail || 'Source has not been normalized into sources/nn/.'}`);
        } else if (item.status === 'stale') {
          console.log(`  - [STALE] ${item.name}`);
          console.log(`    ${item.detail || 'Source content has changed since normalization.'}`);
        } else if (item.status === 'dangling') {
          console.log(`  - [DANGLING] ${item.name}`);
          console.log(`    ${item.detail || 'Normalized source references missing file.'}`);
        }
      }
    }
    console.log('  Remediation: Run `node scripts/index.js --scan` (nn-trannsform --scan) to synchronize sources.\n');
  }

  if (results.summary.templateUpgradesAvailable > 0) {
    console.log(`\n🆙  Workspace template upgrade(s) available (${results.summary.templateUpgradesAvailable}):`);
    for (const item of results.items) {
      if (item.type === 'template-upgrade' && item.status === 'upgrade-available') {
        console.log(`  - ${item.name}: ${item.template} ${item.pinned} -> ${item.adopted} (${item.kind})`);
      }
    }
    console.log('  Invoke the nn-upgrade skill to migrate with backup and re-validation (or continue as-is).\n');
  }

  if (results.summary.templateCatalogOffline > 0) {
    console.log('ℹ️  Template catalog offline — workspace template upgrade detection skipped (non-blocking).\n');
  }

  if (!results.manifest.reachable) {
    console.log(`⚠️  Remote manifest unreachable: ${results.manifest.error}`);
    console.log('Operating in offline cache mode.\n');
    return;
  }

  if (results.status === 'OK') {
    let msg = `Status: OK — All ${results.summary.skillsTotal} skills, ${results.summary.mcpTotal} MCP servers, and ${results.summary.templatesTotal} templates are up-to-date.`;
    if (results.summary.sourcesTotal > 0) {
      msg += ` All ${results.summary.sourcesTotal} sources normalized and verified.`;
    }
    console.log(`${msg}\n`);
    return;
  }

  console.log(`Status: ⚠️  UPDATES OR MISSING COMPONENTS DETECTED\n`);

  const pending = results.items.filter(i =>
    i.status === 'outdated' ||
    i.status === 'missing' ||
    i.status === 'stale' ||
    i.status === 'unnormalized' ||
    i.status === 'dangling'
  );
  console.log('Detected items needing attention:');
  for (const item of pending) {
    let detail;
    if (item.type === 'source-integrity') {
      detail = item.detail ? `(${item.detail})` : `(${item.status})`;
    } else if (item.status === 'outdated') {
      detail = `(installed: ${item.installedCommit || item.installedVersion || 'unknown'} -> pinned: ${item.pinnedCommit || item.version})`;
    } else {
      detail = '(not installed)';
    }
    console.log(`  - [${item.status.toUpperCase()}] ${item.type} "${item.name}" ${detail}`);
  }

  console.log('\nDecision needed before continuing:');
  console.log('  [a] (Recommended) Update components now');
  console.log('  [b] Continue with current version\n');
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

async function main() {
  const isJson = process.argv.includes('--json');
  const manifestUrl = getArg('--manifest-url');
  const skillsDir = getArg('--skills-dir');
  const templatesDir = getArg('--templates-dir');
  const mcpDir = getArg('--mcp-dir');
  const stateFile = getArg('--state-file');
  const workspaceDir = getArg('--workspace-dir');
  const templateCatalogUrl = getArg('--template-catalog-url');

  try {
    const results = await runCheck({
      json: isJson,
      manifestUrl,
      skillsDir,
      templatesDir,
      mcpDir,
      stateFile,
      workspaceDir,
      templateCatalogUrl,
    });
    if (isJson) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      printHumanReport(results);
    }
    process.exit(results.exitCode);
  } catch (err) {
    if (isJson) {
      console.log(JSON.stringify({ status: 'ERROR', error: err.message, exitCode: 2 }));
    } else {
      console.error(`Preflight error: ${err.message}`);
    }
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runCheck,
  parseManifest,
  loadState,
  scanWorkspaceSources,
};
