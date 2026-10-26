import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { extractBlueprintSchema } from '../src/schema/extract.js'
import { extractSubmodelRefs } from '../src/recursiveParser/workspace.js'
import { validateDocument } from '../src/validator/index.js'

describe('retire-type-model: type:: model deprecation and aliasing to knowledge', () => {
  it('normalizes type:: model to knowledge during schema extraction', () => {
    const markdown = `---
spec_version: "V_0-3-0"
level: 2
parent_spec:
  name: iNNfo
  url: "https://example.com/iNNfo_V_0-3-0_NN.md"
title: "Deprecation Test"
---
# NN Concept Definition
## NN Concept Definition: SubProject
type:: model

# NN Field Definition
## NN Field Definition: custom_model
concept:: SubProject
type:: model
`
    const parsed = parseKnowledge(markdown)
    const schema = extractBlueprintSchema(parsed)

    const concept = schema.concepts.find((c) => c.name === 'SubProject')
    expect(concept).toBeDefined()
    expect(concept?.type).toBe('knowledge')

    const field = concept?.fields?.find((f) => f.name === 'custom_model')
    expect(field).toBeDefined()
    expect(field?.type).toBe('knowledge')
  })

  it('traverses fields declared as type:: model even with non-canonical names', () => {
    const schema = {
      concepts: [
        {
          name: 'Project',
          type: 'knowledge' as const,
          fields: [
            {
              name: 'my_sub_system',
              type: 'knowledge' as const,
              scope: 'concept' as const,
            },
          ],
        },
      ],
    }

    const content = `---
spec_version: "V_0-3-0"
level: 3
parent_spec:
  name: test
  url: "https://example.com"
---
# NN Project
## NN Project: Main
my_sub_system:: kNNowledge/nested_system_NN.md
`
    const refs = extractSubmodelRefs(content, 'kNNowledge/main_NN.md', schema)
    expect(refs.some((r) => r.path === 'kNNowledge/nested_system_NN.md')).toBe(true)
  })

  it('emits FIELD_TYPE_MODEL_DEPRECATED warning without failing validation', () => {
    const markdown = `---
spec_version: "V_0-3-0"
level: 2
parent_spec:
  name: iNNfo
  url: "https://example.com/iNNfo_V_0-3-0_NN.md"
title: "Warning Test"
---
# NN Concept Definition
## NN Concept Definition: Task
type:: text

# NN Field Definition
## NN Field Definition: linked_submodel
concept:: Task
type:: model
`
    const result = validateDocument(markdown, { fileName: 'test_bluepriNNt_NN.md', expectedLevel: 2 })
    const warning = result.warnings.find((w) => w.path === 'format.FIELD_TYPE_MODEL_DEPRECATED')
    expect(warning).toBeDefined()
    expect(warning?.severity).toBe('warning')
    expect(warning?.message).toContain('linked_submodel')
    expect(warning?.promptHint).toContain('type:: knowledge')

    // Document remains valid because it is a warning, not an error
    expect(result.valid).toBe(true)
    const fatalError = result.errors.find((e) => e.path.includes('model-retired'))
    expect(fatalError).toBeUndefined()
  })
})
