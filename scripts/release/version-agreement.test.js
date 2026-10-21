#!/usr/bin/env node

/**
 * scripts/release/version-agreement.test.js
 *
 * Unit tests for release version agreement checks (AD-6).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  checkVersionAgreement,
  VersionAgreementError,
} = require('./version-agreement.js');

function mkRepo(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-agreement-'));

  if (opts.mcpVersion) {
    const mcpDir = path.join(dir, 'iNNfo', 'packages', 'nn-mcp');
    fs.mkdirSync(mcpDir, { recursive: true });
    fs.writeFileSync(
      path.join(mcpDir, 'package.json'),
      JSON.stringify({ name: '@cognnitive/nn-mcp', version: opts.mcpVersion }),
      'utf8'
    );
  }

  if (opts.consoleVersion) {
    const conDir = path.join(dir, 'iNNfo', 'specs', 'bluepriNNts', 'console');
    fs.mkdirSync(conDir, { recursive: true });
    fs.writeFileSync(
      path.join(conDir, 'package.json'),
      JSON.stringify({ name: '@cognnitive/nn-console', version: opts.consoleVersion }),
      'utf8'
    );
  }

  return dir;
}

function testMcpVersionAgreement() {
  const repo = mkRepo({ mcpVersion: '0.12.0' });
  try {
    // Valid agreement
    assert.doesNotThrow(() => {
      checkVersionAgreement({
        releaseTag: 'nn-mcp-v0.12.0',
        repoRoot: repo,
        existingTags: ['nn-mcp-v0.11.0'],
      });
    });

    // Mismatched version
    assert.throws(
      () => {
        checkVersionAgreement({
          releaseTag: 'nn-mcp-v0.13.0',
          repoRoot: repo,
          existingTags: ['nn-mcp-v0.11.0'],
        });
      },
      (err) => err instanceof VersionAgreementError && /mismatch/i.test(err.message)
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function testConsoleVersionAgreement() {
  const repo = mkRepo({ consoleVersion: '0.6.0' });
  try {
    // Valid agreement
    assert.doesNotThrow(() => {
      checkVersionAgreement({
        releaseTag: 'nn-console-v0.6.0',
        repoRoot: repo,
        existingTags: ['nn-console-v0.5.0'],
      });
    });

    // Mismatched version
    assert.throws(
      () => {
        checkVersionAgreement({
          releaseTag: 'nn-console-v0.7.0',
          repoRoot: repo,
          existingTags: ['nn-console-v0.5.0'],
        });
      },
      (err) => err instanceof VersionAgreementError && /mismatch/i.test(err.message)
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function testMonotonicVersionProgression() {
  const repo = mkRepo();
  try {
    // Strictly greater is valid
    assert.doesNotThrow(() => {
      checkVersionAgreement({
        releaseTag: 'skills-v2.10.0',
        repoRoot: repo,
        existingTags: ['skills-v2.9.0', 'skills-v1.0.0'],
      });
    });

    // Equal version (re-run on same tag is permitted)
    assert.doesNotThrow(() => {
      checkVersionAgreement({
        releaseTag: 'skills-v2.9.0',
        repoRoot: repo,
        existingTags: ['skills-v2.9.0', 'skills-v2.8.0'],
      });
    });

    // Lower version than highest existing tag is rejected
    assert.throws(
      () => {
        checkVersionAgreement({
          releaseTag: 'skills-v2.8.0',
          repoRoot: repo,
          existingTags: ['skills-v2.9.0'],
        });
      },
      (err) => err instanceof VersionAgreementError && /not greater|below/i.test(err.message)
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

function runAll() {
  console.log('Running version-agreement unit tests...');
  testMcpVersionAgreement();
  testConsoleVersionAgreement();
  testMonotonicVersionProgression();
  console.log('All version-agreement unit tests passed! ✨');
}

runAll();
