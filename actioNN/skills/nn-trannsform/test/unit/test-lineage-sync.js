const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const provenance = require('../../scripts/provenance');
const { checkLineage } = require('../../scripts/lib/lineage-check');

function run() {
  let passed = 0;
  let failed = 0;
  const ok = (cond, msg) => {
    if (cond) {
      console.log(`  PASS: ${msg}`);
      passed++;
    } else {
      console.log(`  FAIL: ${msg}`);
      failed++;
    }
  };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nnt-lineage-'));
  try {
    const proj = path.join(tmp, 'Acme');
    for (const d of ['sources/nn', 'models', 'artifacts']) {
      fs.mkdirSync(path.join(proj, d), { recursive: true });
    }
    fs.writeFileSync(
      path.join(proj, 'sources', 'nn', 'report.md'),
      '---\nsource_file: "sources/original/report.pdf"\nsha256: "a"\nsize_bytes: 1\nnormalized_at: "x"\nnormalized_by: "t"\n---\n\n# Overview\n',
    );
    fs.writeFileSync(
      path.join(proj, 'models', 'Plan_V_1-0-0_NN.md'),
      '---\nlevel: 3\nmodel_version: "V_1-0-0"\nparent_spec:\n  name: "business_V_0-1-0"\ntitle: "Business Plan"\n---\n\n# NN Stakeholders\n\n## NN Stakeholders: Clients\nsources:: [report.md#overview]\n',
    );
    fs.writeFileSync(
      path.join(proj, 'artifacts', 'Exec_Summary_V_1-0-0.md'),
      '---\nmodel: "Business Plan"\nmodel_version: "V_1-0-0"\ntype: "report"\n---\n\n# Executive Summary\n',
    );

    // First build.
    const r1 = provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    const m1 = fs.readFileSync(r1.modelPath, 'utf8');
    ok(r1.modelCount === 1 && r1.artifactCount === 1, 'build reports 1 model + 1 artifact');
    ok(/## NN Models: Business Plan/.test(m1), '# NN Models entry rendered from models/');
    ok(
      /model_ref:: models\/Plan_V_1-0-0_NN\.md/.test(m1) &&
        /derived_from:: \[report\.md#overview\]/.test(m1),
      'model entry carries model_ref + derived_from from sources::',
    );
    ok(
      /## NN Artifacts: Exec_Summary_V_1-0-0/.test(m1) &&
        /derived_from:: \[Business Plan V_1-0-0\]/.test(m1),
      '# NN Artifacts entry rendered with derived_from model+version',
    );
    ok(/# NN Procedures/.test(m1), '# NN Procedures section present (empty placeholder)');

    // Idempotent re-run: managed sections byte-identical.
    const r2 = provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    const m2 = fs.readFileSync(r2.modelPath, 'utf8');
    const managed = (s) => s.slice(s.indexOf('# NN Sources'), s.indexOf('# NN Procedures'));
    ok(managed(m1) === managed(m2), 'managed sections byte-identical on idempotent re-run');

    // Append a procedure run — survives a later section refresh.
    provenance.appendProcedureRun(proj, { command: 'scan', inputs: ['sources/original/'], outputs: ['sources/nn/'] });
    provenance.appendProcedureRun(proj, { command: 'apply Foo', inputs: ['models/'], outputs: ['artifacts/'] });
    let mp = fs.readFileSync(r1.modelPath, 'utf8');
    ok((mp.match(/## NN Procedures:/g) || []).length === 2, 'two procedure entries appended');
    provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    mp = fs.readFileSync(r1.modelPath, 'utf8');
    ok((mp.match(/## NN Procedures:/g) || []).length === 2, 'section refresh preserves procedure history');

    // Remove the model → drops out of # NN Models.
    fs.rmSync(path.join(proj, 'models', 'Plan_V_1-0-0_NN.md'));
    provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    const m3 = fs.readFileSync(r1.modelPath, 'utf8');
    ok(!/## NN Models: Business Plan/.test(m3), 'removed model drops out of # NN Models');

    // --check drift: artifact still cites the now-missing model.
    const drift = checkLineage(proj);
    ok(
      drift.errors.some((e) => /Business Plan/.test(e)),
      '--check flags the artifact citing a now-absent model',
    );

    // Restore the model, add a dangling sources:: — --check catches it.
    fs.writeFileSync(
      path.join(proj, 'models', 'Plan_V_1-0-0_NN.md'),
      '---\nlevel: 3\nmodel_version: "V_1-0-0"\ntitle: "Business Plan"\n---\n\n# NN S\n\n## NN S: X\nsources:: [ghost.md#nowhere]\n',
    );
    provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    const drift2 = checkLineage(proj);
    ok(drift2.errors.some((e) => /ghost\.md/.test(e)), '--check flags a dangling sources:: pointer');

    // Clean workspace → no errors.
    fs.writeFileSync(
      path.join(proj, 'models', 'Plan_V_1-0-0_NN.md'),
      '---\nlevel: 3\nmodel_version: "V_1-0-0"\ntitle: "Business Plan"\n---\n\n# NN S\n\n## NN S: X\nsources:: [report.md#overview]\n',
    );
    fs.rmSync(path.join(proj, 'artifacts', 'Exec_Summary_V_1-0-0.md'));
    provenance.buildProvenanceModel(proj, { projectName: 'Acme' });
    ok(checkLineage(proj).errors.length === 0, '--check clean on a synced workspace');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return { passed, failed };
}

module.exports = { run };

if (require.main === module) {
  const r = run();
  process.exit(r.failed > 0 ? 1 : 0);
}
