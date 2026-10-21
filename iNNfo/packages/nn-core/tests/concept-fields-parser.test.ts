import { describe, it, expect } from 'vitest'
import { parseKnowledge, serializeKnowledge } from '../src/parser'

describe('Concept-Level Field Values (Task 1.10)', () => {
  it('parses concept-level field values directly after # NN <Concept>', () => {
    const doc = `---
spec_version: "V_0-5-0"
level: 3
title: "Concept Values"
---

# NN Goals
tags:: [core]
complexity:: 50

## NN Goals: Grow
tags:: [ai]

Goal description.
`
    const parsed = parseKnowledge(doc)
    expect(parsed.conceptFields).toBeDefined()
    expect(parsed.conceptFields!['Goals']).toEqual({
      tags: ['core'],
      complexity: 50,
    })
    expect(parsed.rawConceptFields!['Goals']).toEqual({
      tags: '[core]',
      complexity: '50',
    })
    // Element values are intact
    const goals = parsed.elements.get('Goals')!
    expect(goals).toBeDefined()
    expect(goals[0].name).toBe('Grow')
    expect(goals[0].fields.tags).toEqual(['ai'])
  })

  it('stops at the first non-property line so prose is never swallowed as a field', () => {
    const doc = `---
spec_version: "V_0-5-0"
level: 3
title: "Prose Not Swallowed"
---

# NN Goals
tags:: [core]
This is initial concept prose.
note:: this should stay prose!

## NN Goals: Grow
`
    const parsed = parseKnowledge(doc)
    expect(parsed.conceptFields!['Goals']).toEqual({
      tags: ['core'],
    })
    expect(parsed.conceptFields!['Goals']['note']).toBeUndefined()
    // Prose after the property block is preserved in rawSections or parse output
    expect(parsed.rawSections?.['Goals'] || parsed.rawContent).toContain('note:: this should stay prose!')
  })

  it('raises CONCEPT_FIELD_AFTER_PROSE warning when a key:: value line appears after prose in concept prologue', () => {
    const doc = `---
spec_version: "V_0-5-0"
level: 3
title: "Late Property Warning"
---

# NN Goals
Initial concept prose paragraph.
tags:: [core]

## NN Goals: Grow
Description.
`
    const parsed = parseKnowledge(doc)
    // The late property should NOT be in conceptFields
    expect(parsed.conceptFields?.['Goals']?.['tags']).toBeUndefined()
    // But should raise a parseWarning with CONCEPT_FIELD_AFTER_PROSE
    expect(parsed.parseWarnings).toBeDefined()
    expect(
      parsed.parseWarnings!.some(
        (w) => w.includes('CONCEPT_FIELD_AFTER_PROSE') && w.includes('Goals') && w.includes('tags'),
      ),
    ).toBe(true)
  })

  it('round-trips concept section holding only concept-level values and no elements byte-identically', () => {
    const doc = `---
spec_version: "V_0-5-0"
level: 3
title: "Values Only Section"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

# NN Goals
tags:: [core]
complexity:: 50
`
    const parsed = parseKnowledge(doc)
    expect(parsed.conceptFields!['Goals']).toEqual({
      tags: ['core'],
      complexity: 50,
    })
    const serialized = serializeKnowledge(parsed)
    expect(serialized).toBe(doc)
  })

  it('round-trips concept section with concept-level values AND elements byte-identically', () => {
    const doc = `---
spec_version: "V_0-5-0"
level: 3
title: "Full Section"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

# NN Goals
tags:: [core]
complexity:: 50

## NN Goals: Grow
tags:: [ai]

Goal description.
`
    const parsed = parseKnowledge(doc)
    const serialized = serializeKnowledge(parsed)
    expect(serialized).toBe(doc)
  })
})
