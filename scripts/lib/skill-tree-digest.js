#!/usr/bin/env node

/**
 * scripts/lib/skill-tree-digest.js
 *
 * Canonical SHA-256 digest of a skill directory tree, used to verify that a
 * referenced external skill is unmodified between pin time and install time.
 *
 * Canonicalization (order-independent, transport-independent):
 *   for each file, sorted by POSIX relative path:
 *     update( posixPath + "\0" + sha256(fileBytes) + "\n" )
 *   `node_modules/`, `.git/` and dot-prefixed entries are excluded.
 *
 * Pure and dependency-free beyond node core, so it bundles into the shipped
 * skills-manager and runs on a fresh install.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git']);

/** @returns {string[]} POSIX-relative file paths, sorted, exclusions applied. */
function walkFiles(rootDir) {
  const files = [];
  const stack = [''];
  while (stack.length > 0) {
    const rel = stack.pop();
    for (const entry of fs.readdirSync(path.join(rootDir, rel), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const child = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(child);
      } else if (entry.isFile()) {
        files.push(child.split(path.sep).join('/'));
      }
    }
  }
  return files.sort();
}

/**
 * @param {string} rootDir skill directory
 * @returns {string} 64-hex SHA-256 digest
 */
function skillTreeDigest(rootDir) {
  const hash = crypto.createHash('sha256');
  for (const posixPath of walkFiles(rootDir)) {
    const fileHash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(rootDir, posixPath.split('/').join(path.sep))))
      .digest('hex');
    hash.update(`${posixPath}\0${fileHash}\n`);
  }
  return hash.digest('hex');
}

module.exports = { skillTreeDigest };
