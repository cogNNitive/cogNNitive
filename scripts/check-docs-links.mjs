#!/usr/bin/env node
/**
 * scripts/check-docs-links.mjs
 *
 * Verifies that all internal relative markdown links across docs/
 * resolve to existing files on disk, preventing Docsify navigation breaks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const docsRoot = path.join(repoRoot, 'docs');

function getAllMarkdownFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

const mdFiles = getAllMarkdownFiles(docsRoot);
let checkedLinks = 0;
const brokenLinks = [];

const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

for (const filePath of mdFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const match of content.matchAll(linkRegex)) {
    const rawTarget = match[2].trim();
    if (
      rawTarget.startsWith('http:') ||
      rawTarget.startsWith('https:') ||
      rawTarget.startsWith('mailto:') ||
      rawTarget.startsWith('#')
    ) {
      continue;
    }

    checkedLinks++;
    const cleanTarget = rawTarget.split('#')[0].split('?')[0];
    if (!cleanTarget) continue;

    const resolved = path.resolve(path.dirname(filePath), cleanTarget);
    if (!fs.existsSync(resolved)) {
      brokenLinks.push({
        source: path.relative(repoRoot, filePath),
        link: rawTarget,
        resolved: path.relative(repoRoot, resolved),
      });
    }
  }
}

if (brokenLinks.length > 0) {
  console.error(`❌ Found ${brokenLinks.length} broken internal links in docs/:\n`);
  for (const b of brokenLinks) {
    console.error(`  - In ${b.source}: [${b.link}] -> ${b.resolved} not found`);
  }
  process.exit(1);
}

console.log(`✅ All ${checkedLinks} internal links across ${mdFiles.length} docs/ markdown files resolve cleanly.`);
