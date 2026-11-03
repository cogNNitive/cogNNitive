import { describe, it, expect } from 'vitest'
import { parseAddress, isAddressError } from '../../src/address/index'
import type { Address, AddressError } from '../../src/address/index'

function ok(input: string): Address {
  const r = parseAddress(input)
  if (isAddressError(r)) throw new Error(`expected an address for "${input}", got ${r.code}: ${r.message}`)
  return r
}

function fail(input: string): AddressError {
  const r = parseAddress(input)
  if (!isAddressError(r)) throw new Error(`expected an error for "${input}", got ${JSON.stringify(r)}`)
  return r
}

describe('parseAddress - valid addresses (unified-reference-grammar: One grammar)', () => {
  it('parses a hierarchical id with element and field into a unit address', () => {
    expect(ok('villabotijos-today/intro@00-gancho&voice')).toEqual({
      kind: 'unit',
      model: 'villabotijos-today/intro',
      unit: { kind: 'element', slug: '00-gancho', field: 'voice' },
    })
  })

  it('parses a bare model id: compact stem, one segment and three segments', () => {
    expect(ok('LC_programas_Tutorias')).toEqual({ kind: 'model', model: 'LC_programas_Tutorias' })
    expect(ok('programa-alfa')).toEqual({ kind: 'model', model: 'programa-alfa' })
    expect(ok('a/b/c')).toEqual({ kind: 'model', model: 'a/b/c' })
  })

  it('treats a stem with a blueprint suffix as a syntactically valid id', () => {
    expect(ok('intro_video-script')).toEqual({ kind: 'model', model: 'intro_video-script' })
  })

  it('parses an element without a field', () => {
    expect(ok('villabotijos-today/pepper-mapache@00-gancho')).toEqual({
      kind: 'unit',
      model: 'villabotijos-today/pepper-mapache',
      unit: { kind: 'element', slug: '00-gancho' },
    })
  })

  it('parses a body unit', () => {
    expect(ok('m@scene-1&#body')).toEqual({
      kind: 'unit',
      model: 'm',
      unit: { kind: 'body', slug: 'scene-1' },
    })
  })

  it('parses a matrix cell', () => {
    expect(ok('m@swot&r1&c1')).toEqual({
      kind: 'unit',
      model: 'm',
      unit: { kind: 'cell', matrix: 'swot', row: 'r1', col: 'c1' },
    })
  })

  it('parses concept and matrix units, with and without a field', () => {
    expect(ok('m@concept:Goal&owner')).toEqual({
      kind: 'unit',
      model: 'm',
      unit: { kind: 'concept', concept: 'Goal', field: 'owner' },
    })
    expect(ok('m@concept:goal')).toEqual({
      kind: 'unit',
      model: 'm',
      unit: { kind: 'concept', concept: 'goal' },
    })
    expect(ok('m@matrix:swot')).toEqual({
      kind: 'unit',
      model: 'm',
      unit: { kind: 'matrix', matrix: 'swot' },
    })
  })

  it('parses a relative address with a null model', () => {
    expect(ok('@programa-alfa')).toEqual({
      kind: 'unit',
      model: null,
      unit: { kind: 'element', slug: 'programa-alfa' },
    })
    expect(ok('@programa-alfa&owner')).toEqual({
      kind: 'unit',
      model: null,
      unit: { kind: 'element', slug: 'programa-alfa', field: 'owner' },
    })
  })

  it('trims surrounding whitespace', () => {
    expect(ok('  m@a  ')).toEqual(ok('m@a'))
  })
})

describe('parseAddress - classification without the filesystem', () => {
  it('classifies the blueprint head `specs` as a blueprint address (A-6)', () => {
    expect(ok('specs/business@concept:goal')).toEqual({
      kind: 'blueprint',
      family: 'business',
      unit: { kind: 'concept', concept: 'goal' },
    })
    expect(ok('specs/business@matrix:swot')).toEqual({
      kind: 'blueprint',
      family: 'business',
      unit: { kind: 'matrix', matrix: 'swot' },
    })
    expect(ok('specs/business@concept:goal&owner')).toEqual({
      kind: 'blueprint',
      family: 'business',
      unit: { kind: 'concept', concept: 'goal', field: 'owner' },
    })
  })

  it('rejects an element unit under the blueprint head', () => {
    expect(fail('specs/business@a-slug').code).toBe('ADDRESS_MALFORMED')
  })

  it.each([
    'sources/import/interview.md@## Clients',
    'report.pdf_sidecar_NN.md@## Findings',
    'prices.csv@R12&price',
    'data.json@/items/0/name',
    'sources/import/interview.md',
  ])('classifies %s as a source citation and does not parse it', (raw) => {
    expect(ok(raw)).toEqual({ kind: 'source', raw })
  })

  it('rejects a model cited by path', () => {
    const e = fail('kNNowledge/x_NN.md@## A')
    expect(e.code).toBe('MODEL_CITED_BY_PATH')
    expect(e.message).toContain('<hierarchical-id>@<slug>')
  })

  it('rejects a model cited by a bare path', () => {
    expect(fail('kNNowledge/Client_business_NN.md').code).toBe('MODEL_CITED_BY_PATH')
  })

  it('rejects a changeset cited by heading', () => {
    const e = fail('changes/x_changes_NN.md@## NN Change: c-09')
    expect(e.code).toBe('NN_DOCUMENT_CITED_BY_HEADING')
    expect(e.message).toContain('@## NN Change:')
  })
})

describe('parseAddress - rejections (unified-reference-grammar: Removed forms are rejected)', () => {
  it.each([
    ['', ''],
    ['   ', ''],
    ['https://example.com/a', 'https://example.com/a'],
    ['/abs/path', '/abs/path'],
    ['C:\\work\\a', 'C:\\work\\a'],
    ['a/../b@x', '..'],
    ['m@scene-1@L10', 'm@scene-1@L10'],
    ['m@scene-1#L13', 'm@scene-1#L13'],
    ['a\\b@x', 'a\\b'],
  ])('rejects %j as malformed naming %j', (input, segment) => {
    const e = fail(input)
    expect(e.code).toBe('ADDRESS_MALFORMED')
    expect(e.segment).toBe(segment)
  })

  it('rejects an uppercase slug segment after the head, naming it', () => {
    const e = fail('series/Intro@x')
    expect(e.code).toBe('ADDRESS_MALFORMED')
    expect(e.segment).toBe('Intro')
  })

  it('accepts an uppercase head', () => {
    expect(ok('LC_x/intro')).toEqual({ kind: 'model', model: 'LC_x/intro' })
  })

  it('rejects an empty model segment', () => {
    expect(fail('a//b').segment).toBe('')
    expect(fail('a/@x').segment).toBe('')
  })

  it('rejects an empty or invalid unit, naming the segment', () => {
    expect(fail('m@').code).toBe('ADDRESS_MALFORMED')
    expect(fail('m@Not A Slug').segment).toBe('Not A Slug')
    expect(fail('m@a&').code).toBe('ADDRESS_MALFORMED')
    expect(fail('m@a&b&c&d').code).toBe('ADDRESS_MALFORMED')
    expect(fail('m@matrix:swot&x').code).toBe('ADDRESS_MALFORMED')
    expect(fail('m@concept:').code).toBe('ADDRESS_MALFORMED')
  })

  it('rejects the title-qualified reference naming the removed form', () => {
    const e = fail('[[Villabotijos Today :: Celedonio Full]]')
    expect(e.code).toBe('ADDRESS_MALFORMED')
    expect(e.removed).toBe('title-qualified reference')
    expect(e.message).toContain('[[Title :: Name]]')
    expect(e.message).toContain('<hierarchical-id>@<slug>')
  })

  it('rejects a bare `Title :: Name` naming the removed form', () => {
    const e = fail('Villabotijos Today :: Celedonio Full')
    expect(e.removed).toBe('title-qualified reference')
  })

  it('rejects a plain wikilink naming the removed form', () => {
    const e = fail('[[Celedonio Full]]')
    expect(e.code).toBe('ADDRESS_MALFORMED')
    expect(e.removed).toBe('wikilink reference')
    expect(e.message).toContain('<hierarchical-id>@<slug>')
  })
})

describe('slugs as the frozen-slug generator writes them', () => {
  it('accepts the Concept/Element boundary `--` in an element and a concept slug', () => {
    expect(ok('m@nn-person--dr-egon')).toMatchObject({ unit: { kind: 'element', slug: 'nn-person--dr-egon' } })
    expect(ok('strategy@concept:vision--mission')).toMatchObject({
      unit: { kind: 'concept', concept: 'vision--mission' },
    })
  })

  it('accepts a non-Latin lowercase slug', () => {
    expect(ok('m@さくら-桜&owner')).toMatchObject({ unit: { kind: 'element', slug: 'さくら-桜', field: 'owner' } })
  })

  it('still rejects an uppercase letter, a leading or trailing hyphen', () => {
    expect(fail('series/Intro@x').segment).toBe('Intro')
    expect(fail('m@-x').code).toBe('ADDRESS_MALFORMED')
    expect(fail('m@x-').code).toBe('ADDRESS_MALFORMED')
  })
})
