#!/usr/bin/env node
const { execSync } = require('child_process');

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