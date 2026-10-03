#!/usr/bin/env node

/**
 * scripts/manifest/validate-manifest.js
 *
 * Orchestrator CLI for validating bootstrap manifests against source repositories
 * over the GitHub API. Delegates parsing, networking, and validation rules to modular libraries.
 *
 * Usage:
 *   node scripts/manifest/validate-manifest.js [repo-root] [--channel <stable|preview>] [--manifest <path|url>]
 *
 * Zero dependencies. Requires Node >= 18.
 */

const fs = require('fs');
const path = require('path');
const { parseFocusedYaml, parseFrontmatter, parseManifest } = require('../lib/yaml-parser.js');
const { apiRequest, fetchString, authHeaders, rateLimited, resolveRef } = require('../lib/github-client.js');
const {
  COMMIT_RE, TAG_SHAPE_RE, CHANNELS, tagShapeViolation, refKindViolation,
  checkReleaseProvenance, checkRefResolvesInDeclaredRepo, checkReleaseAndRefPolicy,
  structuralViolations, checkCommitExists, checkPathAtCommit, checkVersionParity,
  checkMcpUrlPinned, validateMcp, validateConsoleAsset, validateSkill,
  validateBlueprint, checkClosureViolations, validateManifest,
} = require('./lib/manifest-rules.js');

/**
 * Parses CLI command line arguments.
 * @param {string[]} argv
 * @returns {{ repoRoot: string | null, channel: string | null, manifest: string | null }}
 */
function parseArgs(argv) {
  let repoRoot = null;
  let channel = null;
  let manifest = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--channel') channel = argv[++i];
    else if (arg.startsWith('--channel=')) channel = arg.slice(10);
    else if (arg === '--manifest') manifest = argv[++i];
    else if (arg.startsWith('--manifest=')) manifest = arg.slice(11);
    else if (!arg.startsWith('--') && repoRoot === null) repoRoot = arg;
  }
  return { repoRoot, channel, manifest };
}

/**
 * Validates a single manifest text content against channel policy.
 * @param {string} manifestText
 * @param {string} [channelName='stable']
 * @returns {Promise<{
 *   ok: boolean,
 *   violations: string[],
 *   stats: { skillsCount: number, blueprintsCount: number, mcpCount: number, consoleCount: number }
 * }>}
 */
async function validateManifestText(manifestText, channelName = 'stable') {
  const policy = CHANNELS[channelName] || CHANNELS.stable;
  let manifestData;
  try {
    manifestData = parseManifest(manifestText);
  } catch (err) {
    return {
      ok: false,
      violations: [`could not parse manifest: ${err.message}`],
      stats: { skillsCount: 0, blueprintsCount: 0, mcpCount: 0, consoleCount: 0 },
    };
  }
  const { violations, stats } = await validateManifest(manifestData, policy);
  return { ok: violations.length === 0, violations, stats };
}

/**
 * Validates a manifest from a file path or URL.
 * @param {string} manifestSource
 * @param {string} [channelName]
 * @returns {Promise<boolean>}
 */
async function validateManifestSource(manifestSource, channelName) {
  const isUrl = /^https?:\/\//i.test(manifestSource);
  let text;
  try {
    text = isUrl ? await fetchString(manifestSource) : fs.readFileSync(path.resolve(manifestSource), 'utf-8');
  } catch (err) {
    console.error(`FAIL: could not load manifest from ${manifestSource}: ${err.message}`);
    return false;
  }

  const { ok, violations, stats } = await validateManifestText(text, channelName);
  if (!ok) {
    for (const v of violations) console.error(`FAIL: ${v}`);
    return false;
  }
  console.log(`OK: manifest from ${manifestSource} (${stats.skillsCount} skills, ${stats.blueprintsCount} blueprints, ${stats.mcpCount} mcp bundles, ${stats.consoleCount} console assets) validated`);
  return true;
}

/**
 * Validates an entire channel manifest file against policy rules and closures.
 * @param {string} repoRoot
 * @param {string} channelName
 * @returns {Promise<boolean>}
 */
async function validateChannel(repoRoot, channelName) {
  const policy = CHANNELS[channelName];
  const manifestFile = path.join(repoRoot, ...policy.file.split('/'));
  const prefix = `[${channelName}]`;
  if (!fs.existsSync(manifestFile)) {
    console.error(`FAIL: ${prefix} manifest not found at ${manifestFile}`);
    return false;
  }
  let manifestData;
  try {
    manifestData = parseManifest(fs.readFileSync(manifestFile, 'utf-8'));
  } catch (err) {
    console.error(`FAIL: ${prefix} could not parse manifest: ${err.message}`);
    return false;
  }
  const { violations, stats } = await validateManifest(manifestData, policy);
  if (violations.length > 0) {
    for (const v of violations) console.error(`FAIL: ${prefix} ${v}`);
    console.error(`\nFAIL: ${prefix} ${violations.length} violation(s) in manifest (${stats.skillsCount} skills, ${stats.blueprintsCount} blueprints, ${stats.mcpCount} mcp bundles, ${stats.consoleCount} console assets)`);
    return false;
  }
  console.log(`OK: ${prefix} ${stats.skillsCount} skills, ${stats.blueprintsCount} blueprints, ${stats.mcpCount} mcp bundles, and ${stats.consoleCount} console assets validated`);
  return true;
}

/**
 * Main execution entry point for manifest validator.
 * @returns {Promise<void>}
 */
async function main() {
  const { repoRoot: repoRootArg, channel: channelArg, manifest: manifestArg } = parseArgs(process.argv.slice(2));
  if (manifestArg) {
    const ok = await validateManifestSource(manifestArg, channelArg);
    if (!ok) process.exit(1);
    return;
  }
  const repoRoot = repoRootArg ? path.resolve(repoRootArg) : process.cwd();
  if (channelArg && !CHANNELS[channelArg]) {
    console.error(`FAIL: unknown channel '${channelArg}' (expected 'stable' or 'preview')`);
    process.exit(1);
  }
  const channelsToRun = channelArg
    ? [channelArg]
    : Object.keys(CHANNELS).filter((name) => fs.existsSync(path.join(repoRoot, ...CHANNELS[name].file.split('/'))));
  if (channelsToRun.length === 0) {
    const expected = Object.values(CHANNELS).map((c) => c.file).join(', ');
    console.error(`FAIL: no channel manifest found under ${repoRoot} (looked for ${expected})`);
    process.exit(1);
  }
  let allOk = true;
  for (const name of channelsToRun) {
    const ok = await validateChannel(repoRoot, name);
    allOk = allOk && ok;
  }
  if (!allOk) process.exit(1);
}

module.exports = {
  apiRequest, fetchString, authHeaders, rateLimited, resolveRef,
  parseFocusedYaml, parseFrontmatter, parseManifest,
  COMMIT_RE, TAG_SHAPE_RE, CHANNELS, tagShapeViolation, refKindViolation,
  checkReleaseProvenance, checkRefResolvesInDeclaredRepo, checkReleaseAndRefPolicy,
  structuralViolations, checkCommitExists, checkPathAtCommit, checkVersionParity,
  checkMcpUrlPinned, validateMcp, validateConsoleAsset, validateSkill,
  validateBlueprint, checkClosureViolations, validateManifest,
  validateChannel, validateManifestText, validateManifestSource, parseArgs, main,
};

if (require.main === module) main();
