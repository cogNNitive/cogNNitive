#!/usr/bin/env node

/**
 * scripts/lib/skill-tree-digest.test.js
 *
 * Load-bearing check: the digest is the immutability promise. If it is not
 * canonical, pin-time and install-time disagree silently.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { skillTreeDigest } = require('./skill-tree-digest.js');

function makeTree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-digest-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return root;
}

function runTests() {
  console.log('Running skill-tree-digest tests...');

  // 1: stable across file creation order
  {
    const a = makeTree({ 'SKILL.md': '# x\n', 'scripts/a.js': 'A', 'scripts/b.js': 'B' });
    const b = makeTree({ 'scripts/b.js': 'B', 'SKILL.md': '# x\n', 'scripts/a.js': 'A' });
    try {
      assert.strictEqual(skillTreeDigest(a), skillTreeDigest(b), 'order must not change the digest');
      console.log('✔ stable across creation order');
    } finally {
      fs.rmSync(a, { recursive: true, force: true });
      fs.rmSync(b, { recursive: true, force: true });
    }
  }

  // 2: node_modules and dotfiles are excluded
  {
    const plain = makeTree({ 'SKILL.md': '# x\n', 'scripts/a.js': 'A' });
    const noisy = makeTree({
      'SKILL.md': '# x\n',
      'scripts/a.js': 'A',
      'node_modules/dep/index.js': 'nope',
      '.env': 'secret',
      '.cache/x': 'nope',
    });
    try {
      assert.strictEqual(skillTreeDigest(plain), skillTreeDigest(noisy), 'excluded paths must not affect the digest');
      console.log('✔ node_modules and dotfiles excluded');
    } finally {
      fs.rmSync(plain, { recursive: true, force: true });
      fs.rmSync(noisy, { recursive: true, force: true });
    }
  }

  // 3: a content change (including a binary byte) changes the digest
  {
    const root = makeTree({ 'SKILL.md': '# x\n', 'bin.dat': Buffer.from([0, 1, 2]) });
    const before = skillTreeDigest(root);
    fs.writeFileSync(path.join(root, 'bin.dat'), Buffer.from([0, 1, 3]));
    try {
      assert.notStrictEqual(skillTreeDigest(root), before, 'a byte change must change the digest');
      console.log('✔ detects a binary byte change');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  console.log('All skill-tree-digest tests passed successfully!\n');
}

try {
  runTests();
} catch (err) {
  console.error('Test failure:', err);
  process.exit(1);
}
