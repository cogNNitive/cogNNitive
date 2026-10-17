import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'vitest';
import { bootstrapProject } from '../../../../skills/nn-sources/scripts/lib/bootstrap.js';
import {
  parseKnowledge,
  serializeKnowledge,
  applyMutation,
} from '@cognnitive/innfo-core';
import { pruneChangesets } from '../src/tools/prune-changesets.js';

async function runSmokeTest() {
  console.log('🚀 Starting Greenfield E2E Smoke Test...');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cognnitive-greenfield-smoke-'));

  try {
    const domainDir = path.join(tmpRoot, 'Test_Client_NN');
    fs.mkdirSync(domainDir, { recursive: true });

    // Step 1: Initialize domain in-place
    console.log('Step 1: In-place bootstrap');
    const bootstrapRes = bootstrapProject(null, domainDir, null, { inPlace: true });
    assert.strictEqual(bootstrapRes.projectDir, domainDir);
    assert(fs.existsSync(path.join(domainDir, 'AGENTS.md')), 'AGENTS.md created');
    assert(fs.existsSync(path.join(domainDir, 'domaiNN_NN.md')), 'domaiNN_NN.md created');
    assert(fs.existsSync(path.join(domainDir, 'sources', 'import')), 'sources/import created');
    console.log('  ✅ In-place bootstrap passed');

    // Step 2: Import primary source
    console.log('Step 2: Ingest primary source');
    const sourceContent = `# Business Plan\n\n## 1. Misión\n\nTransformar la suerte local.\n\n## 2. Campañas\n\nCampaña de navidad.\n`;
    fs.writeFileSync(path.join(domainDir, 'sources', 'import', 'plan.md'), sourceContent);
    assert(fs.existsSync(path.join(domainDir, 'sources', 'import', 'plan.md')), 'source file written');
    console.log('  ✅ Source ingestion passed');

    // Step 3: Scaffold blueprint and knowledge model with narrative concept + matrix
    console.log('Step 3: Model creation with narrative concept & matrix');
    const modelRaw = `---
spec_version: "V_0-1-0"
spec_url: "https://example.com/marketing_spec_NN.md"
level: 3
title: "Marketing Model"
knowledge_version: "V_0-1-0"
matrices:
  - name: "Mensajes × Públicos"
    slug: "mensajes-x-publicos"
---

# NN Marca

Texto inicial provisional.

# NN Campaña

## NN Campaña: Example Campaña
status:: Draft

# NN matrices: Mensajes × Públicos

| Mensajes \\ Públicos | Colectivos |
| :--- | :---: |
| - | - |
`;

    const model = parseKnowledge(modelRaw);

    // Step 4: Mutate narrative text concept
    console.log('Step 4: Update narrative text concept');
    const textRes = applyMutation(model, 'update_concept_text', {
      conceptName: 'Marca',
      text: 'Marca oficial: "La llave de Moya".',
    });
    assert.strictEqual(textRes.success, true);
    console.log('  ✅ update_concept_text passed');

    // Step 5: Update matrix with accented human-readable title
    console.log('Step 5: Update matrix with accented title');
    const matrixRes = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'Mensajes × Públicos',
      row: 'Oferta1',
      col: 'Colectivos',
      value: 'High',
    });
    assert.strictEqual(matrixRes.success, true);
    console.log('  ✅ Accented matrix cell update passed');

    // Step 6: Remove example element
    console.log('Step 6: Remove scaffold element');
    const removeRes = applyMutation(model, 'remove_element', {
      conceptName: 'Campaña',
      elementName: 'Example Campaña',
    });
    assert.strictEqual(removeRes.success, true);

    const serialized = serializeKnowledge(model);
    assert(!serialized.includes('Example Campaña'), 'Example Campaña removed from body');
    console.log('  ✅ Element removal clean');

    // Step 7: Changeset pruning
    console.log('Step 7: Prune changesets');
    const changesDir = path.join(domainDir, 'changes');
    const kDir = path.join(domainDir, 'kNNowledge');
    fs.mkdirSync(changesDir, { recursive: true });
    fs.mkdirSync(kDir, { recursive: true });

    const activeChangeset = 'domain_agent_20261016T120000Z_changes_NN.md';
    const deadChangeset = 'domain_agent_20261016T120100Z_changes_NN.md';
    const appliedChangeset = [
      '---',
      'spec_version: "V_0-4-0"',
      'level: 3',
      'parent_spec:',
      '  name: "changes"',
      '  url: "specs/changes_V_0-1-0_NN.md"',
      'blueprint_version: "V_0-1-0"',
      'status: applied',
      '---',
      '',
      '## NN Change: c-01',
      'op:: update_field',
      'target:: marketing@item&name',
      'to:: x',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(changesDir, activeChangeset), appliedChangeset);
    fs.writeFileSync(path.join(changesDir, deadChangeset), appliedChangeset);

    // Save model referencing only activeChangeset
    const finalModelContent = serialized + `\nsources:: [changes/${activeChangeset}@## NN Change: c-01]\n`;
    fs.writeFileSync(path.join(kDir, 'marketing_NN.md'), finalModelContent);

    const pruneRes = await pruneChangesets(domainDir, { dryRun: false });
    assert.strictEqual(pruneRes.deletedCount, 1);
    assert.strictEqual(pruneRes.deleted[0], deadChangeset);
    assert(fs.existsSync(path.join(changesDir, activeChangeset)), 'active changeset kept');
    assert(!fs.existsSync(path.join(changesDir, deadChangeset)), 'dead changeset pruned');
    console.log('  ✅ Changeset pruning passed');

    console.log('🎉 All Greenfield E2E Smoke Tests PASSED successfully!');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

describe('Greenfield E2E Smoke Test', () => {
  it('runs end-to-end greenfield lifecycle cleanly', async () => {
    await runSmokeTest();
  });
});
