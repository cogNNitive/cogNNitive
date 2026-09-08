#!/usr/bin/env node

/**
 * scripts/verify.js
 *
 * Deterministic workspace verification runner for cogNNitive tooling.
 * Enforces template inventory parity, scripts static type safety, orchestrator line-count limits, and manifest validity.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure local node_modules/.bin is accessible on PATH for standalone node invocations
const binDir = path.join(__dirname, '..', 'node_modules', '.bin');
const pathKey = Object.keys(process.env).find(k => k.toLowerCase() === 'path') || 'PATH';
if (fs.existsSync(binDir) && !(process.env[pathKey] || '').includes(binDir)) {
  process.env[pathKey] = `${binDir}${path.delimiter}${process.env[pathKey] || ''}`;
}

if (!process.env.GITHUB_TOKEN) {
  try {
    const token = execSync('gh auth token', { encoding: 'utf8' }).trim();
    if (token) process.env.GITHUB_TOKEN = token;
  } catch (_) {
    // gh not installed or not logged in, fallback to unauthenticated
  }
}

function extractDeclaredTemplates(sourceText) {
  /** @type {Set<string>} */
  const declaredTemplates = new Set();
  const matchRegex = /-\s+name:\s+([^\s\n]+)/g;
  for (const block of ['templates:', 'frozen_templates:']) {
    const templatesMatch = sourceText.match(new RegExp(`(?:^|\\n)${block}\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n[a-z_]+:|$)`));
    const templatesBlock = templatesMatch ? templatesMatch[1] : '';
    let match;
    while ((match = matchRegex.exec(templatesBlock)) !== null) {
      declaredTemplates.add(match[1]);
    }
  }
  return declaredTemplates;
}

function checkTemplateInventory(templatesDir, sourceYamlPath) {
  const sourceText = fs.readFileSync(sourceYamlPath, 'utf8');
  const declaredTemplates = extractDeclaredTemplates(sourceText);

  const diskFolders = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'assets')
    .map(d => d.name);

  const missing = diskFolders.filter(name => !declaredTemplates.has(name));
  return { ok: missing.length === 0, missing, diskFolders };
}

/**
 * Executes a verification step synchronously, tracking output and halting on error.
 * @param {string} cmd - CLI command string to execute.
 * @param {string} desc - Descriptive label for the verification step.
 * @returns {void}
 */
function run(cmd, desc) {
  console.log(`\n▶ ${desc} (${cmd})...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ ${desc} failed.`);
    process.exit(1);
  }
}

function runVerification() {
  console.log('🔍 [cogNNitive Verify] Running workspace verification...');

// 1. Template Inventory Guard: ensure every template folder is declared in manifest/source.yaml
  const templatesDir = path.join(__dirname, '..', 'iNNfo', 'specs', 'templates');
  const sourceYamlPath = path.join(__dirname, '..', 'manifest', 'source.yaml');

  if (fs.existsSync(templatesDir) && fs.existsSync(sourceYamlPath)) {
    const { ok, missing, diskFolders } = checkTemplateInventory(templatesDir, sourceYamlPath);
    if (!ok) {
      console.error(`❌ Template Inventory Mismatch! Folders exist in specs/templates/ but are missing from manifest/source.yaml: ${missing.join(', ')}`);
      process.exit(1);
    }
    console.log(`▶ Template Inventory Guard: all ${diskFolders.length} template folders are registered in manifest.`);
  }

  // 2. Orchestrator Line-Count Guard: enforce strictly < 200 physical lines per orchestrator
  const ORCHESTRATORS = [
    'scripts/manifest/validate-manifest.js',
    'scripts/manifest/check-parity.js',
    'actioNN/scripts/skills-manager.js',
    'actioNN/skills/nn-trannsform/scripts/scanner.js',
    'actioNN/skills/nn-trannsform/scripts/provenance.js',
  ];

  const MAX_LINES = 200;
  let lineCountFailed = false;

  for (const relPath of ORCHESTRATORS) {
    const fullPath = path.join(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
      if (lineCount >= MAX_LINES) {
        console.error(`❌ Line-Count Guard Violation: ${relPath} has ${lineCount} lines (limit: strictly < ${MAX_LINES}).`);
        lineCountFailed = true;
      } else {
        console.log(`▶ Line-Count Guard: ${relPath} (${lineCount} lines < ${MAX_LINES}).`);
      }
    }
  }

  if (lineCountFailed) {
    process.exit(1);
  }

  // 3. Workspace Parity Guard: ensure all local skills, templates, and MCP bundles match manifest/source.yaml
  run('node scripts/manifest/check-parity.js', 'Check Workspace Parity');

  // 4. Script static type checking
  run('tsc --noEmit -p tsconfig.scripts.json', 'Typecheck Scripts');

  // 5. Preflight workspace freshness + the single-classifier drift guards. These
  //    run BEFORE the stable-manifest validation (step 6) because that step
  //    currently halts on pre-existing pinned-tag drift — the guards here must
  //    stay reachable in CI (W2/W3 from the slice-1 verify report).
  run('node actioNN/skills/nn-preflight/scripts/preflight-check.test.js', 'Test Preflight Workspace Freshness');

  // 6. Preflight Primitives Drift Guard: the committed version-status.generated.cjs
  //    must match the innfo-core source it is bundled from (single classifier, no
  //    hand-maintained copy). Plus its own unit tests, wired here so the drift
  //    guard has automated teeth.
  run('node scripts/build-preflight-primitives.test.mjs', 'Test Preflight Primitives Build');
  run('node scripts/build-preflight-primitives.mjs --check', 'Check Preflight Primitives Bundle Fresh');

  // 7. Template Catalog Drift Guard: the committed iNNfo/specs/templates/catalog.json
  //    must match the on-disk templates tree (workspace-template-upgrade, shared
  //    classifier input for check_workspace and the preflight CLI).
  run('node scripts/template-catalog.mjs --check', 'Check Template Catalog Fresh');

  // 8. Manifest validation
  run('node scripts/manifest/validate-manifest.js --channel stable', 'Validate Stable Manifest');

  // 9. Rendered stable manifest doc must be in sync with manifest/source.yaml.
  run('node scripts/manifest/generate-manifest.js --channel stable --check', 'Check Stable Manifest Doc Fresh');

  // 10. Test Template Inventory Guard
  run('node scripts/verify-inventory.test.js', 'Test Template Inventory Guard');

  // 11. Test Template Immutability Guard
  run('node scripts/guard-template-immutability.test.js', 'Test Template Immutability Guard');

  // 12. Template Immutability Guard (against real git state)
  run('node scripts/guard-template-immutability.js', 'Template Immutability Guard');

  console.log('\n✅ [cogNNitive Verify] All deterministic pre-checks passed.');
}

if (require.main === module) {
  runVerification();
}

module.exports = {
  checkTemplateInventory,
  runVerification,
  extractDeclaredTemplates,
};