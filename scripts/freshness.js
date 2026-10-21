#!/usr/bin/env node
/**
 * scripts/freshness.js
 *
 * Computes per-subsystem channel drift ("how far has `main` moved past the
 * newest release tag for each subsystem?") using only local git, and publishes it
 * as `docs/use/freshness.json` through the existing Pages/build-docs pipeline.
 *
 * The baseline for each subsystem is its newest monorepo `<key>-v*` tag
 * in local git.
 *
 * Zero dependencies, local git only, no `api.github.com` call.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { saveJsonAtomic } = require('./lib/atomic-fs.js');

const SUBSYSTEM_PATHS = {
  skills: ['skills/'],
  blueprints: ['iNNfo/specs/bluepriNNts/'],
  templates: ['iNNfo/specs/bluepriNNts/'],
  'innfo-mcp': ['iNNfo/packages/nn-mcp/'],
  'innfo-console': ['iNNfo/specs/bluepriNNts/console/', 'scripts/export-console.mjs', 'scripts/console-views.mjs'],
};

function parseSemver(v) {
  const parts = String(v || '').replace(/^v/, '').split('.').map(Number);
  return parts.length === 3 && parts.every((n) => !isNaN(n)) ? parts : null;
}

function compareSemver(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  if (!p1 || !p2) return String(v1).localeCompare(String(v2));
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

function findNewestTag(key, runGit) {
  const patterns = key === 'blueprints' || key === 'templates'
    ? ['blueprints-v*', 'templates-v*']
    : [`${key}-v*`];

  const allTags = [];
  for (const pat of patterns) {
    try {
      const out = runGit(['tag', '-l', pat]);
      if (out) {
        const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
        allTags.push(...lines);
      }
    } catch {
      // ignore
    }
  }

  const valid = [];
  for (const tag of allTags) {
    const m = tag.match(/^(?:skills|blueprints|templates|innfo-mcp|innfo-console)-v(\d+\.\d+\.\d+)$/);
    if (m) {
      valid.push({ tag, version: m[1] });
    }
  }

  if (valid.length === 0) return null;
  valid.sort((a, b) => compareSemver(a.version, b.version));
  return valid[valid.length - 1].tag;
}

function computeFreshness({ runGit, head }) {
  const subsystems = {};
  for (const key of Object.keys(SUBSYSTEM_PATHS)) {
    const paths = SUBSYSTEM_PATHS[key];
    const tag = findNewestTag(key, runGit);

    if (!tag) {
      subsystems[key] = {
        subsystem: key,
        pinnedTag: null,
        commitsSincePin: null,
        unresolved: 'no tag found for this subsystem in local git',
      };
      continue;
    }

    try {
      runGit(['rev-parse', `${tag}^{commit}`]);
    } catch (_err) {
      subsystems[key] = {
        subsystem: key,
        pinnedTag: tag,
        commitsSincePin: null,
        unresolved: 'pinned tag does not resolve in this checkout',
      };
      continue;
    }

    try {
      const pinnedTagDate = runGit(['log', '-1', '--format=%cI', tag]).trim();
      const countOut = runGit(['rev-list', '--count', `${tag}..${head}`, '--', ...paths]).trim();
      const filesOut = runGit(['diff', '--name-only', `${tag}..${head}`, '--', ...paths]).trim();
      subsystems[key] = {
        subsystem: key,
        pinnedTag: tag,
        pinnedTagDate,
        commitsSincePin: Number.parseInt(countOut, 10),
        filesTouched: filesOut === '' ? [] : filesOut.split('\n').filter(Boolean),
      };
    } catch (err) {
      subsystems[key] = {
        subsystem: key,
        pinnedTag: tag,
        commitsSincePin: null,
        unresolved: `git command failed: ${err.message}`,
      };
    }
  }

  return subsystems;
}

function realRunGit(repoRoot) {
  return (args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf-8' });
}

function main() {
  const repoRoot = path.join(__dirname, '..');
  const runGit = realRunGit(repoRoot);
  const head = runGit(['rev-parse', 'HEAD']).trim();

  const subsystems = computeFreshness({ runGit, head });
  const output = {
    generatedAt: new Date().toISOString(),
    head,
    subsystems,
  };

  const outPath = path.join(repoRoot, 'docs', 'use', 'freshness.json');
  try {
    saveJsonAtomic(outPath, output);
  } catch (err) {
    console.error(`FAIL: could not write docs/use/freshness.json: ${err.code || err.message}`);
    process.exit(1);
  }
  console.log(`freshness.json written: ${outPath}`);
}

module.exports = { computeFreshness, SUBSYSTEM_PATHS, findNewestTag };

if (require.main === module) {
  main();
}
