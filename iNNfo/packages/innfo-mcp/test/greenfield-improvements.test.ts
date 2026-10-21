import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseKnowledge,
  serializeKnowledge,
  applyMutation,
} from '@cognnitive/nn-core'
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

})
