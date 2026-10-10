#!/usr/bin/env node

/**
 * scripts/manifest/lib/external-skill-policy.test.js
 *
 * Load-bearing guard: an unpinned or unlicensed external skill must not pass.
 */

const assert = require('node:assert');
const { validateExternalSkill, validateExternalSkills } = require('./external-skill-policy.js');

const HEX40 = 'a'.repeat(40);
const HEX64 = 'b'.repeat(64);

function runTests() {
  console.log('Running external-skill-policy tests...');

  // 1: a well-formed referenced entry passes
  {
    const r = validateExternalSkill({
      name: 'x', repo: 'o/r', path: 'skills/x', commit: HEX40, ref: 'v1', sha256: HEX64, license: 'MIT',
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

  // 3: malformed hashes fail
  {
    const r = validateExternalSkill({ name: 'x', repo: 'o/r', path: 'p', commit: 'nope', sha256: 'nope', license: 'MIT' });
    assert.ok(r.errors.some((e) => e.includes('40-char hex sha')), r.errors.join('\n'));
    assert.ok(r.errors.some((e) => e.includes('64-char hex digest')), r.errors.join('\n'));
    console.log('✔ malformed commit/sha256 are rejected');
  }

  // 4: missing sha256 warns, does not fail
  {
    const r = validateExternalSkill({ name: 'x', repo: 'o/r', path: 'p', commit: HEX40, license: 'MIT' });
    assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
    assert.strictEqual(r.warnings.length, 1);
    console.log('✔ missing sha256 warns');
  }

  // 5: vendored + non-permissive license fails; referenced + same license passes
  {
    const base = { name: 'x', repo: 'o/r', path: 'p', commit: HEX40, sha256: HEX64, license: 'UNLICENSED' };
    assert.ok(validateExternalSkill({ ...base, distribution: 'vendored' }).errors.some((e) => e.includes('not redistributable')));
    assert.deepStrictEqual(validateExternalSkill({ ...base, distribution: 'referenced' }).errors, []);
    console.log('✔ vendored redistribution requires a permissive license');
  }

  // 6: embedded entries are exempt
  {
    const r = validateExternalSkill({ name: 'x', embedded: true });
    assert.deepStrictEqual(r, { errors: [], warnings: [] });
    console.log('✔ embedded entries are exempt');
  }

  // 7: aggregate over a list
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
