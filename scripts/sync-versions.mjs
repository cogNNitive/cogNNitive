#!/usr/bin/env node

/**
 * scripts/sync-versions.mjs
 *
 * Single Source of Truth synchronization and drift validation for:
 *   - MCP package version (nn-mcp/package.json -> nn-core, dep range)
 *
 * (source.yaml synchronization is removed under tag-driven release AD-6).
 *
 * Usage:
 *   node scripts/sync-versions.mjs          # writes all generated targets
 *   node scripts/sync-versions.mjs --check  # verifies zero drift (exit 1 on drift)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const DEFAULT_BLUEPRINTS_DIR = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts');
const DEFAULT_SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const DEFAULT_MCP_PKG_PATH = path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-mcp', 'package.json');
const DEFAULT_CORE_PKG_PATH = path.join(REPO_ROOT, 'iNNfo', 'packages', 'nn-core', 'package.json');

const FRONTMATTER_VERSION_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const BLUEPRINT_VERSION_RE = /^blueprint_version:\s*"?([^"\r\n]+?)"?\s*$/m;
const SKILL_VERSION_RE = /^version:\s*"?([^"\r\n]+?)"?\s*$/m;

/**
 * Reads a version field from a file's YAML frontmatter.
 * Returns undefined if no parseable frontmatter or matching field.
 */
function readFrontmatterVersion(filePath, fieldRe) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(FRONTMATTER_VERSION_RE);
  if (!fmMatch) return undefined;
  const versionMatch = fmMatch[1].match(fieldRe);
  return versionMatch ? versionMatch[1].trim() : undefined;
}

/** Reads `blueprint_version` -- the blueprint's OWN version. */
function readBlueprintVersion(filePath) {
  return readFrontmatterVersion(filePath, BLUEPRINT_VERSION_RE);
}

/**
 * Walks `blueprintsDir` for `<slug>/spec_NN.md` files plus the root
 * `workspace_spec_NN.md`, returning a map of slug -> blueprint_version.
 * @param {string} blueprintsDir
 * @param {(filePath: string) => string | undefined} read
 * @returns {Record<string, string>}
 */
function collectVersions(blueprintsDir, read) {
  /** @type {Record<string, string>} */
  const versions = {};
  if (!fs.existsSync(blueprintsDir)) return versions;

  const workspaceSpecPath = path.join(blueprintsDir, 'workspace_spec_NN.md');
  if (fs.existsSync(workspaceSpecPath)) {
    const v = read(workspaceSpecPath);
    if (v) versions.workspace = v;
  }

  const entries = fs.readdirSync(blueprintsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(blueprintsDir, entry.name, 'spec_NN.md');
    if (!fs.existsSync(specPath)) continue;
    const v = read(specPath);
    if (v) versions[entry.name] = v;
  }

  return versions;
}

export function collectBlueprintVersions(blueprintsDir = DEFAULT_BLUEPRINTS_DIR) {
  return collectVersions(blueprintsDir, readBlueprintVersion);
}

/**
 * Collects frontmatter `version` from each `SKILL.md` under `skillsDir`.
 * @param {string} [skillsDir]
 * @returns {Record<string, string>} map of skillName -> version.
 */
export function collectSkillVersions(skillsDir = DEFAULT_SKILLS_DIR) {
  /** @type {Record<string, string>} */
  const versions = {};
  if (!fs.existsSync(skillsDir)) return versions;

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const v = readFrontmatterVersion(skillPath, SKILL_VERSION_RE);
    if (!v) {
      throw new Error(`SKILL.md in ${skillPath} has no parseable frontmatter version`);
    }
    versions[entry.name] = v;
  }

  return versions;
}

export function readMcpPackageVersion(mcpPkgPath = DEFAULT_MCP_PKG_PATH) {
  if (!fs.existsSync(mcpPkgPath)) return undefined;
  const content = fs.readFileSync(mcpPkgPath, 'utf8');
  const pkg = JSON.parse(content);
  return pkg.version ? String(pkg.version).trim() : undefined;
}

function syncCorePkg({ mcpVersion, corePkgPath, check }) {
  if (!fs.existsSync(corePkgPath)) {
    return { ok: false, error: `Missing core package.json: ${corePkgPath}` };
  }
  const content = fs.readFileSync(corePkgPath, 'utf8');
  let currentVersion;
  try {
    const pkg = JSON.parse(content);
    currentVersion = pkg.version;
  } catch (err) {
    return { ok: false, error: `Failed to parse ${corePkgPath}: ${err.message}` };
  }

  const updated = content.replace(
    /^(\s*"version":\s*)"[^"]*"(,?)$/m,
    `$1"${mcpVersion}"$2`,
  );

  if (check) {
    if (currentVersion !== mcpVersion || updated !== content) {
      return { ok: false, drift: { expected: mcpVersion, actual: currentVersion } };
    }
    return { ok: true };
  }

  if (updated !== content) {
    fs.writeFileSync(corePkgPath, updated, 'utf8');
  }
  return { ok: true, changed: updated !== content };
}

function syncMcpDepRange({ mcpVersion, mcpPkgPath, check }) {
  if (!fs.existsSync(mcpPkgPath)) {
    return { ok: false, error: `Missing mcp package.json: ${mcpPkgPath}` };
  }
  const content = fs.readFileSync(mcpPkgPath, 'utf8');
  let currentDep;
  try {
    const pkg = JSON.parse(content);
    currentDep = pkg.dependencies && pkg.dependencies['@cognnitive/nn-core'];
  } catch (err) {
    return { ok: false, error: `Failed to parse ${mcpPkgPath}: ${err.message}` };
  }

  const expectedDep = `^${mcpVersion}`;
  const updated = content.replace(
    /^(\s*"@cognnitive\/nn-core":\s*)"[^"]*"(,?)$/m,
    `$1"${expectedDep}"$2`,
  );

  if (check) {
    if (currentDep !== expectedDep || updated !== content) {
      return { ok: false, drift: { expected: expectedDep, actual: currentDep } };
    }
    return { ok: true };
  }

  if (updated !== content) {
    fs.writeFileSync(mcpPkgPath, updated, 'utf8');
  }
  return { ok: true, changed: updated !== content };
}

export function syncVersions({
  check = false,
  blueprintsDir = DEFAULT_BLUEPRINTS_DIR,
  skillsDir = DEFAULT_SKILLS_DIR,
  mcpPkgPath = DEFAULT_MCP_PKG_PATH,
  corePkgPath = DEFAULT_CORE_PKG_PATH,
} = {}) {
  const versions = collectBlueprintVersions(blueprintsDir);
  /** @type {Record<string, string>} */
  let skillVersions = {};
  const errors = [];

  try {
    skillVersions = collectSkillVersions(skillsDir);
  } catch (err) {
    errors.push(err.message);
  }

  const mcpVersion = readMcpPackageVersion(mcpPkgPath);
  if (mcpVersion) {
    skillVersions['nn-mcp'] = mcpVersion;
  }

  if (mcpVersion && fs.existsSync(corePkgPath)) {
    const coreResult = syncCorePkg({ mcpVersion, corePkgPath, check });
    if (!coreResult.ok) {
      if (coreResult.drift) {
        errors.push(
          `nn-core package.json version drift in ${corePkgPath}: ` +
          `expected "${coreResult.drift.expected}" (from nn-mcp), found "${coreResult.drift.actual}". ` +
          `Run \`npm run sync:versions\` to fix it.`
        );
      } else {
        errors.push(coreResult.error);
      }
    }
  }

  if (mcpVersion && fs.existsSync(mcpPkgPath)) {
    const depResult = syncMcpDepRange({ mcpVersion, mcpPkgPath, check });
    if (!depResult.ok) {
      if (depResult.drift) {
        errors.push(
          `nn-mcp dependency @cognnitive/nn-core drift in ${mcpPkgPath}: ` +
          `expected "${depResult.drift.expected}", found "${depResult.drift.actual}". ` +
          `Run \`npm run sync:versions\` to fix it.`
        );
      } else {
        errors.push(depResult.error);
      }
    }
  }

  return { ok: errors.length === 0, errors, versions, skillVersions };
}

// Direct CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const isCheck = process.argv.includes('--check');

  if (isCheck) {
    console.log('🔍 Checking version parity (specs & mcp <-> packages)...');
    const res = syncVersions({ check: true });
    if (!res.ok) {
      console.error('❌ Version drift detected:');
      for (const err of res.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log('✅ All versions are in sync.');
  } else {
    console.log('📦 Syncing versions from mcp into packages...');
    const res = syncVersions({ check: false });
    if (!res.ok) {
      console.error('❌ Failed to sync versions:');
      for (const err of res.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log('🎉 Successfully synchronized all versions.');
  }
}
