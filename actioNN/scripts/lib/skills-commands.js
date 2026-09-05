/**
 * actioNN/scripts/lib/skills-commands.js
 *
 * Command implementations, consent gates, and state management for skills-manager.
 * Leverages shared libraries from scripts/lib: atomic-fs, github-client, yaml-parser.
 * Zero external dependencies — native Node.js execution.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawnSync } = require('child_process');
const readline = require('readline');

const {
  saveJsonAtomic,
  copyDirAtomic,
  replaceDirAtomic,
  extractTarball,
  copyDirRecursive,
} = require('../../../scripts/lib/atomic-fs.js');

const {
  fetchString,
  fetchJson,
  downloadFile,
} = require('../../../scripts/lib/github-client.js');

const {
  parseManifest,
} = require('../../../scripts/lib/yaml-parser.js');

const { registerMcpAuto } = require('./mcp-config-adapter.js');

const DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/docs/use/manifest.md';
const DEFAULT_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');
const DEFAULT_TEMPLATES_DIR = path.join(os.homedir(), '.agents', 'templates');
const DEFAULT_MCP_DIR = path.join(os.homedir(), '.agents', 'mcp');
const DEFAULT_STATE_FILE = path.join(os.homedir(), '.agents', 'bootstrap-state.json');
const LEGACY_STATE_FILE = path.join(os.homedir(), '.agents', 'skills-state.json');

/**
 * Returns active manifest URL, respecting SM_MANIFEST_URL environment override.
 * @returns {string}
 */
function getManifestUrl() {
  return process.env.SM_MANIFEST_URL || DEFAULT_MANIFEST_URL;
}

/**
 * Pick the built-in client matching the URL protocol.
 * @param {string} url
 * @returns {typeof https.request | typeof http.request}
 */
function requestFor(url) {
  return url.startsWith('https:') ? https.request : http.request;
}

// ---------------------------------------------------------------------------
// State file (~/.agents/bootstrap-state.json)
// ---------------------------------------------------------------------------

/**
 * Initializes a new empty skill manager state structure.
 * @returns {{ manifest: string, skills: Record<string, any>, templates: Record<string, any> }}
 */
function emptyState() {
  return { manifest: getManifestUrl(), skills: {}, templates: {}, mcp: {} };
}

/**
 * Loads the current machine skill state from JSON file, supporting legacy migrations.
 * @param {string} file
 * @returns {{ manifest: string, skills: Record<string, any>, templates: Record<string, any>, mcp: Record<string, any> }}
 */
function loadState(file) {
  if (fs.existsSync(file)) {
    try {
      const raw = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
      const data = JSON.parse(raw);
      return {
        manifest: data.manifest || getManifestUrl(),
        skills: data.skills || {},
        templates: data.templates || {},
        mcp: data.mcp || {},
      };
    } catch (err) {
      return emptyState();
    }
  }

  // Legacy fallback migration: check sibling skills-state.json or LEGACY_STATE_FILE
  const siblingLegacy = path.join(path.dirname(file), 'skills-state.json');
  const legacyFileToUse = fs.existsSync(siblingLegacy) ? siblingLegacy : LEGACY_STATE_FILE;

  if (fs.existsSync(legacyFileToUse)) {
    try {
      const legacyRaw = fs.readFileSync(legacyFileToUse, 'utf-8').replace(/^\uFEFF/, '');
      const legacyData = JSON.parse(legacyRaw);
      const state = {
        manifest: legacyData.manifest || getManifestUrl(),
        skills: legacyData.skills || {},
        templates: {},
        mcp: {},
      };
      saveState(file, state);
      return state;
    } catch (err) {
      return emptyState();
    }
  }

  return emptyState();
}

/**
 * Persists skill manager state atomically to disk.
 * @param {string} file
 * @param {object} state
 * @returns {void}
 */
function saveState(file, state) {
  saveJsonAtomic(file, state, 2);
}

// ---------------------------------------------------------------------------
// Tarball handling helpers
// ---------------------------------------------------------------------------

/**
 * Spawns tar command synchronously.
 * @param {string[]} args
 * @param {string} cwd
 * @returns {import('child_process').SpawnSyncReturns<string>}
 */
function runTar(args, cwd) {
  return spawnSync('tar', args, { cwd, encoding: 'utf-8' });
}

/**
 * Locates the single top-level directory unpacked inside an extracted tarball directory.
 * @param {string} extractDir
 * @returns {string}
 */
function findRepoRoot(extractDir) {
  const dirs = fs.readdirSync(extractDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
  if (dirs.length !== 1) {
    throw new Error(`unexpected tarball layout: expected one root directory, found ${dirs.length}`);
  }
  return path.join(extractDir, dirs[0]);
}

// ---------------------------------------------------------------------------
// Diff previews via GitHub compare API
// ---------------------------------------------------------------------------

/**
 * Fetches concise summary of files changed between installed commit and target commit.
 * @param {object} item
 * @param {string | undefined} installedCommit
 * @returns {Promise<string>}
 */
async function fetchCompareSummary(item, installedCommit) {
  if (!installedCommit) return '(no installed commit recorded)';
  try {
    const url = `https://api.github.com/repos/${item.repo}/compare/${installedCommit}...${item.commit}`;
    const data = await fetchJson(url);
    const prefix = item.path + '/';
    const files = (data.files || []).filter(f => f.filename && (f.filename.startsWith(prefix) || f.filename === item.path));
    if (files.length === 0) return `0 files changed under ${item.path}`;
    const first = files.slice(0, 3).map(f => f.filename);
    const more = files.length > 3 ? ` (+${files.length - 3} more)` : '';
    return `${files.length} files changed: ${first.join(', ')}${more}`;
  } catch (err) {
    return '(diff preview unavailable)';
  }
}

// ---------------------------------------------------------------------------
// Shared install/update routines
// ---------------------------------------------------------------------------

/**
 * Installs or updates a skill from GitHub tarball at specified commit.
 * @param {object} skill
 * @param {string} skillsDir
 * @param {object} state
 * @returns {Promise<void>}
 */
async function installSkillAtCommit(skill, skillsDir, state) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-skills-'));
  try {
    const tarball = path.join(tmpRoot, 'skill.tar.gz');
    const url = `https://codeload.github.com/${skill.repo}/tar.gz/${skill.commit}`;
    await downloadFile(url, tarball);

    const extractDir = path.join(tmpRoot, 'x');
    extractTarball(tarball, extractDir);
    const repoRoot = findRepoRoot(extractDir);

    const src = path.join(repoRoot, skill.path);
    if (!fs.existsSync(src)) {
      throw new Error(`path ${skill.path} not found in ${skill.repo} at ${skill.commit}`);
    }

    const dest = path.join(skillsDir, skill.name);
    fs.mkdirSync(skillsDir, { recursive: true });
    if (fs.existsSync(dest)) {
      replaceDirAtomic(src, dest);
    } else {
      copyDirAtomic(src, dest);
    }

    state.skills[skill.name] = {
      commit: skill.commit,
      version: skill.version,
      updated_at: new Date().toISOString(),
    };
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

/**
 * Installs or updates a template from GitHub at specified commit.
 * @param {object} template
 * @param {string} templatesDir
 * @param {object} state
 * @returns {Promise<void>}
 */
async function installTemplateAtCommit(template, templatesDir, state) {
  const isMdFile = template.path.endsWith('.md') || template.path.endsWith('.markdown');
  const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
  const destPath = isMdFile ? path.join(templatesDir, fileName) : path.join(templatesDir, template.name);

  fs.mkdirSync(templatesDir, { recursive: true });

  if (isMdFile) {
    const rawUrl = `https://raw.githubusercontent.com/${template.repo}/${template.commit}/${template.path}`;
    await downloadFile(rawUrl, destPath);
  } else {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-templates-'));
    try {
      const tarball = path.join(tmpRoot, 'tmpl.tar.gz');
      const url = `https://codeload.github.com/${template.repo}/tar.gz/${template.commit}`;
      await downloadFile(url, tarball);

      const extractDir = path.join(tmpRoot, 'x');
      extractTarball(tarball, extractDir);
      const repoRoot = findRepoRoot(extractDir);

      const src = path.join(repoRoot, template.path);
      if (!fs.existsSync(src)) {
        throw new Error(`template path ${template.path} not found in ${template.repo} at ${template.commit}`);
      }

      if (fs.statSync(src).isDirectory()) {
        if (fs.existsSync(destPath)) replaceDirAtomic(src, destPath);
        else copyDirAtomic(src, destPath);
      } else {
        fs.copyFileSync(src, destPath);
      }
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }

  state.templates[template.name] = {
    commit: template.commit,
    version: template.version,
    path: destPath,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Installs an MCP server bundle and its imported chunks from GitHub raw URL at specified commit.
 * @param {object} mcp
 * @param {string} mcpDir
 * @param {object} state
 * @returns {Promise<void>}
 */
async function installMcpAtCommit(mcp, mcpDir, state) {
  fs.mkdirSync(mcpDir, { recursive: true });
  const bundleDest = path.join(mcpDir, `${mcp.name}.bundle.js`);

  await downloadFile(mcp.url, bundleDest);

  if (fs.existsSync(bundleDest)) {
    const bundleContent = fs.readFileSync(bundleDest, 'utf-8');
    const chunkMatches = [...bundleContent.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)].map(m => m[1]);
    const baseUrl = mcp.url.substring(0, mcp.url.lastIndexOf('/'));

    for (const chunkFile of chunkMatches) {
      const chunkDest = path.join(mcpDir, chunkFile);
      const chunkUrl = `${baseUrl}/${chunkFile}`;
      try {
        await downloadFile(chunkUrl, chunkDest);
      } catch (err) {
        // Non-blocking for optional or conditional chunks
      }
    }
  }

  if (!state.mcp) state.mcp = {};
  state.mcp[mcp.name] = {
    commit: mcp.commit,
    version: mcp.version,
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Console helpers & Consent gate
// ---------------------------------------------------------------------------

/**
 * Prints formatted status table to console.
 * @param {Array<{ type: string, name: string, pinned: string, installed: string, status: string }>} rows
 * @returns {void}
 */
function printStatusTable(rows) {
  const headers = ['Type', 'Name', 'Pinned', 'Installed', 'Status'];
  const cells = [headers, ...rows.map(r => [r.type, r.name, r.pinned, r.installed, r.status])];
  const widths = headers.map((_, ci) => Math.max(...cells.map(r => r[ci].length)));
  const format = r => r.map((c, ci) => c.padEnd(widths[ci])).join(' | ');
  console.log(format(headers));
  console.log(headers.map((_, ci) => '-'.repeat(widths[ci])).join(' | '));
  for (const row of rows) console.log(format([row.type, row.name, row.pinned, row.installed, row.status]));
}

/**
 * Prompts user for interactive input via readline.
 * @param {string} promptText
 * @returns {Promise<string>}
 */
function promptChoice(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Checks if user answer represents positive consent.
 * @param {string} answer
 * @returns {boolean}
 */
function isConsent(answer) {
  return ['a', 'y', 'yes'].includes(answer);
}

/**
 * Consent gate halting execution when non-interactive and unapproved.
 * @param {string} label
 * @param {string[]} names
 * @param {string} menu
 * @param {boolean} yes
 * @returns {Promise<boolean>}
 */
async function consentOrAbort(label, names, menu, yes) {
  if (names.length === 0) return false;
  if (yes) return true;
  if (!process.stdin.isTTY) {
    console.log(`needs decision: ${label}: ${names.join(', ')}`);
    process.exit(2);
  }
  console.log(menu);
  const choice = await promptChoice('> ');
  if (!isConsent(choice)) {
    console.log('Aborted. No changes applied.');
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Executes status command comparing installed commits against pinned commits.
 * @param {{ skillsDir: string, templatesDir: string, stateFile: string }} args
 * @returns {Promise<void>}
 */
async function cmdStatus(args) {
  const manifestRaw = await fetchString(getManifestUrl());
  const { skills, templates } = parseManifest(manifestRaw);
  const state = loadState(args.stateFile);

  const rows = [];
  const outdatedSkills = [];
  const outdatedTemplates = [];

  for (const skill of skills) {
    const dirPresent = fs.existsSync(path.join(args.skillsDir, skill.name));
    const entry = state.skills[skill.name];
    let status;
    if (dirPresent) {
      if (!entry) status = 'untracked';
      else if (entry.commit === skill.commit) status = 'up-to-date';
      else status = 'outdated';
    } else {
      status = entry ? 'dir-missing' : 'missing';
    }
    rows.push({
      type: 'skill',
      name: skill.name,
      pinned: skill.commit ? skill.commit.slice(0, 7) : '-',
      installed: entry ? entry.commit.slice(0, 7) : '-',
      status,
    });
    if (status === 'outdated') outdatedSkills.push(skill);
  }

  for (const template of templates) {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
    const pathPresent = fs.existsSync(path.join(args.templatesDir, fileName)) || fs.existsSync(path.join(args.templatesDir, template.name));
    const entry = state.templates[template.name];
    let status;
    if (pathPresent) {
      if (!entry) status = 'untracked';
      else if (entry.commit === template.commit) status = 'up-to-date';
      else status = 'outdated';
    } else {
      status = entry ? 'missing' : 'missing';
    }
    rows.push({
      type: 'template',
      name: template.name,
      pinned: template.commit ? template.commit.slice(0, 7) : '-',
      installed: entry ? entry.commit.slice(0, 7) : '-',
      status,
    });
    if (status === 'outdated') outdatedTemplates.push(template);
  }

  printStatusTable(rows);

  if (outdatedSkills.length > 0 || outdatedTemplates.length > 0) {
    console.log('\nDiff previews for outdated items:');
    for (const skill of outdatedSkills) {
      const installed = state.skills[skill.name].commit;
      console.log(`  skill ${skill.name}: ${await fetchCompareSummary(skill, installed)}`);
    }
    for (const template of outdatedTemplates) {
      const installed = state.templates[template.name].commit;
      console.log(`  template ${template.name}: ${await fetchCompareSummary(template, installed)}`);
    }
  }
}

/**
 * Executes install command installing missing skills and templates with consent.
 * @param {{ skillsDir: string, templatesDir: string, stateFile: string, yes: boolean }} args
 * @returns {Promise<void>}
 */
async function cmdInstall(args) {
  const manifestRaw = await fetchString(getManifestUrl());
  const { skills, templates } = parseManifest(manifestRaw);
  const state = loadState(args.stateFile);

  const toInstallSkills = skills.filter(skill => !fs.existsSync(path.join(args.skillsDir, skill.name)));
  const toInstallTemplates = templates.filter(template => {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
    return !fs.existsSync(path.join(args.templatesDir, fileName)) && !fs.existsSync(path.join(args.templatesDir, template.name));
  });

  if (toInstallSkills.length === 0 && toInstallTemplates.length === 0) {
    console.log('All skills and templates present.');
    return;
  }

  const names = [
    ...toInstallSkills.map(s => `skill:${s.name}`),
    ...toInstallTemplates.map(t => `template:${t.name}`),
  ];

  const menu = `The following items are missing:\n` +
    (toInstallSkills.length > 0 ? `Skills:\n  - ${toInstallSkills.map(s => `${s.name} (${s.version})`).join('\n  - ')}\n` : '') +
    (toInstallTemplates.length > 0 ? `Templates:\n  - ${toInstallTemplates.map(t => `${t.name} (${t.version})`).join('\n  - ')}\n` : '') +
    `\n[a] Install all missing (Recommended)\n[b] Skip\n`;

  const proceed = await consentOrAbort('install missing skills and templates', names, menu, args.yes);
  if (!proceed) return;

  let failures = 0;

  for (const skill of toInstallSkills) {
    try {
      await installSkillAtCommit(skill, args.skillsDir, state);
      console.log(`  installed skill ${skill.name} (${skill.version}) @ ${skill.commit.slice(0, 7)}`);
    } catch (err) {
      failures++;
      console.error(`  FAIL skill ${skill.name}: ${err.message}`);
    }
  }

  for (const template of toInstallTemplates) {
    try {
      await installTemplateAtCommit(template, args.templatesDir, state);
      console.log(`  installed template ${template.name} (${template.version}) @ ${template.commit.slice(0, 7)}`);
    } catch (err) {
      failures++;
      console.error(`  FAIL template ${template.name}: ${err.message}`);
    }
  }

  saveState(args.stateFile, state);

  if (failures > 0) {
    console.error(`\n${failures} item(s) failed to install.`);
    process.exit(1);
  }
  console.log(`\nInstalled ${toInstallSkills.length} skill(s) and ${toInstallTemplates.length} template(s).`);
}

/**
 * Executes update command updating outdated skills and templates with consent.
 * @param {{ skillsDir: string, templatesDir: string, stateFile: string, positional: string[], yes: boolean }} args
 * @returns {Promise<void>}
 */
async function cmdUpdate(args) {
  const manifestRaw = await fetchString(getManifestUrl());
  const { skills, templates } = parseManifest(manifestRaw);
  const state = loadState(args.stateFile);

  const isOutdatedSkill = (skill) => {
    const dirPresent = fs.existsSync(path.join(args.skillsDir, skill.name));
    const entry = state.skills[skill.name];
    return dirPresent && (!entry || entry.commit !== skill.commit);
  };

  const isOutdatedTemplate = (template) => {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
    const pathPresent = fs.existsSync(path.join(args.templatesDir, fileName)) || fs.existsSync(path.join(args.templatesDir, template.name));
    const entry = state.templates[template.name];
    return pathPresent && (!entry || entry.commit !== template.commit);
  };

  let selectedSkills = skills.filter(isOutdatedSkill);
  let selectedTemplates = templates.filter(isOutdatedTemplate);

  if (args.positional.length > 0) {
    selectedSkills = skills.filter(s => args.positional.includes(s.name) && isOutdatedSkill(s));
    selectedTemplates = templates.filter(t => args.positional.includes(t.name) && isOutdatedTemplate(t));
  }

  if (selectedSkills.length === 0 && selectedTemplates.length === 0) {
    console.log('All skills and templates up to date.');
    return;
  }

  const names = [
    ...selectedSkills.map(s => `skill:${s.name}`),
    ...selectedTemplates.map(t => `template:${t.name}`),
  ];

  const proceed = await consentOrAbort(
    'update skills and templates',
    names,
    `Updating ${selectedSkills.length} skill(s) and ${selectedTemplates.length} template(s).\n\n[a] Update all listed (Recommended)\n[b] Skip\n`,
    args.yes
  );
  if (!proceed) return;

  let failures = 0;

  for (const skill of selectedSkills) {
    try {
      await installSkillAtCommit(skill, args.skillsDir, state);
      console.log(`  updated skill ${skill.name} -> ${skill.version} (${skill.commit.slice(0, 7)})`);
    } catch (err) {
      failures++;
      console.error(`  FAIL skill ${skill.name}: ${err.message}`);
    }
  }

  for (const template of selectedTemplates) {
    try {
      await installTemplateAtCommit(template, args.templatesDir, state);
      console.log(`  updated template ${template.name} -> ${template.version} (${template.commit.slice(0, 7)})`);
    } catch (err) {
      failures++;
      console.error(`  FAIL template ${template.name}: ${err.message}`);
    }
  }

  saveState(args.stateFile, state);

  if (failures > 0) {
    console.error(`\n${failures} item(s) failed to update.`);
    process.exit(1);
  }
  console.log(`\nUpdated ${selectedSkills.length} skill(s) and ${selectedTemplates.length} template(s).`);
}

/**
 * Synchronizes skills between local repository and global agent directory.
 * @param {{ skillsDir: string, direction?: string, yes: boolean, localSkillsDir?: string }} args
 * @returns {Promise<void>}
 */
async function cmdSync(args) {
  const localSkillsDir = args.localSkillsDir || path.resolve(__dirname, '../../skills');
  const direction = args.direction || 'local-to-global';

  if (direction !== 'local-to-global' && direction !== 'global-to-local') {
    throw new Error(`Invalid sync direction: ${direction}. Expected local-to-global or global-to-local.`);
  }

  const srcDir = direction === 'local-to-global' ? localSkillsDir : args.skillsDir;
  const destDir = direction === 'local-to-global' ? args.skillsDir : localSkillsDir;

  console.log(`Sync direction: ${direction}`);
  console.log(`Source:      ${srcDir}`);
  console.log(`Destination: ${destDir}\n`);

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source directory does not exist: ${srcDir}`);
  }

  const skillsToSync = fs.readdirSync(localSkillsDir).filter(name => {
    return fs.statSync(path.join(localSkillsDir, name)).isDirectory() && !name.startsWith('.');
  });

  const proceed = await consentOrAbort(
    'synchronize skills',
    skillsToSync,
    `This will synchronize the following skills:\n${skillsToSync.map(s => `  - ${s}`).join('\n')}\n\n[a] Proceed with sync\n[b] Skip\n`,
    args.yes
  );
  if (!proceed) return;

  for (const skill of skillsToSync) {
    const srcSkill = path.join(srcDir, skill);
    const destSkill = path.join(destDir, skill);

    if (fs.existsSync(srcSkill)) {
      console.log(`Syncing ${skill}...`);
      copyDirRecursive(srcSkill, destSkill);
    }
  }
  console.log('\nSync completed successfully.');
}

/**
 * Executes complete, deterministic bootstrap:
 * 1. Installs/updates all manifest skills
 * 2. Installs/updates all manifest templates (all 10 Level 2 templates)
 * 3. Downloads all MCP bundles (e.g. innfo-mcp) and their imported chunks
 * 4. Registers MCP server in the target agent's config (OpenCode, Claude, Antigravity, or auto)
 * 5. Saves state file cleanly without BOM
 * 6. Displays clean summary with available workflows
 *
 * @param {{
 *   skillsDir: string,
 *   templatesDir: string,
 *   mcpDir?: string,
 *   stateFile: string,
 *   agent?: string,
 *   yes: boolean,
 *   manifestUrl?: string,
 * }} args
 * @returns {Promise<void>}
 */
async function cmdBootstrap(args) {
  const url = args.manifestUrl || getManifestUrl();
  console.log('=== cogNNitive Bootstrap ===');
  console.log(`Fetching manifest from: ${url}`);
  const manifestRaw = await fetchString(url);
  const manifest = parseManifest(manifestRaw);
  const state = loadState(args.stateFile);

  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR;
  fs.mkdirSync(args.skillsDir, { recursive: true });
  fs.mkdirSync(args.templatesDir, { recursive: true });
  fs.mkdirSync(mcpDir, { recursive: true });

  const names = [
    ...manifest.skills.map(s => `skill:${s.name}`),
    ...manifest.templates.map(t => `template:${t.name}`),
  ];

  const proceed = await consentOrAbort(
    'bootstrap cogNNitive ecosystem',
    names,
    `Bootstrapping ${manifest.skills.length} skills, ${manifest.templates.length} templates, and MCP servers.\n\n[a] Bootstrap now (Recommended)\n[b] Cancel\n`,
    args.yes
  );
  if (!proceed) return;

  // 1. Skills
  console.log(`\nInstalling/verifying ${manifest.skills.length} skill(s)...`);
  for (const skill of manifest.skills) {
    const entry = state.skills[skill.name];
    const dirPresent = fs.existsSync(path.join(args.skillsDir, skill.name));
    if (!dirPresent || !entry || entry.commit !== skill.commit) {
      await installSkillAtCommit(skill, args.skillsDir, state);
      console.log(`  ✓ skill ${skill.name} (${skill.version}) @ ${skill.commit.slice(0, 7)}`);
    } else {
      console.log(`  ✓ skill ${skill.name} (${skill.version}) up-to-date`);
    }
  }

  // 2. Templates
  console.log(`\nInstalling/verifying ${manifest.templates.length} template(s)...`);
  for (const tmpl of manifest.templates) {
    const fileName = tmpl.name.endsWith('.md') ? tmpl.name : `${tmpl.name}.md`;
    const tmplPresent = fs.existsSync(path.join(args.templatesDir, fileName)) || fs.existsSync(path.join(args.templatesDir, tmpl.name));
    const entry = state.templates[tmpl.name];
    if (!tmplPresent || !entry || entry.commit !== tmpl.commit) {
      await installTemplateAtCommit(tmpl, args.templatesDir, state);
      console.log(`  ✓ template ${tmpl.name} (${tmpl.version}) @ ${tmpl.commit.slice(0, 7)}`);
    } else {
      console.log(`  ✓ template ${tmpl.name} (${tmpl.version}) up-to-date`);
    }
  }

  // 3. MCP servers declared in skills or manifest
  const mcpList = [];
  for (const skill of manifest.skills) {
    if (Array.isArray(skill.mcp)) {
      mcpList.push(...skill.mcp);
    }
  }
  if (Array.isArray(manifest.mcp)) {
    mcpList.push(...manifest.mcp);
  }

  if (mcpList.length > 0) {
    console.log(`\nInstalling/verifying ${mcpList.length} MCP server(s)...`);
    for (const mcp of mcpList) {
      const bundleDest = path.join(mcpDir, `${mcp.name}.bundle.js`);
      const entry = state.mcp ? state.mcp[mcp.name] : null;
      if (!fs.existsSync(bundleDest) || !entry || entry.commit !== mcp.commit) {
        await installMcpAtCommit(mcp, mcpDir, state);
        console.log(`  ✓ bundle ${mcp.name} (${mcp.version}) @ ${mcp.commit.slice(0, 7)}`);
      } else {
        console.log(`  ✓ bundle ${mcp.name} (${mcp.version}) up-to-date`);
      }

      // 4. Auto-register in agent config
      const mcpRegistrations = registerMcpAuto({
        bundlePath: bundleDest,
        serverName: mcp.name,
        targetAgent: args.agent,
      });

      for (const reg of mcpRegistrations) {
        console.log(`  ✓ MCP registered for ${reg.agent}: ${reg.file} (${reg.updated ? 'configured' : 'already configured'})`);
      }
    }
  }

  // 5. Save state
  saveState(args.stateFile, state);

  // 6. Summary and workflows
  console.log(`\nBootstrap completed successfully! All components up-to-date.`);
  if (manifest.workflows && manifest.workflows.length > 0) {
    console.log(`\nAvailable workflows:`);
    manifest.workflows.forEach((wf, idx) => {
      console.log(`  ${idx + 1}. ${wf.label} (${wf.skill}) — ${wf.description}`);
    });
  }
}

module.exports = {
  get MANIFEST_URL() {
    return getManifestUrl();
  },
  DEFAULT_MANIFEST_URL,
  DEFAULT_SKILLS_DIR,
  DEFAULT_TEMPLATES_DIR,
  DEFAULT_MCP_DIR,
  DEFAULT_STATE_FILE,
  LEGACY_STATE_FILE,
  getManifestUrl,
  requestFor,
  fetchString,
  fetchJson,
  downloadFile,
  parseManifest,
  emptyState,
  loadState,
  saveState,
  runTar,
  extractTarball,
  findRepoRoot,
  copyDirAtomic,
  replaceDirAtomic,
  copyDirRecursive,
  fetchCompareSummary,
  installSkillAtCommit,
  installTemplateAtCommit,
  installMcpAtCommit,
  printStatusTable,
  promptChoice,
  isConsent,
  consentOrAbort,
  cmdStatus,
  cmdInstall,
  cmdUpdate,
  cmdSync,
  cmdBootstrap,
};
