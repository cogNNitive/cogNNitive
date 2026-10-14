import { describe, it, expect } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../../src/parser/index.js'
import { applyMutation } from '../../src/mutate.js'
import { parseChangeset } from '../../src/changeset/parser.js'

/**
 * S3b P0-3 (`changeset-apply-engine`: Field updates preserve the value type).
 *
 * `changeset/parser.ts` always yields `to::` as a STRING; the MCP engine passes
 * that string straight into core `updateField`. Core has no changeset executor,
 * so this suite mirrors that call — parse the changeset, hand `to` to
 * `applyMutation`, then serialize and re-parse — which is exactly the engine's
 * path once the change reaches the mutation layer.
 */

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "V_0-1-0"
title: "Pricing"
---

# NN Metrics
## NN Metrics: Growth
price:: 5
summary:: initial text
`

const CHANGESET = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: proposed
title: "Type preservation"
---

# NN Change

## NN Change: c-01
op:: update_field
target:: pricing@Growth&price
to:: 7
author:: agent-writer
`

describe('changeset update_field preserves the existing value type', () => {
  it('8.2.1 to:: 7 on price:: 5 serializes price:: 7 and re-parses as the number 7', () => {
    const model = parseKnowledge(MODEL)
    const doc = parseChangeset(CHANGESET)
    const change = doc.changes[0]

    const result = applyMutation(model, 'update_field', {
      target: change.target,
      to: change.to,
    })
    expect(result.success).toBe(true)

    const serialized = serializeKnowledge(model)
    expect(serialized).toContain('price:: 7')
    expect(serialized).not.toContain('price:: "7"')

    const reparsed = parseKnowledge(serialized)
    expect(reparsed.elements.get('Metrics')?.[0].fields.price).toBe(7)
  })

  it('8.2.2 a multi-line value serializes and re-parses to the same string', () => {
    const model = parseKnowledge(MODEL)
    const result = applyMutation(model, 'update_field', {
      target: 'pricing@Growth&summary',
      value: 'line one\nline two',
    })
    expect(result.success).toBe(true)

    const serialized = serializeKnowledge(model)
    // The serializer writes the multi-line string as a JSON string with an
    // escaped newline (`\n` = backslash + n in the file).
    expect(serialized).toContain('summary:: "line one\\nline two"')

    const reparsed = parseKnowledge(serialized)
    expect(reparsed.elements.get('Metrics')?.[0].fields.summary).toBe('line one\nline two')
  })
})
