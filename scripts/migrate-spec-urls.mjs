#!/usr/bin/env node

/**
 * scripts/migrate-spec-urls.mjs
 *
 * Codemod: Migrates canonical spec hosting URLs from the archived cogNNitive/iNNfo
 * repository to the active cogNNitive/cogNNitive monorepo.
 *
 * Enforces LF line endings on all modified files.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

const INCLUDED_EXTENSIONS = new Set([
  '.md',
  '.ts',
  '.vue',
  '.js',
  '.mjs',
  '.html',
  '.json',
  '.yaml',
  '.yml',
]);

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'archive',
  'dist',
  'temp',
  '.claude',
]);

const EXACT_EXCLUDED_PATHS = new Set([
  'manifest/source.yaml',
  'docs/use/manifest.md',
  'docs/use/manifest-next.md',
  'scripts/manifest/validate-manifest.test.js',
  'scripts/manifest/generate-manifest.test.js',
  'actioNN/scripts/skills-manager.test.js',
]);

function shouldSkip(relPath, isDir) {
  const normalized = relPath.replace(/\\/g, '/');
  const segments = normalized.split('/');

  for (const seg of segments) {
    if (EXCLUDED_DIRS.has(seg)) return true;
  }

  if (normalized.startsWith('openspec/changes/migrate-spec-hosting-to-monorepo')) return true;
  if (normalized.startsWith('iNNfo/apps/innfo-editor/tests/fixtures/models')) return true;
  if (normalized.startsWith('docs/innfo/app/assets')) return true;
  if (normalized.startsWith('docs/innfo/cdn')) return true;
  if (normalized.startsWith('manifest/')) return true;

  if (!isDir) {
    if (EXACT_EXCLUDED_PATHS.has(normalized)) return true;
    if (normalized.endsWith('.bundle.js')) return true;
  }

  return false;
}

function collectFiles(dir) {
  const files = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(REPO_ROOT, fullPath);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!shouldSkip(relPath, true)) {
        files.push(...collectFiles(fullPath));
      }
    } else {
      if (!shouldSkip(relPath, false)) {
        const ext = extname(entry);
        if (INCLUDED_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  return files;
}

const RAW_URL_RE =
  /https:\/\/raw\.githubusercontent\.com\/cogNNitive\/iNNfo\/(?:main|v[\d.]+)\/(specs\/[^\s"')\]]+)/g;

const BLOB_URL_RE =
  /https:\/\/github\.com\/cogNNitive\/iNNfo\/blob\/main\/([^\s"')\]]+)/g;

const BARE_SPEC_RAW_RE =
  /https:\/\/raw\.githubusercontent\.com\/cogNNitive\/iNNfo\/(?:main|v[\d.]+)\/([a-zA-Z0-9_-]+_V_\d+-\d+-\d+[^\s"')\]]*_NN\.md)/g;

function migrateContent(content, relPath) {
  let count = 0;
  let updated = content;

  // 1. Raw specs URLs
  updated = updated.replace(RAW_URL_RE, (_match, specPath) => {
    count++;
    return `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/${specPath}`;
  });

  // 2. GitHub blob URLs
  updated = updated.replace(BLOB_URL_RE, (_match, specPath) => {
    count++;
    return `https://github.com/cogNNitive/cogNNitive/blob/main/iNNfo/${specPath}`;
  });

  // 3. Bare spec names if any
  updated = updated.replace(BARE_SPEC_RAW_RE, (_match, filename) => {
    count++;
    return `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/${filename}`;
  });

  // 4. Special prose cases
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized === 'actioNN/AGENTS.md') {
    const target = 'The **canonical** file always lives in `cogNNitive/iNNfo` under `specs/templates/`.';
    if (updated.includes(target)) {
      updated = updated.replace(
        target,
        'The **canonical** file always lives in `cogNNitive/cogNNitive` under `iNNfo/specs/templates/`.'
      );
      count++;
    }
  }

  if (normalized === 'iNNfo/CONTRIBUTING.md') {
    const target = 'falla si alguna URL `raw.githubusercontent.com/cogNNitive/iNNfo/...` hardcodeada';
    if (updated.includes(target)) {
      updated = updated.replace(
        target,
        'falla si alguna URL `raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/...` hardcodeada o si queda alguna referencia a `cogNNitive/iNNfo`.'
      );
      count++;
    }
  }

  return { updated, count };
}

function run() {
  console.log(`[codemod] Scanning repo starting at ${REPO_ROOT}...`);
  const files = collectFiles(REPO_ROOT);
  console.log(`[codemod] Collected ${files.length} files matching extension & exclusion filters.`);

  let modifiedCount = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const relPath = relative(REPO_ROOT, file);
    const content = readFileSync(file, 'utf8');
    const { updated, count } = migrateContent(content, relPath);

    if (count > 0) {
      modifiedCount++;
      totalReplacements += count;
      console.log(`  [MIGRATE] (${count} replacements) ${relPath}`);

      if (!DRY_RUN) {
        // Enforce LF line endings
        const lfContent = updated.replace(/\r\n/g, '\n');
        writeFileSync(file, lfContent, 'utf8');
      }
    }
  }

  console.log(
    `\n[codemod] Complete: ${modifiedCount} files modified, ${totalReplacements} total replacements.${
      DRY_RUN ? ' (DRY RUN - no files written)' : ''
    }`
  );
}

run();
