#!/usr/bin/env node
/**
 * scripts/check-canonical.js
 *
 * Contract test for the single canonical entry point.
 *
 * 1. Consistency guard (always runs, offline):
 *    Fails if any tracked doc still advertises the bare bootstrap phrase
 *    "I want to use https://cognnitive.com" WITHOUT the "/use" path.
 *    This keeps every page pointing at ONE string.
 *
 * 2. Live manifest smoke test (network; skip with --offline or SKIP_MANIFEST_CHECK=1):
 *    Fetches https://cognnitive.com/use and fails if it does not resolve to a
 *    reachable page exposing an `agent-bootstrap` manifest. This is the guard that
 *    turns "the entry point silently broke" into "the build is red until it works".
 *    NOTE: expected to stay RED until the gateway repo (cogNNitive/cogNNitive)
 *    publishes /use. That red is the signal to finish the deploy.
 *
 * Usage:
 *   node scripts/check-canonical.js [--offline]
 *
 * Zero dependencies. Requires Node 18+ for global fetch.
 */

const fs = require('fs');
const path = require('path');

const CANONICAL = 'https://cognnitive.com/use';
const MANIFEST_URL = CANONICAL;
const SCAN_EXTENSIONS = new Set(['.md', '.txt', '.html', '.json', '.yaml', '.yml']);
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'scripts']);

// Matches the install phrase where the domain is NOT immediately followed by "/use".
const STALE_PHRASE = /I want to use https:\/\/cognnitive\.com(?!\/use)/g;

const offline = process.argv.includes('--offline') || process.env.SKIP_MANIFEST_CHECK === '1';
const rootDir = process.cwd();

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function consistencyGuard() {
  const files = walk(rootDir, []);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (STALE_PHRASE.test(line)) {
        violations.push(`${path.relative(rootDir, file)}:${i + 1}  ${line.trim()}`);
      }
      STALE_PHRASE.lastIndex = 0;
    });
  }

  if (violations.length > 0) {
    console.error('\n[FAIL] Stale bootstrap phrase found (must use the canonical /use path):');
    for (const v of violations) console.error(`  - ${v}`);
    console.error(`\n  Canonical entry point: "I want to use ${CANONICAL}"`);
    return false;
  }
  console.log(`[OK] Consistency: every page uses the canonical entry "${CANONICAL}".`);
  return true;
}

async function manifestSmokeTest() {
  if (offline) {
    console.log('[SKIP] Live manifest smoke test (offline mode).');
    return true;
  }
  try {
    const res = await fetch(MANIFEST_URL, { redirect: 'follow' });
    if (!res.ok) {
      console.error(`\n[FAIL] ${MANIFEST_URL} returned HTTP ${res.status}. The entry point is not reachable.`);
      return false;
    }
    const body = await res.text();
    const hasManifest = /agent-bootstrap\s*:/.test(body) ||
      /<link[^>]+rel=["']alternate["'][^>]+type=["']text\/markdown["']/i.test(body);
    if (!hasManifest) {
      console.error(`\n[FAIL] ${MANIFEST_URL} is reachable but exposes no agent-bootstrap manifest (or markdown twin).`);
      return false;
    }
    console.log(`[OK] Live manifest: ${MANIFEST_URL} resolves to a bootstrap manifest.`);
    return true;
  } catch (err) {
    console.error(`\n[FAIL] Could not reach ${MANIFEST_URL}: ${err.message}`);
    return false;
  }
}

(async function main() {
  const okConsistency = consistencyGuard();
  const okManifest = await manifestSmokeTest();
  if (!okConsistency || !okManifest) {
    process.exit(1);
  }
  console.log('\nAll canonical-entry checks passed.');
})();
