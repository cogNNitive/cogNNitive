#!/usr/bin/env node

/**
 * scripts/check-integrity.js
 *
 * Deterministic post-change & pre-push integrity runner.
 * Unifies:
 * - Group 0 & 1: Git working tree & concurrency status
 * - Group 2: MCP version square alignment
 * - Group 3, 4, 7+: Full workspace verification suite (scripts/verify.js)
 * - Group 5 (optional): Complete CI mirror (lint, typecheck, tests)
 *
 * Usage:
 *   node scripts/check-integrity.js            # Standard deterministic gate (Groups 0-4, 7+)
 *   node scripts/check-integrity.js --pre-push # Full pre-push gate (includes CI mirror)
 *   node scripts/check-integrity.js --release  # Release gate: pre-push + live stable-manifest validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { checkVersionSquare } = require('./lib/version-square.js');
const { runVerification } = require('./verify.js');

const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const isRelease = args.includes('--release') || args.includes('-r');
const isPrePush = args.includes('--pre-push') || args.includes('--all') || args.includes('-p') || isRelease;

console.log('🩺 [nn-dev-check-integrity] Running deterministic integrity gate...');

// Step 1: Git & Working Tree Hygiene (Group 0 & 1)
console.log('\n[Group 0 & 1] Working Tree & Git State:');
try {
  const branch = execSync('git branch --show-current', { cwd: repoRoot, encoding: 'utf8' }).trim();
  const status = execSync('git status -sb', { cwd: repoRoot, encoding: 'utf8' }).trim();
  console.log(`  Current branch: ${branch}`);
  console.log(`  ${status.split('\n')[0]}`);

  const uncommitted = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (uncommitted) {
    console.log('  ⚠️ Uncommitted changes detected:');
    uncommitted.split('\n').slice(0, 5).forEach(l => console.log(`     ${l}`));
  } else {
    console.log('  ✅ Working tree clean.');
  }

  const stashes = execSync('git stash list', { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (stashes) {
    console.log(`  ℹ️ Stashes present: ${stashes.split('\n').length}`);
  }
} catch (e) {
  console.log(`  ℹ️ Git state check skipped: ${e.message}`);
}

// Step 2: MCP Version Square (Group 2)
console.log('\n[Group 2] MCP Version Square (pkg · core · manifest · CDN):');
const vSquare = checkVersionSquare(repoRoot);
if (!vSquare.ok) {
  console.error('❌ MCP Version Square mismatch:');
  vSquare.errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}
console.log(`  ✅ All 6 version references in sync (v${vSquare.version}).`);

// Step 3: Full Deterministic Workspace Verification (verify.js)
console.log('\n[Groups 3, 4, 7+] Workspace Verification Suite:');
try {
  runVerification({ release: isRelease });
} catch (e) {
  console.error(`❌ Workspace verification failed: ${e.message}`);
  process.exit(1);
}

// Step 4: Full CI Mirror (Group 5, if --pre-push)
if (isPrePush) {
  console.log('\n[Group 5] Full CI Mirror (lint · typecheck · test suites):');
  function runCmd(cmd, desc) {
    console.log(`\n▶ ${desc} (${cmd})...`);
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });
  }

  try {
    runCmd('npm --prefix iNNfo run lint', 'Lint');
    runCmd('npm --prefix iNNfo run typecheck', 'Typecheck');
    runCmd('npm --prefix iNNfo test', 'Test Suites');
    console.log('\n✅ [Group 5] CI mirror passed.');
  } catch (err) {
    console.error(`\n❌ CI mirror failed.`);
    process.exit(1);
  }
}

console.log('\n🎉 [nn-dev-check-integrity] ALL INTEGRITY GATES PASSED.');
