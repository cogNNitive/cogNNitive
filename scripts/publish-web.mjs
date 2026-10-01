#!/usr/bin/env node

/**
 * scripts/publish-web.mjs
 *
 * One-way publish from the private monorepo to the public distribution repo
 * `cogNNitive-web`, part of OpenSpec change `2026-09-30-public-web-repository-split`.
 *
 * Usage:
 *   node scripts/publish-web.mjs [--dry-run]
 *
 * Exit: 0 on success or no-op; 1 on a real failure.
 */

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runPublish } = require('./lib/publish-web.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const docsRoot = process.env.INNFO_DOCS_OUT
  ? resolve(process.env.INNFO_DOCS_OUT)
  : join(repoRoot, 'docs');
const targetRepo = process.env.WEB_PUBLISH_REPO || 'cogNNitive/cogNNitive-web';
const subdir = (process.env.WEB_PUBLISH_SUBDIR || 'docs').replace(/^\/+|\/+$/g, '');
const skipDistribution = process.env.WEB_PUBLISH_SKIP_DISTRIBUTION === '1';
const token = process.env.WEB_PUBLISH_TOKEN;

async function main() {
  try {
    await runPublish({
      repoRoot,
      docsRoot,
      targetRepo,
      subdir,
      skipDistribution,
      token,
      dryRun: DRY_RUN,
    });
  } catch (err) {
    console.error(`publish-web: ${err.message}`);
    process.exitCode = 1;
  }
}

main();
