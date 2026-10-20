#!/usr/bin/env node

/**
 * scripts/check-integrity.js
 *
 * Deterministic post-change & pre-push integrity runner.
 * Unifies:
 * - Group 0 & 1: Git working tree & concurrency status
 * - Group 2: Checks verify.js does not run (tag/pin freshness, node engines, console bundle, external-skill policy)
 * - Group 3, 4, 7+: Full workspace verification suite (scripts/verify.js)
 * - Group 5 (optional): Complete CI mirror (lint, typecheck, core/app tests,
 *   innfo-mcp tests + coverage ratchet, spec-url resolution)
 *
 * Usage:
 *   node scripts/check-integrity.js            # Standard inner-loop gate (verify.js --fast)
 *   node scripts/check-integrity.js --only=X   # Forward an --only filter to verify.js
 *   node scripts/check-integrity.js --pre-push # Full pre-push gate (full verify.js + CI mirror)
 *   node scripts/check-integrity.js --release  # Same as --pre-push (verification is offline in every mode)
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { checkNodeEngines } = require('./lib/node-engine-check.js');

const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const isRelease = args.includes('--release') || args.includes('-r');
const isPrePush = args.includes('--pre-push') || args.includes('--all') || args.includes('-p') || isRelease;

console.log('🩺 [nn-dev-check-integrity] Running deterministic integrity gate...');

// Step 1: Git & Working Tree Hygiene (Group 0 & 1)
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

// Step 1b: Tag/pin freshness (Group 1c) — a skills or blueprint-spec change
// must re-pin manifest/source.yaml in the same diff.
console.log('\n[Group 1c] Tag/pin freshness (skills & blueprints ↔ manifest/source.yaml):');
try {
  const { checkTagPinFreshness, structuralChanges } = require('./lib/tag-pin-freshness.js');
  // Prefer the batched-merge range; fall back to the branch-vs-main range.
  const range = execSync('git rev-parse --verify --quiet origin/main', { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    ? 'origin/main...HEAD'
    : 'HEAD~1...HEAD';
  const changed = execSync(`git diff --name-only ${range}`, { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const uncommitted = execSync('git diff --name-only', { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const allChanged = Array.from(new Set([...changed, ...uncommitted]));
  const nameStatus = execSync(`git diff --name-status -M ${range}`, { cwd: repoRoot, encoding: 'utf8' });
  const pinResult = checkTagPinFreshness(allChanged, structuralChanges(nameStatus));
  if (!pinResult.ok) {
    console.error('❌ Tag/pin freshness check failed:');
    pinResult.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  const n = pinResult.triggered.skills.length + pinResult.triggered.blueprints.length;
  console.log(
    n > 0
      ? `  ✅ Skill/blueprint changes re-pin the manifest (${n} matched paths).`
      : '  ✅ No skill/blueprint changes in this diff.',
  );
} catch (e) {
  console.log(`  ℹ️ Tag/pin freshness check skipped: ${e.message}`);
}

// Step 2c: Node Engine Compatibility (Group 9 — automated bullets)
console.log('\n[Group 9] Node Engine Compatibility (installed deps vs CI-pinned Node):');
const nodeEngines = checkNodeEngines(repoRoot);
if (nodeEngines.warnings && nodeEngines.warnings.length) {
  nodeEngines.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
}
if (!nodeEngines.ok) {
  console.error('❌ Node engine compatibility violation:');
  nodeEngines.errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}
console.log('  ✅ All installed workspace dependencies are compatible with CI-pinned Node version(s).');

// Step 2g: Blueprint External-Skill Policy Guard
console.log('\n[Group 2g] Blueprint External-Skill Policy Guard:');
const { collectExternalSkillViolations } = require('./manifest/lib/external-skill-policy.js');
const externalSkillResult = collectExternalSkillViolations(repoRoot);
externalSkillResult.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
if (externalSkillResult.errors.length) {
  console.error('❌ Blueprint external-skill policy failed:');
  externalSkillResult.errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}
console.log(`  ✅ Referenced external skills satisfy the pin/license policy (${externalSkillResult.checked} checked).`);

// Step 3: Full Deterministic Workspace Verification (verify.js)
console.log('\n[Groups 3, 4, 7+] Workspace Verification Suite:');
// verify.js is async (worker pool); run it as a child so this script stays synchronous.
// Inner-loop (default) mode uses `--fast`; the dev -> main batch gate (`--pre-push` /
// `--release`) uses the full unfiltered run. Any `--only` filter is forwarded verbatim.
const onlyEq = args.find((a) => a.startsWith('--only='));
const onlyIdx = args.indexOf('--only');
const onlyArgs = onlyEq
  ? [onlyEq]
  : onlyIdx !== -1 && args[onlyIdx + 1]
    ? ['--only', args[onlyIdx + 1]]
    : [];
const verifyArgs = [
  path.join(__dirname, 'verify.js'),
  ...(isRelease ? ['--release'] : isPrePush ? [] : ['--fast']),
  ...onlyArgs,
];
if (spawnSync(process.execPath, verifyArgs, { stdio: 'inherit' }).status !== 0) {
  console.error('❌ Workspace verification failed (see the step summary above).');
  process.exit(1);
}

// Step 4: Full CI Mirror (Group 5, if --pre-push)
if (isPrePush) {
  console.log('\n[Group 5] Full CI Mirror (lint · typecheck · tests+coverage · spec-urls):');
  function runCmd(cmd, desc) {
    console.log(`\n▶ ${desc} (${cmd})...`);
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });
  }

  try {
    runCmd('npm run lint', 'Lint');
    runCmd('npm run typecheck', 'Typecheck');
    runCmd('npm --workspace=@cognnitive/innfo-core run test:coverage', 'Unit tests + coverage (core)');
    runCmd('npm --workspace=@cognnitive/innfo-mcp run test:coverage', 'Unit tests + coverage (innfo-mcp)');
    runCmd('node scripts/check-spec-version.mjs --check-urls', 'Check spec URLs resolve');
    console.log('\n✅ [Group 5] CI mirror passed.');
  } catch (err) {
    console.error(`\n❌ CI mirror failed.`);
    process.exit(1);
  }
}

console.log('\n🎉 [nn-dev-check-integrity] ALL INTEGRITY GATES PASSED.');
