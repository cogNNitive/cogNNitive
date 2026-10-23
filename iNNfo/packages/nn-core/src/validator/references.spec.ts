import { describe, it, expect } from 'vitest'
import { validateElementFieldReferences } from './references.js'
import { ElementsMap, type Concept, type ParsedKnowledge } from '../types/index.js'

function modelWithSubmodelField(submodelValue: string): {
  model: ParsedKnowledge
  templateConcepts: Concept[]
} {
  const elements = new ElementsMap()
  elements.set('Docs', [
    {
      type: 'Docs',
      name: 'Guide',
      description: '',
      fields: { submodel: submodelValue },
      markers: {},
    },
  ])
  const model: ParsedKnowledge = {
    frontmatter: { spec_version: 'V_0-2-0', spec_url: '', level: 3 } as ParsedKnowledge['frontmatter'],
    taxonomy: [],
    elements,
    matrices: [],
    nodeMarkers: {},
    rawContent: '',
  }
  const templateConcepts: Concept[] = [
    {
      name: 'Docs',
      type: 'knowledge',
      fields: [{ name: 'submodel', type: 'knowledge', target_blueprint: 'procedures' }],
    },
  ]
  return { model, templateConcepts }
}

describe('submodel conformance coded warnings (validator-robustness Unit 2)', () => {
  it('Missing submodel warns with a stable code and path-fix hint', () => {
    const { model, templateConcepts } = modelWithSubmodelField('models/missing_NN.md')
    const diagnostics = validateElementFieldReferences(model, templateConcepts, {
      resolveSubmodel: () => ({ exists: false }),
      referringPath: 'models/guide_NN.md',
    })

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].severity).toBe('warning')
    expect(diagnostics[0].code).toBe('SUBMODEL_NOT_FOUND')
    expect(diagnostics[0].path).toBe('elements.Docs.Guide.fields.submodel')
    expect(diagnostics[0].promptHint).toContain('models/missing_NN.md')
  })

  it('Mismatch warns with a stable code, both template names, and a declaration-fix hint', () => {
    const { model, templateConcepts } = modelWithSubmodelField('models/auth_NN.md')
    const diagnostics = validateElementFieldReferences(model, templateConcepts, {
      resolveSubmodel: () => ({ exists: true, templateName: 'procedures' }),
      referringPath: 'models/guide_NN.md',
    })

    // Sanity: the fixture really declares a different expected template.
    expect(templateConcepts[0].fields?.[0].target_blueprint).toBe('procedures')

    const mismatchConcepts: Concept[] = [
      {
        name: 'Docs',
        type: 'knowledge',
        fields: [{ name: 'submodel', type: 'knowledge', target_blueprint: 'business' }],
      },
    ]
    const mismatch = validateElementFieldReferences(model, mismatchConcepts, {
      resolveSubmodel: () => ({ exists: true, templateName: 'procedures' }),
      referringPath: 'models/guide_NN.md',
    })

    expect(diagnostics).toEqual([])
    expect(mismatch).toHaveLength(1)
    expect(mismatch[0].severity).toBe('warning')
    expect(mismatch[0].code).toBe('SUBMODEL_TEMPLATE_MISMATCH')
    expect(mismatch[0].message).toContain('business')
    expect(mismatch[0].message).toContain('procedures')
    expect(mismatch[0].promptHint).toContain('business')
  })

  it('Match by name passes with no diagnostic', () => {
    const { model, templateConcepts } = modelWithSubmodelField('models/auth_NN.md')
    const diagnostics = validateElementFieldReferences(model, templateConcepts, {
      resolveSubmodel: () => ({ exists: true, templateName: 'procedures' }),
      referringPath: 'models/guide_NN.md',
    })

    expect(diagnostics).toEqual([])
  })

  it('Match by URL passes with no diagnostic', () => {
    const urlConcepts: Concept[] = [
      {
        name: 'Docs',
        type: 'knowledge',
        fields: [
          {
            name: 'submodel',
            type: 'knowledge',
            target_blueprint: 'https://example.com/specs/procedures_NN.md',
          },
        ],
      },
    ]
    const { model } = modelWithSubmodelField('models/auth_NN.md')
    const diagnostics = validateElementFieldReferences(model, urlConcepts, {
      resolveSubmodel: () => ({
        exists: true,
        templateName: 'other',
        templateUrl: 'https://example.com/specs/procedures_NN.md',
      }),
      referringPath: 'models/guide_NN.md',
    })

    expect(diagnostics).toEqual([])
  })
})

describe('address field validation (change D)', () => {
  function modelWithAddressField(value: string): {
    model: ParsedKnowledge
    templateConcepts: Concept[]
  } {
    const elements = new ElementsMap()
    elements.set('Pricing', [
      { type: 'Pricing', name: 'SKU', description: '', fields: { ref: value }, markers: {} },
    ])
    const model: ParsedKnowledge = {
      frontmatter: { spec_version: 'V_0-5-0', spec_url: '', level: 3 } as ParsedKnowledge['frontmatter'],
      taxonomy: [],
      elements,
      matrices: [],
      nodeMarkers: {},
      rawContent: '',
    }
    const templateConcepts: Concept[] = [
      { name: 'Pricing', type: 'list', fields: [{ name: 'ref', type: 'address' }] },
    ]
    return { model, templateConcepts }
  }

  it('flags a malformed address (dangling @) as an error', () => {
    const { model, templateConcepts } = modelWithAddressField('pricing@')
    const diagnostics = validateElementFieldReferences(model, templateConcepts, {})
    expect(diagnostics.map((d) => d.code)).toEqual(['ADDRESS_MALFORMED'])
    expect(diagnostics[0].severity).toBe('error')
  })

  it('accepts a <target>@<unit> address and a bare whole-document target', () => {
    for (const value of ['pricing@sku-42&precio', 'strategy']) {
      const { model, templateConcepts } = modelWithAddressField(value)
      expect(validateElementFieldReferences(model, templateConcepts, {})).toEqual([])
    }
  })
})
