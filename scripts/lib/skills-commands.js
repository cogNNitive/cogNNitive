/**
 * actioNN/scripts/lib/skills-commands.js
 *
 * Command implementations, consent gates, and state management for skills-manager.
 * Leverages shared libraries from scripts/lib: atomic-fs, github-client, yaml-parser.
 * Zero external dependencies — native Node.js execution.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const https = require('https')
const { spawnSync } = require('child_process')
const readline = require('readline')

const {
  saveJsonAtomic,
  copyDirAtomic,
  replaceDirAtomic,
  extractTarball,
  copyDirRecursive,
  mirrorDir,
} = require('./atomic-fs.js')

const {
  isProjectableName,
  classifyProjection,
  hashTree,
} = require('../../skills/nn-preflight/scripts/lib/projection.js')

const { skillTreeDigest } = require('./skill-tree-digest.js')
const { hashSkillDir, diffSkillDir } = require('./skill-content-hash.js')

const { fetchString, fetchJson, downloadFile, resolveRef } = require('./github-client.js')

const { parseManifest } = require('./yaml-parser.js')

const { parseFocusedYaml, parseFrontmatter } = require('./yaml-lite.js')

const { registerMcpAuto } = require('./mcp-config-adapter.js')
const {
  recordProvenance,
  readProvenance,
  readBlueprintManifest,
  digestTree,
  diffBlueprintTree,
  distributionUrlParts,
  blueprintVerdict,
} = require('./blueprint-provenance.js')

const {
  loadChannels,
  resolveBlueprintInChannels,
  defaultChannelsFile,
} = require('./blueprint-channels.js')
const { satisfiesRange } = require('./node-engine-check.js')

const SUPPORTED_FORMAT_VERSIONS = [
  'V_0-2-0',
  'V_0-2-1',
  'V_0-2-2',
  'V_0-3-0',
  'V_0-4-0',
  'V_0-5-0',
  'V_0-7-0',
  'V_0-8-0',
  'V_0-9-0',
]

/**
 * Reads engine version from core package.json, falling back to 0.60.0.
 * @returns {string}
 */
function getEngineVersion() {
  try {
    const corePkgPath = path.resolve(__dirname, '../../iNNfo/packages/nn-core/package.json')
    if (fs.existsSync(corePkgPath)) {
      return JSON.parse(fs.readFileSync(corePkgPath, 'utf-8')).version
    }
  } catch {}
  return '0.60.0'
}

/**
 * P5: Compatibility contract (D7).
 * Enforces `requires.engine` and `format_version` before any files are written to disk.
 *
 * @param {string} blueprintName
 * @param {string} srcPath - path to extracted source folder or file
 */
function assertBlueprintCompatibility(blueprintName, srcPath) {
  let manifest = null
  let manifestPath = null
  if (fs.existsSync(srcPath)) {
    manifestPath = fs.statSync(srcPath).isDirectory()
      ? path.join(srcPath, 'blueprint.json')
      : path.join(path.dirname(srcPath), 'blueprint.json')
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      } catch (err) {
        throw new Error(`malformed blueprint.json in blueprint '${blueprintName}': ${err.message}`)
      }
    }
  }

  let specContent = null
  if (fs.existsSync(srcPath)) {
    const specPath = fs.statSync(srcPath).isDirectory() ? path.join(srcPath, 'spec_NN.md') : srcPath
    if (fs.existsSync(specPath) && !fs.statSync(specPath).isDirectory()) {
      try {
        specContent = fs.readFileSync(specPath, 'utf-8')
      } catch {}
    }
  }

  let fm = null
  if (specContent) {
    try {
      fm = parseFocusedYaml(parseFrontmatter(specContent))
    } catch {}
  }

  // 1. Engine requirement (requires.engine)
  let engineRange = null
  if (manifest && manifest.requires) {
    if (typeof manifest.requires === 'object' && manifest.requires.engine) {
      engineRange = String(manifest.requires.engine).trim()
    } else if (typeof manifest.requires === 'string') {
      engineRange = manifest.requires.trim()
    }
  } else if (fm && fm.requires) {
    if (typeof fm.requires === 'object' && fm.requires.engine) {
      engineRange = String(fm.requires.engine).trim()
    } else if (typeof fm.requires === 'string') {
      engineRange = fm.requires.trim()
    }
  } else if (fm && fm.engine) {
    engineRange = String(fm.engine).trim()
  }

  if (engineRange) {
    if (engineRange.toLowerCase().startsWith('engine ')) {
      engineRange = engineRange.slice(7).trim()
    }
    const currentEngine = getEngineVersion()
    if (!satisfiesRange(currentEngine, engineRange)) {
      throw new Error(
        `refusing to install blueprint '${blueprintName}': incompatible engine. Blueprint requires engine '${engineRange}', but current engine is ${currentEngine}. Upgrade engine to install.`,
      )
    }
  }

  // 2. Format version (format_version / spec_version)
  const formatVersion = manifest?.format_version ?? fm?.format_version ?? fm?.spec_version
  if (formatVersion) {
    const norm = String(formatVersion).trim()
    if (!SUPPORTED_FORMAT_VERSIONS.includes(norm)) {
      throw new Error(
        `refusing to install blueprint '${blueprintName}': unsupported format_version '${norm}'. Supported versions are: ${SUPPORTED_FORMAT_VERSIONS.join(', ')}.`,
      )
    }
  }
}

const DEFAULT_MANIFEST_URL = 'https://cognnitive.com/use/manifest.md'
const FALLBACK_MANIFEST_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md'
// Repos retired from distribution: pins pointing here 404 on codeload/raw.
// The fix is re-bootstrap from the canonical manifest, never `update`.
const RETIRED_SKILL_REPOS = ['cogNNitive/cogNNitive']
const RETIRED_REPO_NOTICE =
  'Your install points at the retired repo cogNNitive/cogNNitive (404). ' +
  'Back up ~/.agents/bootstrap-state.json and ~/.agents/skills/, then re-bootstrap: ' +
  'tell your agent "I want to use https://cognnitive.com/use". ' +
  'Do NOT downgrade to older public pins — they lack skills-manager.js.'
const DEFAULT_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills')
const DEFAULT_BLUEPRINTS_DIR = path.join(os.homedir(), '.agents', 'bluepriNNts')
const DEFAULT_MCP_DIR = path.join(os.homedir(), '.agents', 'mcp')
const DEFAULT_CONSOLE_DIR = path.join(os.homedir(), '.agents', 'console')
const DEFAULT_STATE_FILE = path.join(os.homedir(), '.agents', 'bootstrap-state.json')
const LEGACY_STATE_FILE = path.join(os.homedir(), '.agents', 'skills-state.json')

/**
 * Returns active manifest URL, respecting SM_MANIFEST_URL environment override.
 * @returns {string}
 */
function getManifestUrl() {
  return process.env.SM_MANIFEST_URL || DEFAULT_MANIFEST_URL
}

/**
 * Fetches manifest text with automatic fallback to GitHub raw URL.
 * @returns {Promise<string>}
 */
async function fetchManifestString() {
  const primaryUrl = getManifestUrl()
  try {
    return await fetchString(primaryUrl)
  } catch (err) {
    if (!process.env.SM_MANIFEST_URL && primaryUrl !== FALLBACK_MANIFEST_URL) {
      try {
        return await fetchString(FALLBACK_MANIFEST_URL)
      } catch (fallbackErr) {
        throw new Error(
          `Failed to fetch manifest from ${primaryUrl} (${err.message}) and fallback ${FALLBACK_MANIFEST_URL} (${fallbackErr.message})`,
        )
      }
    }
    throw err
  }
}

/**
 * Pick the built-in client matching the URL protocol.
 * @param {string} url
 * @returns {typeof https.request | typeof http.request}
 */
function requestFor(url) {
  return url.startsWith('https:') ? https.request : http.request
}

// ---------------------------------------------------------------------------
// State file (~/.agents/bootstrap-state.json)
// ---------------------------------------------------------------------------

/**
 * Initializes a new empty skill manager state structure.
 * @returns {{ manifest: string, skills: Record<string, any>, blueprints: Record<string, any>, mcp: Record<string, any>, console: Record<string, any>, projections: Record<string, any>, cli: Record<string, any> }}
 */
function emptyState() {
  return {
    manifest: getManifestUrl(),
    skills: {},
    blueprints: {},
    mcp: {},
    console: {},
    projections: {},
    cli: {},
  }
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
  let changed = false

  if (state && state.mcp && state.mcp['innfo-mcp']) {
    if (!state.mcp['nn-mcp']) {
      state.mcp['nn-mcp'] = state.mcp['innfo-mcp']
    }
    delete state.mcp['innfo-mcp']
    changed = true
  }

  if (mcpDir) {
    const legacyBundle = path.join(mcpDir, 'innfo-mcp.bundle.js')
    const newBundle = path.join(mcpDir, 'nn-mcp.bundle.js')
    if (fs.existsSync(legacyBundle)) {
      try {
        if (!fs.existsSync(newBundle)) {
          fs.renameSync(legacyBundle, newBundle)
        } else {
          fs.rmSync(legacyBundle, { force: true })
        }
        changed = true
      } catch (_) {
        // best-effort: a locked legacy bundle must not break install/update
      }
    }
  }

  return changed
}

/**
 * Loads the current machine skill state from JSON file, supporting legacy migrations.
 * @param {string} file
 * @returns {{ manifest: string, skills: Record<string, any>, blueprints: Record<string, any>, mcp: Record<string, any>, console: Record<string, any>, projections: Record<string, any>, cli: Record<string, any> }}
 */
function loadState(file) {
  if (fs.existsSync(file)) {
    try {
      const raw = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '')
      const data = JSON.parse(raw)
      const state = {
        manifest: data.manifest || getManifestUrl(),
        skills: data.skills || {},
        blueprints: data.blueprints || {},
        mcp: data.mcp || {},
        console: data.console || {},
        projections: data.projections || {},
        cli: data.cli || {},
      }
      migrateLegacyMcpState(state)
      return state
    } catch (err) {
      return emptyState()
    }
  }

  // Legacy fallback migration: check sibling skills-state.json or LEGACY_STATE_FILE
  const siblingLegacy = path.join(path.dirname(file), 'skills-state.json')
  const legacyFileToUse = fs.existsSync(siblingLegacy) ? siblingLegacy : LEGACY_STATE_FILE

  if (fs.existsSync(legacyFileToUse)) {
    try {
      const legacyRaw = fs.readFileSync(legacyFileToUse, 'utf-8').replace(/^\uFEFF/, '')
      const legacyData = JSON.parse(legacyRaw)
      const state = {
        manifest: legacyData.manifest || getManifestUrl(),
        skills: legacyData.skills || {},
        blueprints: {},
        mcp: {},
        console: {},
        projections: {},
        cli: {},
      }
      saveState(file, state)
      return state
    } catch (err) {
      return emptyState()
    }
  }

  return emptyState()
}

/**
 * Persists skill manager state atomically to disk.
 * @param {string} file
 * @param {object} state
 * @returns {void}
 */
function saveState(file, state) {
  saveJsonAtomic(file, state, 2)
}

/**
 * Returns true when a manifest pin targets a retired distribution repo.
 * @param {{ repo?: string }} item
 * @returns {boolean}
 */
function isRetiredPin(item) {
  return !!item && RETIRED_SKILL_REPOS.includes(item.repo)
}

/**
 * Warns when the active manifest still pins the retired repo, so the user
 * gets migration instructions instead of a raw 404 from codeload.
 * @param {Array<object>} pins
 * @returns {void}
 */
function warnOnRetiredPins(pins) {
  if ((pins || []).some(isRetiredPin)) {
    console.log(`\nNOTICE (retired repo): ${RETIRED_REPO_NOTICE}\n`)
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
    return new Error(`${err.message}\n${RETIRED_REPO_NOTICE}`)
  }
  return err
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
  return spawnSync('tar', args, { cwd, encoding: 'utf-8' })
}

/**
 * Locates the single top-level directory unpacked inside an extracted tarball directory.
 * @param {string} extractDir
 * @returns {string}
 */
function findRepoRoot(extractDir) {
  const dirs = fs
    .readdirSync(extractDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
  if (dirs.length !== 1) {
    throw new Error(`unexpected tarball layout: expected one root directory, found ${dirs.length}`)
  }
  return path.join(extractDir, dirs[0])
}

// ---------------------------------------------------------------------------
// Session tarball cache (deduplicated downloads by repo@commit)
// ---------------------------------------------------------------------------

/** @type {string | null} */
let tarballCacheDir = null
/** @type {Map<string, Promise<string>>} keyed by `${repo}@${commit}` */
const tarballCache = new Map()

/**
 * Lazily creates the per-process temp directory holding cached tarballs and
 * registers a one-shot exit hook to remove it.
 * @returns {string}
 */
function getTarballCacheDir() {
  if (!tarballCacheDir) {
    tarballCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-tarballs-'))
    const dir = tarballCacheDir
    process.once('exit', () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch (_) {}
    })
  }
  return tarballCacheDir
}

/**
 * Drops the session tarball cache and removes its temp directory. Test seam.
 * @returns {void}
 */
function resetTarballCache() {
  tarballCache.clear()
  if (tarballCacheDir) {
    try {
      fs.rmSync(tarballCacheDir, { recursive: true, force: true })
    } catch (_) {}
    tarballCacheDir = null
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
  const key = `${item.repo}@${item.commit}`
  if (tarballCache.has(key)) return tarballCache.get(key)

  const promise = (async () => {
    const dir = getTarballCacheDir()
    const safe = key.replace(/[^a-zA-Z0-9@._-]/g, '_')
    const tarball = path.join(dir, `${safe}.tar.gz`)
    const url = `https://codeload.github.com/${item.repo}/tar.gz/${item.commit}`
    try {
      await downloadFile(url, tarball)
    } catch (err) {
      throw withRetiredHint(item, err)
    }
    return tarball
  })()

  tarballCache.set(key, promise)
  // A failed download is not cached: retries may re-attempt the network.
  promise.catch(() => tarballCache.delete(key))
  return promise
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
  if (!installedCommit) return '(no installed commit recorded)'
  try {
    const url = `https://api.github.com/repos/${item.repo}/compare/${installedCommit}...${item.commit}`
    const data = await fetchJson(url)
    const prefix = item.path + '/'
    const files = (data.files || []).filter(
      (f) => f.filename && (f.filename.startsWith(prefix) || f.filename === item.path),
    )
    if (files.length === 0) return `0 files changed under ${item.path}`
    const first = files.slice(0, 3).map((f) => f.filename)
    const more = files.length > 3 ? ` (+${files.length - 3} more)` : ''
    return `${files.length} files changed: ${first.join(', ')}${more}`
  } catch (err) {
    return '(diff preview unavailable)'
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
/**
 * Ensures an installed skill's npm dependencies are present. Spawns
 * `npm install --omit=dev` only when a declared dependency is missing, so it is
 * a no-op (fast) for an already-provisioned skill. Best-effort: a failure leaves
 * the skill in place and the consuming stage fails fast on the missing dep.
 * @param {string} skillDir
 * @returns {void}
 */
function ensureSkillNodeModules(skillDir) {
  if (process.env.SM_SKIP_NPM_INSTALL === '1') return
  const pkgPath = path.join(skillDir, 'package.json')
  if (!fs.existsSync(pkgPath)) return
  let pkg
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  } catch (_) {
    return
  }
  const deps = Object.keys(pkg.dependencies || {})
  const nodeModulesDir = path.join(skillDir, 'node_modules')
  const needsInstall =
    deps.length > 0 &&
    (!fs.existsSync(nodeModulesDir) ||
      deps.some((d) => !fs.existsSync(path.join(nodeModulesDir, d))))
  if (!needsInstall) return
  try {
    spawnSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
      cwd: skillDir,
      encoding: 'utf-8',
      shell: true,
      timeout: 60000,
    })
  } catch (_) {
    // best-effort
  }
}

async function installSkillAtCommit(skill, skillsDir, state) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-skills-'))
  try {
    const tarball = await fetchRepoCommitTarball(skill)

    const extractDir = path.join(tmpRoot, 'x')
    extractTarball(tarball, extractDir)
    const repoRoot = findRepoRoot(extractDir)

    const src = path.join(repoRoot, skill.path)
    if (!fs.existsSync(src)) {
      throw new Error(`path ${skill.path} not found in ${skill.repo} at ${skill.commit}`)
    }

    // Integrity: a referenced external skill pins a canonical tree digest. Verify
    // the fetched tree BEFORE the atomic swap so a mismatch writes nothing.
    if (skill.sha256) {
      const actual = skillTreeDigest(src)
      if (actual !== String(skill.sha256)) {
        throw new Error(
          `integrity mismatch for ${skill.name}: expected sha256 ${skill.sha256}, got ${actual}`,
        )
      }
    }

    const dest = path.join(skillsDir, skill.name)
    fs.mkdirSync(skillsDir, { recursive: true })
    const existingNodeModules = path.join(dest, 'node_modules')
    const tempNodeModules = path.join(tmpRoot, 'saved_node_modules')
    let hasExistingNodeModules = false
    if (fs.existsSync(existingNodeModules)) {
      try {
        fs.renameSync(existingNodeModules, tempNodeModules)
        hasExistingNodeModules = true
      } catch (_) {}
    }

    if (fs.existsSync(dest)) {
      replaceDirAtomic(src, dest)
    } else {
      copyDirAtomic(src, dest)
    }

    if (hasExistingNodeModules && !fs.existsSync(path.join(dest, 'node_modules'))) {
      try {
        fs.renameSync(tempNodeModules, path.join(dest, 'node_modules'))
      } catch (_) {}
    }

    ensureSkillNodeModules(dest)

    state.skills[skill.name] = {
      commit: skill.commit,
      version: skill.version,
      updated_at: new Date().toISOString(),
      files: hashSkillDir(dest),
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
}

/**
 * Reads a skill's top-level `depends_on` frontmatter (nested shape) or null.
 * @param {string} skillText
 * @returns {object | null}
 */
function readDependsOn(skillText) {
  try {
    const fm = parseFocusedYaml(parseFrontmatter(skillText))
    return fm.depends_on || null
  } catch (_) {
    return null
  }
}

const DEPENDS_ON_KEYS = new Set(['cli', 'env', 'binaries', 'node', 'optional_mcp'])

/** External skill frontmatter `depends_on` validation. Returns error strings. */
function validateDependsOn(dependsOn, pkg) {
  const errors = []
  if (dependsOn == null) return errors
  if (typeof dependsOn !== 'object' || Array.isArray(dependsOn))
    return ['depends_on must be a mapping']

  for (const key of Object.keys(dependsOn)) {
    if (!DEPENDS_ON_KEYS.has(key)) errors.push(`unknown depends_on key: ${key}`)
  }

  const deps = (pkg && pkg.dependencies) || {}
  for (const entry of dependsOn.cli || []) {
    if (!entry || !entry.name) {
      errors.push('cli entry missing name')
      continue
    }
    if (Object.prototype.hasOwnProperty.call(entry, 'version')) {
      errors.push(`cli '${entry.name}': version belongs in package.json only`)
    }
    const pinned = deps[entry.name]
    if (pinned === undefined) {
      errors.push(`cli '${entry.name}' is not in package.json dependencies`)
    } else if (!/^\d+\.\d+\.\d+([-+].*)?$/.test(String(pinned))) {
      errors.push(`cli '${entry.name}' must be pinned exactly in package.json (got '${pinned}')`)
    }
  }
  return errors
}

/**
 * Records the CLI-delivered agent skills for a projected skill: for each
 * `depends_on.cli` entry with `agent_skills: true`, run the pinned CLI's
 * `<bin> skills update` and record `state.cli[name]` (the pin covers it).
 * Best-effort: a missing binary or a failed update is skipped.
 * @param {object|null} dependsOn
 * @param {string} skillDir
 * @param {string} skillName
 * @param {object} state
 * @returns {void}
 */
function recordCliDeliveredSkills(dependsOn, skillDir, skillName, state) {
  const cliEntries = (dependsOn && dependsOn.cli) || []
  for (const item of cliEntries) {
    if (!item || !item.name || !item.agent_skills) continue
    const binPosix = path.join(skillDir, 'node_modules', '.bin', item.name)
    const binWin = `${binPosix}.cmd`
    const exe = process.platform === 'win32' && fs.existsSync(binWin) ? binWin : binPosix
    if (fs.existsSync(binPosix) || fs.existsSync(binWin)) {
      try {
        spawnSync(exe, ['skills', 'update'], {
          cwd: skillDir,
          encoding: 'utf-8',
          shell: true,
          timeout: 60000,
        })
      } catch (_) {
        // best-effort
      }
    }
    let version
    try {
      version = JSON.parse(
        fs.readFileSync(path.join(skillDir, 'node_modules', item.name, 'package.json'), 'utf8'),
      ).version
    } catch (_) {
      version = undefined
    }
    state.cli = state.cli || {}
    state.cli[item.name] = {
      version,
      source_skill: skillName,
      updated_at: new Date().toISOString(),
    }
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
  const embeddedRoot = path.join(pkgDir, 'skills')
  if (!fs.existsSync(embeddedRoot)) return []

  const names = []
  try {
    for (const entry of fs.readdirSync(embeddedRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules')
        continue
      const src = path.join(embeddedRoot, entry.name)
      const skillFile = path.join(src, 'SKILL.md')
      if (!fs.existsSync(skillFile)) continue

      const dest = path.join(skillsDir, entry.name)
      fs.mkdirSync(skillsDir, { recursive: true })
      if (fs.existsSync(dest)) replaceDirAtomic(src, dest)
      else copyDirAtomic(src, dest)

      const skillText = fs.readFileSync(skillFile, 'utf8')
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillText)
      const versionMatch =
        frontmatter && /^version:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(frontmatter[1])

      // Make sure the embedded skill's npm deps are present (self-heal); the
      // declared `depends_on` is validated by preflight, not at install, so a
      // package mid-migration never blocks a projection.
      ensureSkillNodeModules(dest)
      // CLI-delivered agent skills (e.g. `hyperframes skills`) come with the
      // pinned CLI; record them under the pin in state.
      recordCliDeliveredSkills(readDependsOn(skillText), dest, entry.name, state)

      state.skills[entry.name] = {
        commit: template.commit,
        version: versionMatch ? versionMatch[1] : undefined,
        source_blueprint: template.name,
        updated_at: new Date().toISOString(),
        files: hashSkillDir(dest),
      }
      names.push(entry.name)
    }
  } catch (err) {
    // Skills projected before the failure stay recorded in state and on disk; hand their names
    // to the caller so they still reach the agent directories instead of being lost silently.
    err.projectedSkills = names
    throw err
  }
  return names
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
  const isMdFile = template.path.endsWith('.md') || template.path.endsWith('.markdown')
  const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`
  const flatDestPath = path.join(blueprintsDir, fileName)
  const pkgDestPath = path.join(blueprintsDir, template.name)

  fs.mkdirSync(blueprintsDir, { recursive: true })

  let recordedPath = isMdFile ? flatDestPath : pkgDestPath
  const pkgExistedBefore = fs.existsSync(pkgDestPath)

  // P3: Refuse update if the blueprint was modified locally (D9)
  if (pkgExistedBefore && fs.existsSync(pkgDestPath)) {
    const prov = readProvenance(blueprintsDir, template.name)
    if (prov.ok && prov.entry && prov.entry.digests) {
      const diff = diffBlueprintTree(pkgDestPath, prov.entry.digests)
      if (diff.modified) {
        throw new Error(
          `refusing to update blueprint '${template.name}': locally modified (${diff.differing.join(', ')}). Update will not overwrite hand edits.`,
        )
      }
    }
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-blueprints-'))
  try {
    const tarball = await fetchRepoCommitTarball(template)

    const extractDir = path.join(tmpRoot, 'x')
    extractTarball(tarball, extractDir)
    const repoRoot = findRepoRoot(extractDir)

    const src = path.join(repoRoot, template.path)
    if (!fs.existsSync(src)) {
      throw new Error(
        `template path ${template.path} not found in ${template.repo} at ${template.commit}`,
      )
    }

    // P5 Compatibility Check (D7): evaluate requires and format_version before writing any files
    assertBlueprintCompatibility(template.name, src)

    if (fs.statSync(src).isDirectory()) {
      if (fs.existsSync(pkgDestPath)) replaceDirAtomic(src, pkgDestPath)
      else copyDirAtomic(src, pkgDestPath)
      recordedPath = pkgDestPath
    } else {
      const srcParentDir = path.dirname(src)
      const hasPackageSubdirs =
        fs.existsSync(path.join(srcParentDir, 'procedures')) ||
        fs.existsSync(path.join(srcParentDir, 'assets')) ||
        fs.existsSync(path.join(srcParentDir, 'samples')) ||
        path.basename(srcParentDir).toLowerCase() === template.name.toLowerCase()

      if (hasPackageSubdirs) {
        if (fs.existsSync(pkgDestPath)) replaceDirAtomic(srcParentDir, pkgDestPath)
        else copyDirAtomic(srcParentDir, pkgDestPath)
        recordedPath = pkgDestPath
      } else {
        fs.copyFileSync(src, flatDestPath)
        recordedPath = flatDestPath
      }
    }
  } catch (err) {
    if (isMdFile) {
      const rawUrl = `https://raw.githubusercontent.com/${template.repo}/${template.commit}/${template.path}`
      const tmpFlat = path.join(tmpRoot, 'flat.md')
      await downloadFile(rawUrl, tmpFlat)
      assertBlueprintCompatibility(template.name, tmpFlat)
      fs.copyFileSync(tmpFlat, flatDestPath)
      recordedPath = flatDestPath
    } else {
      throw err
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }

  // The blueprint is recorded only AFTER its embedded skills projected successfully. Recording it
  // first would let a projection failure (EBUSY/EPERM, a later skill failing) be persisted as a
  // success: bootstrap skips an existing package and update sees an equal commit, so the skill
  // would never be retried. On failure the previous state entry stays (update sees it outdated)
  // and a freshly created package dir is removed (bootstrap sees it missing and retries).
  let projected = []
  if (skillsDir && recordedPath === pkgDestPath) {
    try {
      projected = installEmbeddedSkills(pkgDestPath, skillsDir, template, state)
    } catch (err) {
      if (!pkgExistedBefore) fs.rmSync(pkgDestPath, { recursive: true, force: true })
      throw err
    }
  }

  state.blueprints[template.name] = {
    commit: template.commit,
    version: template.version,
    path: recordedPath,
    updated_at: new Date().toISOString(),
  }

  // Provenance is recorded beside the managed layer, in the directory that holds
  // it, so it travels with the domain and a clone with no network still reads it
  // (plan C5). `status` and `update` read it instead of walking a catalog (S5).
  // The version and the distribution_url come from the unit's own
  // `blueprint.json`; `commit` is a sha or it is null, never a tag (S3).
  const installedDir = recordedPath === pkgDestPath ? pkgDestPath : null
  const shipped = installedDir ? readBlueprintManifest(installedDir) : { ok: false, value: null }
  const isSha = /^[0-9a-f]{40}$/i.test(String(template.commit || ''))
  recordProvenance(blueprintsDir, template.name, {
    version: (shipped.ok && shipped.value.version) || template.version || null,
    tag: isSha ? template.tag || template.ref || null : template.commit || null,
    commit: isSha ? template.commit : null,
    distribution_url: shipped.ok ? shipped.value.distribution_url : null,
    digests: installedDir ? digestTree(installedDir) : {},
  })

  return projected
}

/**
 * Installs an MCP server bundle and its imported chunks from GitHub raw URL at specified commit.
 * @param {object} mcp
 * @param {string} mcpDir
 * @param {object} state
 * @returns {Promise<void>}
 */
async function installMcpAtCommit(mcp, mcpDir, state) {
  fs.mkdirSync(mcpDir, { recursive: true })
  const bundleDest = path.join(mcpDir, `${mcp.name}.bundle.js`)

  await downloadFile(mcp.url, bundleDest)

  if (fs.existsSync(bundleDest)) {
    const bundleContent = fs.readFileSync(bundleDest, 'utf-8')
    const chunkMatches = [...bundleContent.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)].map(
      (m) => m[1],
    )
    const baseUrl = mcp.url.substring(0, mcp.url.lastIndexOf('/'))

    for (const chunkFile of chunkMatches) {
      const chunkDest = path.join(mcpDir, chunkFile)
      const chunkUrl = `${baseUrl}/${chunkFile}`
      try {
        await downloadFile(chunkUrl, chunkDest)
      } catch (err) {
        // Non-blocking for optional or conditional chunks
      }
    }
  }

  if (!state.mcp) state.mcp = {}
  state.mcp[mcp.name] = {
    commit: mcp.commit,
    version: mcp.version,
    updated_at: new Date().toISOString(),
  }
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
  fs.mkdirSync(consoleDir, { recursive: true })
  const fileName = path.basename(asset.file || asset.url)
  const dest = path.join(consoleDir, fileName)
  const url =
    asset.url || `https://raw.githubusercontent.com/${asset.repo}/${asset.commit}/${asset.file}`
  await downloadFile(url, dest)
  if (!state.console) state.console = {}
  state.console[fileName] = {
    commit: asset.commit,
    version: asset.version,
    path: dest,
    updated_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Console helpers & Consent gate
// ---------------------------------------------------------------------------

/**
 * Renders one ref column of the status table.
 *
 * A pinned commit keeps the 7-character short form the table has always shown,
 * but a release tag is printed whole: clipping it to 7 characters made
 * `blueprints-v0.70.1` and `blueprints-v0.72.0` both read `bluepri`, so the pin
 * could not be read from `status` at all (#710). Columns size themselves to the
 * widest cell, so the full tag widens the table only when a tag is in play.
 *
 * @param {string|null|undefined} value Commit, release tag, or nothing.
 * @returns {string}
 */
function statusRef(value) {
  if (!value) return '-'
  const text = String(value)
  return /^[0-9a-f]{40}$/i.test(text) ? text.slice(0, 7) : text
}

/**
 * Prints formatted status table to console.
 * @param {Array<{ type: string, name: string, pinned: string, installed: string, status: string }>} rows
 * @returns {void}
 */
function printStatusTable(rows) {
  const headers = ['Type', 'Name', 'Pinned', 'Installed', 'Status']
  const cells = [headers, ...rows.map((r) => [r.type, r.name, r.pinned, r.installed, r.status])]
  const widths = headers.map((_, ci) => Math.max(...cells.map((r) => r[ci].length)))
  const format = (r) => r.map((c, ci) => c.padEnd(widths[ci])).join(' | ')
  console.log(format(headers))
  console.log(headers.map((_, ci) => '-'.repeat(widths[ci])).join(' | '))
  for (const row of rows)
    console.log(format([row.type, row.name, row.pinned, row.installed, row.status]))
}

/**
 * Prompts user for interactive input via readline.
 * @param {string} promptText
 * @returns {Promise<string>}
 */
function promptChoice(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

/**
 * Checks if user answer represents positive consent.
 * @param {string} answer
 * @returns {boolean}
 */
function isConsent(answer) {
  return ['a', 'y', 'yes'].includes(answer)
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
  if (names.length === 0) return false
  if (yes) return true
  if (!process.stdin.isTTY) {
    console.log(`needs decision: ${label}: ${names.join(', ')}`)
    process.exit(2)
  }
  console.log(menu)
  const choice = await promptChoice('> ')
  if (!isConsent(choice)) {
    console.log('Aborted. No changes applied.')
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Provenance verdicts for the blueprints present on disk, keyed by name.
 *
 * A unit that is not on disk needs no fetch: `status` reports it as missing from
 * the state, not from the network. A unit with no lock entry is reported by the
 * caller as today (manifest pin) or as `unknown` — never as `current`.
 *
 * @param {string} blueprintsDir
 * @param {Iterable<string>} names
 * @returns {Promise<Map<string, { status: string, recorded: boolean, installed: string|null, published: string|null, commit: string|null, tag: string|null, detail: string|null, differing?: string[] }>>}
 */
async function collectBlueprintVerdicts(blueprintsDir, names) {
  const verdicts = new Map()
  for (const name of new Set([...names].filter(Boolean))) {
    const installedDir = path.join(blueprintsDir, name)
    if (!fs.existsSync(installedDir) || !fs.statSync(installedDir).isDirectory()) continue
    verdicts.set(name, await blueprintVerdict({ blueprintsDir, installedDir, name }))
  }
  return verdicts
}

/**
 * Executes status command comparing installed commits against pinned commits.
 * @param {{ skillsDir: string, blueprintsDir: string, consoleDir?: string, mcpDir?: string, stateFile: string, catalogPath?: string }} args
 * @returns {Promise<void>}
 */
async function cmdStatus(args) {
  const manifestRaw = await fetchManifestString()
  const { skills, blueprints, consoleAssets, mcp } = parseManifest(manifestRaw)
  warnOnRetiredPins([...skills, ...blueprints])
  const state = loadState(args.stateFile)
  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR

  const rows = []
  const outdatedSkills = []
  const outdatedBlueprints = []
  const outdatedConsoleAssets = []
  const outdatedMcp = []
  const modifiedSkills = []
  const blueprintDetails = []

  const manifestNames = new Set(blueprints.map((t) => t.name))
  const untracked = untrackedInstalledBlueprints(args.blueprintsDir, state, manifestNames)
  const verdicts = await collectBlueprintVerdicts(args.blueprintsDir, [
    ...manifestNames,
    ...Object.keys(state.blueprints || {}),
    ...untracked.map((item) => item.name),
  ])

  for (const skill of skills) {
    const dirPresent = fs.existsSync(path.join(args.skillsDir, skill.name))
    const entry = state.skills[skill.name]
    let status
    if (dirPresent) {
      if (!entry) status = 'untracked'
      else if (entry.commit === skill.commit) status = 'up-to-date'
      else status = 'outdated'
    } else {
      status = entry ? 'dir-missing' : 'missing'
    }
    let modified = false
    if (dirPresent && entry && entry.files) {
      try {
        modified = diffSkillDir(path.join(args.skillsDir, skill.name), entry.files).modified
      } catch (_) {
        modified = false
      }
    }
    if (modified && status === 'up-to-date') status = 'modified locally'
    rows.push({
      type: 'skill',
      name: skill.name,
      pinned: statusRef(skill.commit),
      installed: statusRef(entry && entry.commit),
      status,
    })
    if (status === 'outdated') outdatedSkills.push(skill)
    if (modified) modifiedSkills.push(skill.name)
  }

  for (const template of blueprints) {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`
    const pathPresent =
      fs.existsSync(path.join(args.blueprintsDir, fileName)) ||
      fs.existsSync(path.join(args.blueprintsDir, template.name))
    const entry = state.blueprints[template.name]
    const verdict = verdicts.get(template.name)
    let status
    if (!pathPresent) {
      status = entry ? 'file-missing' : 'missing'
    } else if (verdict && verdict.recorded) {
      // A recorded provenance is the answer: the unit says what it is and where
      // it came from, so a catalog or a manifest pin is not consulted (S5).
      status = verdict.status
    } else if (!entry) {
      status = 'untracked'
    } else {
      // No provenance yet: the manifest pin is all that is known, and it is stated
      // as a pin comparison — of immutable commits, not of versions.
      status = entry.commit === template.commit ? 'up-to-date' : 'outdated'
    }
    rows.push({
      type: 'template',
      name: template.name,
      pinned: verdict && verdict.published ? verdict.published : statusRef(template.commit),
      installed:
        verdict && verdict.installed ? verdict.installed : statusRef(entry && entry.commit),
      status,
    })
    if (status === 'outdated' || status === 'update-available') outdatedBlueprints.push(template)
    // A manifest-pinned unit with no recorded provenance already reads as a pin
    // comparison; repeating "no provenance" for every core blueprint would bury
    // the rows that do need an explanation.
    if (verdict && verdict.detail && verdict.recorded)
      blueprintDetails.push(`${template.name}: ${verdict.detail}`)
  }

  for (const server of mcp || []) {
    const bundleName = `${server.name}.bundle.js`
    const bundlePath = path.join(mcpDir, bundleName)
    const pathPresent = fs.existsSync(bundlePath)
    const entry = state.mcp ? state.mcp[server.name] : null
    let status
    if (pathPresent) {
      if (!entry) status = 'untracked'
      else if (entry.commit === server.commit) status = 'up-to-date'
      else status = 'outdated'
    } else {
      status = entry ? 'bundle-missing' : 'missing'
    }
    rows.push({
      type: 'mcp',
      name: server.name,
      pinned: statusRef(server.commit),
      installed: statusRef(entry && entry.commit),
      status,
    })
    if (status === 'outdated') outdatedMcp.push(server)
  }

  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR
  for (const asset of consoleAssets || []) {
    const fileName = path.basename(asset.file || asset.url)
    const pathPresent = fs.existsSync(path.join(consoleDir, fileName))
    const entry = state.console ? state.console[fileName] : null
    let status
    if (pathPresent) {
      if (!entry) status = 'untracked'
      else if (entry.commit === asset.commit) status = 'up-to-date'
      else status = 'outdated'
    } else {
      status = entry ? 'file-missing' : 'missing'
    }
    rows.push({
      type: 'console',
      name: fileName,
      pinned: statusRef(asset.commit),
      installed: statusRef(entry && entry.commit),
      status,
    })
    if (status === 'outdated') outdatedConsoleAssets.push(asset)
  }

  // Installed bluepriNNts the manifest does not list: provenance decides. A unit
  // with no recorded provenance is `unknown`, never `up-to-date` (A4). The catalog
  // is consulted only to tell a retired orphan from a live one.
  let catalog = null
  try {
    catalog = await loadBlueprintCatalog(args.catalogPath)
  } catch (_) {
    catalog = null
  }
  for (const [name, entry] of Object.entries(state.blueprints || {})) {
    if (manifestNames.has(name)) continue
    const verdict = verdicts.get(name)
    const catalogEntry = findCatalogEntry(catalog, name)
    let status
    if (verdict && verdict.recorded) status = verdict.status
    else if (!catalogEntry) status = unmatchedCatalogStatus(catalog)
    else status = 'unknown'
    rows.push({
      type: 'catalog',
      name,
      pinned:
        verdict && verdict.published
          ? verdict.published
          : statusRef(catalogEntry && catalogEntry.release_tag),
      installed:
        verdict && verdict.installed ? verdict.installed : statusRef(entry && entry.commit),
      status,
    })
    if (verdict && verdict.detail) blueprintDetails.push(`${name}: ${verdict.detail}`)
  }

  // BluepriNNt packages present on disk that nothing records: same rule. A flat
  // file is never a package, so it has no provenance to read.
  for (const item of untracked) {
    const { name, version } = item
    const verdict = verdicts.get(name)
    const catalogEntry = item.kind === 'dir' ? findCatalogEntry(catalog, name) : null
    let status
    if (verdict && verdict.recorded) status = verdict.status
    else if (!catalogEntry) status = unmatchedCatalogStatus(catalog)
    else status = 'unknown'
    rows.push({
      type: 'catalog',
      name: untrackedDisplayName(item),
      pinned:
        verdict && verdict.published
          ? verdict.published
          : catalogEntry && catalogEntry.adopted
            ? String(catalogEntry.adopted)
            : '-',
      installed: verdict && verdict.installed ? verdict.installed : version || '-',
      status,
    })
    if (verdict && verdict.detail)
      blueprintDetails.push(`${untrackedDisplayName(item)}: ${verdict.detail}`)
  }

  printStatusTable(rows)

  if (blueprintDetails.length > 0) {
    console.log('\nbluepriNNt provenance:')
    for (const line of blueprintDetails) console.log(`  ${line}`)
  }
  const retired = rows.filter((r) => r.type === 'catalog' && r.status === 'retired')
  if (retired.length > 0) {
    console.log(
      `\n${retired.length} installed bluepriNNt(s) are not in the catalog (retired). No update will ever touch them; nothing deletes them either. Remove them by hand from ${args.blueprintsDir} if no domaiNN uses them: ${retired.map((r) => r.name).join(', ')}`,
    )
  }
  if (!catalog) {
    console.log(
      '\nThe bluepriNNt catalog could not be read, so catalog bluepriNNts were not compared (catalog-unavailable). Re-run status when the catalog is reachable.',
    )
  }

  if (
    outdatedSkills.length > 0 ||
    outdatedBlueprints.length > 0 ||
    outdatedConsoleAssets.length > 0 ||
    outdatedMcp.length > 0
  ) {
    console.log('\nDiff previews for outdated items:')
    for (const skill of outdatedSkills) {
      const installed = state.skills[skill.name].commit
      console.log(`  skill ${skill.name}: ${await fetchCompareSummary(skill, installed)}`)
    }
    for (const template of outdatedBlueprints) {
      const installed = state.blueprints[template.name]
      const summary = await fetchCompareSummary(template, installed && installed.commit)
      console.log(`  template ${template.name}: ${summary}`)
      // A blueprint is a unit with its own name, so the repair line can name it. Without this
      // the report says "outdated" and leaves the reader with no next step (decision 4,
      // 2026-11-26).
      console.log(`    repair: update --blueprint ${template.name}`)
    }
  }

  if (modifiedSkills.length > 0) {
    console.log(
      `\nmodified locally (hand-edited copy, version unchanged): ${modifiedSkills.join(', ')}`,
    )
  }
}

/**
 * Executes install command installing missing skills and templates with consent.
 * @param {{ skillsDir: string, blueprintsDir: string, consoleDir?: string, mcpDir?: string, stateFile: string, yes: boolean, agent?: string, scope?: string }} args
 * @returns {Promise<void>}
 */
async function cmdInstall(args) {
  const manifestRaw = await fetchManifestString()
  const { skills, blueprints, consoleAssets, mcp } = parseManifest(manifestRaw)
  const state = loadState(args.stateFile)
  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR
  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR
  migrateLegacyMcpState(state, mcpDir)

  const toInstallSkills = skills.filter(
    (skill) => !fs.existsSync(path.join(args.skillsDir, skill.name)),
  )
  const toInstallBlueprints = blueprints.filter((template) => {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`
    return (
      !fs.existsSync(path.join(args.blueprintsDir, fileName)) &&
      !fs.existsSync(path.join(args.blueprintsDir, template.name))
    )
  })
  const toInstallConsole = (consoleAssets || []).filter((asset) => {
    const fileName = path.basename(asset.file || asset.url)
    return !fs.existsSync(path.join(consoleDir, fileName))
  })
  const toInstallMcp = (mcp || []).filter((server) => {
    return !fs.existsSync(path.join(mcpDir, `${server.name}.bundle.js`))
  })

  if (
    toInstallSkills.length === 0 &&
    toInstallBlueprints.length === 0 &&
    toInstallConsole.length === 0 &&
    toInstallMcp.length === 0
  ) {
    console.log('All skills, templates, and console assets present.')
    return
  }

  const names = [
    ...toInstallSkills.map((s) => `skill:${s.name}`),
    ...toInstallBlueprints.map((t) => `template:${t.name}`),
    ...toInstallConsole.map((a) => `console:${path.basename(a.file || a.url)}`),
    ...toInstallMcp.map((m) => `mcp:${m.name}`),
  ]

  const menu =
    `The following items are missing:\n` +
    (toInstallSkills.length > 0
      ? `Skills:\n  - ${toInstallSkills.map((s) => `${s.name} (${s.version})`).join('\n  - ')}\n`
      : '') +
    (toInstallBlueprints.length > 0
      ? `Templates:\n  - ${toInstallBlueprints.map((t) => `${t.name} (${t.version})`).join('\n  - ')}\n`
      : '') +
    (toInstallConsole.length > 0
      ? `Console assets:\n  - ${toInstallConsole.map((a) => `${path.basename(a.file || a.url)} (${a.version})`).join('\n  - ')}\n`
      : '') +
    (toInstallMcp.length > 0
      ? `MCP servers:\n  - ${toInstallMcp.map((m) => `${m.name} (${m.version})`).join('\n  - ')}\n`
      : '') +
    `\n[a] Install all missing (Recommended)\n[b] Skip\n`

  const proceed = await consentOrAbort(
    'install missing skills, templates, console assets, and MCP servers',
    names,
    menu,
    args.yes,
  )
  if (!proceed) return

  let failures = 0
  const embeddedSkillNames = []

  for (const skill of toInstallSkills) {
    try {
      await installSkillAtCommit(skill, args.skillsDir, state)
      console.log(
        `  installed skill ${skill.name} (${skill.version}) @ ${skill.commit.slice(0, 7)}`,
      )
    } catch (err) {
      failures++
      console.error(`  FAIL skill ${skill.name}: ${err.message}`)
    }
  }

  for (const template of toInstallBlueprints) {
    try {
      embeddedSkillNames.push(
        ...(await installBlueprintAtCommit(template, args.blueprintsDir, state, args.skillsDir)),
      )
      console.log(
        `  installed template ${template.name} (${template.version}) @ ${template.commit.slice(0, 7)}`,
      )
    } catch (err) {
      failures++
      if (err.projectedSkills) embeddedSkillNames.push(...err.projectedSkills)
      console.error(`  FAIL template ${template.name}: ${err.message}`)
    }
  }

  for (const asset of toInstallConsole) {
    try {
      await installConsoleAssetAtCommit(asset, consoleDir, state)
      console.log(
        `  installed console ${path.basename(asset.file || asset.url)} (${asset.version}) @ ${asset.commit.slice(0, 7)}`,
      )
    } catch (err) {
      failures++
      console.error(`  FAIL console ${path.basename(asset.file || asset.url)}: ${err.message}`)
    }
  }

  for (const server of toInstallMcp) {
    try {
      await installMcpAtCommit(server, mcpDir, state)
      registerMcpAuto({
        bundlePath: path.join(mcpDir, `${server.name}.bundle.js`),
        serverName: server.name,
        targetAgent: args.agent,
      })
      console.log(
        `  installed MCP ${server.name} (${server.version}) @ ${server.commit.slice(0, 7)}`,
      )
    } catch (err) {
      failures++
      console.error(`  FAIL MCP ${server.name}: ${err.message}`)
    }
  }

  projectSkillsToAgents({
    canonicalSkillsDir: args.skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
    skillNames: [...toInstallSkills.map((s) => s.name), ...embeddedSkillNames],
  })

  saveState(args.stateFile, state)

  if (failures > 0) {
    console.error(`\n${failures} item(s) failed to install.`)
    process.exit(1)
  }
  console.log(
    `\nInstalled ${toInstallSkills.length} skill(s), ${toInstallBlueprints.length} template(s), ${toInstallConsole.length} console asset(s), and ${toInstallMcp.length} MCP server(s).`,
  )
}

/** Third-party skill trust guidance, linked from the install notice when it matters. */
const THIRD_PARTY_SKILL_DOC_URL =
  'https://cognnitive.com/skills/documentation/#/skills/installing-third-party-skills'

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
  const shortCommit = String(commit).slice(0, 7)
  const integrity = sha256
    ? "pinned and verified against the author's sha256"
    : 'pinned by commit only (no sha256 to verify)'
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
  )
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
  const { name, repo, commit } = args
  const skillPath = args.path
  if (!name || !repo || !skillPath || !commit) {
    throw new Error('install-external requires --name, --repo, --path and --commit')
  }
  if (!/^[0-9a-f]{40}$/i.test(String(commit))) {
    throw new Error(`--commit '${commit}' is not a 40-char hex sha`)
  }

  const skillsDir = args.skillsDir || DEFAULT_SKILLS_DIR
  const state = loadState(args.stateFile)

  const menu = buildExternalSkillNotice({
    name,
    repo,
    path: skillPath,
    commit,
    sha256: args.sha256,
  })
  const proceed = await consentOrAbort(
    `install external skill ${name}`,
    [`external-skill:${name}`],
    menu,
    args.yes,
  )
  if (!proceed) return

  await installSkillAtCommit(
    { name, repo, path: skillPath, commit, sha256: args.sha256 },
    skillsDir,
    state,
  )
  projectSkillsToAgents({
    canonicalSkillsDir: skillsDir,
    targetAgent: args.agent || 'auto',
    scope: args.scope || 'global',
    state,
    skillNames: [name],
  })
  saveState(args.stateFile, state)
  console.log(`installed referenced external skill ${name} @ ${String(commit).slice(0, 7)}`)
}

const DEFAULT_BLUEPRINT_REPO = 'cogNNitive/cogNNitive-web'
const DEFAULT_CATALOG_PATH = path.join(
  __dirname,
  '..',
  '..',
  'iNNfo',
  'specs',
  'bluepriNNts',
  'catalog.json',
)
const DEFAULT_CATALOG_URL = 'https://cognnitive.com/innfo/blueprints/catalog.json'
const FALLBACK_CATALOG_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/catalog.json'

const isUrl = (value) => /^https?:\/\//i.test(String(value))

/** Reads + parses a catalog from a filesystem path or an http(s) URL. */
async function readCatalog(source) {
  const raw = isUrl(source) ? await fetchString(source) : fs.readFileSync(source, 'utf-8')
  return JSON.parse(raw)
}

/**
 * Loads the Level-2 blueprint catalog (`catalog.json`). Resolution order: an
 * explicit path/URL, the `COGNNITIVE_CATALOG` / `SM_CATALOG` override, the
 * in-repo copy when present, then the published Pages URL and its raw GitHub
 * fallback. Throws naming the URL when none resolves, so an installed manager
 * outside the repository can still `install --blueprint`.
 * @param {string} [override]
 * @returns {Promise<object>}
 */
async function loadBlueprintCatalog(override) {
  const explicit = override || process.env.COGNNITIVE_CATALOG || process.env.SM_CATALOG
  if (explicit) return readCatalog(explicit)
  if (fs.existsSync(DEFAULT_CATALOG_PATH)) return readCatalog(DEFAULT_CATALOG_PATH)
  try {
    return await readCatalog(DEFAULT_CATALOG_URL)
  } catch (primaryErr) {
    try {
      return await readCatalog(FALLBACK_CATALOG_URL)
    } catch (fallbackErr) {
      throw new Error(
        `blueprint catalog unreachable: ${DEFAULT_CATALOG_URL} (${primaryErr.message}); ` +
          `fallback ${FALLBACK_CATALOG_URL} (${fallbackErr.message})`,
      )
    }
  }
}

/**
 * Finds a catalog entry by blueprint name (case-insensitive).
 * @param {object | null} catalog
 * @param {string} name
 * @returns {object | null}
 */
function findCatalogEntry(catalog, name) {
  if (!catalog) return null
  const wanted = String(name).toLowerCase()
  for (const [key, entry] of Object.entries(catalog.blueprints || {})) {
    if (key.toLowerCase() === wanted) return entry
    if (entry && entry.name && String(entry.name).toLowerCase() === wanted) return entry
  }
  return null
}

/** The exact command that installs (or reinstalls) catalog bluepriNNt `name` from anywhere. */
function blueprintInstallCommand(name) {
  return `node ~/.agents/skills/nn-skills-lifecycle/scripts/skills-manager.js install --blueprint ${name} --yes`
}

/**
 * Status of an installed bluepriNNt that has no catalog entry. The two causes
 * must not share a word: `retired` is a permanent orphan (the catalog was read
 * and does not list it, so no `update` will ever touch it), while
 * `catalog-unavailable` is transient (the catalog could not be read, so nothing
 * on disk can be judged).
 * @param {object | null} catalog
 * @returns {'retired' | 'catalog-unavailable'}
 */
function unmatchedCatalogStatus(catalog) {
  return catalog ? 'retired' : 'catalog-unavailable'
}

/**
 * Catalog bluepriNNt packages present under `blueprintsDir` (`<name>/spec_NN.md`)
 * that neither the manifest nor the state file records — hydrated outside the
 * manager (e.g. by nn-mcp). Their installed version is the spec's
 * `blueprint_version`, the only record of what is on disk.
 *
 * Each entry is keyed on what is on disk, never on what the spec declares: a
 * renamed or backed-up copy (`_video-script.bak-<date>/` declaring
 * `blueprint_name: video-script`) is reported under its own directory name, so it
 * cannot resurrect a retired bluepriNNt under a version nobody can trace. Flat
 * `<name>.md` files that nothing records are reported too (`kind: 'file'`):
 * a directory-only scan left them invisible.
 * @param {string} blueprintsDir
 * @param {object} state
 * @param {Set<string>} manifestNames
 * @returns {{ name: string, declared: string | null, version: string | null, kind: 'dir' | 'file' }[]}
 */
function untrackedInstalledBlueprints(blueprintsDir, state, manifestNames) {
  const trackedPaths = Object.values(state.blueprints || {})
    .map((entry) => (entry && entry.path ? path.basename(String(entry.path)) : null))
    .filter(Boolean)
  const known = new Set(
    [...manifestNames, ...Object.keys(state.blueprints || {}), ...trackedPaths].map((n) =>
      String(n).toLowerCase(),
    ),
  )
  let entries
  try {
    entries = fs.readdirSync(blueprintsDir, { withFileTypes: true })
  } catch (_) {
    return []
  }
  /** @type {{ name: string, declared: string | null, version: string | null, kind: 'dir' | 'file' }[]} */
  const found = []
  for (const entry of entries) {
    const lower = entry.name.toLowerCase()
    if (known.has(lower)) continue
    if (entry.isFile() && lower.endsWith('.md')) {
      if (known.has(lower.slice(0, -3))) continue
      found.push({ name: entry.name, declared: null, version: null, kind: 'file' })
      continue
    }
    if (!entry.isDirectory()) continue
    let text
    try {
      text = fs.readFileSync(path.join(blueprintsDir, entry.name, 'spec_NN.md'), 'utf-8')
    } catch (_) {
      continue
    }
    const field = (key) => {
      const m = new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+?)["']?\\s*$`, 'm').exec(text)
      return m ? m[1] : null
    }
    found.push({
      name: entry.name,
      declared: field('blueprint_name'),
      version: field('blueprint_version'),
      kind: 'dir',
    })
  }
  return found.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Display name of an untracked install: the on-disk name, plus the declared
 * name when the two disagree, so a stray copy reads as one.
 * @param {{ name: string, declared: string | null }} item
 */
function untrackedDisplayName(item) {
  if (!item.declared || item.declared.toLowerCase() === item.name.toLowerCase()) return item.name
  return `${item.name} (declares ${item.declared})`
}

/**
 * Fetches + extracts a blueprint package once and summarizes what installing it
 * would bring (embedded skills, npm deps, CLI, env, binaries), for one consent
 * menu. Best-effort: returns null on failure so the caller falls back to the
 * catalog-derived menu.
 * @param {object} template
 * @returns {Promise<{ skills: string[], npmDeps: string[], cli: string[], env: string[], binaries: string[] } | null>}
 */
async function describeBlueprintPackage(template) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-bp-menu-'))
  try {
    const tarball = await fetchRepoCommitTarball(template)
    const extractDir = path.join(tmpRoot, 'x')
    extractTarball(tarball, extractDir)
    const repoRoot = findRepoRoot(extractDir)
    const pkgDir = path.join(repoRoot, path.dirname(template.path))
    const out = { skills: [], npmDeps: [], cli: [], env: [], binaries: [] }
    const skillsDir = path.join(pkgDir, 'skills')
    if (fs.existsSync(skillsDir)) {
      for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue
        const skillFile = path.join(skillsDir, entry.name, 'SKILL.md')
        if (!fs.existsSync(skillFile)) continue
        out.skills.push(entry.name)
        const dep = readDependsOn(fs.readFileSync(skillFile, 'utf8'))
        if (dep) {
          for (const c of dep.cli || []) if (c && c.name) out.cli.push(c.name)
          for (const e of dep.env || []) if (e && e.name) out.env.push(e.name)
          for (const b of dep.binaries || []) out.binaries.push(b)
          const pkgJsonPath = path.join(skillsDir, entry.name, 'package.json')
          if (fs.existsSync(pkgJsonPath)) {
            try {
              out.npmDeps.push(
                ...Object.keys(JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).dependencies || {}),
              )
            } catch (_) {
              // ignore an unreadable package.json
            }
          }
        }
      }
    }
    return out
  } catch (_) {
    return null
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
}

/**
 * Installs a single optional catalog bluepriNNt on demand
 * (`skills-manager.js install --blueprint <name>`) from its catalog release pin
 * into the blueprints directory, projecting any embedded `<name>/skills/*` into
 * the skills directory. Consent-gated.
 * @param {{ blueprintsDir?: string, skillsDir?: string, stateFile: string, blueprint: string, repo?: string, catalogPath?: string, channelsPath?: string, home?: string, fetchString?: (url: string) => Promise<string>, yes?: boolean, agent?: string, scope?: string }} args
 * @returns {Promise<void>}
 */
async function cmdInstallBlueprint(args) {
  const name = args.blueprint
  if (!name) throw new Error('install --blueprint requires a blueprint name')

  const catalogPath = args.catalogPath
  const blueprintsDir = args.blueprintsDir || DEFAULT_BLUEPRINTS_DIR
  const skillsDir = args.skillsDir || DEFAULT_SKILLS_DIR

  // Catalog first, unchanged. Then channels (plan P2): "not in the catalog" stops being
  // terminal, and it covers an unreachable catalog too — a transient network failure
  // must not be reported as "this blueprint does not exist" when a channel carries it.
  let entry = null
  let catalogError = null
  try {
    const catalog = await loadBlueprintCatalog(catalogPath)
    entry = findCatalogEntry(catalog, name)
  } catch (err) {
    catalogError = err
  }

  /** @type {{ template: object, header: string[] }} */
  let plan
  if (entry) {
    if (!entry.release_tag) {
      // A channel may carry what the catalog still marks unreleased. Refuse before
      // consulting them only when nobody configured a source: an explicit path, the
      // environment, or the operator's own `~/.agents/channels.json` all count — the home
      // file was ignored here, which is why `install --blueprint` refused a unit the
      // channel publishes while the catalog still says `release_tag: null`.
      const hasChannelSource = Boolean(
        args.channelsPath ||
        process.env.COGNNITIVE_CHANNELS ||
        fs.existsSync(defaultChannelsFile(args.home)),
      )
      if (!hasChannelSource) {
        throw new Error(
          `blueprint '${name}' is not yet released (no matching blueprints-v* tag); update the catalog`,
        )
      }
    } else {
      const repo = args.repo || DEFAULT_BLUEPRINT_REPO
      const ref = entry.release_tag
      const version = entry.adopted
      const entryName = entry.name || name

      // codeload accepts a tag as the archive ref; reuse the (repo, ref) tarball
      // cache and the standard blueprint install path for extraction + projection.
      // A tag is not a commit, so resolve it: provenance must name an immutable tree
      // (S3). When resolution fails the tag is still recorded, and the lock records
      // `commit: null` rather than a tag in a commit field.
      let resolvedCommit = ref
      try {
        const resolved = await resolveRef(repo, ref)
        if (resolved && 'sha' in resolved && resolved.sha) resolvedCommit = resolved.sha
      } catch (_) {
        /* offline or rate-limited: the tag still fetches the archive */
      }

      plan = {
        template: {
          name: entryName,
          repo,
          path: `iNNfo/specs/bluepriNNts/${entryName}/spec_NN.md`,
          version,
          tag: ref,
          ref,
          commit: resolvedCommit,
        },
        header: [
          'Optional catalog blueprint (on demand):',
          `  - ${entryName} (${version}) from ${repo} @ ${ref}`,
          `  tier: ${entry.tier || 'free'} · access: ${entry.access || 'public'}`,
        ],
      }
    }
  }
  if (!plan) {
    // A channel answers "does someone publish this name, and at which commit". The
    // commit comes from the publisher's own versions.json and is verified by reading
    // that commit's blueprint.json (C3), so the install fetches an immutable tree and
    // never a branch or a tag list.
    const loaded = await loadChannels({
      file: args.channelsPath,
      home: args.home,
      env: process.env,
    })
    const resolved = await resolveBlueprintInChannels(
      { name, channels: loaded.channels },
      { fetchString: args.fetchString },
    )
    if (!resolved.ok) {
      if (entry && !entry.release_tag) {
        throw new Error(
          `blueprint '${name}' is not yet released (no matching blueprints-v* tag); update the catalog`,
        )
      }
      const tried = resolved.tried.map((t) => `${t.channel}: ${t.reason}`).join('; ')
      throw new Error(
        `blueprint '${name}' is not in the catalog ` +
          (catalogError
            ? `(${catalogError.message})`
            : `(${catalogPath || DEFAULT_CATALOG_PATH})`) +
          ` and no channel carries it. channels (${loaded.source}): ${tried}`,
      )
    }
    // The failure branch above establishes the invariant; the resolver returns nulls
    // instead of a discriminated union so `checkJs` can narrow it here in one place.
    const hit =
      /** @type {{ channel: { name: string, distribution_url: string }, distribution_url: string, entry: { version: string, tag: string | null, commit: string } }} */ (
        resolved
      )
    const parts = distributionUrlParts(hit.distribution_url)
    if (!parts) {
      throw new Error(
        `blueprint '${name}' resolved in channel '${hit.channel.name}' but ` +
          `${hit.distribution_url} cannot address a commit's tree`,
      )
    }
    plan = {
      template: {
        name,
        repo: parts.repo,
        path: `${parts.blueprintPath}/spec_NN.md`,
        version: hit.entry.version,
        tag: hit.entry.tag,
        ref: hit.entry.commit,
        commit: hit.entry.commit,
      },
      header: [
        'Optional channel blueprint (on demand):',
        `  - ${name} (${hit.entry.version}) from ${parts.repo} @ ${hit.entry.commit.slice(0, 7)}`,
        `  channel: ${hit.channel.name} · ${hit.channel.distribution_url}`,
      ],
    }
  }

  const { template } = plan
  const entryName = template.name
  const embedded = Array.isArray(entry && entry.embedded_skills) ? entry.embedded_skills : []

  const summary = await describeBlueprintPackage(template)
  const summaryMenu = summary
    ? (summary.skills.length ? `  embedded skills: ${summary.skills.join(', ')}\n` : '') +
      (summary.cli.length ? `  CLI: ${summary.cli.join(', ')} (agent skills)\n` : '') +
      (summary.npmDeps.length ? `  npm deps: ${summary.npmDeps.join(', ')}\n` : '') +
      (summary.binaries.length ? `  binaries: ${summary.binaries.join(', ')}\n` : '') +
      (summary.env.length ? `  env keys: ${summary.env.join(', ')}\n` : '')
    : embedded.length
      ? `  embedded skills: ${embedded.join(', ')}\n`
      : ''

  const menu = `${plan.header.join('\n')}\n` + summaryMenu + `\n[a] Install\n[b] Skip\n`
  const proceed = await consentOrAbort(
    `install catalog blueprint ${entryName}`,
    [`blueprint:${entryName}`],
    menu,
    args.yes,
  )
  if (!proceed) return

  const state = loadState(args.stateFile)
  let projected = []
  try {
    projected = await installBlueprintAtCommit(template, blueprintsDir, state, skillsDir)
  } catch (err) {
    if (err.projectedSkills) projected = err.projectedSkills
    throw err
  }

  projectSkillsToAgents({
    canonicalSkillsDir: skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
    skillNames: projected.length > 0 ? projected : undefined,
  })
  saveState(args.stateFile, state)
  console.log(
    `installed blueprint ${entryName} (${template.version}) @ ${template.ref}` +
      (projected.length
        ? ` and projected ${projected.length} skill(s): ${projected.join(', ')}`
        : ''),
  )
}

/**
 * Executes update command updating outdated skills and templates with consent.
 * @param {{ skillsDir: string, blueprintsDir: string, consoleDir?: string, mcpDir?: string, stateFile: string, positional: string[], yes: boolean, agent?: string, scope?: string, catalogPath?: string, repo?: string, blueprint?: string | null }} args
 * @returns {Promise<void>}
 */
async function cmdUpdate(args) {
  const manifestRaw = await fetchManifestString()
  const { skills, blueprints, consoleAssets, mcp } = parseManifest(manifestRaw)
  const state = loadState(args.stateFile)
  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR
  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR
  migrateLegacyMcpState(state, mcpDir)

  // Provenance for every blueprint on disk, computed once. `update` reads it
  // instead of a catalog (S5); the network is touched only for units that carry a
  // recorded distribution_url, and this command is explicitly invoked (A5).
  const manifestNames = new Set(blueprints.map((t) => t.name))
  const untrackedUpdate = untrackedInstalledBlueprints(args.blueprintsDir, state, manifestNames)
  const verdicts = await collectBlueprintVerdicts(args.blueprintsDir, [
    ...manifestNames,
    ...Object.keys(state.blueprints || {}),
    ...untrackedUpdate.map((item) => item.name),
  ])

  const isOutdatedSkill = (skill) => {
    const dirPresent = fs.existsSync(path.join(args.skillsDir, skill.name))
    const entry = state.skills[skill.name]
    return dirPresent && (!entry || entry.commit !== skill.commit)
  }

  const isOutdatedBlueprint = (template) => {
    const fileName = template.name.endsWith('.md') ? template.name : `${template.name}.md`
    const pathPresent =
      fs.existsSync(path.join(args.blueprintsDir, fileName)) ||
      fs.existsSync(path.join(args.blueprintsDir, template.name))
    if (!pathPresent) return false
    const verdict = verdicts.get(template.name)
    // Provenance is the answer when it exists: the unit says what it is and where
    // it came from, so the manifest pin is not consulted (S5). A recorded but
    // unknown verdict is selected too — it is the only way a unit can gain the
    // provenance it lacks.
    if (verdict && verdict.recorded)
      return verdict.status === 'update-available' || verdict.status === 'unknown'
    const entry = state.blueprints[template.name]
    return !entry || entry.commit !== template.commit
  }

  const isOutdatedMcp = (server) => {
    const bundleDest = path.join(mcpDir, `${server.name}.bundle.js`)
    const pathPresent = fs.existsSync(bundleDest)
    const entry = state.mcp ? state.mcp[server.name] : null
    if (!pathPresent) return true
    return !entry || entry.commit !== server.commit
  }

  // The console assets are one set (exporter, view lib, CSS, bundle, payload mirror).
  // Once any member is installed, update also installs the members a newer release added.
  const consoleSetInstalled = (consoleAssets || []).some((asset) =>
    fs.existsSync(path.join(consoleDir, path.basename(asset.file || asset.url))),
  )

  const isOutdatedConsole = (asset) => {
    const fileName = path.basename(asset.file || asset.url)
    const pathPresent = fs.existsSync(path.join(consoleDir, fileName))
    if (!pathPresent) return consoleSetInstalled
    const entry = state.console ? state.console[fileName] : null
    return !entry || entry.commit !== asset.commit
  }

  let selectedSkills = skills.filter(isOutdatedSkill)
  let selectedBlueprints = blueprints.filter(isOutdatedBlueprint)
  let selectedConsole = (consoleAssets || []).filter(isOutdatedConsole)
  let selectedMcp = (mcp || []).filter(isOutdatedMcp)

  if (args.positional.length > 0) {
    for (const pos of args.positional) {
      const verdict = verdicts.get(pos)
      if (verdict && verdict.status === 'modified-locally') {
        const detail =
          verdict.differing && verdict.differing.length > 0
            ? verdict.differing.join(', ')
            : verdict.detail
        console.error(
          `refusing to update blueprint '${pos}': locally modified (${detail}). Update will not overwrite hand edits.`,
        )
        throw new Error(`refusing to update blueprint '${pos}': locally modified (${detail})`)
      }
    }
    selectedSkills = skills.filter((s) => args.positional.includes(s.name) && isOutdatedSkill(s))
    selectedBlueprints = blueprints.filter(
      (t) => args.positional.includes(t.name) && isOutdatedBlueprint(t),
    )
    selectedConsole = (consoleAssets || []).filter(
      (a) => args.positional.includes(path.basename(a.file || a.url)) && isOutdatedConsole(a),
    )
    selectedMcp = (mcp || []).filter(
      (m) =>
        (args.positional.includes(m.name) || args.positional.includes('mcp')) && isOutdatedMcp(m),
    )
  }

  // `--blueprint <name>` is the repair line `status` prints: exactly one blueprint unit, and
  // never a skill, console asset or MCP server that happens to share the name. A blueprint is
  // a unit with its own name and version (decision 4, 2026-11-26).
  if (args.blueprint) {
    const verdict = verdicts.get(args.blueprint)
    if (verdict && verdict.status === 'modified-locally') {
      const detail =
        verdict.differing && verdict.differing.length > 0
          ? verdict.differing.join(', ')
          : verdict.detail
      console.error(
        `refusing to update blueprint '${args.blueprint}': locally modified (${detail}). Update will not overwrite hand edits.`,
      )
      throw new Error(
        `refusing to update blueprint '${args.blueprint}': locally modified (${detail})`,
      )
    }
    selectedSkills = []
    selectedBlueprints = blueprints.filter(
      (t) => t.name === args.blueprint && isOutdatedBlueprint(t),
    )
    selectedConsole = []
    selectedMcp = []
  }

  // BluepriNNts the manifest does not list: provenance decides, and a unit with no
  // provenance is selected so `update` can record one instead of reporting
  // "up to date" for something it never checked (A4, A7).
  const selectedCatalog = []
  for (const name of new Set([
    ...Object.keys(state.blueprints || {}),
    ...untrackedUpdate.map((item) => item.name),
  ])) {
    if (manifestNames.has(name)) continue
    if (args.positional.length > 0 && !args.positional.includes(name)) continue
    if (args.blueprint && name !== args.blueprint) continue
    const verdict = verdicts.get(name)
    if (!verdict) continue
    if (!verdict.recorded) {
      // No provenance and no manifest pin: the unit can still be named, but its
      // version cannot be resolved from a catalog (S5), so it is skipped loudly
      // rather than reported as up to date.
      selectedCatalog.push({ name, verdict })
      continue
    }
    if (verdict.status !== 'update-available' && verdict.status !== 'unknown') continue
    selectedCatalog.push({ name, verdict })
  }

  // Locally modified skills: name the differing files for the consent prompt.
  const modifiedSkills = selectedSkills
    .map((skill) => {
      const entry = state.skills[skill.name]
      const dir = path.join(args.skillsDir, skill.name)
      if (!entry || !entry.files || !fs.existsSync(dir)) return null
      let diff
      try {
        diff = diffSkillDir(dir, entry.files)
      } catch (_) {
        diff = null
      }
      if (!diff || !diff.modified) return null
      return { name: skill.name, files: [...diff.changed, ...diff.added, ...diff.removed] }
    })
    .filter(Boolean)

  if (
    selectedSkills.length === 0 &&
    selectedBlueprints.length === 0 &&
    selectedConsole.length === 0 &&
    selectedMcp.length === 0 &&
    selectedCatalog.length === 0
  ) {
    console.log('All skills, templates, and console assets up to date.')
    projectSkillsToAgents({
      canonicalSkillsDir: args.skillsDir,
      targetAgent: args.agent,
      scope: args.scope,
      state,
      skillNames: args.positional.length > 0 ? args.positional : undefined,
    })
    saveState(args.stateFile, state)
    return
  }

  const names = [
    ...selectedSkills.map((s) => `skill:${s.name}`),
    ...selectedBlueprints.map((t) => `template:${t.name}`),
    ...selectedConsole.map((a) => `console:${path.basename(a.file || a.url)}`),
    ...selectedMcp.map((m) => `mcp:${m.name}`),
    ...selectedCatalog.map((c) => `catalog:${c.name}`),
  ]

  const modifiedMenu =
    modifiedSkills.length > 0
      ? `\nLocally modified (overwritten only with consent):\n` +
        modifiedSkills.map((m) => `  - ${m.name}: ${m.files.join(', ')}`).join('\n') +
        '\n'
      : ''

  const proceed = await consentOrAbort(
    'update skills, templates, console assets, and MCP servers',
    names,
    `Updating ${selectedSkills.length} skill(s), ${selectedBlueprints.length} template(s), ${selectedConsole.length} console asset(s), ${selectedMcp.length} MCP server(s), and ${selectedCatalog.length} catalog blueprint(s).\n` +
      modifiedMenu +
      `\n[a] Update all listed (Recommended)\n[b] Skip\n`,
    args.yes,
  )
  if (!proceed) return

  // A locally modified skill is overwritten only with explicit consent that names
  // the modified files; declining leaves that skill untouched.
  const skipSkills = new Set()
  for (const m of modifiedSkills) {
    const ok = await consentOrAbort(
      `overwrite modified skill ${m.name}`,
      [`skill:${m.name}`],
      `Skill ${m.name} was edited by hand (version unchanged):\n  ${m.files.join('\n  ')}\n\nOverwrite with the catalog copy?\n\n[a] Overwrite\n[b] Keep my changes\n`,
      args.yes,
    )
    if (!ok) skipSkills.add(m.name)
  }
  const skillsToUpdate = selectedSkills.filter((s) => !skipSkills.has(s.name))

  let failures = 0
  const embeddedSkillNames = []

  for (const skill of skillsToUpdate) {
    try {
      await installSkillAtCommit(skill, args.skillsDir, state)
      console.log(`  updated skill ${skill.name} -> ${skill.version} (${skill.commit.slice(0, 7)})`)
    } catch (err) {
      failures++
      console.error(`  FAIL skill ${skill.name}: ${err.message}`)
    }
  }

  for (const template of selectedBlueprints) {
    try {
      embeddedSkillNames.push(
        ...(await installBlueprintAtCommit(template, args.blueprintsDir, state, args.skillsDir)),
      )
      console.log(
        `  updated template ${template.name} -> ${template.version} (${template.commit.slice(0, 7)})`,
      )
    } catch (err) {
      failures++
      if (err.projectedSkills) embeddedSkillNames.push(...err.projectedSkills)
      console.error(`  FAIL template ${template.name}: ${err.message}`)
    }
  }

  for (const { name, verdict } of selectedCatalog) {
    // The install target comes from the unit's own provenance: the repository and
    // the in-repo path are read out of its distribution_url, and the tree is the
    // commit `versions.json` named and `blueprint.json` verified (C3, S5).
    const recorded = readProvenance(args.blueprintsDir, name)
    const parts = distributionUrlParts(recorded.entry && recorded.entry.distribution_url)
    if (!parts || !verdict.commit) {
      console.log(
        `  skipped catalog blueprint ${name}: ${verdict.detail || 'no verifiable published version'}`,
      )
      continue
    }
    const template = {
      name,
      repo: parts.repo,
      path: `${parts.blueprintPath}/spec_NN.md`,
      version: verdict.published,
      tag: verdict.tag || null,
      ref: verdict.tag || parts.ref,
      commit: verdict.commit,
    }
    try {
      embeddedSkillNames.push(
        ...(await installBlueprintAtCommit(template, args.blueprintsDir, state, args.skillsDir)),
      )
      console.log(
        `  updated catalog blueprint ${name} -> ${verdict.published} (${verdict.commit.slice(0, 7)})`,
      )
    } catch (err) {
      failures++
      if (err.projectedSkills) embeddedSkillNames.push(...err.projectedSkills)
      console.error(`  FAIL catalog blueprint ${name}: ${err.message}`)
    }
  }

  for (const asset of selectedConsole) {
    try {
      await installConsoleAssetAtCommit(asset, consoleDir, state)
      console.log(
        `  updated console ${path.basename(asset.file || asset.url)} -> ${asset.version} (${asset.commit.slice(0, 7)})`,
      )
    } catch (err) {
      failures++
      console.error(`  FAIL console ${path.basename(asset.file || asset.url)}: ${err.message}`)
    }
  }

  for (const server of selectedMcp) {
    try {
      await installMcpAtCommit(server, mcpDir, state)
      const bundleDest = path.join(mcpDir, `${server.name}.bundle.js`)
      registerMcpAuto({
        bundlePath: bundleDest,
        serverName: server.name,
        targetAgent: args.agent,
      })
      console.log(
        `  updated MCP ${server.name} -> ${server.version} (${server.commit.slice(0, 7)})`,
      )
    } catch (err) {
      failures++
      console.error(`  FAIL MCP ${server.name}: ${err.message}`)
    }
  }

  projectSkillsToAgents({
    canonicalSkillsDir: args.skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
    // A positional filter names blueprint or skill entries; skills embedded in an updated blueprint have
    // their own directory names, so they must be added or they are never projected to the agents.
    skillNames:
      args.positional.length > 0 ? [...args.positional, ...embeddedSkillNames] : undefined,
  })

  saveState(args.stateFile, state)

  if (failures > 0) {
    console.error(`\n${failures} item(s) failed to update.`)
    process.exit(1)
  }
  console.log(
    `\nUpdated ${skillsToUpdate.length} skill(s), ${selectedBlueprints.length} template(s), ${selectedConsole.length} console asset(s), ${selectedMcp.length} MCP server(s), and ${selectedCatalog.length} catalog blueprint(s).`,
  )
}

/**
 * Synchronizes skills between local repository and global agent directory.
 * @param {{ skillsDir: string, direction?: string, yes: boolean, localSkillsDir?: string }} args
 * @returns {Promise<void>}
 */
async function cmdSync(args) {
  const localSkillsDir = args.localSkillsDir || path.resolve(__dirname, '../../skills')
  const direction = args.direction || 'local-to-global'

  if (direction !== 'local-to-global' && direction !== 'global-to-local') {
    throw new Error(
      `Invalid sync direction: ${direction}. Expected local-to-global or global-to-local.`,
    )
  }

  const srcDir = direction === 'local-to-global' ? localSkillsDir : args.skillsDir
  const destDir = direction === 'local-to-global' ? args.skillsDir : localSkillsDir

  console.log(`Sync direction: ${direction}`)
  console.log(`Source:      ${srcDir}`)
  console.log(`Destination: ${destDir}\n`)

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source directory does not exist: ${srcDir}`)
  }

  const skillsToSync = fs.readdirSync(localSkillsDir).filter((name) => {
    return fs.statSync(path.join(localSkillsDir, name)).isDirectory() && !name.startsWith('.')
  })

  const proceed = await consentOrAbort(
    'synchronize skills',
    skillsToSync,
    `This will synchronize the following skills:\n${skillsToSync.map((s) => `  - ${s}`).join('\n')}\n\n[a] Proceed with sync\n[b] Skip\n`,
    args.yes,
  )
  if (!proceed) return

  for (const skill of skillsToSync) {
    const srcSkill = path.join(srcDir, skill)
    const destSkill = path.join(destDir, skill)

    if (fs.existsSync(srcSkill)) {
      console.log(`Syncing ${skill}...`)
      copyDirRecursive(srcSkill, destSkill)
    }
  }
  console.log('\nSync completed successfully.')
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
  const url = args.manifestUrl || getManifestUrl()
  console.log('=== cogNNitive Bootstrap ===')
  console.log(`Fetching manifest from: ${url}`)
  const manifestRaw = await fetchString(url)
  const manifest = parseManifest(manifestRaw)
  const state = loadState(args.stateFile)

  const mcpDir = args.mcpDir || DEFAULT_MCP_DIR
  const consoleDir = args.consoleDir || DEFAULT_CONSOLE_DIR
  migrateLegacyMcpState(state, mcpDir)
  fs.mkdirSync(args.skillsDir, { recursive: true })
  fs.mkdirSync(args.blueprintsDir, { recursive: true })
  fs.mkdirSync(mcpDir, { recursive: true })
  fs.mkdirSync(consoleDir, { recursive: true })

  const names = [
    ...manifest.skills.map((s) => `skill:${s.name}`),
    ...manifest.blueprints.map((t) => `template:${t.name}`),
    ...(manifest.consoleAssets || []).map((a) => `console:${path.basename(a.file || a.url)}`),
  ]

  const proceed = await consentOrAbort(
    'bootstrap cogNNitive ecosystem',
    names,
    `Bootstrapping ${manifest.skills.length} skills, ${manifest.blueprints.length} templates, MCP servers, and console assets.\n\n[a] Bootstrap now (Recommended)\n[b] Cancel\n`,
    args.yes,
  )
  if (!proceed) return

  // 1. Skills
  console.log(`\nInstalling/verifying ${manifest.skills.length} skill(s)...`)
  for (const skill of manifest.skills) {
    const entry = state.skills[skill.name]
    const dirPresent = fs.existsSync(path.join(args.skillsDir, skill.name))
    if (!dirPresent || !entry || entry.commit !== skill.commit) {
      await installSkillAtCommit(skill, args.skillsDir, state)
      console.log(`  ✓ skill ${skill.name} (${skill.version}) @ ${skill.commit.slice(0, 7)}`)
    } else {
      console.log(`  ✓ skill ${skill.name} (${skill.version}) up-to-date`)
    }
  }

  // 2. Templates
  console.log(`\nInstalling/verifying ${manifest.blueprints.length} template(s)...`)
  for (const tmpl of manifest.blueprints) {
    const fileName = tmpl.name.endsWith('.md') ? tmpl.name : `${tmpl.name}.md`
    const tmplPresent =
      fs.existsSync(path.join(args.blueprintsDir, fileName)) ||
      fs.existsSync(path.join(args.blueprintsDir, tmpl.name))
    const entry = state.blueprints[tmpl.name]
    if (!tmplPresent || !entry || entry.commit !== tmpl.commit) {
      await installBlueprintAtCommit(tmpl, args.blueprintsDir, state, args.skillsDir)
      console.log(`  ✓ template ${tmpl.name} (${tmpl.version}) @ ${tmpl.commit.slice(0, 7)}`)
    } else {
      console.log(`  ✓ template ${tmpl.name} (${tmpl.version}) up-to-date`)
    }
  }

  // 3. MCP servers — parseManifest already hoists skills[].mcp into manifest.mcp.
  const mcpList = manifest.mcp || []

  if (mcpList.length > 0) {
    console.log(`\nInstalling/verifying ${mcpList.length} MCP server(s)...`)
    for (const mcp of mcpList) {
      const bundleDest = path.join(mcpDir, `${mcp.name}.bundle.js`)
      const entry = state.mcp ? state.mcp[mcp.name] : null
      if (!fs.existsSync(bundleDest) || !entry || entry.commit !== mcp.commit) {
        await installMcpAtCommit(mcp, mcpDir, state)
        console.log(`  ✓ bundle ${mcp.name} (${mcp.version}) @ ${mcp.commit.slice(0, 7)}`)
      } else {
        console.log(`  ✓ bundle ${mcp.name} (${mcp.version}) up-to-date`)
      }

      // 4. Auto-register in agent config
      const mcpRegistrations = registerMcpAuto({
        bundlePath: bundleDest,
        serverName: mcp.name,
        targetAgent: args.agent,
      })

      for (const reg of mcpRegistrations) {
        console.log(
          `  ✓ MCP registered for ${reg.agent}: ${reg.file} (${reg.updated ? 'configured' : 'already configured'})`,
        )
      }
    }
  }

  // 5. Console assets
  if (manifest.consoleAssets && manifest.consoleAssets.length > 0) {
    console.log(`\nInstalling/verifying ${manifest.consoleAssets.length} console asset(s)...`)
    for (const asset of manifest.consoleAssets) {
      const fileName = path.basename(asset.file || asset.url)
      const dest = path.join(consoleDir, fileName)
      const entry = state.console ? state.console[fileName] : null
      if (!fs.existsSync(dest) || !entry || entry.commit !== asset.commit) {
        await installConsoleAssetAtCommit(asset, consoleDir, state)
        console.log(`  ✓ console ${fileName} (${asset.version}) @ ${asset.commit.slice(0, 7)}`)
      } else {
        console.log(`  ✓ console ${fileName} (${asset.version}) up-to-date`)
      }
    }
  }

  // 6. Project skills to agent directories (OpenCode, Claude Code, Antigravity)
  projectSkillsToAgents({
    canonicalSkillsDir: args.skillsDir,
    targetAgent: args.agent,
    scope: args.scope,
    state,
  })

  // 7. Save state
  saveState(args.stateFile, state)

  // 8. Summary and workflows
  console.log(`\nBootstrap completed successfully! All components up-to-date.`)
  if (manifest.workflows && manifest.workflows.length > 0) {
    console.log(`\nAvailable workflows:`)
    manifest.workflows.forEach((wf, idx) => {
      console.log(`  ${idx + 1}. ${wf.label} (${wf.skill}) — ${wf.description}`)
    })
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
      console.log(
        `\nSkipping skill projection: workspace scope does not project to global editor directories.`,
      )
    }
    return []
  }

  if (!fs.existsSync(canonicalSkillsDir)) return []

  let skillEntries = []
  try {
    const diskDirs = fs.readdirSync(canonicalSkillsDir).filter((name) => {
      return (
        isProjectableName(name) && fs.statSync(path.join(canonicalSkillsDir, name)).isDirectory()
      )
    })
    if (skillNames && skillNames.length > 0) {
      skillEntries = diskDirs.filter((name) => skillNames.includes(name))
    } else if (state && state.skills && Object.keys(state.skills).length > 0) {
      skillEntries = diskDirs.filter((name) => state.skills[name])
    } else {
      skillEntries = diskDirs
    }
  } catch {
    return []
  }

  if (skillEntries.length === 0) return []

  const normalizedAgent = (targetAgent || 'auto').toLowerCase()
  /** @type {Array<{ agent: string, targetDir: string, skill: string, method: 'symlink' | 'copy', action: 'create' | 'adopt' | 'replace' | 'mirror' | 'skip' }>} */
  const projections = []

  const agentTargets = []
  const opencodeSkillsDir = path.join(homedir, '.config', 'opencode', 'skills')
  const claudeSkillsDir = path.join(homedir, '.claude', 'skills')
  const geminiSkillsDir = path.join(homedir, '.gemini', 'config', 'skills')
  const hermesSkillsDir = path.join(homedir, '.hermes', 'skills')

  if (normalizedAgent === 'opencode' || normalizedAgent === 'all') {
    agentTargets.push({ agent: 'opencode', dir: opencodeSkillsDir })
  }
  if (normalizedAgent === 'claude' || normalizedAgent === 'all') {
    agentTargets.push({ agent: 'claude', dir: claudeSkillsDir })
  }
  if (normalizedAgent === 'antigravity' || normalizedAgent === 'all') {
    agentTargets.push({ agent: 'antigravity', dir: geminiSkillsDir })
  }
  if (normalizedAgent === 'hermes' || normalizedAgent === 'all') {
    agentTargets.push({ agent: 'hermes', dir: hermesSkillsDir })
  }

  if (normalizedAgent === 'auto') {
    if (
      fs.existsSync(path.join(homedir, '.config', 'opencode')) ||
      process.env.OPENCODE_SESSION_ID ||
      process.env.OPENCODE_RUN_ID
    ) {
      agentTargets.push({ agent: 'opencode', dir: opencodeSkillsDir })
    }
    if (
      fs.existsSync(path.join(homedir, '.claude')) ||
      fs.existsSync(path.join(homedir, '.claude.json')) ||
      process.env.CLAUDE_CODE ||
      process.env.CLAUDE_PROJECT_DIR
    ) {
      agentTargets.push({ agent: 'claude', dir: claudeSkillsDir })
    }
    if (
      fs.existsSync(path.join(homedir, '.gemini')) ||
      process.env.ANTIGRAVITY ||
      process.env.GEMINI_CLI
    ) {
      agentTargets.push({ agent: 'antigravity', dir: geminiSkillsDir })
    }
    if (
      fs.existsSync(path.join(homedir, '.hermes')) ||
      process.env.HERMES ||
      process.env.HERMES_HOME
    ) {
      agentTargets.push({ agent: 'hermes', dir: hermesSkillsDir })
    }
    if (agentTargets.length === 0) {
      agentTargets.push({ agent: 'opencode', dir: opencodeSkillsDir })
      agentTargets.push({ agent: 'claude', dir: claudeSkillsDir })
      agentTargets.push({ agent: 'antigravity', dir: geminiSkillsDir })
    }
  }

  if (state) {
    state.projections = state.projections || {}
  }

  for (const target of agentTargets) {
    fs.mkdirSync(target.dir, { recursive: true })
    if (state) {
      state.projections[target.agent] = state.projections[target.agent] || {
        dir: target.dir,
        skills: {},
      }
      state.projections[target.agent].dir = target.dir
      state.projections[target.agent].skills = state.projections[target.agent].skills || {}
    }

    for (const skill of skillEntries) {
      const src = path.join(canonicalSkillsDir, skill)
      const dest = path.join(target.dir, skill)

      if (path.resolve(src).toLowerCase() === path.resolve(dest).toLowerCase()) continue

      const classification = classifyProjection(dest, src)
      const recorded =
        state && state.projections[target.agent] && state.projections[target.agent].skills[skill]

      const recordState = (method) => {
        if (state) {
          state.projections[target.agent].skills[skill] = {
            method,
            source: path.resolve(src),
            projected_at: new Date().toISOString(),
          }
        }
      }

      if (classification === 'absent') {
        /** @type {'symlink' | 'copy'} */
        let method = 'symlink'
        /** @type {'create' | 'adopt' | 'replace' | 'mirror' | 'skip'} */
        let action = 'create'
        let symlinkSuccess = false
        try {
          const symlinkType = process.platform === 'win32' ? 'junction' : 'dir'
          fs.symlinkSync(src, dest, symlinkType)
          symlinkSuccess = true
        } catch {
          symlinkSuccess = false
        }

        if (!symlinkSuccess) {
          mirrorDir(src, dest, isProjectableName)
          method = /** @type {'symlink' | 'copy'} */ ('copy')
        }
        recordState(method)
        projections.push({ agent: target.agent, targetDir: target.dir, skill, method, action })
      } else if (classification === 'link-ok') {
        /** @type {'symlink' | 'copy'} */
        const method = 'symlink'
        /** @type {'create' | 'adopt' | 'replace' | 'mirror' | 'skip'} */
        const action = 'adopt'
        recordState(method)
        projections.push({ agent: target.agent, targetDir: target.dir, skill, method, action })
      } else if (classification === 'link-wrong' || classification === 'link-dangling') {
        if (recorded) {
          try {
            fs.unlinkSync(dest)
          } catch {
            fs.rmSync(dest, { force: true })
          }

          /** @type {'symlink' | 'copy'} */
          let method = 'symlink'
          /** @type {'create' | 'adopt' | 'replace' | 'mirror' | 'skip'} */
          let action = 'replace'
          let symlinkSuccess = false
          try {
            const symlinkType = process.platform === 'win32' ? 'junction' : 'dir'
            fs.symlinkSync(src, dest, symlinkType)
            symlinkSuccess = true
          } catch {
            symlinkSuccess = false
          }

          if (!symlinkSuccess) {
            mirrorDir(src, dest, isProjectableName)
            method = /** @type {'symlink' | 'copy'} */ ('copy')
          }
          recordState(method)
          projections.push({ agent: target.agent, targetDir: target.dir, skill, method, action })
        } else {
          projections.push({
            agent: target.agent,
            targetDir: target.dir,
            skill,
            method: 'symlink',
            action: 'skip',
          })
        }
      } else if (classification === 'dir') {
        if (recorded && recorded.method === 'copy') {
          mirrorDir(src, dest, isProjectableName)
          recordState('copy')
          projections.push({
            agent: target.agent,
            targetDir: target.dir,
            skill,
            method: 'copy',
            action: 'mirror',
          })
        } else if (!recorded) {
          const srcHash = hashTree(src, isProjectableName)
          const destHash = hashTree(dest, isProjectableName)
          if (srcHash && destHash && srcHash === destHash) {
            recordState('copy')
            projections.push({
              agent: target.agent,
              targetDir: target.dir,
              skill,
              method: 'copy',
              action: 'adopt',
            })
          } else {
            projections.push({
              agent: target.agent,
              targetDir: target.dir,
              skill,
              method: 'copy',
              action: 'skip',
            })
          }
        } else {
          projections.push({
            agent: target.agent,
            targetDir: target.dir,
            skill,
            method: 'copy',
            action: 'skip',
          })
        }
      }
    }
  }

  if (!silent && projections.length > 0) {
    console.log(`\nProjected skills to agent directories:`)
    const grouped = {}
    for (const p of projections) {
      if (!grouped[p.agent]) grouped[p.agent] = []
      grouped[p.agent].push(p)
    }
    for (const [agent, list] of Object.entries(grouped)) {
      const active = list.filter((p) => p.action !== 'skip')
      const symlinks = active.filter((p) => p.method === 'symlink').length
      const copies = active.filter((p) => p.method === 'copy').length
      const skipped = list.filter((p) => p.action === 'skip').length

      const parts = []
      if (symlinks > 0) parts.push(`${symlinks} symlink`)
      if (copies > 0) parts.push(`${copies} copy`)

      if (active.length > 0) {
        console.log(`  ✓ ${agent}: ${active.length} skill(s) synchronized (${parts.join(', ')})`)
      }
      if (skipped > 0) {
        console.log(`  ⚠️ ${agent}: ${skipped} unmanaged skill(s) skipped`)
      }
    }
  }

  return projections
}

module.exports = {
  get MANIFEST_URL() {
    return getManifestUrl()
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
  statusRef,
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
  assertBlueprintCompatibility,
  getEngineVersion,
  installEmbeddedSkills,
  ensureSkillNodeModules,
  recordCliDeliveredSkills,
  readDependsOn,
  validateDependsOn,
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
  untrackedInstalledBlueprints,
  unmatchedCatalogStatus,
  blueprintInstallCommand,
  DEFAULT_BLUEPRINT_REPO,
  DEFAULT_CATALOG_PATH,
  cmdUpdate,
  cmdSync,
  cmdBootstrap,
  RETIRED_SKILL_REPOS,
  RETIRED_REPO_NOTICE,
  isRetiredPin,
  withRetiredHint,
}
