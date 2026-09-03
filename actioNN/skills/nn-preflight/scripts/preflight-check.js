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
const { parseFocusedYaml, parseFrontmatter } = require('./lib/yaml-lite');

const DEFAULT_MANIFEST_URL = process.env.SM_MANIFEST_URL ||
  'https://raw.githubusercontent.com/cogNNitive/eNNvironment/main/docs/use/manifest.md';

const DEFAULT_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');
const DEFAULT_TEMPLATES_DIR = path.join(os.homedir(), '.agents', 'templates');
const DEFAULT_MCP_DIR = path.join(os.homedir(), '.agents', 'mcp');
const DEFAULT_STATE_FILE = path.join(os.homedir(), '.agents', 'bootstrap-state.json');
const LEGACY_STATE_FILE = path.join(os.homedir(), '.agents', 'skills-state.json');

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
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
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
      const legacyData = JSON.parse(fs.readFileSync(legacyToUse, 'utf-8'));
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

async function runCheck(options = {}) {
  const isJson = options.json || process.argv.includes('--json');
  const manifestUrl = options.manifestUrl || process.env.SM_MANIFEST_URL || DEFAULT_MANIFEST_URL;
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const templatesDir = options.templatesDir || DEFAULT_TEMPLATES_DIR;
  const mcpDir = options.mcpDir || DEFAULT_MCP_DIR;
  const stateFile = options.stateFile || DEFAULT_STATE_FILE;

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
    // Offline mode: do not block if local files exist
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

  if (hasOutdated || hasMissing) {
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

  if (!results.manifest.reachable) {
    console.log(`⚠️  Remote manifest unreachable: ${results.manifest.error}`);
    console.log('Operating in offline cache mode.\n');
    return;
  }

  if (results.status === 'OK') {
    console.log(`Status: OK — All ${results.summary.skillsTotal} skills, ${results.summary.mcpTotal} MCP servers, and ${results.summary.templatesTotal} templates are up-to-date.\n`);
    return;
  }

  console.log(`Status: ⚠️  UPDATES OR MISSING COMPONENTS DETECTED\n`);

  const pending = results.items.filter(i => i.status === 'outdated' || i.status === 'missing');
  console.log('Detected items needing attention:');
  for (const item of pending) {
    const detail = item.status === 'outdated'
      ? `(installed: ${item.installedCommit || item.installedVersion || 'unknown'} -> pinned: ${item.pinnedCommit || item.version})`
      : '(not installed)';
    console.log(`  - [${item.status.toUpperCase()}] ${item.type} "${item.name}" ${detail}`);
  }

  console.log('\nDecision needed before continuing:');
  console.log('  [a] (Recomendado) Actualizar componentes ahora (Update now)');
  console.log('  [b] Continuar con la versión actual (Continue with current version)\n');
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

  try {
    const results = await runCheck({
      json: isJson,
      manifestUrl,
      skillsDir,
      templatesDir,
      mcpDir,
      stateFile,
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
};
