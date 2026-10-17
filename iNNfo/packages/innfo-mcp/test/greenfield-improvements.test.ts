import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseKnowledge,
  serializeKnowledge,
  applyMutation,
} from '@cognnitive/innfo-core'
import { pruneChangesets } from '../src/tools/prune-changesets.js'
import { applyChange } from '../src/tools/mutate.js'
import { writeProposedChangeset } from '../src/tools/propose-changeset.js'

describe('Greenfield Improvements & Tooling Hardening', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'innfo-greenfield-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('update_concept_text updates primitive: text concepts without requiring elements', () => {
    const raw = `---
spec_version: "V_0-1-0"
spec_url: "https://example.com/spec.md"
level: 3
title: "Brand Model"
knowledge_version: "V_0-1-0"
---

# NN Marca

Texto inicial de la marca.
`
    const model = parseKnowledge(raw)
    const result = applyMutation(model, 'update_concept_text', {
      conceptName: 'Marca',
      text: 'Nueva narrativa de marca: "La llave de Moya abre tu suerte".',
    })

    expect(result.success).toBe(true)
    const serialized = serializeKnowledge(model)
    expect(serialized).toContain('# NN Marca')
    expect(serialized).toContain('Nueva narrativa de marca: "La llave de Moya abre tu suerte".')
    expect(serialized).not.toContain('Texto inicial de la marca.')
  })

  it('remove_element cascades to model.matrices so deleted elements leave no orphan cells', () => {
    const raw = `---
spec_version: "V_0-1-0"
spec_url: "https://example.com/spec.md"
level: 3
title: "Campaign Model"
knowledge_version: "V_0-1-0"
matrices:
  - name: "Campaign × Audience"
---

# NN Campaign

## NN Campaign: Example Campaña
status:: Draft

# NN matrices: Campaign × Audience

| Campaign \\ Audience | General |
| :--- | :---: |
| Example Campaña | High |
`
    const model = parseKnowledge(raw)
    expect(model.matrices[0].cells.length).toBe(1)

    const result = applyMutation(model, 'remove_element', {
      conceptName: 'Campaign',
      elementName: 'Example Campaña',
    })

    expect(result.success).toBe(true)
    expect(result.cascadedMatrixCells).toBe(1)
    expect(model.matrices[0].cells.length).toBe(0)
    const serialized = serializeKnowledge(model)
    expect(serialized).not.toContain('Example Campaña')
  })

  it('update_matrix_cell resolves accented and non-ASCII matrix titles transparently', () => {
    const raw = `---
spec_version: "V_0-1-0"
spec_url: "https://example.com/spec.md"
level: 3
title: "Matrix Model"
knowledge_version: "V_0-1-0"
matrices:
  - name: "Mensajes × Públicos"
    slug: "mensajes-x-publicos"
---

# NN matrices: Mensajes × Públicos

| Mensajes \\ Públicos | Colectivos |
| :--- | :---: |
| - | - |
`
    const model = parseKnowledge(raw)

    // Call updateMatrixCell with human-readable accented title containing multiplication sign
    const result = applyMutation(model, 'update_matrix_cell', {
      matrixName: 'Mensajes × Públicos',
      row: 'Mensaje1',
      col: 'Colectivos',
      value: 'High',
    })

    expect(result.success).toBe(true)
    const serialized = serializeKnowledge(model)
    expect(serialized).toContain('| Mensaje1 | High |')
  })

  it('prune_changesets removes unreferenced changesets from changes/ and keeps cited ones', async () => {
    const changesDir = join(tempDir, 'changes')
    const kDir = join(tempDir, 'kNNowledge')
    await mkdir(changesDir, { recursive: true })
    await mkdir(kDir, { recursive: true })

    const citedChangeName = 'acme_agent_20261016T120000Z_changes_NN.md'
    const unreferencedChangeName = 'test_exploratory_20261016T120500Z_changes_NN.md'

    const appliedChangeset = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "changes"
  url: "specs/changes_V_0-1-0_NN.md"
blueprint_version: "V_0-1-0"
status: applied
---

## NN Change: c-01
op:: update_field
target:: model@item&name
to:: x
`
    await writeFile(join(changesDir, citedChangeName), appliedChangeset)
    await writeFile(join(changesDir, unreferencedChangeName), appliedChangeset)

    // Knowledge model citing citedChangeName
    const modelContent = `---
level: 3
---
# NN Model
## NN Item: Test
sources:: [changes/${citedChangeName}@## NN Change: c-01]
`
    await writeFile(join(kDir, 'model_NN.md'), modelContent)

    // Run pruneChangesets with dryRun: true
    const dryRunRes = await pruneChangesets(tempDir, { dryRun: true })
    expect(dryRunRes.deletedCount).toBe(1)
    expect(dryRunRes.deleted).toContain(unreferencedChangeName)
    expect(dryRunRes.kept).toContain(citedChangeName)

    // Run pruneChangesets for real
    const liveRes = await pruneChangesets(tempDir, { dryRun: false })
    expect(liveRes.deletedCount).toBe(1)
    expect(liveRes.deleted).toContain(unreferencedChangeName)

    // Verify unreferenced file was deleted, cited file kept
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(changesDir, unreferencedChangeName))).toBe(false)
    expect(existsSync(join(changesDir, citedChangeName))).toBe(true)
  })
})
