#!/usr/bin/env node

/**
 * scripts/guard-text-encoding.test.js
 *
 * Plain-node tests for the tracked-text encoding guard.
 * Fixtures cover: valid text, U+FFFD, undecodable UTF-8 bytes, binary content,
 * generated bundles, and an explicit allowlist exception.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkTextBuffer, scanForEncodingViolations } = require('./guard-text-encoding.js');

function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-encoding-'));
  try {
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeFixture(dir, name, content) {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

function main() {
  console.log('Running guard-text-encoding unit tests...');

  // 1. Pure buffer classification.
  assert.strictEqual(checkTextBuffer(Buffer.from('plain ascii\n', 'utf8')), null);
  assert.strictEqual(checkTextBuffer(Buffer.from('em dash \u2014 ok\n', 'utf8')), null);
  assert.strictEqual(
    checkTextBuffer(Buffer.from('replacement \uFFFD here', 'utf8')),
    'replacement-character (U+FFFD)',
  );
  assert.strictEqual(
    checkTextBuffer(Buffer.from([0x66, 0x80, 0x6f])),
    'invalid-utf8 (undecodable bytes)',
  );
  assert.strictEqual(
    checkTextBuffer(Buffer.from([0x61, 0x00, 0x62])),
    null,
    'a NUL byte marks binary content and is skipped',
  );
  console.log('✔ buffer classification');

  // 2. Reports replacement + undecodable; skips binary + generated bundles.
  withTempDir((dir) => {
    const valid = writeFixture(dir, 'valid.txt', Buffer.from('clean text\n', 'utf8'));
    const replacement = writeFixture(dir, 'docs/broken.md', Buffer.from('bad \uFFFD char', 'utf8'));
    const undecodable = writeFixture(dir, 'data/bytes.txt', Buffer.from([0x6f, 0x6b, 0x80, 0x0a]));
    const binary = writeFixture(dir, 'assets/logo.bin', Buffer.from([0x00, 0x01, 0x02]));
    const generated = writeFixture(
      dir,
      'docs/innfo/cdn/x.bundle.js',
      Buffer.from('generated \uFFFD', 'utf8'),
    );

    const violations = scanForEncodingViolations(
      [valid, replacement, undecodable, binary, generated],
      { repoRoot: dir, allowlist: new Set() },
    );
    const byFile = Object.fromEntries(violations.map((v) => [v.file, v.reason]));
    assert.deepStrictEqual(Object.keys(byFile).sort(), ['data/bytes.txt', 'docs/broken.md']);
    assert.strictEqual(byFile['docs/broken.md'], 'replacement-character (U+FFFD)');
    assert.strictEqual(byFile['data/bytes.txt'], 'invalid-utf8 (undecodable bytes)');
    console.log('✔ reports replacement + undecodable, skips binary + generated');
  });

  // 3. An explicit allowlist entry is skipped (documented exception, not silent).
  withTempDir((dir) => {
    const p = writeFixture(dir, 'allowlisted.md', Buffer.from('grandfathered \uFFFD', 'utf8'));
    const violations = scanForEncodingViolations([p], {
      repoRoot: dir,
      allowlist: new Set(['allowlisted.md']),
    });
    assert.deepStrictEqual(violations, []);
    console.log('✔ allowlist skips an explicitly documented exception');
  });

  console.log('All guard-text-encoding unit tests passed successfully!');
}

main();
