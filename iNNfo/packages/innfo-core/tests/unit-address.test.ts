import { describe, it, expect } from 'vitest'
import { unitAddress, parseUnitAddress, unitHome } from '../src/console/unit-address.js'

describe('unitAddress builders (Task 1.1)', () => {
  it('builds domain address', () => {
    expect(unitAddress.domain()).toBe('domaiNN_NN.md')
  })

  it('builds document address', () => {
    expect(unitAddress.document('kNNowledge/TestLab_coverage_TestLab')).toBe(
      'kNNowledge/TestLab_coverage_TestLab',
    )
  })

  it('builds section address with concept prefix and slugifyHeading', () => {
    expect(unitAddress.section('strategy', 'Vision & Mission')).toBe(
      'strategy@concept:vision-mission',
    )
    expect(unitAddress.section('strategy', 'Vision--Mission')).toBe(
      'strategy@concept:vision--mission',
    )
    expect(unitAddress.section('kNNowledge/X', 'Goals')).toBe(
      'kNNowledge/X@concept:goals',
    )
  })

  it('builds element address', () => {
    expect(unitAddress.element('strategy', 'vision')).toBe('strategy@vision')
    expect(unitAddress.element('kNNowledge/TestLab', 'element-1b')).toBe(
      'kNNowledge/TestLab@element-1b',
    )
  })

  it('builds own and concept-level value addresses', () => {
    expect(unitAddress.value('strategy@vision', 'statement')).toBe(
      'strategy@vision&statement',
    )
    expect(
      unitAddress.value('strategy@concept:vision--mission', 'tags'),
    ).toBe('strategy@concept:vision--mission&tags')
  })

  it('builds matrix cell address with two subunits', () => {
    expect(
      unitAddress.cell('swot', 'swot-matrix', 'strength-1', 'opportunity-1'),
    ).toBe('swot@swot-matrix&strength-1&opportunity-1')
  })

  it('builds blueprint definition addresses with specs/ prefix', () => {
    expect(unitAddress.concept('business', 'Goal')).toBe(
      'specs/business@concept:goal',
    )
    expect(unitAddress.field('business', 'Goal', 'owner')).toBe(
      'specs/business@concept:goal&owner',
    )
    expect(unitAddress.matrix('business', 'swot-matrix')).toBe(
      'specs/business@matrix:swot-matrix',
    )
  })

  it('rejects empty or invalid inputs', () => {
    expect(() => unitAddress.document('')).toThrow()
    expect(() => unitAddress.element('', 'slug')).toThrow()
    expect(() => unitAddress.element('model', '')).toThrow()
  })
})

describe('parseUnitAddress parser (Task 1.3)', () => {
  it('parses domain address', () => {
    const parsed = parseUnitAddress('domaiNN_NN.md')
    expect(parsed).toEqual({
      kind: 'domain',
      modelId: 'domaiNN_NN.md',
      subunits: [],
    })
  })

  it('parses document address', () => {
    const parsed = parseUnitAddress('kNNowledge/TestLab_coverage_TestLab')
    expect(parsed).toEqual({
      kind: 'document',
      modelId: 'kNNowledge/TestLab_coverage_TestLab',
      subunits: [],
    })
  })

  it('parses section address with concept: prefix', () => {
    const parsed = parseUnitAddress('strategy@concept:vision-mission')
    expect(parsed).toEqual({
      kind: 'section',
      modelId: 'strategy',
      slug: 'vision-mission',
      subunits: [],
    })
  })

  it('parses element address', () => {
    const parsed = parseUnitAddress('strategy@vision')
    expect(parsed).toEqual({
      kind: 'element',
      modelId: 'strategy',
      slug: 'vision',
      subunits: [],
    })
  })

  it('parses element own value address with 1 subunit', () => {
    const parsed = parseUnitAddress('strategy@vision&statement')
    expect(parsed).toEqual({
      kind: 'value',
      modelId: 'strategy',
      slug: 'vision',
      subunits: ['statement'],
    })
  })

  it('parses concept-level value address', () => {
    const parsed = parseUnitAddress('strategy@concept:vision-mission&tags')
    expect(parsed).toEqual({
      kind: 'value',
      modelId: 'strategy',
      slug: 'vision-mission',
      subunits: ['tags'],
    })
  })

  it('parses matrix cell address with 2 subunits', () => {
    const parsed = parseUnitAddress('swot@swot-matrix&strength-1&opportunity-1')
    expect(parsed).toEqual({
      kind: 'value',
      modelId: 'swot',
      slug: 'swot-matrix',
      subunits: ['strength-1', 'opportunity-1'],
    })
  })

  it('parses blueprint concept, field, and matrix definitions', () => {
    expect(parseUnitAddress('specs/business@concept:goal')).toEqual({
      kind: 'concept',
      family: 'business',
      slug: 'goal',
      subunits: [],
    })
    expect(parseUnitAddress('specs/business@concept:goal&owner')).toEqual({
      kind: 'field',
      family: 'business',
      slug: 'goal',
      subunits: ['owner'],
    })
    expect(parseUnitAddress('specs/business@matrix:swot-matrix')).toEqual({
      kind: 'matrix',
      family: 'business',
      slug: 'swot-matrix',
      subunits: [],
    })
  })

  it('distinguishes element, section, and matrix sharing a slug without collision', () => {
    const el = parseUnitAddress('model@goals')
    const sec = parseUnitAddress('model@concept:goals')
    const mat = parseUnitAddress('model@matrix:goals')

    expect(el?.kind).toBe('element')
    expect(sec?.kind).toBe('section')
    expect(mat?.kind).toBe('matrix')
  })

  it('delegates paths with extensions / sources to citation parsing', () => {
    const parsed = parseUnitAddress('sources/data.csv@r1')
    expect(parsed?.kind).toBe('source')
    expect(parsed?.filePath).toBe('sources/data.csv')
  })

  it('rejects invalid addresses', () => {
    expect(parseUnitAddress('sources/import/notes')).toBeNull() // extensionless typo in source
    expect(parseUnitAddress('../model@element')).toBeNull()
    expect(parseUnitAddress('model..id@element')).toBeNull()
    expect(parseUnitAddress('https://example.com@element')).toBeNull()
    expect(parseUnitAddress('C:/abs/path@element')).toBeNull()
    expect(parseUnitAddress('')).toBeNull()
  })
})

describe('unitHome derivation (Task 1.7)', () => {
  it('maps blueprint definition addresses to blueprint home', () => {
    expect(unitHome('specs/business@concept:goal')).toBe('blueprint')
    expect(unitHome('specs/testlab@matrix:m1')).toBe('blueprint')
    expect(unitHome('specs/testlab')).toBe('blueprint')
  })

  it('maps entrypoint to domain home', () => {
    expect(unitHome('domaiNN_NN.md')).toBe('domain')
  })

  it('maps model documents and units to knowledge home', () => {
    expect(unitHome('kNNowledge/TestLab_coverage_TestLab')).toBe('knowledge')
    expect(unitHome('strategy@vision')).toBe('knowledge')
    expect(unitHome('strategy@vision&statement')).toBe('knowledge')
    expect(unitHome('strategy@concept:vision-mission')).toBe('knowledge')
    expect(unitHome('swot@swot-matrix&r1&c1')).toBe('knowledge')
  })

  it('maps sources to source home', () => {
    expect(unitHome('sources/report.pdf')).toBe('source')
    expect(unitHome('sources/data.csv@r1')).toBe('source')
    expect(unitHome('sources/doc.md@## Notes')).toBe('source')
  })

  it('returns null for invalid addresses', () => {
    expect(unitHome('')).toBeNull()
    expect(unitHome('https://external.com')).toBeNull()
  })
})


