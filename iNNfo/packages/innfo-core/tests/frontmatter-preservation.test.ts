import { describe, it, expect } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../src/parser/index.js'

/**
 * A Level-2 blueprint whose frontmatter carries keys the constructed emit path
 * does not model (`procedures`, `relationship_types`). Regression: mutating a
 * *known* key switched `serializeKnowledge` off the raw-frontmatter path and
 * silently dropped these keys.
 */
const BLUEPRINT = `---
spec_version: "V_0-5-0"
spec_url: "specs/bluepriNNts/accounting/V_0-2-0/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://example.com/iNNfo_V_0-5-0_NN.md"
title: "Accounting App"
blueprint_name: "accounting"
blueprint_version: "V_0-2-0"
procedures:
  - id: "quarter-close"
    name: "Cierre Contable Trimestral"
    path: "procedures/quarter_close_procedures_NN.md"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

# NN index

* [[Entity]]
`

describe('serializeKnowledge preserves unmanaged frontmatter keys', () => {
  it('keeps the author text when nothing changed (raw-frontmatter path)', () => {
    const out = serializeKnowledge(parseKnowledge(BLUEPRINT))
    expect(out).toContain('procedures:')
    expect(out).toContain('relationship_types:')
  })

  it('keeps unrecognised keys after a managed key is mutated (bump_version)', () => {
    const model = parseKnowledge(BLUEPRINT)
    // What `bumpBlueprintVersion` does: change one known key in place, then save.
    model.frontmatter.blueprint_version = 'V_0-2-1'

    const out = serializeKnowledge(model)

    expect(out).toContain('blueprint_version: "V_0-2-1"')
    // The unmanaged keys must survive the reconstructed emit path.
    expect(out).toContain('procedures:')
    expect(out).toContain('quarter_close_procedures_NN.md')
    expect(out).toContain('relationship_types:')
    expect(out).toContain('sequence:')
  })

  it('round-trips that mutated document: the unknown keys survive a re-parse', () => {
    const model = parseKnowledge(BLUEPRINT)
    model.frontmatter.blueprint_version = 'V_0-2-1'

    const reparsed = parseKnowledge(serializeKnowledge(model))

    expect(reparsed.frontmatter.blueprint_version).toBe('V_0-2-1')
    expect(reparsed.frontmatter.procedures).toBeDefined()
    expect(reparsed.frontmatter.relationship_types).toBeDefined()
  })
})
