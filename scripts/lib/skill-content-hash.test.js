#!/usr/bin/env node
/**
 * scripts/lib/skill-content-hash.test.js
 *
 * Unit tests for the per-file skill content hash (plain node, zero deps).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { hashSkillDir, diffSkillDir } = require('./skill-content-hash.js');

function main() {
  console.log('Running skill-content-hash unit tests...');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hash-'));
  try {
    fs.mkdirSync(path.join(dir, 'sub'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
    fs.mkdirSync(path.join(dir, '.bak-20261027'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'sub', '.bak-old'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# skill\n');
    fs.writeFileSync(path.join(dir, 'sub', 'b.txt'), 'b\n');
    fs.writeFileSync(path.join(dir, 'node_modules', 'x.js'), 'x\n');
    fs.writeFileSync(path.join(dir, '.bak-20261027', 'c.txt'), 'c\n');
    fs.writeFileSync(path.join(dir, 'sub', '.bak-old', 'd.txt'), 'd\n');

    // Excludes node_modules and .bak-* at any depth; stable across runs.
    const h1 = hashSkillDir(dir);
    const h2 = hashSkillDir(dir);
    assert.deepStrictEqual(Object.keys(h1).sort(), ['SKILL.md', 'sub/b.txt'], 'excludes node_modules and .bak-* at any depth');
    assert.deepStrictEqual(h1, h2, 'hash is stable');
    console.log('✔ hashSkillDir excludes node_modules/.bak-* and is stable');

    // No difference on an unchanged tree.
    assert.strictEqual(diffSkillDir(dir, h1).modified, false, 'an unchanged tree is not modified');

    // A changed, an added and a removed file are all reported.
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# skill edited\n');
    fs.writeFileSync(path.join(dir, 'sub', 'new.txt'), 'new\n');
    fs.rmSync(path.join(dir, 'sub', 'b.txt'));
    const d = diffSkillDir(dir, h1);
    assert.strictEqual(d.modified, true, 'edits make the skill modified');
    assert.deepStrictEqual(d.changed, ['SKILL.md'], 'changed file listed');
    assert.deepStrictEqual(d.added, ['sub/new.txt'], 'added file listed');
    assert.deepStrictEqual(d.removed, ['sub/b.txt'], 'removed file listed');
    console.log('✔ diffSkillDir reports changed/added/removed');

    // Excluded paths changing do not count.
    fs.writeFileSync(path.join(dir, 'node_modules', 'x.js'), 'edited\n');
    fs.mkdirSync(path.join(dir, '.bak-2'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.bak-2', 'z.txt'), 'z\n');
    const h3 = hashSkillDir(dir);
    const d2 = diffSkillDir(dir, h3);
    assert.strictEqual(d2.modified, false, 'node_modules/.bak-* changes are ignored');

    // A missing record is not a modification.
    assert.strictEqual(diffSkillDir(dir, {}).modified, true, 'an empty record sees the files as added (caller decides to skip)');
    assert.strictEqual(diffSkillDir(path.join(dir, 'does-not-exist'), null).modified, false, 'a missing dir yields no difference');
    console.log('✔ exclusion + missing-record behavior');

    console.log('All skill-content-hash unit tests passed successfully!\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main();
