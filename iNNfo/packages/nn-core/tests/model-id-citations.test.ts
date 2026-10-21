import { describe, it, expect } from 'vitest'
import { parseCitation, resolveUnitPath } from '../src/index.js'

describe('model ids with underscores and capitals', () => {
  it('resolveUnitPath accepts a model file stem', () => {
    expect(resolveUnitPath('cognnitive_repository')).toEqual({
      filePath: 'cognnitive_repository',
      kind: 'model',
    })
    expect(resolveUnitPath('Client_business')?.kind).toBe('model')
  })

  it('parseCitation resolves a matrix @ pointer addressed by model id', () => {
    const cit = parseCitation('cognnitive_repository@a&b')
    expect(cit).not.toBeNull()
    expect(cit?.filePath).toBe('cognnitive_repository')
    expect(cit?.kind).toBe('model')
  })

  it('parseCitation resolves a bare model id with a legacy heading slug', () => {
    const ref = parseCitation('cognnitive_repository#intro')
    expect(ref?.filePath).toBe('cognnitive_repository')
    expect(ref?.slug).toBe('intro')
  })

  it('still rejects things that are not model stems', () => {
    expect(resolveUnitPath('a b')).toBeNull()
    expect(resolveUnitPath('foo.txt')).toBeNull()
    expect(resolveUnitPath('_x')).toBeNull()
  })
})
