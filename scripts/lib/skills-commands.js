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
  mirrorDir,
} = require('./atomic-fs.js');

const {
  isProjectableName,
  classifyProjection,
  hashTree,
} = require('../../skills/nn-preflight/scripts/lib/projection.js');

const { skillTreeDigest } = require('./skill-tree-digest.js');

const {
  fetchString,
  fetchJson,
  downloadFile,
} = require('./github-client.js');

const {
  parseManifest,
} = require('./yaml-parser.js');

const { registerMcpAuto } = require('./mcp-config-adapter.js');

const DEFAULT_MANIFEST_URL = 'https://cognnitive.com/use/manifest.md';
const FALLBACK_MANIFEST_URL = 'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md';
// Repos retired from distribution: pins pointing here 404 on codeload/raw.
// The fix is re-bootstrap from the canonical manifest, never `update`.
const RETIRED_SKILL_REPOS = ['cogNNitive/cogNNitive'];
const RETIRED_REPO_NOTICE =
  'Your install points at the retired repo cogNNitive/cogNNitive (404). ' +
  'Back up ~/.agents/bootstrap-state.json and ~/.agents/skills/, then re-bootstrap: ' +
  'tell your agent "I want to use https://cognnitive.com/use". ' +
  'Do NOT downgrade to older public pins — they lack nn-upgrade and skills-manager.js.';
const DEFAULT_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills');
const DEFAULT_BLUEPRINTS_DIR = path.join(os.homedir(), '.agents', 'bluepriNNts');
const DEFAULT_MCP_DIR = path.join(os.homedir(), '.agents', 'mcp');
const DEFAULT_CONSOLE_DIR = path.join(os.homedir(), '.agents', 'console');
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
 * Fetches manifest text with automatic fallback to GitHub raw URL.
 * @returns {Promise<string>}
 */
async function fetchManifestString() {
  const primaryUrl = getManifestUrl();
  try {
    return await fetchString(primaryUrl);
  } catch (err) {
    if (!process.env.SM_MANIFEST_URL && primaryUrl !== FALLBACK_MANIFEST_URL) {
      try {
        return await fetchString(FALLBACK_MANIFEST_URL);
      } catch (fallbackErr) {
        throw new Error(`Failed to fetch manifest from ${primaryUrl} (${err.message}) and fallback ${FALLBACK_MANIFEST_URL} (${fallbackErr.message})`);
      }
    }
    throw err;
  }
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
 * @returns {{ manifest: string, skills: Record<string, any>, blueprints: Record<string, any>, mcp: Record<string, any>, console: Record<string, any>, projections: Record<string, any> }}
 */
function emptyState() {
  return { manifest: getManifestUrl(), skills: {}, blueprints: {}, mcp: {}, console: {}, projections: {} };
}

/**
 * Migrates a pre-cutover `innfo-mcp` state entry and installed bundle to `nn-mcp`
 * (design D10). Kept permanently: it is small and idempotent, and without it an
 * installed skills-manager could register `nn-mcp` beside the stale `innfo-mcp`
 * entry, ending up with two MCP servers. Running it twice changes nothing.
 *
 * @param {object} state
 * @param {string} [mcpDir] when set, the legacy bundle file is renamed/deleted too
 * @returns {boolean} true when anything changed
 */
function migrateLegacyMcpState(state, mcpDir) {
  let changed = false;

  if (state && state.mcp && state.mcp['innfo-mcp']) {
    if (!state.mcp['nn-mcp']) {
      state.mcp['nn-mcp'] = state.mcp['innfo-mcp'];
    }
    delete state.mcp['innfo-mcp'];
    changed = true;
  }

  if (mcpDir) {
    const legacyBundle = path.join(mcpDir, 'innfo-mcp.bundle.js');
    const newBundle = path.join(mcpDir, 'nn-mcp.bundle.js');
    if (fs.existsSync(legacyBundle)) {
      try {
        if (!fs.existsSync(newBundle)) {
          fs.renameSync(legacyBundle, newBundle);
        } else {
          fs.rmSync(legacyBundle, { force: true });
        }
        changed = true;
      } catch (_) {
        // best-effort: a locked legacy bundle must not break install/update
      }
    }
  }

  return changed;
}

/**
  * Loads the current machine skill state from JSON file, supporting legacy migrations.
  * @param {string} file
  * @returns {{ manifest: string, skills: Record<string, any>, blueprints: Record<string, any>, mcp: Record<string, any>, console: Record<string, any>, projections: Record<string, any> }}
  */
function loadState(file) {
  if (fs.existsSync(file)) {
    try {
      const raw = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
      const data = JSON.parse(raw);
      const state = {
        manifest: data.manifest || getManifestUrl(),
        skills: data.skills || {},
        blueprints: data.blueprints || {},
        mcp: data.mcp || {},
        console: data.console || {},
        projections: data.projections || {},
      };
      migrateLegacyMcpState(state);
      return state;
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
        blueprints: {},
        mcp: {},
        console: {},
        projections: {},
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

/**
 * Returns true when a manifest pin targets a retired distribution repo.
 * @param {{ repo?: string }} item
 * @returns {boolean}
 */
function isRetiredPin(item) {
  return !!item && RETIRED_SKILL_REPOS.includes(item.repo);
}

/**
 * Warns when the active manifest still pins the retired repo, so the user
 * gets migration instructions instead of a raw 404 from codeload.
 * @param {Array<object>} pins
 * @returns {void}
 */
function warnOnRetiredPins(pins) {
  if ((pins || []).some(isRetiredPin)) {
    console.log(`\nNOTICE (retired repo): ${RETIRED_REPO_NOTICE}\n`);
  }
}

/**
 * Rewrites a raw codeload/raw 404 on a retired repo into the migration notice.
 * @param {object} item
 * @param {Error} err
 * @returns {Error}
 */
function withRetiredHint(item, err) {
  if (isRetiredPin(item) && /status:\s*404|Failed to (fetch|download).*404/.test(err.message)) {
    return new Error(`${err.message}\n${RETIRED_REPO_NOTICE}`);
  }
  return err;
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
// Session tarball cache (deduplicated downloads by repo@commit)
// ---------------------------------------------------------------------------

/** @type {string | null} */
let tarballCacheDir = null;
/** @type {Map<string, Promise<string>>} keyed by `${repo}@${commit}` */
const tarballCache = new Map();

/**
 * Lazily creates the per-process temp directory holding cached tarballs and
 * registers a one-shot exit hook to remove it.
 * @returns {string}
 */
function getTarballCacheDir() {
  if (!tarballCacheDir) {
    tarballCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-tarballs-'));
    const dir = tarballCacheDir;
    process.once('exit', () => {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    });
  }
  return tarballCacheDir;
}

/**
 * Drops the session tarball cache and removes its temp directory. Test seam.
 * @returns {void}
 */
function resetTarballCache() {
  tarballCache.clear();
  if (tarballCacheDir) {
    try { fs.rmSync(tarballCacheDir, { recursive: true, force: true }); } catch (_) {}
    tarballCacheDir = null;
  }
}

/**
 * Downloads (at most once per process) the repository archive for a pinned
 * (repo, commit) and returns the cached archive path. Repeated callers — install,
 * update, bootstrap — reuse the same archive instead of re-downloading it.
 * @param {{ repo: string, commit: string }} item
 * @returns {Promise<string>}
 */
async function fetchRepoCommitTarball(item) {
  const key = `${item.repo}@${item.commit}`;
  if (tarballCache.has(key)) return tarballCache.get(key);

  const promise = (async () => {
    const dir = getTarballCacheDir();
    const safe = key.replace(/[^a-zA-Z0-9@._-]/g, '_');
    const tarball = path.join(dir, `${safe}.tar.gz`);
    const url = `https://codeload.github.com/${item.repo}/tar.gz/${item.commit}`;
    try {
      await downloadFile(url, tarball);
    } catch (err) {
      throw withRetiredHint(item, err);
    }
    return tarball;
  })();

  tarballCache.set(key, promise);
  // A failed download is not cached: retries may re-attempt the network.
  promise.catch(() => tarballCache.delete(key));
  return promise;
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
    const tarball = await fetchRepoCommitTarball(skill);

    const extractDir = path.join(tmpRoot, 'x');
    extractTarball(tarball, extractDir);
    const repoRoot = findRepoRoot(extractDir);

    const src = path.join(repoRoot, skill.path);
    if (!fs.existsSync(src)) {
      throw new Error(`path ${skill.path} not found in ${skill.repo} at ${skill.commit}`);
    }

    // Integrity: a referenced external skill pins a canonical tree digest. Verify
    // the fetched tree BEFORE the atomic swap so a mismatch writes nothing.
    if (skill.sha256) {
      const actual = skillTreeDigest(src);
      if (actual !== String(skill.sha256)) {
        throw new Error(
          `integrity mismatch for ${skill.name}: expected sha256 ${skill.sha256}, got ${actual}`,
        );
      }
    }

    const dest = path.join(skillsDir, skill.name);
    fs.mkdirSync(skillsDir, { recursive: true });
    const existingNodeModules = path.join(dest, 'node_modules');
    const tempNodeModules = path.join(tmpRoot, 'saved_node_modules');
    let hasExistingNodeModules = false;
    if (fs.existsSync(existingNodeModules)) {
      try {
        fs.renameSync(existingNodeModules, tempNodeModules);
        hasExistingNodeModules = true;
      } catch (_) {}
    }

    if (fs.existsSync(dest)) {
      replaceDirAtomic(src, dest);
    } else {
      copyDirAtomic(src, dest);
    }

    if (hasExistingNodeModules && !fs.existsSync(path.join(dest, 'node_modules'))) {
      try {
        fs.renameSync(tempNodeModules, path.join(dest, 'node_modules'));
      } catch (_) {}
    }

    const pkgPath = path.join(dest, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = Object.keys(pkg.dependencies || {});
        const nodeModulesDir = path.join(dest, 'node_modules');
        const needsInstall =
          deps.length > 0 &&
          (!fs.existsSync(nodeModulesDir) ||
            deps.some((d) => !fs.existsSync(path.join(nodeModulesDir, d))));
        if (needsInstall) {
          try {
            spawnSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
              cwd: dest,
              encoding: 'utf-8',
              shell: true,
              timeout: 60000,
            });
          } catch (_) {}
        }
      } catch (_) {}
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
 * Projects the skills embedded in an installed bluepriNNt package (`<pkgDir>/skills/<name>/`)
 * into the canonical skills directory. An existing destination (for example a former standalone
 * install) is replaced atomically with its `node_modules` carried over.
 * @param {string} pkgDir installed package directory
 * @param {string} skillsDir canonical skills directory
 * @param {object} template
 * @param {object} state
 * @returns {string[]} names of the projected skills
 */
function installEmbeddedSkills(pkgDir, skillsDir, template, state) {
  const embeddedRoot = path.join(pkgDir, 'skills');
  if (!fs.existsSync(embeddedRoot)) return [];

  const names = [];
  try {
    for (const entry of fs.readdirSync(embeddedRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const src = path.join(embeddedRoot, entry.name);
      const skillFile = path.join(src, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;

      const dest = path.join(skillsDir, entry.name);
      fs.mkdirSync(skillsDir, { recursive: true });
      if (fs.existsSync(dest)) replaceDirAtomic(src, dest);
      else copyDirAtomic(src, dest);

      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(skillFile, 'utf8'));
      const versionMatch = frontmatter && /^version:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(frontmatter[1]);
      state.skills[entry.name] = {
        commit: template.commit,
        version: versionMatch ? versionMatch[1] : undefined,
        source_blueprint: template.name,
        updated_at: new Date().toISOString(),
      };
      names.push(entry.name);
    }
  } catch (err) {
    // Skills projected before the failure stay recorded in state and on disk; hand their names
    // to the caller so they still reach the agent directories instead of being lost silently.
    err.projectedSkills = names;
    throw err;
  }
  return names;
}

/**
 * Installs or updates a template from GitHub at specified commit.
 * @param {object} template
 * @param {string} blueprintsDir
 * @param {object} state
 * @param {string} [skillsDir] when set, skills embedded in the package are projected here
 * @returns {Promise<string[]>} names of the embedded skills projected
 */
async function installBlueprintAtCommit(template, blueprintsDir, state, skillsDir) {
  const isMdFile = template.path.endsWith('.md') || template.path.endsWith('.markdown');
  const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
  const flatDestPath = path.join(blueprintsDir, fileName);
  const pkgDestPath = path.join(blueprintsDir, template.name);

  fs.mkdirSync(blueprintsDir, { recursive: true });

  let recordedPath = isMdFile ? flatDestPath : pkgDestPath;
  const pkgExistedBefore = fs.existsSync(pkgDestPath);

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-blueprints-'));
  try {
    const tarball = await fetchRepoCommitTarball(template);

    const extractDir = path.join(tmpRoot, 'x');
    extractTarball(tarball, extractDir);
    const repoRoot = findRepoRoot(extractDir);

    const src = path.join(repoRoot, template.path);
    if (!fs.existsSync(src)) {
      throw new Error(`template path ${template.path} not found in ${template.repo} at ${template.commit}`);
    }

    if (fs.statSync(src).isDirectory()) {
      if (fs.existsSync(pkgDestPath)) replaceDirAtomic(src, pkgDestPath);
      else copyDirAtomic(src, pkgDestPath);
      recordedPath = pkgDestPath;
    } else {
      const srcParentDir = path.dirname(src);
      const hasPackageSubdirs =
        fs.existsSync(path.join(srcParentDir, 'procedures')) ||
        fs.existsSync(path.join(srcParentDir, 'assets')) ||
        fs.existsSync(path.join(srcParentDir, 'samples')) ||
        path.basename(srcParentDir).toLowerCase() === template.name.toLowerCase();

      if (hasPackageSubdirs) {
        if (fs.existsSync(pkgDestPath)) replaceDirAtomic(srcParentDir, pkgDestPath);
        else copyDirAtomic(srcParentDir, pkgDestPath);
        try { fs.copyFileSync(src, flatDestPath); } catch (_) {}
        recordedPath = pkgDestPath;
      } else {
        fs.copyFileSync(src, flatDestPath);
        recordedPath = flatDestPath;
      }
    }
  } catch (err) {
    if (isMdFile) {
      const rawUrl = `https://raw.githubusercontent.com/${template.repo}/${template.commit}/${template.path}`;
      await downloadFile(rawUrl, flatDestPath);
      recordedPath = flatDestPath;
    } else {
      throw err;
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  // The blueprint is recorded only AFTER its embedded skills projected successfully. Recording it
  // first would let a projection failure (EBUSY/EPERM, a later skill failing) be persisted as a
  // success: bootstrap skips an existing package and update sees an equal commit, so the skill
  // would never be retried. On failure the previous state entry stays (update sees it outdated)
  // and a freshly created package dir is removed (bootstrap sees it missing and retries).
  let projected = [];
  if (skillsDir && recordedPath === pkgDestPath) {
    try {
      projected = installEmbeddedSkills(pkgDestPath, skillsDir, template, state);
    } catch (err) {
      if (!pkgExistedBefore) fs.rmSync(pkgDestPath, { recursive: true, force: true });
      throw err;
    }
  }

  state.blueprints[template.name] = {
    commit: template.commit,
    version: template.version,
    path: recordedPath,
    updated_at: new Date().toISOString(),
  };
  return projected;
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

/**
 * Installs a console asset bundle (nn-console.bundle.js) from GitHub raw URL
 * at the pinned commit. The bundle is self-contained (runtime + renderers) and
 * lives in ~/.agents/console/ so generated artifacts can vendor it locally.
 * @param {object} asset
 * @param {string} consoleDir
 * @param {object} state
 * @returns {Promise<void>}
 */
async function installConsoleAssetAtCommit(asset, consoleDir, state) {
  fs.mkdirSync(consoleDir, { recursive: true });
  const fileName = path.basename(asset.file || asset.url);
  const dest = path.join(consoleDir, fileName);
  const url = asset.url || `https://raw.githubusercontent.com/${asset.repo}/${asset.commit}/${asset.file}`;
  await downloadFile(url, dest);
  if (!state.console) state.console = {};
  state.console[fileName] = {
    commit: asset.commit,
    version: asset.version,
    path: dest,
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
 * @param {{ skillsDir: string, blueprintsDir: string, consoleDir?: string, mcpDir?: string, stateFile: string }} args
 * @returns {Promise<void>}
 */
async function cmdStatus(args) {
  const manifestRaw = await fetchManifestString();
  const { skills, blueprints, consoleAssets, mcp } = parseManifest(manifestRaw);
  warnOnRetiredPins([...skills, ...blueprints]);
  const state = loadState(args.stateFile);
  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR;

  const rows = [];
  const outdatedSkills = [];
  const outdatedBlueprints = [];
  const outdatedConsoleAssets = [];
  const outdatedMcp = [];

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

  for (const template of blueprints) {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
    const pathPresent = fs.existsSync(path.join(args.blueprintsDir, fileName)) || fs.existsSync(path.join(args.blueprintsDir, template.name));
    const entry = state.blueprints[template.name];
    let status;
    if (pathPresent) {
      if (!entry) status = 'untracked';
      else if (entry.commit === template.commit) status = 'up-to-date';
      else status = 'outdated';
    } else {
      status = entry ? 'file-missing' : 'missing';
    }
    rows.push({
      type: 'template',
      name: template.name,
      pinned: template.commit ? template.commit.slice(0, 7) : '-',
      installed: entry ? entry.commit.slice(0, 7) : '-',
      status,
    });
    if (status === 'outdated') outdatedBlueprints.push(template);
  }

  for (const server of mcp || []) {
    const bundleName = `${server.name}.bundle.js`;
    const bundlePath = path.join(mcpDir, bundleName);
    const pathPresent = fs.existsSync(bundlePath);
    const entry = state.mcp ? state.mcp[server.name] : null;
    let status;
    if (pathPresent) {
      if (!entry) status = 'untracked';
      else if (entry.commit === server.commit) status = 'up-to-date';
      else status = 'outdated';
    } else {
      status = entry ? 'bundle-missing' : 'missing';
    }
    rows.push({
      type: 'mcp',
      name: server.name,
      pinned: server.commit ? server.commit.slice(0, 7) : '-',
      installed: entry ? entry.commit.slice(0, 7) : '-',
      status,
    });
    if (status === 'outdated') outdatedMcp.push(server);
  }

  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR;
  for (const asset of consoleAssets || []) {
    const fileName = path.basename(asset.file || asset.url);
    const pathPresent = fs.existsSync(path.join(consoleDir, fileName));
    const entry = state.console ? state.console[fileName] : null;
    let status;
    if (pathPresent) {
      if (!entry) status = 'untracked';
      else if (entry.commit === asset.commit) status = 'up-to-date';
      else status = 'outdated';
    } else {
      status = entry ? 'file-missing' : 'missing';
    }
    rows.push({
      type: 'console',
      name: fileName,
      pinned: asset.commit ? asset.commit.slice(0, 7) : '-',
      installed: entry ? entry.commit.slice(0, 7) : '-',
      status,
    });
    if (status === 'outdated') outdatedConsoleAssets.push(asset);
  }

  printStatusTable(rows);

  if (outdatedSkills.length > 0 || outdatedBlueprints.length > 0 || outdatedConsoleAssets.length > 0 || outdatedMcp.length > 0) {
    console.log('\nDiff previews for outdated items:');
    for (const skill of outdatedSkills) {
      const installed = state.skills[skill.name].commit;
      console.log(`  skill ${skill.name}: ${await fetchCompareSummary(skill, installed)}`);
    }
    for (const template of outdatedBlueprints) {
      const installed = state.blueprints[template.name].commit;
      console.log(`  template ${template.name}: ${await fetchCompareSummary(template, installed)}`);
    }
  }
}

/**
 * Executes install command installing missing skills and templates with consent.
 * @param {{ skillsDir: string, blueprintsDir: string, consoleDir?: string, mcpDir?: string, stateFile: string, yes: boolean, agent?: string, scope?: string }} args
 * @returns {Promise<void>}
 */
async function cmdInstall(args) {
  const manifestRaw = await fetchManifestString();
  const { skills, blueprints, consoleAssets, mcp } = parseManifest(manifestRaw);
  const state = loadState(args.stateFile);
  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR;
  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR;
  migrateLegacyMcpState(state, mcpDir);

  const toInstallSkills = skills.filter(skill => !fs.existsSync(path.join(args.skillsDir, skill.name)));
  const toInstallBlueprints = blueprints.filter(template => {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
    return !fs.existsSync(path.join(args.blueprintsDir, fileName)) && !fs.existsSync(path.join(args.blueprintsDir, template.name));
  });
  const toInstallConsole = (consoleAssets || []).filter(asset => {
    const fileName = path.basename(asset.file || asset.url);
    return !fs.existsSync(path.join(consoleDir, fileName));
  });
  const toInstallMcp = (mcp || []).filter(server => {
    return !fs.existsSync(path.join(mcpDir, `${server.name}.bundle.js`));
  });

  if (toInstallSkills.length === 0 && toInstallBlueprints.length === 0 && toInstallConsole.length === 0 && toInstallMcp.length === 0) {
    console.log('All skills, templates, and console assets present.');
    return;
  }

  const names = [
    ...toInstallSkills.map(s => `skill:${s.name}`),
    ...toInstallBlueprints.map(t => `template:${t.name}`),
    ...toInstallConsole.map(a => `console:${path.basename(a.file || a.url)}`),
    ...toInstallMcp.map(m => `mcp:${m.name}`),
  ];

  const menu = `The following items are missing:\n` +
    (toInstallSkills.length > 0 ? `Skills:\n  - ${toInstallSkills.map(s => `${s.name} (${s.version})`).join('\n  - ')}\n` : '') +
    (toInstallBlueprints.length > 0 ? `Templates:\n  - ${toInstallBlueprints.map(t => `${t.name} (${t.version})`).join('\n  - ')}\n` : '') +
    (toInstallConsole.length > 0 ? `Console assets:\n  - ${toInstallConsole.map(a => `${path.basename(a.file || a.url)} (${a.version})`).join('\n  - ')}\n` : '') +
    (toInstallMcp.length > 0 ? `MCP servers:\n  - ${toInstallMcp.map(m => `${m.name} (${m.version})`).join('\n  - ')}\n` : '') +
    `\n[a] Install all missing (Recommended)\n[b] Skip\n`;

  const proceed = await consentOrAbort('install missing skills, templates, console assets, and MCP servers', names, menu, args.yes);
  if (!proceed) return;

  let failures = 0;
  const embeddedSkillNames = [];

  for (const skill of toInstallSkills) {
    try {
      await installSkillAtCommit(skill, args.skillsDir, state);
      console.log(`  installed skill ${skill.name} (${skill.version}) @ ${skill.commit.slice(0, 7)}`);
    } catch (err) {
      failures++;
      console.error(`  FAIL skill ${skill.name}: ${err.message}`);
    }
  }

  for (const template of toInstallBlueprints) {
    try {
      embeddedSkillNames.push(...await installBlueprintAtCommit(template, args.blueprintsDir, state, args.skillsDir));
      console.log(`  installed template ${template.name} (${template.version}) @ ${template.commit.slice(0, 7)}`);
    } catch (err) {
      failures++;
      if (err.projectedSkills) embeddedSkillNames.push(...err.projectedSkills);
      console.error(`  FAIL template ${template.name}: ${err.message}`);
    }
  }

  for (const asset of toInstallConsole) {
    try {
      await installConsoleAssetAtCommit(asset, consoleDir, state);
      console.log(`  installed console ${path.basename(asset.file || asset.url)} (${asset.version}) @ ${asset.commit.slice(0, 7)}`);
    } catch (err) {
      failures++;
      console.error(`  FAIL console ${path.basename(asset.file || asset.url)}: ${err.message}`);
    }
  }

  for (const server of toInstallMcp) {
    try {
      await installMcpAtCommit(server, mcpDir, state);
      registerMcpAuto({
        bundlePath: path.join(mcpDir, `${server.name}.bundle.js`),
        serverName: server.name,
        targetAgent: args.agent,
      });
      console.log(`  installed MCP ${server.name} (${server.version}) @ ${server.commit.slice(0, 7)}`);
    } catch (err) {
      failures++;
      console.error(`  FAIL MCP ${server.name}: ${err.message}`);
    }
  }

  projectSkillsToAgents({
    canonicalSkillsDir: args.skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
    skillNames: [...toInstallSkills.map(s => s.name), ...embeddedSkillNames],
  });

  saveState(args.stateFile, state);

  if (failures > 0) {
    console.error(`\n${failures} item(s) failed to install.`);
    process.exit(1);
  }
  console.log(`\nInstalled ${toInstallSkills.length} skill(s), ${toInstallBlueprints.length} template(s), ${toInstallConsole.length} console asset(s), and ${toInstallMcp.length} MCP server(s).`);
}

/** Third-party skill trust guidance, linked from the install notice when it matters. */
const THIRD_PARTY_SKILL_DOC_URL =
  'https://cognnitive.com/skills/documentation/#/skills/installing-third-party-skills';

/**
 * Builds the consent notice shown before installing a *referenced* external
 * skill. Deliberately brief and contextual: it names only this skill's
 * provenance and points at the trust guidance, without reciting attack types or
 * otherwise alarming the user. The full explanation lives in the linked page;
 * the why-now rationale belongs to the agent conversation, not this line.
 * Pure and exported so it can be unit-tested and kept in sync with the bundled
 * skills-manager.
 * @param {{ name: string, repo: string, path: string, commit: string, sha256?: string }} args
 * @returns {string}
 */
function buildExternalSkillNotice({ name, repo, path: skillPath, commit, sha256 }) {
  const shortCommit = String(commit).slice(0, 7);
  const integrity = sha256
    ? "pinned and verified against the author's sha256"
    : 'pinned by commit only (no sha256 to verify)';
  return (
    `Third-party skill — not from cogNNitive\n` +
    `\n` +
    `  name:      ${name}\n` +
    `  source:    ${repo}/${skillPath} @ ${shortCommit}\n` +
    `  integrity: ${integrity}\n` +
    `\n` +
    `cogNNitive has not reviewed this content. Before trusting a skill from a\n` +
    `third party, it is worth having a security skill check it first — a quick,\n` +
    `routine step. Why and how: ${THIRD_PARTY_SKILL_DOC_URL}\n` +
    `\n` +
    `[a] Install anyway   [b] Skip\n`
  );
}

/**
 * Installs a single *referenced* external skill (declared in a bluepriNNt
 * frontmatter `skills:` array) from its upstream repo at its pinned commit,
 * verifying the declared sha256 tree digest when present. Consent-gated: the
 * skill is third-party and NOT curated by cogNNitive.
 * @param {{ skillsDir: string, stateFile: string, name: string, repo: string, path: string, commit: string, sha256?: string, yes?: boolean, agent?: string, scope?: string }} args
 * @returns {Promise<void>}
 */
async function cmdInstallExternal(args) {
  const { name, repo, commit } = args;
  const skillPath = args.path;
  if (!name || !repo || !skillPath || !commit) {
    throw new Error('install-external requires --name, --repo, --path and --commit');
  }
  if (!/^[0-9a-f]{40}$/i.test(String(commit))) {
    throw new Error(`--commit '${commit}' is not a 40-char hex sha`);
  }

  const skillsDir = args.skillsDir || DEFAULT_SKILLS_DIR;
  const state = loadState(args.stateFile);

  const menu = buildExternalSkillNotice({
    name,
    repo,
    path: skillPath,
    commit,
    sha256: args.sha256,
  });
  const proceed = await consentOrAbort(`install external skill ${name}`, [`external-skill:${name}`], menu, args.yes);
  if (!proceed) return;

  await installSkillAtCommit(
    { name, repo, path: skillPath, commit, sha256: args.sha256 },
    skillsDir,
    state,
  );
  projectSkillsToAgents({
    canonicalSkillsDir: skillsDir,
    targetAgent: args.agent || 'auto',
    scope: args.scope || 'global',
    state,
    skillNames: [name],
  });
  saveState(args.stateFile, state);
  console.log(`installed referenced external skill ${name} @ ${String(commit).slice(0, 7)}`);
}

const DEFAULT_BLUEPRINT_REPO = 'cogNNitive/cogNNitive-web';
const DEFAULT_CATALOG_PATH = path.join(__dirname, '..', '..', 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json');

/**
 * Loads the Level-2 blueprint catalog (`catalog.json`). Resolution order:
 * an explicit path, the `COGNNITIVE_CATALOG` / `SM_CATALOG` env override, then
 * the in-repo copy. Returns null when no catalog is readable.
 * @param {string} [override]
 * @returns {object | null}
 */
function loadBlueprintCatalog(override) {
  const candidate = override || process.env.COGNNITIVE_CATALOG || process.env.SM_CATALOG || DEFAULT_CATALOG_PATH;
  try {
    return JSON.parse(fs.readFileSync(candidate, 'utf-8'));
  } catch (_) {
    return null;
  }
}

/**
 * Finds a catalog entry by blueprint name (case-insensitive) across the
 * `blueprints` and `frozen` partitions.
 * @param {object | null} catalog
 * @param {string} name
 * @returns {object | null}
 */
function findCatalogEntry(catalog, name) {
  if (!catalog) return null;
  const wanted = String(name).toLowerCase();
  for (const group of [catalog.blueprints || {}, catalog.frozen || {}]) {
    for (const [key, entry] of Object.entries(group)) {
      if (key.toLowerCase() === wanted) return entry;
      if (entry && entry.name && String(entry.name).toLowerCase() === wanted) return entry;
    }
  }
  return null;
}

/**
 * Installs a single optional catalog bluepriNNt on demand
 * (`skills-manager.js install --blueprint <name>`) from its catalog release pin
 * into the blueprints directory, projecting any embedded `<name>/skills/*` into
 * the skills directory. Consent-gated.
 * @param {{ blueprintsDir?: string, skillsDir?: string, stateFile: string, blueprint: string, repo?: string, catalogPath?: string, yes?: boolean, agent?: string, scope?: string }} args
 * @returns {Promise<void>}
 */
async function cmdInstallBlueprint(args) {
  const name = args.blueprint;
  if (!name) throw new Error('install --blueprint requires a blueprint name');

  const catalogPath = args.catalogPath;
  const catalog = loadBlueprintCatalog(catalogPath);
  const entry = findCatalogEntry(catalog, name);
  if (!entry) {
    throw new Error(
      `blueprint '${name}' is not in the catalog (${catalogPath || DEFAULT_CATALOG_PATH}); ` +
        'check the name or refresh catalog.json',
    );
  }

  const blueprintsDir = args.blueprintsDir || DEFAULT_BLUEPRINTS_DIR;
  const skillsDir = args.skillsDir || DEFAULT_SKILLS_DIR;
  const repo = args.repo || DEFAULT_BLUEPRINT_REPO;
  const ref = entry.release_tag;
  const version = entry.adopted;
  const entryName = entry.name || name;
  const embedded = Array.isArray(entry.embedded_skills) ? entry.embedded_skills : [];

  // codeload accepts a tag as the archive ref; reuse the (repo, ref) tarball
  // cache and the standard blueprint install path for extraction + projection.
  const template = {
    name: entryName,
    repo,
    path: `iNNfo/specs/bluepriNNts/${entryName}/spec_NN.md`,
    version,
    ref,
    commit: ref,
  };

  const menu =
    `Optional catalog blueprint (on demand):\n` +
    `  - ${entryName} (${version}) from ${repo} @ ${ref}\n` +
    `  tier: ${entry.tier || 'free'} · access: ${entry.access || 'public'}\n` +
    (embedded.length ? `  embedded skills: ${embedded.join(', ')}\n` : '') +
    `\n[a] Install\n[b] Skip\n`;
  const proceed = await consentOrAbort(`install catalog blueprint ${entryName}`, [`blueprint:${entryName}`], menu, args.yes);
  if (!proceed) return;

  const state = loadState(args.stateFile);
  let projected = [];
  try {
    projected = await installBlueprintAtCommit(template, blueprintsDir, state, skillsDir);
  } catch (err) {
    if (err.projectedSkills) projected = err.projectedSkills;
    throw err;
  }

  projectSkillsToAgents({
    canonicalSkillsDir: skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
    skillNames: projected.length > 0 ? projected : undefined,
  });
  saveState(args.stateFile, state);
  console.log(
    `installed catalog blueprint ${entryName} (${version}) @ ${ref}` +
      (projected.length ? ` and projected ${projected.length} skill(s): ${projected.join(', ')}` : ''),
  );
}

/**
 * Executes update command updating outdated skills and templates with consent.
 * @param {{ skillsDir: string, blueprintsDir: string, consoleDir?: string, mcpDir?: string, stateFile: string, positional: string[], yes: boolean, agent?: string, scope?: string }} args
 * @returns {Promise<void>}
 */
async function cmdUpdate(args) {  const manifestRaw = await fetchManifestString();
  const { skills, blueprints, consoleAssets, mcp } = parseManifest(manifestRaw);
  const state = loadState(args.stateFile);
  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR;
  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR;
  migrateLegacyMcpState(state, mcpDir);

  const isOutdatedSkill = (skill) => {
    const dirPresent = fs.existsSync(path.join(args.skillsDir, skill.name));
    const entry = state.skills[skill.name];
    return dirPresent && (!entry || entry.commit !== skill.commit);
  };

  const isOutdatedBlueprint = (template) => {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`;
    const pathPresent = fs.existsSync(path.join(args.blueprintsDir, fileName)) || fs.existsSync(path.join(args.blueprintsDir, template.name));
    const entry = state.blueprints[template.name];
    return pathPresent && (!entry || entry.commit !== template.commit);
  };

  const isOutdatedMcp = (server) => {
    const bundleDest = path.join(mcpDir, `${server.name}.bundle.js`);
    const pathPresent = fs.existsSync(bundleDest);
    const entry = state.mcp ? state.mcp[server.name] : null;
    if (!pathPresent) return true;
    return !entry || entry.commit !== server.commit;
  };

  // The console assets are one set (exporter, view lib, CSS, bundle, payload mirror).
  // Once any member is installed, update also installs the members a newer release added.
  const consoleSetInstalled = (consoleAssets || []).some(asset =>
    fs.existsSync(path.join(consoleDir, path.basename(asset.file || asset.url))));

  const isOutdatedConsole = (asset) => {
    const fileName = path.basename(asset.file || asset.url);
    const pathPresent = fs.existsSync(path.join(consoleDir, fileName));
    if (!pathPresent) return consoleSetInstalled;
    const entry = state.console ? state.console[fileName] : null;
    return !entry || entry.commit !== asset.commit;
  };

  let selectedSkills = skills.filter(isOutdatedSkill);
  let selectedBlueprints = blueprints.filter(isOutdatedBlueprint);
  let selectedConsole = (consoleAssets || []).filter(isOutdatedConsole);
  let selectedMcp = (mcp || []).filter(isOutdatedMcp);

  if (args.positional.length > 0) {
    selectedSkills = skills.filter(s => args.positional.includes(s.name) && isOutdatedSkill(s));
    selectedBlueprints = blueprints.filter(t => args.positional.includes(t.name) && isOutdatedBlueprint(t));
    selectedConsole = (consoleAssets || []).filter(a => args.positional.includes(path.basename(a.file || a.url)) && isOutdatedConsole(a));
    selectedMcp = (mcp || []).filter(m => (args.positional.includes(m.name) || args.positional.includes('mcp')) && isOutdatedMcp(m));
  }

  if (selectedSkills.length === 0 && selectedBlueprints.length === 0 && selectedConsole.length === 0 && selectedMcp.length === 0) {
    console.log('All skills, templates, and console assets up to date.');
    projectSkillsToAgents({
      canonicalSkillsDir: args.skillsDir,
      targetAgent: args.agent,
      scope: args.scope,
      state,
      skillNames: args.positional.length > 0 ? args.positional : undefined,
    });
    saveState(args.stateFile, state);
    return;
  }

  const names = [
    ...selectedSkills.map(s => `skill:${s.name}`),
    ...selectedBlueprints.map(t => `template:${t.name}`),
    ...selectedConsole.map(a => `console:${path.basename(a.file || a.url)}`),
    ...selectedMcp.map(m => `mcp:${m.name}`),
  ];

  const proceed = await consentOrAbort(
    'update skills, templates, console assets, and MCP servers',
    names,
    `Updating ${selectedSkills.length} skill(s), ${selectedBlueprints.length} template(s), ${selectedConsole.length} console asset(s), and ${selectedMcp.length} MCP server(s).\n\n[a] Update all listed (Recommended)\n[b] Skip\n`,
    args.yes
  );
  if (!proceed) return;

  let failures = 0;
  const embeddedSkillNames = [];

  for (const skill of selectedSkills) {
    try {
      await installSkillAtCommit(skill, args.skillsDir, state);
      console.log(`  updated skill ${skill.name} -> ${skill.version} (${skill.commit.slice(0, 7)})`);
    } catch (err) {
      failures++;
      console.error(`  FAIL skill ${skill.name}: ${err.message}`);
    }
  }

  for (const template of selectedBlueprints) {
    try {
      embeddedSkillNames.push(...await installBlueprintAtCommit(template, args.blueprintsDir, state, args.skillsDir));
      console.log(`  updated template ${template.name} -> ${template.version} (${template.commit.slice(0, 7)})`);
    } catch (err) {
      failures++;
      if (err.projectedSkills) embeddedSkillNames.push(...err.projectedSkills);
      console.error(`  FAIL template ${template.name}: ${err.message}`);
    }
  }

  for (const asset of selectedConsole) {
    try {
      await installConsoleAssetAtCommit(asset, consoleDir, state);
      console.log(`  updated console ${path.basename(asset.file || asset.url)} -> ${asset.version} (${asset.commit.slice(0, 7)})`);
    } catch (err) {
      failures++;
      console.error(`  FAIL console ${path.basename(asset.file || asset.url)}: ${err.message}`);
    }
  }

  for (const server of selectedMcp) {
    try {
      await installMcpAtCommit(server, mcpDir, state);
      const bundleDest = path.join(mcpDir, `${server.name}.bundle.js`);
      registerMcpAuto({
        bundlePath: bundleDest,
        serverName: server.name,
        targetAgent: args.agent,
      });
      console.log(`  updated MCP ${server.name} -> ${server.version} (${server.commit.slice(0, 7)})`);
    } catch (err) {
      failures++;
      console.error(`  FAIL MCP ${server.name}: ${err.message}`);
    }
  }

  projectSkillsToAgents({
    canonicalSkillsDir: args.skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
    // A positional filter names blueprint or skill entries; skills embedded in an updated blueprint have
    // their own directory names, so they must be added or they are never projected to the agents.
    skillNames: args.positional.length > 0 ? [...args.positional, ...embeddedSkillNames] : undefined,
  });

  saveState(args.stateFile, state);

  if (failures > 0) {
    console.error(`\n${failures} item(s) failed to update.`);
    process.exit(1);
  }
  console.log(`\nUpdated ${selectedSkills.length} skill(s), ${selectedBlueprints.length} template(s), ${selectedConsole.length} console asset(s), and ${selectedMcp.length} MCP server(s).`);
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
 *   blueprintsDir: string,
 *   mcpDir?: string,
 *   consoleDir?: string,
 *   stateFile: string,
 *   agent?: string,
 *   scope?: string,
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
  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR;
  migrateLegacyMcpState(state, mcpDir);
  fs.mkdirSync(args.skillsDir, { recursive: true });
  fs.mkdirSync(args.blueprintsDir, { recursive: true });
  fs.mkdirSync(mcpDir, { recursive: true });
  fs.mkdirSync(consoleDir, { recursive: true });

  const names = [
    ...manifest.skills.map(s => `skill:${s.name}`),
    ...manifest.blueprints.map(t => `template:${t.name}`),
    ...(manifest.consoleAssets || []).map(a => `console:${path.basename(a.file || a.url)}`),
  ];

  const proceed = await consentOrAbort(
    'bootstrap cogNNitive ecosystem',
    names,
    `Bootstrapping ${manifest.skills.length} skills, ${manifest.blueprints.length} templates, MCP servers, and console assets.\n\n[a] Bootstrap now (Recommended)\n[b] Cancel\n`,
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
  console.log(`\nInstalling/verifying ${manifest.blueprints.length} template(s)...`);
  for (const tmpl of manifest.blueprints) {
    const fileName = tmpl.name.endsWith('.md') ? tmpl.name : `${tmpl.name}.md`;
    const tmplPresent = fs.existsSync(path.join(args.blueprintsDir, fileName)) || fs.existsSync(path.join(args.blueprintsDir, tmpl.name));
    const entry = state.blueprints[tmpl.name];
    if (!tmplPresent || !entry || entry.commit !== tmpl.commit) {
      await installBlueprintAtCommit(tmpl, args.blueprintsDir, state, args.skillsDir);
      console.log(`  ✓ template ${tmpl.name} (${tmpl.version}) @ ${tmpl.commit.slice(0, 7)}`);
    } else {
      console.log(`  ✓ template ${tmpl.name} (${tmpl.version}) up-to-date`);
    }
  }

  // 3. MCP servers — parseManifest already hoists skills[].mcp into manifest.mcp.
  const mcpList = manifest.mcp || [];

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

  // 5. Console assets
  if (manifest.consoleAssets && manifest.consoleAssets.length > 0) {
    console.log(`\nInstalling/verifying ${manifest.consoleAssets.length} console asset(s)...`);
    for (const asset of manifest.consoleAssets) {
      const fileName = path.basename(asset.file || asset.url);
      const dest = path.join(consoleDir, fileName);
      const entry = state.console ? state.console[fileName] : null;
      if (!fs.existsSync(dest) || !entry || entry.commit !== asset.commit) {
        await installConsoleAssetAtCommit(asset, consoleDir, state);
        console.log(`  ✓ console ${fileName} (${asset.version}) @ ${asset.commit.slice(0, 7)}`);
      } else {
        console.log(`  ✓ console ${fileName} (${asset.version}) up-to-date`);
      }
    }
  }

  // 6. Project skills to agent directories (OpenCode, Claude Code, Antigravity)
  projectSkillsToAgents({
    canonicalSkillsDir: args.skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
  });

  // 7. Save state
  saveState(args.stateFile, state);

  // 8. Summary and workflows
  console.log(`\nBootstrap completed successfully! All components up-to-date.`);
  if (manifest.workflows && manifest.workflows.length > 0) {
    console.log(`\nAvailable workflows:`);
    manifest.workflows.forEach((wf, idx) => {
      console.log(`  ${idx + 1}. ${wf.label} (${wf.skill}) — ${wf.description}`);
    });
  }
}

/**
 * Projects installed skills from canonical ~/.agents/skills/ into specific agent skill directories.
 * Target agents:
 * - OpenCode: ~/.config/opencode/skills/
 * - Claude Code: ~/.claude/skills/
 * - Antigravity: ~/.gemini/config/skills/
 *
 * @param {{
 *   canonicalSkillsDir: string,
 *   homedir?: string,
 *   targetAgent?: string,
 *   silent?: boolean,
 *   state?: Record<string, any>,
 *   scope?: string,
 *   skillNames?: string[],
 * }} options
 * @returns {Array<{ agent: string, targetDir: string, skill: string, method: 'symlink' | 'copy', action: 'create' | 'adopt' | 'replace' | 'mirror' | 'skip' }>}
 */
function projectSkillsToAgents({
  canonicalSkillsDir,
  homedir = os.homedir(),
  targetAgent = 'auto',
  silent = false,
  state = null,
  scope = 'global',
  skillNames = null,
}) {
  if (scope === 'workspace') {
    if (!silent) {
      console.log(`\nSkipping skill projection: workspace scope does not project to global editor directories.`);
    }
    return [];
  }

  if (!fs.existsSync(canonicalSkillsDir)) return [];

  let skillEntries = [];
  try {
    const diskDirs = fs.readdirSync(canonicalSkillsDir).filter(name => {
      return isProjectableName(name) && fs.statSync(path.join(canonicalSkillsDir, name)).isDirectory();
    });
    if (skillNames && skillNames.length > 0) {
      skillEntries = diskDirs.filter(name => skillNames.includes(name));
    } else if (state && state.skills && Object.keys(state.skills).length > 0) {
      skillEntries = diskDirs.filter(name => state.skills[name]);
    } else {
      skillEntries = diskDirs;
    }
  } catch {
    return [];
  }

  if (skillEntries.length === 0) return [];

  const normalizedAgent = (targetAgent || 'auto').toLowerCase();
  /** @type {Array<{ agent: string, targetDir: string, skill: string, method: 'symlink' | 'copy', action: 'create' | 'adopt' | 'replace' | 'mirror' | 'skip' }>} */
  const projections = [];

  const agentTargets = [];
  const opencodeSkillsDir = path.join(homedir, '.config', 'opencode', 'skills');
  const claudeSkillsDir = path.join(homedir, '.claude', 'skills');
  const geminiSkillsDir = path.join(homedir, '.gemini', 'config', 'skills');

  if (normalizedAgent === 'opencode' || normalizedAgent === 'all') {
    agentTargets.push({ agent: 'opencode', dir: opencodeSkillsDir });
  }
  if (normalizedAgent === 'claude' || normalizedAgent === 'all') {
    agentTargets.push({ agent: 'claude', dir: claudeSkillsDir });
  }
  if (normalizedAgent === 'antigravity' || normalizedAgent === 'all') {
    agentTargets.push({ agent: 'antigravity', dir: geminiSkillsDir });
  }

  if (normalizedAgent === 'auto') {
    if (fs.existsSync(path.join(homedir, '.config', 'opencode')) || process.env.OPENCODE_SESSION_ID || process.env.OPENCODE_RUN_ID) {
      agentTargets.push({ agent: 'opencode', dir: opencodeSkillsDir });
    }
    if (fs.existsSync(path.join(homedir, '.claude')) || fs.existsSync(path.join(homedir, '.claude.json')) || process.env.CLAUDE_CODE || process.env.CLAUDE_PROJECT_DIR) {
      agentTargets.push({ agent: 'claude', dir: claudeSkillsDir });
    }
    if (fs.existsSync(path.join(homedir, '.gemini')) || process.env.ANTIGRAVITY || process.env.GEMINI_CLI) {
      agentTargets.push({ agent: 'antigravity', dir: geminiSkillsDir });
    }
    if (agentTargets.length === 0) {
      agentTargets.push({ agent: 'opencode', dir: opencodeSkillsDir });
      agentTargets.push({ agent: 'claude', dir: claudeSkillsDir });
      agentTargets.push({ agent: 'antigravity', dir: geminiSkillsDir });
    }
  }

  if (state) {
    state.projections = state.projections || {};
  }

  for (const target of agentTargets) {
    fs.mkdirSync(target.dir, { recursive: true });
    if (state) {
      state.projections[target.agent] = state.projections[target.agent] || { dir: target.dir, skills: {} };
      state.projections[target.agent].dir = target.dir;
      state.projections[target.agent].skills = state.projections[target.agent].skills || {};
    }

    for (const skill of skillEntries) {
      const src = path.join(canonicalSkillsDir, skill);
      const dest = path.join(target.dir, skill);

      if (path.resolve(src).toLowerCase() === path.resolve(dest).toLowerCase()) continue;

      const classification = classifyProjection(dest, src);
      const recorded = state && state.projections[target.agent] && state.projections[target.agent].skills[skill];

      const recordState = (method) => {
        if (state) {
          state.projections[target.agent].skills[skill] = {
            method,
            source: path.resolve(src),
            projected_at: new Date().toISOString(),
          };
        }
      };

      if (classification === 'absent') {
        /** @type {'symlink' | 'copy'} */
        let method = 'symlink';
        /** @type {'create' | 'adopt' | 'replace' | 'mirror' | 'skip'} */
        let action = 'create';
        let symlinkSuccess = false;
        try {
          const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
          fs.symlinkSync(src, dest, symlinkType);
          symlinkSuccess = true;
        } catch {
          symlinkSuccess = false;
        }

        if (!symlinkSuccess) {
          mirrorDir(src, dest, isProjectableName);
          method = /** @type {'symlink' | 'copy'} */ ('copy');
        }
        recordState(method);
        projections.push({ agent: target.agent, targetDir: target.dir, skill, method, action });
      } else if (classification === 'link-ok') {
        /** @type {'symlink' | 'copy'} */
        const method = 'symlink';
        /** @type {'create' | 'adopt' | 'replace' | 'mirror' | 'skip'} */
        const action = 'adopt';
        recordState(method);
        projections.push({ agent: target.agent, targetDir: target.dir, skill, method, action });
      } else if (classification === 'link-wrong' || classification === 'link-dangling') {
        if (recorded) {
          try {
            fs.unlinkSync(dest);
          } catch {
            fs.rmSync(dest, { force: true });
          }

          /** @type {'symlink' | 'copy'} */
          let method = 'symlink';
          /** @type {'create' | 'adopt' | 'replace' | 'mirror' | 'skip'} */
          let action = 'replace';
          let symlinkSuccess = false;
          try {
            const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
            fs.symlinkSync(src, dest, symlinkType);
            symlinkSuccess = true;
          } catch {
            symlinkSuccess = false;
          }

          if (!symlinkSuccess) {
            mirrorDir(src, dest, isProjectableName);
            method = /** @type {'symlink' | 'copy'} */ ('copy');
          }
          recordState(method);
          projections.push({ agent: target.agent, targetDir: target.dir, skill, method, action });
        } else {
          projections.push({ agent: target.agent, targetDir: target.dir, skill, method: 'symlink', action: 'skip' });
        }
      } else if (classification === 'dir') {
        if (recorded && recorded.method === 'copy') {
          mirrorDir(src, dest, isProjectableName);
          recordState('copy');
          projections.push({ agent: target.agent, targetDir: target.dir, skill, method: 'copy', action: 'mirror' });
        } else if (!recorded) {
          const srcHash = hashTree(src, isProjectableName);
          const destHash = hashTree(dest, isProjectableName);
          if (srcHash && destHash && srcHash === destHash) {
            recordState('copy');
            projections.push({ agent: target.agent, targetDir: target.dir, skill, method: 'copy', action: 'adopt' });
          } else {
            projections.push({ agent: target.agent, targetDir: target.dir, skill, method: 'copy', action: 'skip' });
          }
        } else {
          projections.push({ agent: target.agent, targetDir: target.dir, skill, method: 'copy', action: 'skip' });
        }
      }
    }
  }

  if (!silent && projections.length > 0) {
    console.log(`\nProjected skills to agent directories:`);
    const grouped = {};
    for (const p of projections) {
      if (!grouped[p.agent]) grouped[p.agent] = [];
      grouped[p.agent].push(p);
    }
    for (const [agent, list] of Object.entries(grouped)) {
      const active = list.filter(p => p.action !== 'skip');
      const symlinks = active.filter(p => p.method === 'symlink').length;
      const copies = active.filter(p => p.method === 'copy').length;
      const skipped = list.filter(p => p.action === 'skip').length;

      const parts = [];
      if (symlinks > 0) parts.push(`${symlinks} symlink`);
      if (copies > 0) parts.push(`${copies} copy`);

      if (active.length > 0) {
        console.log(`  ✓ ${agent}: ${active.length} skill(s) synchronized (${parts.join(', ')})`);
      }
      if (skipped > 0) {
        console.log(`  ⚠️ ${agent}: ${skipped} unmanaged skill(s) skipped`);
      }
    }
  }

  return projections;
}

module.exports = {
  get MANIFEST_URL() {
    return getManifestUrl();
  },
  DEFAULT_MANIFEST_URL,
  FALLBACK_MANIFEST_URL,
  DEFAULT_SKILLS_DIR,
  DEFAULT_BLUEPRINTS_DIR,
  DEFAULT_MCP_DIR,
  DEFAULT_CONSOLE_DIR,
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
  migrateLegacyMcpState,
  runTar,
  extractTarball,
  findRepoRoot,
  copyDirAtomic,
  replaceDirAtomic,
  copyDirRecursive,
  fetchCompareSummary,
  fetchRepoCommitTarball,
  resetTarballCache,
  installSkillAtCommit,
  installBlueprintAtCommit,
  installEmbeddedSkills,
  installMcpAtCommit,
  installConsoleAssetAtCommit,
  projectSkillsToAgents,
  printStatusTable,
  promptChoice,
  isConsent,
  consentOrAbort,
  cmdStatus,
  cmdInstall,
  cmdInstallExternal,
  buildExternalSkillNotice,
  THIRD_PARTY_SKILL_DOC_URL,
  cmdInstallBlueprint,
  loadBlueprintCatalog,
  findCatalogEntry,
  DEFAULT_BLUEPRINT_REPO,
  DEFAULT_CATALOG_PATH,
  cmdUpdate,
  cmdSync,
  cmdBootstrap,
  RETIRED_SKILL_REPOS,
  RETIRED_REPO_NOTICE,
  isRetiredPin,
  withRetiredHint,
};
