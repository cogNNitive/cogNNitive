import { describe, it, expect } from 'vitest'
import { resolveBlueprintSchema, canonicalizeDefinition } from '../src/index'

/* ────────────────────────────────────────────────────────────────────────────
 * D1 — deduplication of AST-identical Definitions across `includes`.
 *
 * When two included templates declare a Definition with the same name and an
 * AST-identical body, the composed schema keeps a single entry (silent merge).
 * When the bodies differ, it stays a collision ERROR naming both sources.
 * ──────────────────────────────────────────────────────────────────────────── */

const PARENT = {
  name: 'iNNfo_V_0-2-0',
  url: 'https://example.test/iNNfo_V_0-2-0_NN.md',
}

const SLICE_ONE = `---
level: 2
title: "Slice One"
parent_spec:
  name: "${PARENT.name}"
  url: "${PARENT.url}"
---

# NN Concept Definition
## NN Concept Definition: Market
type:: category

# NN Field Definition
## NN Field Definition: tags
concept:: *
type:: select
multiple:: true
`

// Same declaration, byte-identical to SLICE_ONE's.
const SLICE_TWO = `---
level: 2
title: "Slice Two"
parent_spec:
  name: "${PARENT.name}"
  url: "${PARENT.url}"
---

# NN Concept Definition
## NN Concept Definition: Analysis
type:: category

# NN Field Definition
## NN Field Definition: tags
concept:: *
type:: select
multiple:: true
`

// Same field name, DIFFERENT body (multiple).
const SLICE_TWO_DIVERGENT = SLICE_TWO.replace('multiple:: true', 'multiple:: false')

// Same body, different property order + whitespace (must still merge).
const SLICE_TWO_REORDERED = `---
level: 2
title: "Slice Two"
parent_spec:
  name: "${PARENT.name}"
  url: "${PARENT.url}"
---

# NN Concept Definition
## NN Concept Definition: Analysis
type:: category

# NN Field Definition
## NN Field Definition: tags
multiple::   true
type:: select
concept:: *
`

const UMBRELLA = `---
level: 2
title: "Umbrella"
parent_spec:
  name: "${PARENT.name}"
  url: "${PARENT.url}"
includes:
  - name: "slice_one"
    url: "https://example.test/slice_one_NN.md"
  - name: "slice_two"
    url: "https://example.test/slice_two_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Business summary
type:: text
`

const mk = (two: string) => (ref: { name: string }) => {
  const m: Record<string, string> = { slice_one: SLICE_ONE, slice_two: two }
  return m[ref.name.toLowerCase()] ?? null
}

describe('resolveBlueprintSchema — D1 AST-identical dedup across `includes`', () => {
  it('merges an identical Field declared by two included templates (no error, one entry)', () => {
    const { schema, errors } = resolveBlueprintSchema(UMBRELLA, mk(SLICE_TWO))
    expect(errors).toEqual([])
    expect(schema.concepts[0].fields?.some((f) => f.name === 'tags')).toBe(true)
    expect(schema.concepts.map((c) => c.name).sort()).toEqual([
      'Analysis',
      'Business summary',
      'Market',
    ])
  })

  it('merges when the two declarations differ only in property order / whitespace', () => {
    const { schema, errors } = resolveBlueprintSchema(UMBRELLA, mk(SLICE_TWO_REORDERED))
    expect(errors).toEqual([])
    expect(schema.concepts[0].fields?.some((f) => f.name === 'tags')).toBe(true)
  })

  it('still ERRORs when the same Field name is declared with a different body, naming both sources', () => {
    const { errors } = resolveBlueprintSchema(UMBRELLA, mk(SLICE_TWO_DIVERGENT))
    const collision = errors.find((e) => e.message.includes('tags'))
    expect(collision?.severity).toBe('error')
    expect(collision?.message).toMatch(/Slice One/)
    expect(collision?.message).toMatch(/Slice Two/)
  })
})

describe('canonicalizeDefinition', () => {
  it('is invariant to object key order', () => {
    expect(canonicalizeDefinition({ name: 'x', type: 'list', color: 'blue' } as never)).toBe(
      canonicalizeDefinition({ color: 'blue', type: 'list', name: 'x' } as never),
    )
  })

  it('is invariant to surrounding whitespace in string values', () => {
    expect(canonicalizeDefinition({ name: 'x', type: 'list', icon: '  plus ' } as never)).toBe(
      canonicalizeDefinition({ name: 'x', type: 'list', icon: 'plus' } as never),
    )
  })

  it('treats set-like arrays (applies_to) as order-insensitive', () => {
    expect(
      canonicalizeDefinition({ name: 'certainty', applies_to: ['Element', 'Concept'] } as never),
    ).toBe(
      canonicalizeDefinition({ name: 'certainty', applies_to: ['Concept', 'Element'] } as never),
    )
  })

  it('distinguishes definitions that actually differ', () => {
    expect(canonicalizeDefinition({ name: 'importance', symbol: '*' } as never)).not.toBe(
      canonicalizeDefinition({ name: 'importance', symbol: '!' } as never),
    )
  })
})
