#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Destination for the built site. Defaults to the in-repo `docs/` (the Pages
// artifact the monorepo already produces); the public-web publish pipeline
// (`public-web-repository-split`) can redirect it to a staging tree via
// `INNFO_DOCS_OUT` without changing any of the staging logic below.
const docsRoot = process.env.INNFO_DOCS_OUT
  ? path.resolve(process.env.INNFO_DOCS_OUT)
  : path.join(repoRoot, 'docs');

console.log('ðŸš€ [cogNNitive Build Docs] Starting workspace build orchestration...');
console.log(`   Output root: ${docsRoot}`);

function run(cmd, desc) {
  console.log(`\nâ–¶ ${desc} (${cmd})...`);
  try {
    const binDir = path.join(repoRoot, 'node_modules', '.bin');
    const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
    const pathEnv = process.env[pathKey] ? `${binDir}${path.delimiter}${process.env[pathKey]}` : binDir;
    const env = { ...process.env, [pathKey]: pathEnv, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096' };
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit', env });
  } catch (err) {
    console.error(`\nâŒ ${desc} failed.`);
    process.exit(1);
  }
}

// 1. Sequential topological build execution
run('npm --workspace=@cognnitive/innfo-core run build', 'Build @cognnitive/innfo-core');
run('npm --workspace=@cognnitive/innfo-mcp run build', 'Build @cognnitive/innfo-mcp');
run('npm --workspace=@cognnitive/innfo-editor run build', 'Build @cognnitive/innfo-editor');

// 2. Stage innfo-editor distribution into docs/innfo/app/
console.log('\nâ–¶ Staging innfo-editor dist into docs/innfo/app/...');
const editorDist = path.join(repoRoot, 'iNNfo', 'apps', 'innfo-editor', 'dist');
const targetAppDir = path.join(docsRoot, 'innfo', 'app');

if (!fs.existsSync(editorDist)) {
  console.error(`âŒ Editor dist directory not found at: ${editorDist}`);
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
console.log(`âœ… Staged ${distEntries.length} dist entries to docs/innfo/app/`);

// 3. The MCP CDN bundle is NOT staged here: `scripts/stage-mcp-bundle.mjs` owns it
// (it copies the committed bundle and needs no editor build). CI `site` and the
// release workflow run it.

// 3b. Stage the Level-2 blueprint catalog so it is reachable at a canonical
// same-origin URL for the browser editor and non-monorepo workspaces (AD-3,
// tier 1): https://cognnitive.com/innfo/blueprints/catalog.json
console.log('\nâ–¶ Staging blueprint catalog into docs/innfo/blueprints/catalog.json...');
const catalogSrc = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json');
const catalogTargetDir = path.join(docsRoot, 'innfo', 'blueprints');
if (!fs.existsSync(catalogSrc)) {
  console.error(`âŒ Blueprint catalog not found at: ${catalogSrc}. Run scripts/blueprint-catalog.mjs first.`);
  process.exit(1);
}
fs.mkdirSync(catalogTargetDir, { recursive: true });
fs.copyFileSync(catalogSrc, path.join(catalogTargetDir, 'catalog.json'));
console.log('âœ… Staged docs/innfo/blueprints/catalog.json');

// 3c. Derive docs-facts generated regions (MCP tool facts today; skills
// catalog from Unit 3 onward) from their canonical sources, so the Docsify
// step below never staleness-races a hand-typed fact (design D5).
run('node scripts/generate-docs-facts.mjs', 'Generate docs-derived facts (MCP tool facts, skills catalog)');

// 3d. Regenerate docs/innfo/about.md as a Markdown twin of about.html
// (design D6, superseding the original "delete about.md" decision): the
// twin is never hand-edited, so every build re-derives it from the
// canonical HTML page.
run('node scripts/generate-about-twin.mjs', 'Generate docs/innfo/about.md twin from about.html');

// 3e. Stage distribution preview manifest into docs/update/
console.log('\n▶ Staging distribution preview manifest into docs/update/...');
const manifestNextSrc = path.join(docsRoot, 'use', 'manifest-next.md');
const updateDir = path.join(docsRoot, 'update');
fs.mkdirSync(updateDir, { recursive: true });
if (fs.existsSync(manifestNextSrc)) {
  fs.copyFileSync(manifestNextSrc, path.join(updateDir, 'manifest-next.md'));
  console.log('✅ Staged docs/update/manifest-next.md');
}


// 4. Generate Docsify documentation suites from iNNfo models
run(
  'node scripts/generate-docsify-suite.mjs docs/innfo/documentation/documentation_NN.md',
  'Generate iNNfo Docsify documentation suite from iNNfo model'
);
run(
  'node scripts/generate-docsify-suite.mjs docs/skills/documentation/documentation_NN.md',
  'Generate Agent Skills Docsify documentation suite from iNNfo model'
);

console.log('\nðŸŽ‰ [cogNNitive Build Docs] All artifacts built and staged successfully.');

