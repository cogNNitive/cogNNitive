#!/usr/bin/env node

/**
 * scripts/lib/nn-name-regex-guard.test.js
 *
 * Plain-node tests for the `_NN.md` regex guard. Seeded violations are built by
 * concatenation so this test file carries no live pattern (test files are also
 * out of scan scope).
 */

const assert = require('node:assert');
const {
  checkNnNameRegexGuard,
  inScope,
  isExcluded,
  validateAllowlist,
  ALLOWLIST,
} = require('./nn-name-regex-guard.js');

const NN_REGEX = '/_NN' + '\\.md$/i';
const NN_REGEX_STRING = "new RegExp('_NN" + "\\\\.md$')";
const NN_LITERAL = "'_NN" + ".md'";
const STAMP_REGEX = '/(' + '\\d{8})-(\\d{6})/';

function run(files, extra = {}) {
  return checkNnNameRegexGuard({ files: Object.keys(files), readFile: (f) => files[f], ...extra });
}

function main() {
  console.log('Running nn-name-regex-guard unit tests...');

  // 1. A seeded `_NN.md` regex outside the contract fails, naming file and line.
  {
    const r = run({ 'iNNfo/packages/innfo-mcp/src/tools/seeded.ts': `const a = 1\nconst re = ${NN_REGEX}\n` });
    assert.strictEqual(r.ok, false, 'a regex must fail');
    assert.ok(r.errors.some((e) => e.includes('iNNfo/packages/innfo-mcp/src/tools/seeded.ts:2')), r.errors.join('; '));
  }
  console.log('✔ a seeded _NN.md regex outside src/naming fails with file and line');

  // 2. The escaped form inside a RegExp string and the standalone literal fail too.
  {
    assert.strictEqual(run({ 'scripts/a.mjs': `const re = ${NN_REGEX_STRING}\n` }).ok, false);
    assert.strictEqual(run({ 'iNNfo/packages/innfo-core/src/a.ts': `if (n.endsWith(${NN_LITERAL})) {}\n` }).ok, false);
    // The frozen Vue editor is out of scope (S5-freeze): a retired token there must not force an edit.
    assert.strictEqual(run({ 'iNNfo/apps/innfo-editor/src/a.vue': `if (n.endsWith(${NN_LITERAL})) {}\n` }).ok, true);
    assert.strictEqual(run({ 'skills/nn-sources/scripts/a.js': `name.endsWith(${NN_LITERAL})\n` }).ok, false);
  }
  console.log('✔ RegExp strings and standalone _NN.md literals fail');

  // 3. An 8-digit stamp builder and a local-time stamp builder fail.
  {
    const r1 = run({ 'skills/nn-sources/scripts/lib/x.js': `const m = name.match(${STAMP_REGEX})\n` });
    assert.strictEqual(r1.ok, false);
    const r2 = run({ 'skills/nn-sources/scripts/x.js': 'const h = String(now.getHours()).padStart(2)\n' });
    assert.strictEqual(r2.ok, false);
  }
  console.log('✔ stamp builders (8-digit pattern, local-time) fail');

  // 4. The contract module itself is the one place that may define the pattern.
  {
    const r = run({
      'iNNfo/packages/innfo-core/src/naming/contract.ts': `const NN = ${NN_REGEX}\nconst d = ${STAMP_REGEX}\nnow.getUTCHours()\n`,
    });
    assert.strictEqual(r.ok, true, r.errors.join('; '));
  }
  console.log('✔ the contract module is exempt');

  // 5. Tests, generated files, legacy quarantine, docs, and openspec are out of scope.
  {
    const body = `const re = ${NN_REGEX}\n`;
    const r = run({
      'scripts/a.test.js': body,
      'iNNfo/packages/innfo-core/tests/a.test.ts': body,
      'iNNfo/packages/innfo-mcp/src/tools/a.spec.ts': body,
      'skills/nn-sources/scripts/lib/innfo-core.generated.cjs': body,
      'iNNfo/packages/innfo-core/src/legacy/layout/detect.ts': body,
      'docs/x.md': body,
      'openspec/x.md': body,
    });
    assert.strictEqual(r.ok, true, r.errors.join('; '));
  }
  console.log('✔ tests, generated files, legacy/**, docs, and openspec are out of scope');

  // 6. Pure comment lines never count as a definition.
  {
    const r = run({
      'scripts/a.mjs': `// matches ${NN_LITERAL} files\n/**\n * ${NN_REGEX}\n */\n`,
    });
    assert.strictEqual(r.ok, true, r.errors.join('; '));
  }
  console.log('✔ comment lines are ignored');

  // 7. An allowlisted file passes; an allowlist entry without a reason fails.
  {
    const allowlist = [{ pattern: 'scripts/legit.mjs', reason: 'published-spec URL tooling' }];
    assert.strictEqual(run({ 'scripts/legit.mjs': `const re = ${NN_REGEX}\n` }, { allowlist }).ok, true);
    const bad = checkNnNameRegexGuard({ files: [], allowlist: [{ pattern: 'x', reason: '' }] });
    assert.strictEqual(bad.ok, false);
    assert.ok(bad.errors.some((e) => e.includes('missing a reason')));
  }
  console.log('✔ allowlist entries pass with a reason and fail without one');

  // 8. Clean input passes; helpers behave.
  assert.strictEqual(run({ 'scripts/clean.mjs': 'export const a = 1\n' }).ok, true);
  assert.strictEqual(inScope('iNNfo/packages/innfo-core/src/layout.ts'), true);
  assert.strictEqual(inScope('docs/x.md'), false);
  assert.strictEqual(inScope('scripts/x.cjs'), false);
  assert.strictEqual(isExcluded('skills/a/scripts/x.generated.cjs'), true);
  assert.deepStrictEqual(validateAllowlist(ALLOWLIST), []);
  console.log('✔ clean input passes and the shipped allowlist carries a reason on every entry');

  console.log('All nn-name-regex-guard unit tests passed successfully!\n');
}

main();
