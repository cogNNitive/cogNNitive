#!/usr/bin/env node

/**
 * scripts/skills-manager.js
 *
 * Lockfile-lite manager for cogNNitive skills and Level 2 templates.
 *
 * The bootstrap manifest (eNNvironment/docs/use/manifest.md) is the source of
 * truth for DESIRED pins: per skill and template a `commit` (full 40-char sha)
 * and a `version` (display string that must match frontmatter).
 * A per-machine state file (~/.agents/bootstrap-state.json, with automatic migration
 * from legacy ~/.agents/skills-state.json) records what is actually INSTALLED.
 *
 * Commands:
 *   status   — compare installed commits against pinned commits (with diff previews)
 *   install  — install missing skills and templates at their pinned commit (consent required)
 *   update   — update outdated skills and templates at their pinned commit (consent required)
 *   sync     — synchronize skill files and templates between local repo and global agent directory
 *
 * Consent is mandatory: without `--yes` and without a TTY, the script prints a
 * "needs decision: ..." line and exits 2 WITHOUT applying anything.
 *
 * Zero dependencies. Requires Node >= 18.
 *
 * Env: SM_MANIFEST_URL overrides the manifest URL (useful for testing).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawnSync } = require('child_process');
const readline = require('readline');
const { parseFocusedYaml, parseFrontmatter } = require('./lib/yaml-lite');

const MANIFEST_URL = process.env.SM_MANIFEST_URL ||
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/docs/use/manifest.md';
const DEFAULT_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');
const DEFAULT_TEMPLATES_DIR = path.join(os.homedir(), '.agents', 'templates');
const DEFAULT_STATE_FILE = path.join(os.homedir(), '.agents', 'bootstrap-state.json');
const LEGACY_STATE_FILE = path.join(os.homedir(), '.agents', 'skills-state.json');

/**
 * Pick the built-in client matching the URL protocol. `http` is only used for
 * local manifest testing (SM_MANIFEST_URL); production URLs are https.
 */
function requestFor(url) {
  return url.startsWith('https:') ? https.request : http.request;
}

/**
 * Perform an HTTP(S) GET returning the response body as a string.
 */
function fetchString(url) {
  return new Promise((resolve, reject) => {
    const req = requestFor(url)(url, { headers: { 'User-Agent': 'actioNN-Skills-Updater' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Download a file to a local destination path.
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(destPath);
    const req = requestFor(url)(url, { headers: { 'User-Agent': 'actioNN-Skills-Updater' } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`Failed to download ${url}, status: ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    req.on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
    req.end();
  });
}

/**
 * Fetch a URL and parse the response as JSON.
 */
function fetchJson(url) {
  return fetchString(url).then(text => JSON.parse(text));
}

// ---------------------------------------------------------------------------
// Manifest parsing
// ---------------------------------------------------------------------------

function parseManifest(text) {
  const doc = parseFocusedYaml(parseFrontmatter(text));
  const bootstrap = doc['agent-bootstrap'];
  if (!bootstrap || typeof bootstrap !== 'object') {
    throw new Error('agent-bootstrap block not found in manifest');
  }
  if (!Array.isArray(bootstrap.skills)) {
    throw new Error('agent-bootstrap.skills is not a list');
  }
  const templates = Array.isArray(bootstrap.templates) ? bootstrap.templates : [];
  return {
    skills: bootstrap.skills,
    templates,
    version: bootstrap.version,
    entrypoint: bootstrap.entrypoint,
  };
}

// ---------------------------------------------------------------------------
// State file (~/.agents/bootstrap-state.json)
// ---------------------------------------------------------------------------

function emptyState() {
  return { manifest: MANIFEST_URL, skills: {}, templates: {} };
}

function loadState(file) {
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return {
        manifest: data.manifest || MANIFEST_URL,
        skills: data.skills || {},
        templates: data.templates || {},
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
      const legacyData = JSON.parse(fs.readFileSync(legacyFileToUse, 'utf-8'));
      const state = {
        manifest: legacyData.manifest || MANIFEST_URL,
        skills: legacyData.skills || {},
        templates: {},
      };
      saveState(file, state);
      return state;
    } catch (err) {
      return emptyState();
    }
  }

  return emptyState();
}

function saveState(file, state) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

// ---------------------------------------------------------------------------
// Tarball handling
// ---------------------------------------------------------------------------

function runTar(args, cwd) {
  return spawnSync('tar', args, { cwd, encoding: 'utf-8' });
}

function extractTarball(tarFile, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const res = runTar(['-xzf', tarFile, '-C', destDir], destDir);
  if (res.status !== 0) {
    throw new Error(`tar extraction failed: ${(res.stderr || res.stdout || '').trim()}`);
  }
}

function findRepoRoot(extractDir) {
  const dirs = fs.readdirSync(extractDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
  if (dirs.length !== 1) {
    throw new Error(`unexpected tarball layout: expected one root directory, found ${dirs.length}`);
  }
  return path.join(extractDir, dirs[0]);
}

function copyDirAtomic(src, dest) {
  const parent = path.dirname(dest);
  const staged = path.join(parent, `.${path.basename(dest)}.new-${process.pid}`);
  fs.rmSync(staged, { recursive: true, force: true });
  fs.cpSync(src, staged, { recursive: true });
  fs.renameSync(staged, dest);
}

function replaceDirAtomic(src, dest) {
  const parent = path.dirname(dest);
  const name = path.basename(dest);
  const staged = path.join(parent, `.${name}.new-${process.pid}`);
  const backup = path.join(parent, `.${name}.bak-${process.pid}`);
  fs.rmSync(staged, { recursive: true, force: true });
  fs.rmSync(backup, { recursive: true, force: true });
  fs.cpSync(src, staged, { recursive: true });
  if (fs.existsSync(dest)) fs.renameSync(dest, backup);
  try {
    fs.renameSync(staged, dest);
    fs.rmSync(backup, { recursive: true, force: true });
  } catch (err) {
    if (fs.existsSync(backup) && !fs.existsSync(dest)) fs.renameSync(backup, dest);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Diff previews via GitHub compare API
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Console helpers & Consent gate
// ---------------------------------------------------------------------------

function printStatusTable(rows) {
  const headers = ['Type', 'Name', 'Pinned', 'Installed', 'Status'];
  const cells = [headers, ...rows.map(r => [r.type, r.name, r.pinned, r.installed, r.status])];
  const widths = headers.map((_, ci) => Math.max(...cells.map(r => r[ci].length)));
  const format = r => r.map((c, ci) => c.padEnd(widths[ci])).join(' | ');
  console.log(format(headers));
  console.log(headers.map((_, ci) => '-'.repeat(widths[ci])).join(' | '));
  for (const row of rows) console.log(format([row.type, row.name, row.pinned, row.installed, row.status]));
}

function promptChoice(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function isConsent(answer) {
  return ['a', 'y', 'yes'].includes(answer);
}

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

async function cmdStatus(args) {
  const manifestRaw = await fetchString(MANIFEST_URL);
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

async function cmdInstall(args) {
  const manifestRaw = await fetchString(MANIFEST_URL);
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

async function cmdUpdate(args) {
  const manifestRaw = await fetchString(MANIFEST_URL);
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

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const base = path.basename(src);
  if (base === 'node_modules' || base.startsWith('.')) return;

  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyDirRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function cmdSync(args) {
  const localSkillsDir = path.join(__dirname, '..', 'skills');
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

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { positional: [], skillsDir: null, templatesDir: null, state: null, yes: false, direction: 'local-to-global' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    } else if (arg === '--direction') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Option ${arg} requires a value`);
      }
      args.direction = value;
      i++;
    } else if (arg === '--skills-dir' || arg === '--templates-dir' || arg === '--state') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Option ${arg} requires a value`);
      }
      if (arg === '--skills-dir') args.skillsDir = value;
      else if (arg === '--templates-dir') args.templatesDir = value;
      else args.state = value;
      i++;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      args.positional.push(arg);
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node scripts/skills-manager.js status    [--skills-dir <dir>] [--templates-dir <dir>] [--state <file>]
  node scripts/skills-manager.js install   [--skills-dir <dir>] [--templates-dir <dir>] [--state <file>] [--yes]
  node scripts/skills-manager.js update    [item ...] [--skills-dir <dir>] [--templates-dir <dir>] [--state <file>] [--yes]
  node scripts/skills-manager.js sync      [--skills-dir <dir>] [--templates-dir <dir>] [--direction <local-to-global|global-to-local>] [--yes]

Commands:
  status   Compare installed commits (state file) against manifest pins.
  install  Install missing skills and templates at their pinned commit.
  update   Update outdated skills and templates at their pinned commit.
  sync     Synchronize skill and template files between local repository and global agent directory.

Flags:
  --skills-dir <dir>     Skills directory (default: ~/.agents/skills)
  --templates-dir <dir>  Templates directory (default: ~/.agents/templates)
  --state <file>         State file (default: ~/.agents/bootstrap-state.json)
  --direction <dir>      Sync direction: local-to-global (default) or global-to-local
  --yes, -y              Skip the interactive consent prompt.

Consent is mandatory. Without a TTY and without --yes, the script prints
"needs decision: ..." and exits 2 without applying anything.`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`skills-manager: ${err.message}`);
    process.exit(1);
  }

  const command = args.positional.shift();
  if (!command || !['status', 'install', 'update', 'sync'].includes(command)) {
    usage();
    process.exit(1);
  }

  args.skillsDir = path.resolve(args.skillsDir || DEFAULT_SKILLS_DIR);
  args.templatesDir = path.resolve(args.templatesDir || DEFAULT_TEMPLATES_DIR);
  args.stateFile = path.resolve(args.state || DEFAULT_STATE_FILE);

  try {
    if (command === 'status') await cmdStatus(args);
    else if (command === 'install') await cmdInstall(args);
    else if (command === 'update') await cmdUpdate(args);
    else await cmdSync(args);
  } catch (err) {
    console.error(`skills-manager: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
