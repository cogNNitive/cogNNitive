#!/usr/bin/env node

/**
 * scripts/manifest/lib/external-skill-policy.test.js
 *
 * Load-bearing guard: an unpinned or unlicensed external skill must not pass.
 */

const assert = require('node:assert');
const { validateExternalSkill, validateExternalSkills } = require('./external-skill-policy.js');

const HEX40 = 'a'.repeat(40);

function runTests() {
  console.log('Running external-skill-policy tests...');

  // 1: a well-formed referenced entry passes
  {
    const r = validateExternalSkill({
      name: 'x', repo: 'o/r', path: 'skills/x', commit: HEX40, license: 'MIT',
    });
    assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
    assert.deepStrictEqual(r.warnings, [], r.warnings.join('\n'));
    console.log('✔ valid referenced entry passes');
  }

  // 2: missing commit or license fails
  {
    const r = validateExternalSkill({ name: 'x', repo: 'o/r', path: 'skills/x', license: '', commit: '' });
    assert.ok(r.errors.some((e) => e.includes("missing field 'commit'")), r.errors.join('\n'));
    assert.ok(r.errors.some((e) => e.includes("missing field 'license'")), r.errors.join('\n'));
    console.log('✔ unpinned or unlicensed entry is rejected');
  }

  // 3: a malformed commit fails
  {
    const r = validateExternalSkill({ name: 'x', repo: 'o/r', path: 'p', commit: 'nope', license: 'MIT' });
    assert.ok(r.errors.some((e) => e.includes('40-char hex sha')), r.errors.join('\n'));
    console.log('✔ malformed commit is rejected');
  }

  // 4: sha256/ref/distribution are ignored (no policy, no ceremony)
  {
    const r = validateExternalSkill({
      name: 'x', repo: 'o/r', path: 'p', commit: HEX40, license: 'MIT',
      ref: 'v1', sha256: 'b'.repeat(64), distribution: 'vendored',
    });
    assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
    assert.deepStrictEqual(r.warnings, [], r.warnings.join('\n'));
    console.log('✔ sha256/ref/distribution carry no policy');
  }

  // 5: embedded entries are exempt
  {
    const r = validateExternalSkill({ name: 'x', embedded: true });
    assert.deepStrictEqual(r, { errors: [], warnings: [] });
    console.log('✔ embedded entries are exempt');
  }

  // 6: aggregate over a list
  {
    const r = validateExternalSkills([{ name: 'a', embedded: true }, { name: 'b' }]);
    assert.ok(r.errors.some((e) => e.includes("skill 'b'")), r.errors.join('\n'));
    assert.ok(!r.errors.some((e) => e.includes("skill 'a'")), 'embedded must not be flagged');
    console.log('✔ aggregation skips embedded entries');
  }

  console.log('All external-skill-policy tests passed successfully!\n');
}

try {
  runTests();
} catch (err) {
  console.error('Test failure:', err);
  process.exit(1);
}
