#!/usr/bin/env node

/**
 * scripts/lib/skill-script-refs.test.js
 *
 * Tests for the distributed-skill self-containment gate: every
 * `node scripts/<file>` in a manifest-distributed SKILL.md must exist inside
 * that skill's own folder.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkSkillScriptReferences } = require('./skill-script-refs.js');

function makeRepo(skills) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-refs-'));
  fs.mkdirSync(path.join(root, 'manifest'), { recursive: true });
  const yaml = ['skills:'];
  for (const [name, spec] of Object.entries(skills)) {
    yaml.push(`  - name: ${name}`, '    repo: o/r', `    path: skills/${name}`, '    ref_key: skills');
    const dir = path.join(root, 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), spec.skillMd);
    for (const file of spec.files || []) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), '// x\n');
    }
  }
  fs.writeFileSync(path.join(root, 'manifest', 'source.yaml'), yaml.join('\n') + '\n');
  return root;
}

function runTests() {
  console.log('Running skill-script-refs tests...');

  // Test 1: passes when every referenced script is inside the skill
  {
    const root = makeRepo({ a: { skillMd: 'Run `node scripts/tool.js --x`.\n', files: ['scripts/tool.js'] } });
    try {
      const res = checkSkillScriptReferences(root);
      assert.strictEqual(res.ok, true, res.errors.join('\n'));
      console.log('✔ passes when referenced scripts exist in the skill folder');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // Test 2: fails on a referenced script that is missing from the skill folder
  {
    const root = makeRepo({ a: { skillMd: 'Run `node scripts/missing.js`.\n', files: [] } });
    try {
      const res = checkSkillScriptReferences(root);
      assert.strictEqual(res.ok, false);
      assert.ok(res.errors.some((e) => e.includes('a') && e.includes('scripts/missing.js')), res.errors.join('\n'));
      console.log('✔ fails on a missing referenced script');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // Test 2b: a `node scripts/...` inside an HTML comment is documentation, not a runtime reference.
  {
    const root = makeRepo({
      a: { skillMd: '<!-- run node scripts/build-skill-shared-rules.mjs to regenerate -->\nRun `node scripts/tool.js`.\n', files: ['scripts/tool.js'] },
    });
    try {
      const res = checkSkillScriptReferences(root);
      assert.strictEqual(res.ok, true, res.errors.join('\n'));
      assert.strictEqual(res.checked, 1, 'only the non-comment reference is counted');
      console.log('✔ ignores node scripts references inside HTML comments');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // Test 3: ignores cross-skill paths and skills outside the manifest
  {
    const root = makeRepo({ a: { skillMd: 'Run `node skills/other/scripts/x.js`.\n' } });
    fs.mkdirSync(path.join(root, 'skills', 'undistributed'), { recursive: true });
    fs.writeFileSync(path.join(root, 'skills', 'undistributed', 'SKILL.md'), 'node scripts/nope.js\n');
    try {
      const res = checkSkillScriptReferences(root);
      assert.strictEqual(res.ok, true, res.errors.join('\n'));
      console.log('✔ ignores cross-skill paths and undistributed skills');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // Test 3b: skills embedded in a bluepriNNt package are held to the same gate
  {
    const root = makeRepo({ a: { skillMd: 'ok\n' } });
    const embedded = path.join(root, 'iNNfo', 'specs', 'bluepriNNts', 'video', 'skills', 'emb');
    fs.mkdirSync(path.join(embedded, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(embedded, 'SKILL.md'), 'Run `node scripts/there.js` and `node scripts/gone.js`.\n');
    fs.writeFileSync(path.join(embedded, 'scripts', 'there.js'), '// x\n');
    try {
      const res = checkSkillScriptReferences(root);
      assert.strictEqual(res.ok, false, 'an embedded skill with a dangling reference must fail');
      assert.strictEqual(res.errors.length, 1, res.errors.join('\n'));
      assert.ok(res.errors[0].includes('emb') && res.errors[0].includes('scripts/gone.js'), res.errors[0]);
      assert.strictEqual(res.checked, 2, 'both embedded references are checked');
      console.log('✔ embedded bluepriNNt skills are checked too');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  // Test 4: the real repo is clean
  {
    const res = checkSkillScriptReferences(path.resolve(__dirname, '..', '..'));
    assert.strictEqual(res.ok, true, res.errors.join('\n'));
    console.log('✔ the real repo satisfies the gate');
  }

  // Test 5: verify.js wires both the bundle drift guard and this gate
  {
    const { buildSteps } = require('../verify.js');
    const ids = buildSteps(path.resolve(__dirname, '..', '..')).map((s) => s.id);
    assert.ok(ids.includes('skills-manager-bundle'), 'bundle drift step wired');
    assert.ok(ids.includes('skill-script-refs'), 'script-refs step wired');
    console.log('✔ verify.js wires the bundle drift guard and the script-refs gate');
  }

  console.log('All skill-script-refs tests passed successfully!\n');
}

try {
  runTests();
} catch (err) {
  console.error('Test failure:', err);
  process.exit(1);
}
