#!/usr/bin/env node

/**
 * scripts/migrate-hash-citations.test.mjs
 *
 * Unit tests for scripts/migrate-hash-citations.mjs (Strict TDD RED -> GREEN).
 * Tests #slug to @ rewrite using extractHeadings + serializeKnowledgeUnitRef
 * via the innfo-core mirror, idempotency, and exclusion filters.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const MIGRATOR_SCRIPT = path.join(SCRIPT_DIR, 'migrate-hash-citations.mjs')

// Dynamically import or load the migrator module
let migratorModule = null
try {
  migratorModule = await import('./migrate-hash-citations.mjs')
} catch {
  // Expected in RED phase if script doesn't exist yet
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [MIGRATOR_SCRIPT, ...args], {
    cwd: cwd || REPO_ROOT,
    encoding: 'utf-8',
  })
}

function createFixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-hash-test-'))
  
  // Create directories
  fs.mkdirSync(path.join(root, 'sources', 'import'), { recursive: true })
  fs.mkdirSync(path.join(root, 'kNNowledge'), { recursive: true })
  fs.mkdirSync(path.join(root, 'docs', 'innfo', 'samples'), { recursive: true })
  fs.mkdirSync(path.join(root, '_samples_nn'), { recursive: true })
  fs.mkdirSync(path.join(root, 'tests', 'unit', 'fixtures'), { recursive: true })

  // 1. Target source file with headings
  const sourceContent = `# Market Research\n\n## Overview & Summary\n\nSome overview text.\n\n### Detailed Findings\n\nFindings text.\n`
  fs.writeFileSync(path.join(root, 'sources', 'import', 'market.md'), sourceContent, 'utf8')

  // 2. Another source file
  const interviewContent = `# User Interview\n\n## Pain Points\n\nPain points.\n`
  fs.writeFileSync(path.join(root, 'sources', 'import', 'interview.md'), interviewContent, 'utf8')

  // 3. Model file with legacy #slug citations (scalar, list, quoted)
  const modelContent = `---
type: knowledge
sources: [sources/import/market.md#overview-summary]
---
# Strategy

## NN Strategy: Expansion
sources:: sources/import/market.md#detailed-findings
derived_from:: [sources/import/interview.md#pain-points]
`
  fs.writeFileSync(path.join(root, 'kNNowledge', 'strategy_NN.md'), modelContent, 'utf8')

  // 4. Second model file with a legacy #slug citation
  const unqualifiedModelContent = `---
type: knowledge
---
# Operations

## NN Operations: Plan
sources:: sources/import/market.md#overview-summary
`
  fs.writeFileSync(path.join(root, 'kNNowledge', 'operations_NN.md'), unqualifiedModelContent, 'utf8')

  // 5. Frozen _V_ file (must be skipped)
  const frozenVContent = `sources:: sources/import/market.md#overview-summary\n`
  fs.writeFileSync(path.join(root, 'kNNowledge', 'Model_V_1-0-0_NN.md'), frozenVContent, 'utf8')

  // 6. docs/innfo/samples file (must be skipped)
  fs.writeFileSync(path.join(root, 'docs', 'innfo', 'samples', 'sample.md'), frozenVContent, 'utf8')

  // 7. _samples_nn file (must be skipped)
  fs.writeFileSync(path.join(root, '_samples_nn', 'sample.md'), frozenVContent, 'utf8')

  // 8. tests fixtures file (must be skipped)
  fs.writeFileSync(path.join(root, 'tests', 'unit', 'fixtures', 'fixture.md'), frozenVContent, 'utf8')

  // 9. File already containing canonical @ citations (must remain unchanged)
  const canonicalContent = `sources:: sources/import/market.md@## Overview & Summary\n`
  fs.writeFileSync(path.join(root, 'kNNowledge', 'canonical_NN.md'), canonicalContent, 'utf8')

  return root
}

async function runTests() {
  console.log('Running migrate-hash-citations unit tests...')

  assert.ok(migratorModule, 'migrate-hash-citations.mjs module must exist and be importable')

  const { migrateContent, shouldSkip, runMigration } = migratorModule

  // Test 1: shouldSkip rules
  console.log('  Testing shouldSkip exclusion rules...')
  assert.strictEqual(shouldSkip('kNNowledge/strategy_NN.md'), false, 'Normal model is not skipped')
  assert.strictEqual(shouldSkip('kNNowledge/Model_V_1-0-0_NN.md'), true, 'Files with _V_ are skipped')
  assert.strictEqual(shouldSkip('iNNfo/specs/bluepriNNts/base/base_V_0-1-0_NN.md'), true, 'Templates with _V_ are skipped')
  assert.strictEqual(shouldSkip('docs/innfo/samples/sample.md'), true, 'docs/innfo/samples/ is skipped')
  assert.strictEqual(shouldSkip('_samples_nn/sample.md'), true, '_samples_nn/ is skipped')
  assert.strictEqual(shouldSkip('iNNfo/packages/innfo-core/tests/fixtures/test.md'), true, 'fixtures are skipped')
  assert.strictEqual(shouldSkip('tests/unit/fixtures/fixture.md'), true, 'test fixtures are skipped')
  assert.strictEqual(shouldSkip('node_modules/pkg/index.js'), true, 'node_modules is skipped')
  assert.strictEqual(shouldSkip('.git/config'), true, '.git is skipped')

  // Test 2: migrateContent rewrites #slug to @## Heading Text
  console.log('  Testing migrateContent rewriting...')
  const ws = createFixtureWorkspace()
  const resolveSource = (rel) => {
    const full = path.join(ws, rel)
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null
  }

  const sampleInput = `sources:: sources/import/market.md#overview-summary\nderived_from:: [sources/import/interview.md#pain-points]`
  const { updated, count } = migrateContent(sampleInput, 'kNNowledge/test_NN.md', resolveSource)
  assert.strictEqual(count, 2, 'Two replacements made')
  assert.ok(updated.includes('sources:: sources/import/market.md@## Overview & Summary'), 'market.md rewritten with heading text')
  assert.ok(updated.includes('derived_from:: [sources/import/interview.md@## Pain Points]'), 'interview.md rewritten with heading text')

  // Test 3: Idempotence of migrateContent
  console.log('  Testing idempotence of migrateContent...')
  const secondPass = migrateContent(updated, 'kNNowledge/test_NN.md', resolveSource)
  assert.strictEqual(secondPass.count, 0, 'Second pass makes zero replacements')
  assert.strictEqual(secondPass.updated, updated, 'Second pass leaves content identical')

  // Test 4: Preserves non-hash citations and markdown anchors
  console.log('  Testing preservation of non-hash citations...')
  const nonHashInput = `sources:: sources/import/market.md@## Overview & Summary\nCSV: sources/import/data.csv@R10&col\nLink: [Intro](#overview)\n`
  const nonHashResult = migrateContent(nonHashInput, 'kNNowledge/test_NN.md', resolveSource)
  assert.strictEqual(nonHashResult.count, 0, 'Non-hash citations untouched')
  assert.strictEqual(nonHashResult.updated, nonHashInput, 'Content untouched')

  // Test 5: Full workspace run via runMigration
  console.log('  Testing runMigration over fixture workspace...')
  const report = runMigration({ workspaceRoot: ws, dryRun: false })
  assert.ok(report.totalReplacements >= 3, `Expected >=3 replacements, got ${report.totalReplacements}`)
  assert.ok(report.modifiedFiles >= 2, `Expected >=2 modified files, got ${report.modifiedFiles}`)

  // Verify non-frozen modified file
  const migratedStrategy = fs.readFileSync(path.join(ws, 'kNNowledge', 'strategy_NN.md'), 'utf8')
  assert.ok(migratedStrategy.includes('@## Overview & Summary'), 'strategy_NN.md has migrated overview')
  assert.ok(migratedStrategy.includes('@### Detailed Findings'), 'strategy_NN.md has migrated detailed findings')
  assert.ok(migratedStrategy.includes('@## Pain Points'), 'strategy_NN.md has migrated pain points')

  // Verify frozen file was NOT modified
  const frozenContent = fs.readFileSync(path.join(ws, 'kNNowledge', 'Model_V_1-0-0_NN.md'), 'utf8')
  assert.ok(frozenContent.includes('#overview-summary'), 'Frozen _V_ file was preserved untouched')

  // Verify docs/innfo/samples was NOT modified
  const samplesContent = fs.readFileSync(path.join(ws, 'docs', 'innfo', 'samples', 'sample.md'), 'utf8')
  assert.ok(samplesContent.includes('#overview-summary'), 'docs/innfo/samples was preserved untouched')

  // Test 6: CLI invocation with --dry-run
  console.log('  Testing CLI execution...')
  const cliRes = runCli(['--workspace', ws, '--dry-run'])
  assert.strictEqual(cliRes.status, 0, `CLI dry-run exited with code ${cliRes.status}: ${cliRes.stderr}`)

  console.log('All migrate-hash-citations tests passed successfully! 🎉')
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
