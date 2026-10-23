import { describe, it, expect } from 'vitest'
import { parseNature } from '../../src/schema/nature.js'

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
