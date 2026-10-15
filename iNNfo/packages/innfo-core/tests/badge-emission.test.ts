import { describe, it, expect } from 'vitest'
import { serializeKnowledge } from '../src/parser/index.js'
import { scaffoldBodyFromSchema } from '../src/scaffold/knowledge.js'
import type { ParsedKnowledge } from '../src/types'

/**
 * [document-badge: Serializer and Generator Badge Emission]
 * Every emitter writes the canonical badge that points at the domain console
 * documentation, never at the retired hosted application.
 */
const CANONICAL_BADGE =
  '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.'

describe('canonical document badge emission', () => {
  it('serializeKnowledge emits the canonical badge for a model without a raw header', () => {
    const model = {
      frontmatter: { level: 3, knowledge_version: 'V_0-1-0', title: 'Badge Repro' },
      elements: new Map(),
      taxonomy: [],
      matrices: [],
      nodeMarkers: {},
    } as unknown as ParsedKnowledge
    const out = serializeKnowledge(model)
    expect(out).toContain(CANONICAL_BADGE)
  })

  it('scaffoldBodyFromSchema emits the canonical badge', () => {
    const out = scaffoldBodyFromSchema({ concepts: [], matrices: [], markers: [] } as never)
    expect(out).toContain(CANONICAL_BADGE)
  })
})
