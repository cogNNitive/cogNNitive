import { describe, it, expect } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../../src/parser/index.js'
import { applyMutation } from '../../src/mutate.js'
import { checkRemovedMarkerConstructs } from '../../src/validator/removed-constructs.js'

// Spec: markers-removed-diagnostic — "A full remediation is expressible as one
// changeset". The nn-innfo recipe re-expresses a legacy document as ordinary
// `tags`/Field values plus `remove_matrix`; after applying it, the document
// carries no marker construct and validates clean.
function legacyModel() {
  return parseKnowledge(`---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Legacy Model"
---

# NN Initiative

## NN Initiative: Alpha
  slug:: alpha
  priority:: high

# NN matrices: item-markers matrix
| marker \\\\ element | Alpha |
| :--- | :---: |
| priority | X |
`)
}

describe('Recipe: MARKERS_REMOVED is expressible as one changeset', () => {
  it('reports the legacy construct before remediation', () => {
    expect(checkRemovedMarkerConstructs(legacyModel()).length).toBeGreaterThan(0)
  })

  it('update_concept_field + remove_matrix clears the diagnostic and validates clean', () => {
    const model = legacyModel()

    const conceptField = applyMutation(model, 'update_concept_field', {
      conceptName: 'Initiative',
      fieldName: 'tags',
      value: '[core]',
    })
    expect(conceptField.success).toBe(true)

    const dropMatrix = applyMutation(model, 'remove_matrix', { matrixName: 'item-markers matrix' })
    expect(dropMatrix.success).toBe(true)

    // The serialized document now carries no marker construct: it re-parses and
    // validates clean.
    const serialized = serializeKnowledge(model)
    expect(serialized).toContain('tags:: [core]')
    expect(serialized).not.toContain('item-markers matrix')
    expect(checkRemovedMarkerConstructs(parseKnowledge(serialized))).toHaveLength(0)
  })
})
