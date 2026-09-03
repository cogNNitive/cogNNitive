#!/usr/bin/env node
const { execSync } = require('child_process');

if (!process.env.GITHUB_TOKEN) {
  try {
    const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
    if (token) process.env.GITHUB_TOKEN = token;
  } catch (_) {
    // gh not installed or not logged in, fallback to unauthenticated
  }
}

console.log('🔍 [cogNNitive Verify] Running workspace verification...');

function run(cmd, desc) {
  console.log(`\n▶ ${desc} (${cmd})...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ ${desc} failed.`);
    process.exit(1);
  }
}

// 1. Manifest validation
run('node scripts/manifest/validate-manifest.js --channel stable', 'Validate Stable Manifest');

console.log('\n✅ [cogNNitive Verify] All deterministic pre-checks passed.');