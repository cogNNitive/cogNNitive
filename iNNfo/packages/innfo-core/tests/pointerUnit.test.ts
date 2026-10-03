import { describe, it, expect } from 'vitest'
import { parseKnowledgeUnitRef } from '../src/sourceRef.js'
import {
  parseCitation,
  serializeKnowledgeUnitRef,
  resolveUnit,
  validateCitations,
  type CitationSite,
  type SourceResolver,
} from '../src/index.js'
import { resolveJsonPointer, isJsonPointer } from '../src/jsonPointer.js'

const DOC = JSON.stringify({
  items: [{ name: 'a' }, { name: 'b' }],
  'a/b': 1,
  'm~n': 2,
  'R&D': 3,
  '100%': 4,
})
const FILE = 'sources/nn/d.json'

describe('JSON Pointer unit: parse and serialize', () => {
  it('parses a pointer citation into a pointer unit with no subunits', () => {
    const ref = parseCitation(`${FILE}@/items/0/name`)
    expect(ref).toMatchObject({
      filePath: FILE,
      fileName: 'd.json',
      kind: 'source',
      unit: { kind: 'pointer', pointer: '/items/0/name' },
      subunits: [],
    })
  })

  it('serializes back to the same text', () => {
    const ref = parseKnowledgeUnitRef(`${FILE}@/items/0/name`)!
    expect(serializeKnowledgeUnitRef(ref.filePath, ref.unit!)).toBe(`${FILE}@/items/0/name`)
  })

  it('decodes %26 to a literal ampersand and never parses a subunit', () => {
    const ref = parseKnowledgeUnitRef(`${FILE}@/R%26D`)!
    expect(ref.unit).toEqual({ kind: 'pointer', pointer: '/R&D' })
    expect(ref.subunits).toEqual([])
    expect(serializeKnowledgeUnitRef(ref.filePath, ref.unit!)).toBe(`${FILE}@/R%26D`)
  })

  it('round-trips a literal percent sign as %25', () => {
    const ref = parseKnowledgeUnitRef(`${FILE}@/100%25`)!
    expect(ref.unit).toEqual({ kind: 'pointer', pointer: '/100%' })
    expect(serializeKnowledgeUnitRef(ref.filePath, ref.unit!)).toBe(`${FILE}@/100%25`)
  })

  it('keeps the RFC 6901 escapes in raw form', () => {
    const ref = parseKnowledgeUnitRef(`${FILE}@/a~1b/m~0n`)!
    expect(ref.unit).toEqual({ kind: 'pointer', pointer: '/a~1b/m~0n' })
  })

  it('treats the empty pointer as the file-level citation', () => {
    const ref = parseCitation(`${FILE}@`)
    expect(ref?.unit).toEqual({ kind: 'pointer', pointer: '' })
    expect(serializeKnowledgeUnitRef(FILE, { kind: 'pointer', pointer: '' })).toBe(`${FILE}@`)
  })

  it.each([
    ['a pointer not starting with a slash', `${FILE}@items/0`],
    ['an unknown escape', `${FILE}@/a~2b`],
    ['a dangling tilde', `${FILE}@/a~`],
    ['a literal ampersand (subunits do not exist)', `${FILE}@/a&b`],
    ['a malformed percent escape', `${FILE}@/100%`],
    ['a pointer on a markdown file', 'sources/nn/a.md@/items/0'],
  ])('rejects %s', (_label, input) => {
    expect(parseCitation(input)).toBeNull()
  })
})

describe('isJsonPointer', () => {
  it('accepts the empty pointer and slash-led pointers with valid escapes', () => {
    for (const p of ['', '/', '/a', '/a/b/0', '/a~0b~1c']) expect(isJsonPointer(p)).toBe(true)
  })
  it('rejects anything else', () => {
    for (const p of ['a', '~0', '/a~', '/a~2']) expect(isJsonPointer(p)).toBe(false)
  })
})

describe('resolveJsonPointer', () => {
  const ok = (pointer: string): unknown => {
    const r = resolveJsonPointer(DOC, pointer)
    if (!r.ok) throw new Error(`expected ${pointer} to resolve, got ${r.reason}`)
    return r.value
  }

  it('resolves nested values and the empty pointer (whole document)', () => {
    expect(ok('/items/0/name')).toBe('a')
    expect(ok('/items/1')).toEqual({ name: 'b' })
    expect(ok('')).toEqual(JSON.parse(DOC))
  })

  it('resolves escaped keys', () => {
    expect(ok('/a~1b')).toBe(1)
    expect(ok('/m~0n')).toBe(2)
    expect(ok('/R&D')).toBe(3)
  })

  it.each(['/items/2', '/items/-', '/items/01', '/items/-1', '/items/0/missing', '/nope', '/items/name', '/a~1b/x'])(
    'does not resolve %s',
    (pointer) => {
      expect(resolveJsonPointer(DOC, pointer)).toEqual({ ok: false, reason: 'unknown-pointer' })
    },
  )

  it('does not resolve inherited properties', () => {
    expect(resolveJsonPointer(DOC, '/constructor')).toEqual({ ok: false, reason: 'unknown-pointer' })
    expect(resolveJsonPointer(DOC, '/__proto__')).toEqual({ ok: false, reason: 'unknown-pointer' })
  })

  it('reports invalid JSON', () => {
    expect(resolveJsonPointer('{not json', '/items')).toEqual({ ok: false, reason: 'invalid-json' })
  })
})

describe('resolveUnit with a pointer unit', () => {
  it('returns the addressed value', () => {
    const ref = parseKnowledgeUnitRef(`${FILE}@/items/0/name`)!
    expect(resolveUnit(DOC, ref)).toEqual({ kind: 'pointer', pointer: '/items/0/name', value: 'a' })
  })
  it('returns null for an unknown pointer or invalid JSON', () => {
    const ref = parseKnowledgeUnitRef(`${FILE}@/items/9`)!
    expect(resolveUnit(DOC, ref)).toBeNull()
    expect(resolveUnit('{bad', ref)).toBeNull()
  })
})

describe('validateCitations with pointer units', () => {
  const resolverOf =
    (files: Record<string, string>): SourceResolver =>
    (refPath) => {
      const content = files[refPath]
      return content === undefined ? { exists: false } : { exists: true, content }
    }
  const site = (value: string): CitationSite => ({
    value,
    referringPath: 'kNNowledge/Client_NN.md',
    element: 'Acme',
    field: 'sources',
  })
  const resolver = resolverOf({ [FILE]: DOC, 'sources/nn/bad.json': '{not json' })
  const codes = (value: string, r: SourceResolver = resolver): string[] =>
    validateCitations([site(value)], r).map((d) => d.code ?? '')

  it.each(['@/items/0/name', '@/a~1b', '@/m~0n', '@/R%26D', '@', '@/items/1'])('resolves %s', (anchor) => {
    expect(codes(`${FILE}${anchor}`)).toEqual([])
  })

  it('reports KU_UNKNOWN_POINTER for missing and past-end pointers', () => {
    expect(codes(`${FILE}@/items/2`)).toEqual(['KU_UNKNOWN_POINTER'])
    expect(codes(`${FILE}@/items/-`)).toEqual(['KU_UNKNOWN_POINTER'])
  })

  it('reports KU_INVALID_JSON when the target does not parse', () => {
    expect(codes('sources/nn/bad.json@/items/0')).toEqual(['KU_INVALID_JSON'])
  })

  it('reports a malformed citation for a pointer on a markdown file', () => {
    expect(codes('sources/nn/a.md@/items/0')).toEqual(['KU_MALFORMED'])
  })

  it('reports a dangling file when the target is absent', () => {
    expect(codes('sources/nn/none.json@/items/0')).toEqual(['KU_DANGLING_FILE'])
  })

  it('stays silent when the resolver offers no content (degraded)', () => {
    expect(codes(`${FILE}@/items/9`, () => ({ exists: true }))).toEqual([])
  })

  it('carries site and target on the diagnostic', () => {
    const [d] = validateCitations([site(`${FILE}@/items/2`)], resolver)
    expect(d).toMatchObject({ severity: 'error', target: FILE, path: 'kNNowledge/Client_NN.md#Acme.sources' })
  })
})

describe('console citations and labels with pointer units', () => {
  const resolver: SourceResolver = () => ({ exists: true, content: DOC })

  it('resolveCitation reports the pointer as anchor and its value as excerpt', async () => {
    const { resolveCitation } = await import('../src/console/citations.js')
    expect(resolveCitation(`${FILE}@/items/0/name`, 'sources', resolver)).toMatchObject({
      path: FILE,
      anchor: '/items/0/name',
      exists: true,
      excerpt: 'a',
    })
    expect(resolveCitation(`${FILE}@/items/1`, 'sources', resolver)).toMatchObject({ excerpt: '{"name":"b"}' })
  })

  it('resolveCitation flags an unknown pointer as UNKNOWN_ANCHOR', async () => {
    const { resolveCitation } = await import('../src/console/citations.js')
    expect(resolveCitation(`${FILE}@/items/9`, 'sources', resolver)).toMatchObject({ error: 'UNKNOWN_ANCHOR' })
  })

  it('unitLabel renders every kind', async () => {
    const { unitLabel } = await import('../src/index.js')
    expect(unitLabel({ kind: 'pointer', pointer: '/items/0' })).toBe('/items/0')
    expect(unitLabel({ kind: 'row', id: '104' }, ['mrr_usd'])).toBe('104&mrr_usd')
    expect(unitLabel({ kind: 'header', level: 2, text: 'A B', slug: 'a-b' })).toBe('##a-b')
  })
})
