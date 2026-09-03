#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

console.log('🚀 [cogNNitive Build Docs] Starting workspace build orchestration...');

function run(cmd, desc) {
  console.log(`\n▶ ${desc} (${cmd})...`);
  try {
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });
  } catch (err) {
    console.error(`\n❌ ${desc} failed.`);
    process.exit(1);
  }
}

// 1. Sequential topological build execution
run('npm --prefix iNNfo/packages/innfo-core run build', 'Build @cognnitive/innfo-core');
run('npm --prefix iNNfo/packages/innfo-mcp run build', 'Build @cognnitive/innfo-mcp');
run('npm --prefix iNNfo/apps/innfo-editor run build', 'Build @cognnitive/innfo-editor');

// 2. Stage innfo-editor distribution into docs/innfo/app/
console.log('\n▶ Staging innfo-editor dist into docs/innfo/app/...');
const editorDist = path.join(repoRoot, 'iNNfo', 'apps', 'innfo-editor', 'dist');
const targetAppDir = path.join(repoRoot, 'docs', 'innfo', 'app');

if (!fs.existsSync(editorDist)) {
  console.error(`❌ Editor dist directory not found at: ${editorDist}`);
  process.exit(1);
}

fs.mkdirSync(targetAppDir, { recursive: true });

// Clean existing compiled assets directory in docs/innfo/app/ to prevent stale hashed chunks
const targetAssetsDir = path.join(targetAppDir, 'assets');
if (fs.existsSync(targetAssetsDir)) {
  fs.rmSync(targetAssetsDir, { recursive: true, force: true });
}

// Copy editor dist contents (index.html, assets, etc.) while preserving starter/ and 404.html
const distEntries = fs.readdirSync(editorDist);
for (const entry of distEntries) {
  const srcPath = path.join(editorDist, entry);
  const destPath = path.join(targetAppDir, entry);
  fs.cpSync(srcPath, destPath, { recursive: true });
}
console.log(`✅ Staged ${distEntries.length} dist entries to docs/innfo/app/`);

// 3. Stage MCP bundle and update CDN manifest
console.log('\n▶ Staging innfo-mcp CDN bundle and updating manifest...');
const mcpDir = path.join(repoRoot, 'iNNfo', 'packages', 'innfo-mcp');
const mcpPkgPath = path.join(mcpDir, 'package.json');
const mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
const version = mcpPkg.version;

if (!version) {
  console.error('❌ Could not determine version from innfo-mcp package.json');
  process.exit(1);
}

const cdnDir = path.join(repoRoot, 'docs', 'innfo', 'cdn');
fs.mkdirSync(cdnDir, { recursive: true });

const srcBundle = path.join(mcpDir, 'bin', 'innfo-mcp.bundle.js');
if (!fs.existsSync(srcBundle)) {
  console.error(`❌ MCP bundle not found at: ${srcBundle}`);
  process.exit(1);
}

const targetBundle = path.join(cdnDir, `innfo-mcp-v${version}.bundle.js`);
fs.copyFileSync(srcBundle, targetBundle);
console.log(`✅ Copied MCP bundle to docs/innfo/cdn/innfo-mcp-v${version}.bundle.js`);

const manifestPath = path.join(cdnDir, 'manifest.json');
const manifest = {
  latest: `v${version}`,
  updated: new Date().toISOString().split('T')[0],
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`✅ Updated docs/innfo/cdn/manifest.json (latest: v${version})`);

console.log('\n🎉 [cogNNitive Build Docs] All artifacts built and staged successfully.');
