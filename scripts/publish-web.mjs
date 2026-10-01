#!/usr/bin/env node

/**
 * scripts/publish-web.mjs
 *
 * One-way publish from the private monorepo to the public distribution repo
 * `cogNNitive-web`, part of OpenSpec change `2026-09-30-public-web-repository-split`.
 *
 * The public repo is the canonical host for two surfaces, both generated/copied
 * from the private monorepo (the single source of truth):
 *
 *   1. the built website → `<repo>/docs/` (Pages serves `main:<WEB_PUBLISH_SUBDIR>`),
 *   2. the distribution surface the manifest pins against → copied verbatim so
 *      every `repo: cogNNitive/cogNNitive-web` pin resolves at the release
 *      commit: `skills/**`, `iNNfo/specs/**`, the MCP bundle and
 *      `scripts/export-console.mjs`.
 *
 * Contract:
 *   - Idempotent: a byte-identical artifact is a no-op (no empty commit).
 *   - Append-only: commits on top of the public repo's history so SHA-pinned
 *     manifest URLs stay valid.
 *   - Generated-output-only: refuses to publish if the distribution surface ever
 *     carries private source (src/, node_modules/, package.json, .env, ...).
 *
 * Env:
 *   INNFO_DOCS_OUT       built site root (default `<repo>/docs`)
 *   WEB_PUBLISH_REPO     target repo slug (default `cogNNitive/cogNNitive-web`)
 *   WEB_PUBLISH_TOKEN    token with Contents:write on the target repo (required)
 *   WEB_PUBLISH_SUBDIR   site path inside the public repo (default `docs`)
 *   WEB_PUBLISH_SKIP_DISTRIBUTION  set to `1` to publish only the site
 *
 * Usage:
 *   node scripts/publish-web.mjs [--dry-run]
 *
 * Exit: 0 on success or no-op; 1 on a real failure.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { diffTrees } = require('./lib/publish-diff.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const docsRoot = process.env.INNFO_DOCS_OUT
  ? resolve(process.env.INNFO_DOCS_OUT)
  : join(repoRoot, 'docs');
const targetRepo = process.env.WEB_PUBLISH_REPO || 'cogNNitive/cogNNitive-web';
const subdir = (process.env.WEB_PUBLISH_SUBDIR || 'docs').replace(/^\/+|\/+$/g, '');
const skipDistribution = process.env.WEB_PUBLISH_SKIP_DISTRIBUTION === '1';

// Paths copied verbatim into the public repo so the manifest's
// `repo: cogNNitive/cogNNitive-web` pins resolve. Only distribution artifacts:
// no editor/core/video source, no node_modules.
const DISTRIBUTION_PATHS = [
  'skills',
  'iNNfo/specs',
  'iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js',
  'scripts/export-console.mjs',
];

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// Source trees that must NEVER reach the public repo.
const FORBIDDEN_SOURCE = [
  'src',
  'packages',
  'apps',
  'node_modules',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  '.env',
];

function assertNoSource(target) {
  const offenders = [];
  const walk = (abs, rel) => {
    if (!statSync(abs).isDirectory()) return;
    for (const name of readdirSync(abs)) {
      const full = join(abs, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const isDir = statSync(full).isDirectory();
      if (!rel && FORBIDDEN_SOURCE.includes(name)) {
        offenders.push(isDir ? `${relPath}/` : relPath);
        continue;
      }
      if (isDir) walk(full, relPath);
    }
  };
  walk(target, '');
  if (offenders.length > 0) {
    console.error(
      `publish-web: refusing to publish — the artifact carries source-like paths that must never be public: ${offenders.join(', ')}`,
    );
    process.exit(1);
  }
}

/** Copies one distribution path into the clone, guarding against source leaks. */
function copyDistributionPath(rel, work) {
  const from = join(repoRoot, rel);
  if (!existsSync(from)) {
    console.warn(`publish-web: distribution path missing, skipping: ${rel}`);
    return;
  }
  assertNoSource(from);
  const to = join(work, rel);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

function main() {
  if (!existsSync(docsRoot)) {
    console.error(`publish-web: built docs not found at ${docsRoot} — run \`npm run build:docs\` first.`);
    process.exit(1);
  }

  const token = process.env.WEB_PUBLISH_TOKEN;
  if (!token && !DRY_RUN) {
    console.error('publish-web: WEB_PUBLISH_TOKEN is required (Contents: write on the target repo).');
    process.exit(1);
  }

  // Generated-output-only guarantee: never publish private source.
  assertNoSource(docsRoot);

  const work = mkdtempSync(join(tmpdir(), 'publish-web-'));
  try {
    const cloneUrl = token
      ? `https://x-access-token:${token}@github.com/${targetRepo}.git`
      : `https://github.com/${targetRepo}.git`;

    console.log(`publish-web: cloning ${targetRepo}...`);
    git(['clone', '--depth', '1', cloneUrl, work], repoRoot);

    // ── 1. Site: diff the built tree against the Pages subtree ──
    const targetTree = join(work, subdir);
    const siteDiff = diffTrees(docsRoot, existsSync(targetTree) ? targetTree : join(work, '__absent__'));
    if (siteDiff.identical) {
      console.log('publish-web: site artifact is byte-identical.');
    } else {
      console.log(
        `publish-web: site → ${siteDiff.added.length} added, ${siteDiff.modified.length} modified, ${siteDiff.removed.length} removed.`,
      );
      rmSync(targetTree, { recursive: true, force: true });
      cpSync(docsRoot, targetTree, { recursive: true });
    }

    // ── 2. Distribution surface: copy verbatim (manifest pins) ──
    if (!skipDistribution) {
      for (const rel of DISTRIBUTION_PATHS) copyDistributionPath(rel, work);
      console.log(`publish-web: staged ${DISTRIBUTION_PATHS.length} distribution path(s).`);
    }

    if (DRY_RUN) {
      console.log('publish-web: DRY RUN — no commit/push performed.');
      return;
    }

    git(['config', 'user.name', 'cogNNitive publish bot'], work);
    git(['config', 'user.email', 'publish@cognnitive.com'], work);
    const addPaths = skipDistribution ? [subdir] : [subdir, ...DISTRIBUTION_PATHS];
    git(['add', '--', ...addPaths], work);

    const staged = git(['diff', '--cached', '--name-only'], work);
    if (!staged) {
      console.log('publish-web: nothing staged — no-op (no empty commit).');
      return;
    }

    const stamp = new Date().toISOString();
    git(['commit', '-m', `chore: publish from cogNNitive@${process.env.GITHUB_SHA || 'local'} (${stamp})`], work);
    git(['push', 'origin', 'HEAD:main'], work);
    console.log('publish-web: pushed to', targetRepo);
    console.log(relative(repoRoot, work));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main();
