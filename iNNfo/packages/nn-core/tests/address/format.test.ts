import { describe, it, expect } from 'vitest'
import { parseAddress, formatAddress, isAddressError } from '../../src/address/index'
import type { Address, ModelId, Unit } from '../../src/address/index'

const id = (value: string) => value as ModelId

describe('formatAddress - canonical output for every kind', () => {
  it.each<[string, Address, string]>([
    ['model', { kind: 'model', model: id('villabotijos-today/intro') }, 'villabotijos-today/intro'],
    [
      'element',
      { kind: 'unit', model: id('a/b'), unit: { kind: 'element', slug: 's' } },
      'a/b@s',
    ],
    [
      'field',
      { kind: 'unit', model: id('a/b'), unit: { kind: 'element', slug: '00-gancho', field: 'voice' } },
      'a/b@00-gancho&voice',
    ],
    [
      'body',
      { kind: 'unit', model: id('a/b'), unit: { kind: 'body', slug: 's' } },
      'a/b@s&#body',
    ],
    [
      'cell',
      { kind: 'unit', model: id('m'), unit: { kind: 'cell', matrix: 'swot', row: 'r1', col: 'c1' } },
      'm@swot&r1&c1',
    ],
    [
      'concept',
      { kind: 'unit', model: id('m'), unit: { kind: 'concept', concept: 'Goal' } },
      'm@concept:Goal',
    ],
    [
      'concept field',
      { kind: 'unit', model: id('m'), unit: { kind: 'concept', concept: 'Goal', field: 'owner' } },
      'm@concept:Goal&owner',
    ],
    [
      'matrix',
      { kind: 'unit', model: id('m'), unit: { kind: 'matrix', matrix: 'swot' } },
      'm@matrix:swot',
    ],
    [
      'relative',
      { kind: 'unit', model: null, unit: { kind: 'element', slug: 'programa-alfa' } },
      '@programa-alfa',
    ],
    [
      'relative field',
      { kind: 'unit', model: null, unit: { kind: 'element', slug: 'a', field: 'owner' } },
      '@a&owner',
    ],
    [
      'blueprint',
      { kind: 'blueprint', family: 'business', unit: { kind: 'concept', concept: 'goal' } },
      'specs/business@concept:goal',
    ],
    ['bare blueprint', { kind: 'blueprint', family: 'business', unit: null }, 'specs/business'],
    ['source', { kind: 'source', raw: 'prices.csv@R12&price' }, 'prices.csv@R12&price'],
  ])('formats %s', (_name, address, expected) => {
    expect(formatAddress(address)).toBe(expected)
  })

  it('rejects a segment that the grammar would not parse', () => {
    expect(() =>
      formatAddress({ kind: 'unit', model: id('a/B'), unit: { kind: 'element', slug: 's' } }),
    ).toThrow(/B/)
    expect(() =>
      formatAddress({ kind: 'unit', model: id('a'), unit: { kind: 'element', slug: 'Not Slug' } }),
    ).toThrow(/Not Slug/)
    expect(() =>
      formatAddress({ kind: 'unit', model: id('a'), unit: { kind: 'element', slug: 's', field: 'a&b' } }),
    ).toThrow(/a&b/)
  })
})

const MODEL_IDS = ['LC_programas_Tutorias', 'intro', 'villabotijos-today/intro', 'a/b/c-d']
const UNITS: Unit[] = [
  { kind: 'element', slug: '00-gancho' },
  { kind: 'element', slug: '00-gancho', field: 'voice' },
  { kind: 'body', slug: 'scene-1' },
  { kind: 'cell', matrix: 'swot', row: 'r1', col: 'c1' },
  { kind: 'concept', concept: 'Goal' },
  { kind: 'concept', concept: 'Goal', field: 'owner' },
  { kind: 'matrix', matrix: 'swot' },
]

describe('formatAddress - round trip parse(format(parse(x))) == parse(x)', () => {
  const inputs: string[] = []
  for (const model of MODEL_IDS) {
    inputs.push(model)
    for (const unit of UNITS) {
      inputs.push(formatAddress({ kind: 'unit', model: id(model), unit }))
    }
  }
  for (const unit of UNITS) inputs.push(formatAddress({ kind: 'unit', model: null, unit }))
  inputs.push('specs/business@concept:goal', 'specs/business@matrix:swot', 'specs/business')
  inputs.push('sources/import/interview.md@## Clients', 'data.json@/items/0/name')

  it('covers every model-id shape times every unit kind', () => {
    expect(inputs.length).toBe(MODEL_IDS.length * (UNITS.length + 1) + UNITS.length + 5)
  })

  it.each(inputs)('round-trips %s', (input) => {
    const first = parseAddress(input)
    if (isAddressError(first)) throw new Error(`${input}: ${first.message}`)
    expect(parseAddress(formatAddress(first))).toEqual(first)
    expect(formatAddress(first)).toBe(input)
  })
})
