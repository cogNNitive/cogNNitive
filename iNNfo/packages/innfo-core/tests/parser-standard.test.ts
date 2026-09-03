import { describe, it, expect } from 'vitest'
import { parseModel, parseYaml, serializeModel } from '../src/parser'

describe('Standardised Parser (TDD)', () => {
  it('parses complex nested frontmatter with standard YAML features', () => {
    const yamlStr = `
spec_version: "V_0-2-0"
nested:
  nested_list:
    - name: "Item 1"
      value: true
    - name: "Item 2"
      value: false
inline_array: [10, 20, 30]
inline_object: { key: "value", num: 42 }
multi_line: |
  Line 1
  Line 2
`
    const parsed = parseYaml(yamlStr)
    expect(parsed.nested).toEqual({
      nested_list: [
        { name: 'Item 1', value: true },
        { name: 'Item 2', value: false },
      ],
    })
    expect(parsed.inline_array).toEqual([10, 20, 30])
    expect(parsed.inline_object).toEqual({ key: 'value', num: 42 })
    expect(parsed.multi_line).toBe('Line 1\nLine 2\n')
  })

  it('parses a model with complex section boundaries and list syntax', () => {
    const modelContent = `---
spec_version: "V_0-2-0"
level: 3
model_version: "V_1-0-0"
title: "Complex Model"
---

# NN Stakeholders

## NN Stakeholders: Customer

importance:: "high"
needs:: ["speed", "accuracy"]

  Customer description goes here.
  It can span multiple lines.

## NN Stakeholders: Partner

importance:: "medium"

  Partner description.
`
    const model = parseModel(modelContent)
    const list = model.elements.get('Stakeholders')
    expect(list).toBeDefined()
    expect(list).toHaveLength(2)

    const customer = list![0]
    expect(customer.name).toBe('Customer')
    expect(customer.fields.importance).toBe('high')
    expect(customer.fields.needs).toEqual(['speed', 'accuracy'])
    expect(customer.description).toContain('Customer description goes here.')

    const partner = list![1]
    expect(partner.name).toBe('Partner')
    expect(partner.fields.importance).toBe('medium')
    expect(partner.description).toBe('Partner description.')
  })

  it('preserves free-form Markdown content of `text` concepts in rawSections', () => {
    const modelContent = `---
spec_version: "V_0-2-0"
level: 3
model_version: "V_1-0-0"
title: "Text Concept Model"
---

# NN index

* [[Market size]]

# NN Market size

En España fallecieron 439.146 personas en 2024 (INE).

**TAM:** ~500.000 procesos de reparto anuales.

# NN Stakeholders

## NN Stakeholders: Customer
  Customer description.
`
    const model = parseModel(modelContent)
    expect(model.rawSections).toBeDefined()
    // `text` concepts have no elements but their body IS the content.
    expect(model.elements.get('Market size')).toBeUndefined()
    expect(model.rawSections!['Market size']).toContain(
      'En España fallecieron 439.146 personas en 2024 (INE).',
    )
    expect(model.rawSections!['Market size']).toContain(
      '**TAM:** ~500.000 procesos de reparto anuales.',
    )
    // Element-bearing concepts are serialized from `elements`; their raw body
    // is not duplicated in rawSections.
    expect(model.rawSections!['Stakeholders']).toBeUndefined()
  })

  it('round-trips `text` concept content through serializer', () => {
    const modelContent = `---
spec_version: "V_0-2-0"
level: 3
model_version: "V_1-0-0"
title: "Text Round Trip"
---

# NN index

* [[Market size]]

# NN Market size

En España fallecieron 439.146 personas en 2024 (INE).

**TAM:** ~500.000 procesos de reparto anuales.
`
    const model = parseModel(modelContent)
    expect(model.rawSections!['Market size']).toContain('**TAM:**')

    const serialized = serializeModel(model)
    expect(serialized).toContain('# NN Market size')
    expect(serialized).toContain('En España fallecieron 439.146 personas en 2024 (INE).')
    expect(serialized).toContain('**TAM:** ~500.000 procesos de reparto anuales.')
  })

  it('parses tags:: property correctly and normalizes them', () => {
    const modelContent = `---
spec_version: "V_0-2-0"
level: 3
title: "Tags Model"
---

# NN Some Concept
tags:: tag1, Tag2,   TAG3 , tag1 

## NN Some Concept: Some Element
tags:: el-tag1 , EL-tag2, , el-tag3

This is an element with tags.
`
    const parsed = parseModel(modelContent)

    // Check Concept tags
    expect(parsed.conceptTags).toBeDefined()
    expect(parsed.conceptTags!['Some Concept']).toEqual(['tag1', 'tag2', 'tag3', 'tag1'])

    // Check Element tags
    const elements = parsed.elements.get('Some Concept')
    expect(elements).toBeDefined()
    expect(elements![0].tags).toEqual(['el-tag1', 'el-tag2', 'el-tag3'])

    // Check Serialization round-trip
    const serialized = serializeModel(parsed)
    expect(serialized).toContain('tags:: tag1, tag2, tag3, tag1')
    expect(serialized).toContain('tags:: el-tag1, el-tag2, el-tag3')

    const reParsed = parseModel(serialized)
    expect(reParsed.conceptTags!['Some Concept']).toEqual(['tag1', 'tag2', 'tag3', 'tag1'])
    expect(reParsed.elements.get('Some Concept')![0].tags).toEqual([
      'el-tag1',
      'el-tag2',
      'el-tag3',
    ])
  })
})
