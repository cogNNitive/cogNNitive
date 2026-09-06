#!/usr/bin/env node

/**
 * skills/nn-upgrade/scripts/backup-workspace.js
 *
 * Timestamped, out-of-workspace backup of the files a template migration
 * touches: models/, specs/, sources/nn/, procedures/, index.md.
 *
 * The target is always created OUTSIDE the workspace (sibling of the workspace
 * parent, or an explicit --target) so a migration cannot pollute the tree it is
 * about to modify.
 *
 * Usage:
 *   node backup-workspace.js --workspace-dir <dir> [--target <dir>] [--dry-run] [--json]
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const BACKUP_DIRS = ['models', 'specs', 'sources/nn', 'procedures'];
const BACKUP_FILE = 'index.md';
const SKIP_DIRS = new Set(['.git', '.staging', 'backups', 'archive', 'node_modules', 'dist']);

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function isInside(child, parent) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function defaultTarget(workspaceDir) {
  const parent = path.dirname(path.resolve(workspaceDir));
  const name = path.basename(path.resolve(workspaceDir));
  return path.join(parent, `${name}-backup-${stamp()}`);
}

function copyFilter(src) {
  const name = path.basename(src);
  if (name.startsWith('.') || SKIP_DIRS.has(name)) return false;
  return true;
}

/**
 * Backup a workspace's migration-relevant files to a timestamped out-of-workspace dir.
 * Returns a manifest { target, dirs, files, missing }.
 */
function backupWorkspace(workspaceDir, options = {}) {
  const dryRun = options.dryRun || false;
  const ws = path.resolve(workspaceDir);
  if (!fs.existsSync(ws) || !fs.statSync(ws).isDirectory()) {
    throw new Error(`workspace not found: ${ws}`);
  }
  const target = options.target ? path.resolve(options.target) : defaultTarget(ws);
  if (isInside(target, ws)) {
    throw new Error(`backup target must be outside the workspace: ${target}`);
  }

  const manifest = { target, dirs: [], files: [], missing: [] };

  if (!dryRun) fs.mkdirSync(target, { recursive: true });

  for (const rel of BACKUP_DIRS) {
    const src = path.join(ws, rel);
    if (!fs.existsSync(src)) {
      manifest.missing.push(rel);
      continue;
    }
    if (!dryRun) fs.cpSync(src, path.join(target, rel), { recursive: true, filter: copyFilter });
    manifest.dirs.push(rel);
  }

  const indexSrc = path.join(ws, BACKUP_FILE);
  if (fs.existsSync(indexSrc)) {
    if (!dryRun) fs.copyFileSync(indexSrc, path.join(target, BACKUP_FILE));
    manifest.files.push(BACKUP_FILE);
  } else {
    manifest.missing.push(BACKUP_FILE);
  }

  return manifest;
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function main() {
  const isJson = process.argv.includes('--json');
  const dryRun = process.argv.includes('--dry-run');
  const workspaceDir = getArg('--workspace-dir');
  const target = getArg('--target');

  if (!workspaceDir) {
    console.error('Usage: node backup-workspace.js --workspace-dir <dir> [--target <dir>] [--dry-run] [--json]');
    process.exit(2);
  }

  try {
    const manifest = backupWorkspace(workspaceDir, { target, dryRun });
    if (isJson) {
      console.log(JSON.stringify({ ok: true, dryRun, ...manifest }, null, 2));
    } else {
      const verb = dryRun ? 'Would back up' : 'Backed up';
      console.log(`${verb} to ${manifest.target}`);
      console.log(`  dirs:  ${manifest.dirs.join(', ') || '(none)'}`);
      console.log(`  files: ${manifest.files.join(', ') || '(none)'}`);
      if (manifest.missing.length) console.log(`  missing (skipped): ${manifest.missing.join(', ')}`);
    }
  } catch (err) {
    if (isJson) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`backup-workspace: ${err.message}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { backupWorkspace, defaultTarget, isInside };