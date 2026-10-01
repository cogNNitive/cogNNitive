import { describe, it, expect } from 'vitest'
import {
  buildConsolePayload,
  groupCitationsByField,
  citationFieldsFor,
} from '../src/index.js'
import type { ResolvedCitation } from '../src/index.js'

describe('Console Citations', () => {
  it('groups citations by field and omits field property from children', () => {
    const citations: ResolvedCitation[] = [
      {
        path: 'sources/nn/brief.md',
        anchor: 'intro',
        exists: true,
        field: 'sources',
        origin: 'document',
        excerpt: 'Brief excerpt',
      },
      {
        path: 'sources/nn/pricing.md',
        anchor: 'table',
        exists: true,
        field: 'precio_source',
        origin: 'reviewer',
        author: 'lead',
        excerpt: 'Pricing excerpt',
      },
      {
        path: 'sources/nn/extra.md',
        exists: true,
        field: 'sources',
        origin: 'human',
      },
    ]

    const grouped = groupCitationsByField(citations)
    expect(grouped).toEqual({
      sources: [
        {
          path: 'sources/nn/brief.md',
          anchor: 'intro',
          exists: true,
          origin: 'document',
          excerpt: 'Brief excerpt',
        },
        {
          path: 'sources/nn/extra.md',
          exists: true,
          origin: 'human',
        },
      ],
      precio_source: [
        {
          path: 'sources/nn/pricing.md',
          anchor: 'table',
          exists: true,
          origin: 'reviewer',
          author: 'lead',
          excerpt: 'Pricing excerpt',
        },
      ],
    })
  })

  it('identifies citation fields via name matching and schema type:: citation', () => {
    const mockSchema = {
      concepts: [{ name: 'Services' }],
      fields: [
        {
          concept: 'Services',
          name: 'precio_source',
          type: 'citation',
        },
        {
          concept: 'Services',
          name: 'regular_field',
          type: 'text',
        },
      ],
      markers: [],
      matrices: [],
    }

    const fields = {
      sources: 'sources/nn/brief.md',
      precio_source: 'sources/nn/pricing.md',
      regular_field: 'Some text',
      other_field: 'Other text',
    }

    const citationFields = citationFieldsFor('Services', fields, mockSchema)
    expect(citationFields).toEqual(['sources', 'precio_source'])
  })

  it('builds per-field citation map and sets meta.citationsResolvedAt when resolver is provided', () => {
    const markdown = `---
title: "Services Model"
knowledge_version: "V_1-0-0"
---

# NN Services
## NN Services: Ghost Capture
sources:: sources/nn/brief.md#intro
precio_source:: sources/nn/pricing.md#rates
`
    const mockSchema = {
      concepts: [{ name: 'Services' }],
      fields: [
        {
          concept: 'Services',
          name: 'precio_source',
          type: 'citation',
        },
      ],
      markers: [],
      matrices: [],
    }

    const mockResolver = (filePath: string) => {
      if (filePath === 'sources/nn/brief.md') {
        return {
          exists: true,
          content: '## Intro\nGhost capture services intro.\n',
        }
      }
      if (filePath === 'sources/nn/pricing.md') {
        return {
          exists: true,
          content: '## Rates\nStandard rate is $5000.\n',
        }
      }
      return { exists: false }
    }

    const payload = buildConsolePayload({
      content: markdown,
      schema: mockSchema,
      resolver: mockResolver,
    })

    expect(payload.model.meta.citationsResolvedAt).toBeDefined()
    expect(payload.model.meta.citationsResolvedAt).toBe(payload.model.meta.generated)

    const el = payload.model.elements[0]
    expect(el.citations).toBeDefined()
    expect(el.citations!.sources).toBeDefined()
    expect(el.citations!.precio_source).toBeDefined()
    expect(el.citations!.sources[0].path).toBe('sources/nn/brief.md')
    expect(el.citations!.sources[0].anchor).toBe('intro')
    expect((el.citations!.sources[0] as any).field).toBeUndefined()
    expect(el.citations!.precio_source[0].path).toBe('sources/nn/pricing.md')
  })
})
