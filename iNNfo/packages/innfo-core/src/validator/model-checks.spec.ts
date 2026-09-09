import { describe, it, expect } from 'vitest'
import { Diagnostics } from '../diagnostics'
import { ElementsMap, type ParsedModel } from '../types'
import { checkFrontmatterInvariants } from './model-checks'

function frontmatterModel(fm: Record<string, unknown>): ParsedModel {
  return {
    frontmatter: fm as ParsedModel['frontmatter'],
    taxonomy: [],
    elements: new ElementsMap(),
    matrices: [],
    nodeMarkers: {},
    rawContent: '',
  }
}

const BASE_FM = {
  level: 3,
  parent_spec: { name: 'business_V_0-2-0', url: 'https://example.com/business_NN.md' },
  model_version: 'V_0-1-0',
}

describe('misuse-class stable codes (robustness-coda 1.2)', () => {
  it('L3 schema components carry a stable code and a fix example', () => {
    const d = new Diagnostics()
    checkFrontmatterInvariants(
      frontmatterModel({ ...BASE_FM, matrices: [{ name: 'persons-positions matrix' }] }),
      d,
    )

    expect(d.errors).toHaveLength(1)
    expect(d.errors[0].severity).toBe('error')
    expect(d.errors[0].code).toBe('L3_SCHEMA_COMPONENTS')
    expect(d.errors[0].message).toContain('Move them to the template')
    expect(d.errors[0].promptHint).toContain('parent template')
  })

  it('reserved concept names carry a stable code and a fix example', () => {
    const d = new Diagnostics()
    checkFrontmatterInvariants(
      frontmatterModel({ ...BASE_FM, concepts: [{ name: 'Concepts', type: 'text' }] }),
      d,
    )

    // `concepts` in a level-3 frontmatter is itself a schema component, so both
    // classes fire — and stay distinguished by code.
    const reserved = d.errors.find((e) => e.code === 'RESERVED_CONCEPT_NAME')
    expect(reserved).toBeDefined()
    expect(reserved!.severity).toBe('error')
    expect(reserved!.path).toBe('frontmatter.concepts.Concepts')
    expect(reserved!.message).toContain('Reserved concept name "Concepts"')
    expect(reserved!.promptHint).toContain('Rename')
  })

  it('codes stay stable across runs for the same misuse condition', () => {
    const run = (): string[] => {
      const d = new Diagnostics()
      checkFrontmatterInvariants(
        frontmatterModel({
          ...BASE_FM,
          matrices: [{ name: 'persons-positions matrix' }],
          concepts: [{ name: 'Markers', type: 'list' }],
        }),
        d,
      )
      return d.errors.map((e) => e.code ?? '')
    }

    const first = run()
    const second = run()
    expect(first).toEqual(['L3_SCHEMA_COMPONENTS', 'RESERVED_CONCEPT_NAME'])
    expect(second).toEqual(first)
  })

  it('both classes stay errors and fail validity (triangulation)', () => {
    const d = new Diagnostics()
    checkFrontmatterInvariants(
      frontmatterModel({
        ...BASE_FM,
        markers: [{ name: 'complexity' }],
        concepts: [{ name: 'Elements', type: 'list' }],
      }),
      d,
    )

    expect(d.valid).toBe(false)
    expect(d.errors.every((e) => e.severity === 'error')).toBe(true)
    expect(d.errors.map((e) => e.code).sort()).toEqual(
      ['L3_SCHEMA_COMPONENTS', 'RESERVED_CONCEPT_NAME'].sort(),
    )
  })
})
