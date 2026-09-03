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

const fs = require('fs');
const path = require('path');

// 1. Template Inventory Guard: ensure every template folder is declared in manifest/source.yaml
const templatesDir = path.join(__dirname, '..', 'iNNfo', 'specs', 'templates');
const sourceYamlPath = path.join(__dirname, '..', 'manifest', 'source.yaml');

if (fs.existsSync(templatesDir) && fs.existsSync(sourceYamlPath)) {
  const sourceText = fs.readFileSync(sourceYamlPath, 'utf8');
  const declaredTemplates = new Set();
  const matchRegex = /-\s+name:\s+([^\s\n]+)/g;
  let match;
  while ((match = matchRegex.exec(sourceText)) !== null) {
    declaredTemplates.add(match[1]);
  }

  const diskFolders = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'assets')
    .map(d => d.name);

  const missing = diskFolders.filter(name => !declaredTemplates.has(name));
  if (missing.length > 0) {
    console.error(`❌ Template Inventory Mismatch! Folders exist in specs/templates/ but are missing from manifest/source.yaml: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`▶ Template Inventory Guard: all ${diskFolders.length} template folders are registered in manifest.`);
}

// 2. Manifest validation
run('node scripts/manifest/validate-manifest.js --channel stable', 'Validate Stable Manifest');

console.log('\n✅ [cogNNitive Verify] All deterministic pre-checks passed.');