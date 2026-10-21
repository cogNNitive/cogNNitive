import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { validateKnowledge } from '../src/validator/index.js'
import { buildConsolePayload } from '../src/console/payload-builder.js'
import { checkElementsAgainstSchema } from '../src/schema/metaschema.js'
import { resolveBlueprintSchema } from '../src/schema/compose.js'
import type { ElementNode, ParsedKnowledge } from '../src/types/parser.js'
import type { BlueprintSchema } from '../src/types/parser.js'

describe('Task 3.7: tags-as-plain-field (No Reserved tags Property)', () => {
  const blueprintWithTagsMd = `---
spec_version: V_0-5-0
blueprint_version: V_0-1-0
level: 2
parent_spec:
  name: iNNfo
  url: https://raw.githubusercontent.com/the-innfo/iNNfo/main/specs/iNNfo_V_0-5-0_NN.md
title: Test Blueprint With Tags
---

# NN Concept Definition
## NN Concept Definition: Task

# NN Field Definition
## NN Field Definition: tags
concept:: Task
type:: select
multiple:: true
scope:: open
`

  const blueprintWithoutTagsMd = `---
spec_version: V_0-5-0
blueprint_version: V_0-1-0
level: 2
parent_spec:
  name: iNNfo
  url: https://raw.githubusercontent.com/the-innfo/iNNfo/main/specs/iNNfo_V_0-5-0_NN.md
title: Test Blueprint Without Tags
---

# NN Concept Definition
## NN Concept Definition: Task

# NN Field Definition
## NN Field Definition: title
concept:: Task
type:: string
`

  it('parses declared tags into element.fields and does not populate node.tags or model.conceptTags', () => {
    const markdown = `---
spec_version: V_0-5-0
level: 3
parent_spec:
  name: test-bp
  url: https://example.com/test-bp
title: Sample
---

# NN Task
tags:: [core]

## NN Task: Implement Auth
slug:: implement-auth
tags:: [security, backend]

Prose description.
`
    const parsed = parseKnowledge(markdown)

    // Concept level
    expect((parsed as any).conceptTags).toBeUndefined()
    expect(parsed.conceptFields?.['Task']?.['tags']).toEqual(['core'])

    // Element level
    const elements = parsed.elements.get('Task')
    expect(elements).toHaveLength(1)
    const el = elements![0]

    expect((el as any).tags).toBeUndefined()
    expect((el as any).rawTags).toBeUndefined()
    expect(el.fields['tags']).toEqual(['security', 'backend'])
  })

  it('undeclared tags:: behaves like any undeclared property without tag-specific behavior', () => {
    const markdown = `---
spec_version: V_0-5-0
level: 3
parent_spec:
  name: no-tags-bp
  url: https://example.com/no-tags-bp
title: Sample
---

# NN Task

## NN Task: Do Work
slug:: do-work
tags:: [random]
title:: Work

Some description.
`
    const parsed = parseKnowledge(markdown)
    const el = parsed.elements.get('Task')![0]
    expect(el.fields['tags']).toEqual(['random'])
    expect((el as any).tags).toBeUndefined()

    // When validated against blueprint with unknownProperty: 'error', treats tags exactly like any other undeclared property
    const template = { rawContent: blueprintWithoutTagsMd }
    const composed = resolveBlueprintSchema(template.rawContent)
    const diags = checkElementsAgainstSchema(
      [['Task', [el]]],
      composed.schema.concepts,
      { unknownProperty: 'error' },
    )
    const tagDiag = diags.find((d) => d.message.includes('Property "tags" is not declared on Task'))
    expect(tagDiag).toBeDefined()
  })

  it('closed select tags validates and rejects invalid option with diagnostic', () => {
    const blueprintClosedTagsMd = `---
spec_version: V_0-5-0
blueprint_version: V_0-1-0
level: 2
parent_spec:
  name: iNNfo
  url: https://raw.githubusercontent.com/the-innfo/iNNfo/main/specs/iNNfo_V_0-5-0_NN.md
title: Test Blueprint Closed Tags
---

# NN Concept Definition
## NN Concept Definition: Task

# NN Field Definition
## NN Field Definition: tags
concept:: Task
type:: select
multiple:: true
scope:: closed
options:: [alpha, beta]
`
    const markdown = `---
spec_version: V_0-5-0
level: 3
parent_spec:
  name: closed-tags-bp
  url: https://example.com/closed-tags-bp
title: Sample
---

# NN Task

## NN Task: Invalid Option
slug:: invalid-option
tags:: [gamma]
`
    const parsed = parseKnowledge(markdown)
    const diags = validateKnowledge(parsed, { rawContent: blueprintClosedTagsMd } as any)
    const invalidOpt = diags.errors.find((d) => d.message.includes('gamma'))
    expect(invalidOpt).toBeDefined()
  })

  it('payload builder reflects tags through standard element.fields and inheritance', () => {
    const markdown = `---
spec_version: V_0-5-0
level: 3
parent_spec:
  name: test-bp
  url: https://example.com/test-bp
title: Sample
---

# NN Task
tags:: [core]

## NN Task: Task A
slug:: task-a
tags:: [ai]

## NN Task: Task B
slug:: task-b
`
    const payload = buildConsolePayload({
      content: markdown,
      schema: blueprintWithTagsMd,
    })

    const elA = payload.model.elements.find((e) => e.name === 'Task A')!
    const elB = payload.model.elements.find((e) => e.name === 'Task B')!

    expect(elA.fields['tags']).toEqual(['ai'])
    expect(elA.inherited?.['tags']).toEqual({ value: ['core'], from: 'Task' })
    expect(elB.fields['tags']).toBeUndefined()
    expect(elB.inherited?.['tags']).toEqual({ value: ['core'], from: 'Task' })
    expect((elA as any).tags).toBeUndefined()
  })
})



