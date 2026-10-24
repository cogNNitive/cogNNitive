import { describe, it, expect } from 'vitest'
import { parseNature, natureOfBlueprint } from '../../src/schema/nature.js'

describe('parseNature', () => {
  it('returns no nature and no diagnostics when the block is absent', () => {
    expect(parseNature({})).toEqual({ diagnostics: [] })
  })

  it('reads a valid nature', () => {
    const { nature, diagnostics } = parseNature({
      nature: { structure: 'members', ownership: 'derived' },
    })
    expect(nature).toEqual({ structure: 'members', ownership: 'derived' })
    expect(diagnostics).toEqual([])
  })

  it('flags an unknown structure and resolves no nature', () => {
    const { nature, diagnostics } = parseNature({
      nature: { structure: 'collection', ownership: 'derived' },
    })
    expect(nature).toBeUndefined()
    expect(diagnostics.map((d) => d.code)).toEqual(['NATURE_UNKNOWN_STRUCTURE'])
  })

  it('flags an unknown ownership', () => {
    const { diagnostics } = parseNature({
      nature: { structure: 'catalog', ownership: 'immutable' },
    })
    expect(diagnostics.map((d) => d.code)).toEqual(['NATURE_UNKNOWN_OWNERSHIP'])
  })

  it('flags a non-mapping nature', () => {
    const { diagnostics } = parseNature({ nature: 'members' })
    expect(diagnostics.map((d) => d.code)).toEqual(['NATURE_INVALID_SHAPE'])
  })
})

describe('natureOfBlueprint', () => {
  it('resolves the declared core collections', () => {
    expect(natureOfBlueprint('sources')).toEqual({ structure: 'catalog', ownership: 'derived' })
    expect(natureOfBlueprint('artifacts')).toEqual({ structure: 'catalog', ownership: 'derived' })
    expect(natureOfBlueprint('procedures')).toEqual({ structure: 'catalog', ownership: 'derived' })
  })

  it('declares the changes collection as members/derived', () => {
    expect(natureOfBlueprint('changes')).toEqual({ structure: 'members', ownership: 'derived' })
  })

  it('returns undefined for undeclared or domain-local blueprints', () => {
    expect(natureOfBlueprint('workspace')).toBeUndefined()
    expect(natureOfBlueprint('business')).toBeUndefined()
  })
})
