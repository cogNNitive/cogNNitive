#!/usr/bin/env node

/**
 * nn-trannsform — Test Runner
 *
 * Runs unit tests (Node assert, zero deps) and exits with code 0/1.
 *
 * Usage:
 *   node test/run.js              # run all tests
 *   node test/run.js unit         # unit tests only
 *   node test/run.js integration  # integration tests only
 */

const path = require('path');

const TEST_DIR = __dirname;

function printBanner(title) {
  console.log('');
  console.log('═'.repeat(50));
  console.log(`  ${title}`);
  console.log('═'.repeat(50));
}

async function main() {
  const mode = process.argv[2] || 'all';
  let totalPassed = 0;
  let totalFailed = 0;

  if (mode === 'all' || mode === 'unit') {
    printBanner('Unit Tests');

    const configTest = require('./unit/test-config');
    const configResult = await configTest.run();
    totalPassed += configResult.passed;
    totalFailed += configResult.failed;

    const bootstrapTest = require('./unit/test-bootstrap-recursive');
    const bootstrapResult = await bootstrapTest.run();
    totalPassed += bootstrapResult.passed;
    totalFailed += bootstrapResult.failed;

    const scannerTest = require('./unit/test-scanner');
    const scannerResult = await scannerTest.run();
    totalPassed += scannerResult.passed;
    totalFailed += scannerResult.failed;

    const provenanceTest = require('./unit/test-provenance');
    const provenanceResult = await provenanceTest.run();
    totalPassed += provenanceResult.passed;
    totalFailed += provenanceResult.failed;

    const webImportTest = require('./unit/test-web-import');
    const webImportResult = await webImportTest.run();
    totalPassed += webImportResult.passed;
    totalFailed += webImportResult.failed;
  }

  if (mode === 'all' || mode === 'integration') {
    printBanner('Integration Tests');

    try {
      const integrationScript = path.join(TEST_DIR, 'test.ps1');
      console.log(`  To run integration tests on Windows:`);
      console.log(`  pwsh -ExecutionPolicy Bypass -File "${integrationScript}"`);
      console.log('');
      console.log('  (Integration tests are skipped in the Node runner —');
      console.log('   they require PowerShell and a clean test environment.)');
    } catch (e) {
      console.log(`  SKIP: Integration tests not available on this platform`);
    }
  }

  console.log('');
  console.log('═'.repeat(50));
  console.log(`  Result: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('═'.repeat(50));
  console.log('');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
