const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Canonical vocabulary dictionary guard (nn-trannsform unit pattern).
// Validates iNNfo/specs/vocabulary.json: well-formed, `app` canonical,
// `template` recorded as a deprecated alias, and every stable identifier
// (resolution-bearing path/tool/key/tag that MUST NOT be renamed) listed.
const SPECS_DIR = path.resolve(__dirname, '..');
const VOCAB_FILE = path.join(SPECS_DIR, 'vocabulary.json');

// Every identifier that must stay byte-identical during the user-facing
// `template` -> `app` rename. If one is dropped from the dictionary, the
// guard fails so the deprecation contract stays auditable.
const REQUIRED_STABLE_IDENTIFIERS = [
  'specs/templates/',
  'template_version',
  'get_template',
  'templates:',
  'templates-v*',
  'SHIPPED_TEMPLATE_VERSIONS',
];

function run() {
  let passed = 0;
  let failed = 0;

  function assertEqual(actual, expected, msg) {
    try {
      assert.strictEqual(actual, expected);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg}`);
      console.log(`    Expected: ${JSON.stringify(expected)}`);
      console.log(`    Actual:   ${JSON.stringify(actual)}`);
      failed++;
    }
  }

  function assertTrue(actual, msg) {
    assertEqual(actual, true, msg);
  }

  try {
    if (!fs.existsSync(VOCAB_FILE)) {
      console.error(`  ERROR: vocabulary.json not found at ${VOCAB_FILE}`);
      failed++;
      return { passed, failed };
    }

    const vocab = JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));

    // Well-formedness
    assertEqual(typeof vocab, 'object', 'vocabulary.json parses as an object');
    assertEqual(typeof vocab.terms, 'object', 'vocabulary.json has a terms map');

    // `app` is the canonical term
    const app = vocab.terms.app;
    assertEqual(typeof app, 'object', 'app term entry exists');
    assertTrue(app.canonical === true, 'app is marked canonical');

    // `template` is recorded as a deprecated alias
    assertTrue(Array.isArray(app.aliases), 'app declares an aliases array');
    assertTrue(app.aliases.includes('template'), 'template is listed as a deprecated alias');

    // sense + excluded senses
    assertEqual(typeof app.sense, 'string', 'app declares a sense string');
    assertTrue(app.sense.length > 0, 'app sense is non-empty');
    assertTrue(Array.isArray(app.excludes), 'app declares an excludes array');
    assertTrue(
      app.excludes.includes('traNNsformations'),
      'excludes covers the nn-trannsform traNNsformations sense',
    );
    assertTrue(
      app.excludes.includes('vue-sfc-template'),
      'excludes covers the Vue SFC <template> sense',
    );

    // Every stable identifier is listed (deprecation contract)
    assertTrue(Array.isArray(app.stable_identifiers), 'app lists stable identifiers');
    for (const id of REQUIRED_STABLE_IDENTIFIERS) {
      assertTrue(
        app.stable_identifiers.includes(id),
        `stable identifier "${id}" is listed`,
      );
    }

    // planned_migrations present for the future mechanical identifier migration
    assertTrue(Array.isArray(app.planned_migrations), 'app declares planned_migrations');
    assertTrue(app.planned_migrations.length > 0, 'planned_migrations is non-empty');

    console.log(`\n  Vocabulary tests: ${passed} passed, ${failed} failed`);
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
    console.error(e.stack);
    failed++;
  }

  return { passed, failed };
}

module.exports = { run };

if (require.main === module) {
  const result = run();
  process.exit(result.failed > 0 ? 1 : 0);
}