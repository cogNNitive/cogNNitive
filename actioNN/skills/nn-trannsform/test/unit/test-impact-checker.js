const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { auditModelCitations, checkScanImpact, findClosestSlugs } = require('../../scripts/lib/impact-checker');

async function run() {
  let passed = 0;
  let failed = 0;

  function ok(actual, msg) {
    try {
      assert.ok(actual);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg} - ${e.message}`);
      failed++;
    }
  }

  function eq(actual, expected, msg) {
    try {
      assert.strictEqual(actual, expected);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
      failed++;
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cog-impact-test-'));

  try {
    const modelsDir = path.join(tmpDir, 'models');
    const nnDir = path.join(tmpDir, 'sources', 'nn');
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(nnDir, { recursive: true });

    // 1. Create normalized source
    const sourceContent = `---
source_file: "sources/import/strategy.pdf"
sha256: "abc123hash"
---

# Strategy 2026

## Strategic Vision
Here is the vision.

## Market Positioning
Positioning details here.
`;
    fs.writeFileSync(path.join(nnDir, 'strategy_source.md'), sourceContent, 'utf8');

    // 2. Create model with valid citations
    const validModelContent = `---
spec_version: "V_0-1-0"
---

# NN Objectives

## NN Objectives: Global Expansion
sources:: [strategy_source.md#strategic-vision, strategy_source.md#market-positioning]
status:: Active
`;
    fs.writeFileSync(path.join(modelsDir, 'Objectives_V_1-0-0_NN.md'), validModelContent, 'utf8');

    // Test 1: Clean audit
    const auditClean = auditModelCitations(tmpDir);
    eq(auditClean.errors.length, 0, 'clean audit has 0 errors');
    eq(auditClean.totalCitations, 2, 'records 2 total citations');
    eq(auditClean.validCitations, 2, 'records 2 valid citations');

    // Test 2: Missing heading detection (drift)
    const driftedModelContent = `---
spec_version: "V_0-1-0"
---

# NN Objectives

## NN Objectives: Unknown Heading Target
sources:: strategy_source.md#non-existent-heading
status:: Inactive
`;
    fs.writeFileSync(path.join(modelsDir, 'Drifted_V_1-0-0_NN.md'), driftedModelContent, 'utf8');

    const auditDrift = auditModelCitations(tmpDir);
    ok(auditDrift.errors.length > 0, 'detects missing heading as error');
    const drifted = auditDrift.driftedCitations.find(c => c.headingSlug === 'non-existent-heading');
    ok(Boolean(drifted), 'records drifted citation details');
    eq(drifted.reason, 'missing_heading', 'reason is missing_heading');

    // Test 3: Suggest closest matching slugs
    const suggestions = findClosestSlugs('strategic-mission', ['strategic-vision', 'market-positioning', 'overview']);
    ok(suggestions.includes('strategic-vision'), 'finds closest slug suggestions for similar tokens');

    // Test 4: checkScanImpact for modified source
    const scanImpact = checkScanImpact([
      { baseName: 'strategy_source', displayOutPath: 'strategy_source.md' }
    ], tmpDir);
    ok(scanImpact.length > 0, 'scan impact returns affected models for changed source');
    eq(scanImpact[0].affectedModels[0].modelFile, 'models/Drifted_V_1-0-0_NN.md', 'identifies correct affected model');

  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  return { passed, failed };
}

module.exports = { run };
