const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const provenance = require('../../scripts/provenance');

const SRC_FM = (sourceFile, hash) => `---
source_file: "${sourceFile}"
sha256: "${hash}"
size_bytes: 123
normalized_at: "2026-08-01T10:00:00Z"
normalized_by: "traNNsform v1.5"
---

# Body
content
`;

function run() {
  let passed = 0;
  let failed = 0;

  function ok(actual, msg) {
    try {
      assert.ok(actual);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg}`);
      failed++;
    }
  }
  function eq(actual, expected, msg) {
    try {
      assert.strictEqual(actual, expected);
      console.log(`  PASS: ${msg}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
      failed++;
    }
  }

  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'trannsform-prov-'));
  try {
    // slugify mirrors innfo-core
    eq(provenance.slugify('market-report.docx'), 'market-reportdocx', 'slugify strips dots');
    eq(provenance.slugify('Exec Summary'), 'exec-summary', 'slugify hyphenates spaces');

    // build a project with two normalized md sources under sources/nn/ (one nested in a subfolder,
    // mirroring sources/original/clientA/)
    const proj = path.join(TMP, 'Acme');
    fs.mkdirSync(path.join(proj, 'sources', 'nn', 'clientA'), { recursive: true });
    fs.writeFileSync(
      path.join(proj, 'sources', 'nn', 'clientA', 'market-report.md'),
      SRC_FM('sources/original/clientA/market-report.docx', 'aaa')
    );
    fs.writeFileSync(
      path.join(proj, 'sources', 'nn', 'team.md'),
      SRC_FM('sources/original/team.csv', 'bbb')
    );

    const r1 = provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    eq(r1.created, true, 'model created on first run');
    eq(r1.sourceCount, 2, 'two sources registered');
    ok(fs.existsSync(r1.modelPath), 'model file written');
    eq(path.basename(r1.modelPath), 'Acme_V_0-1-0_cogNNitive_NN.md', 'model file named after the cogNNitive template (not trannsform)');

    const model1 = fs.readFileSync(r1.modelPath, 'utf8');
    ok(/parent_spec:\s*\n\s*name: "cogNNitive_V_0-1-0"/.test(model1), 'parent_spec points to the cogNNitive template');
    ok(/## NN Sources: market-report\.docx/.test(model1), 'source element present');
    ok(/source_format:: docx/.test(model1), 'source_format derived from extension');
    ok(/normalized_content:: sources\/nn\/clientA\/market-report\.md/.test(model1), 'normalized_content records the full sources/nn/ path, subfolders preserved');
    ok(!/source_id/.test(model1), 'provenance model never emits source_id');
    ok(!/src-\d{3}/.test(model1), 'provenance model never emits a src-NNN id');

    // assets materialized at assets/{slug}/{file}
    ok(fs.existsSync(path.join(proj, 'assets', 'market-reportdocx', 'market-report.md')), 'asset copied to slug dir');

    // semantic index.md written at root
    const idx = fs.readFileSync(path.join(proj, 'index.md'), 'utf8');
    ok(/# NN index/.test(idx), 'semantic index has # NN index');
    ok(/Acme_V_0-1-0_cogNNitive_NN\.md/.test(idx), 'index links the provenance model');

    // agent adds a Models element, then re-run preserves it and refreshes Sources
    const withModel = model1.replace(
      /# NN Models\n\n<!--[\s\S]*?-->\n/,
      '# NN Models\n\n## NN Models: Acme Plan\nmodel_template:: business\nsources:: [sources/nn/clientA/market-report.md]\n'
    );
    fs.writeFileSync(r1.modelPath, withModel);
    fs.rmSync(path.join(proj, 'sources', 'nn', 'team.md')); // drop one source

    const r2 = provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    eq(r2.created, false, 'model refreshed (not recreated) on second run');
    eq(r2.sourceCount, 1, 'sources refreshed down to one');
    const model2 = fs.readFileSync(r2.modelPath, 'utf8');
    ok(/## NN Models: Acme Plan/.test(model2), 'agent-added Models element preserved');
    ok(!/## NN Sources: team\.csv/.test(model2), 'dropped source removed from Sources');

    // --- P5: workspace index.md preserves existing entries, drops dangling, walks nested models/ ---
    const idxPath = path.join(proj, 'index.md');
    fs.mkdirSync(path.join(proj, 'models', 'sub'), { recursive: true });
    fs.writeFileSync(path.join(proj, 'models', 'sub', 'Deep_Model_V_1-0-0_NN.md'), '# Deep Model\n');
    fs.writeFileSync(path.join(proj, 'models', 'Custom_Model_V_2-0-0_NN.md'), '# Custom Model\n');
    fs.writeFileSync(
      idxPath,
      fs.readFileSync(idxPath, 'utf8') +
        '* [My Custom](models/Custom_Model_V_2-0-0_NN.md)\n' +
        '* [Gone](models/Gone_V_9-9-9_NN.md)\n'
    );

    const logs = [];
    const origLog = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    let r3;
    try {
      r3 = provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    } finally {
      console.log = origLog;
    }
    eq(r3.created, false, 'model refreshed again on third run');
    const idx3 = fs.readFileSync(idxPath, 'utf8');
    ok(idx3.includes('* [My Custom](models/Custom_Model_V_2-0-0_NN.md)'), 'existing index entry preserved with its original label');
    ok(idx3.includes('Acme_V_0-1-0_cogNNitive_NN.md'), 'discovered provenance model link kept after regeneration');
    ok(idx3.includes('models/sub/Deep_Model_V_1-0-0_NN.md'), 'nested model under models/sub/ included in index');
    ok(!/Gone/.test(idx3), 'dangling index entry (target removed) dropped');
    ok(logs.some((l) => /regenerated.*dropped 1 dangling/.test(l)), 'regeneration logged the dropped dangling entry');

    // nested model discovery alone (recursive, skips excluded dirs)
    const nested = provenance.listWorkspaceModels(proj);
    ok(nested.includes('./models/sub/Deep_Model_V_1-0-0_NN.md'), 'listWorkspaceModels is recursive into models/sub/');
    ok(nested.includes('./models/Custom_Model_V_2-0-0_NN.md'), 'listWorkspaceModels includes top-level models/');
    ok(nested.includes('./Acme_V_0-1-0_cogNNitive_NN.md'), 'listWorkspaceModels keeps root files prefixed ./');

    fs.rmSync(TMP, { recursive: true, force: true });
    console.log(`\n  Provenance tests: ${passed} passed, ${failed} failed`);
  } catch (e) {
    fs.rmSync(TMP, { recursive: true, force: true });
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
