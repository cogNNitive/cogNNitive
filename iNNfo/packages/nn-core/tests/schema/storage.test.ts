import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parsePlacement, storageOf, validateStorage } from '../../src/schema/storage.js'
import { extractBlueprintSchemaFromContent } from '../../src/schema/extract.js'
import { applyAliasToSchema, resolveBlueprintSchema } from '../../src/schema/compose.js'

const FIXTURES = join(import.meta.dirname!, '..', 'fixtures', 'distributed-storage')
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8')

/** Builds a minimal L2 document from `[name, extra property lines]` concept definitions. */
const concepts = (...defs: Array<[string, string]>) =>
  extractBlueprintSchemaFromContent(
    [
      '---',
      'level: 2',
      'title: "T"',
      '---',
      '',
      '# NN Concept Definition',
      ...defs.map(
        ([name, body]) => `\n## NN Concept Definition: ${name}\nslug:: ${name.toLowerCase()}\ntype:: list\n${body}`,
      ),
    ].join('\n'),
  ).concepts

const codes = (c: ReturnType<typeof concepts>) => validateStorage(c).map((d) => d.code)

const DISTRIBUTED = (placement: string, container?: string) =>
  `storage:: distributed\n${container ? `container:: ${container}\n` : ''}placement:: "${placement}"`

/** concept-storage-declaration: A distributed concept declares a placement rule (design A1, A2). */
describe('parsePlacement - placement grammar table', () => {
  const VALID: Array<[string, boolean, string[]]> = [
    ['series/{slug}/', false, ['literal:series', 'slug']],
    ['{container}/assets/{slug}/', true, ['container', 'literal:assets', 'slug']],
    ['proyectos/{slug}/models/', false, ['literal:proyectos', 'slug', 'literal:models']],
  ]

  it.each(VALID)('accepts %s', (template, hasContainer, shape) => {
    const parsed = parsePlacement(template, { hasContainer })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(
      parsed.segments.map((s) => (s.kind === 'literal' ? `literal:${s.value}` : s.kind)),
    ).toEqual(shape)
    expect(parsed.slugIndex).toBe(shape.indexOf('slug'))
  })

  const INVALID: Array<[string, string, boolean, RegExp]> = [
    ['no slug token', 'series/', false, /\{slug\}/],
    ['two slug tokens', 'series/{slug}/{slug}/', false, /exactly one/],
    ['container not first', 'series/{container}/{slug}/', true, /first segment/],
    ['container without container::', '{container}/{slug}/', false, /container::/],
    ['parent traversal', 'series/../{slug}/', false, /\.\./],
    ['dot-prefixed segment', '.hidden/{slug}/', false, /"\."/],
    ['reserved archive', 'archive/{slug}/', false, /archive/],
    ['reserved staging', 'staging/{slug}/', false, /staging/],
    ['reserved specs', 'specs/{slug}/', false, /specs/],
    ['reserved backups', 'backups/{slug}/', false, /backups/],
    ['root sources', 'sources/{slug}/', false, /sources/],
    ['kNNowledge literal', 'kNNowledge/{slug}/', false, /kNNowledge/],
    ['kNNowledge, case-folded', 'knowledge/{slug}/', false, /kNNowledge/],
    ['uppercase literal', 'Series/{slug}/', false, /kebab-case/],
    ['missing trailing slash', 'series/{slug}', false, /end with/],
    ['empty template', '', false, /empty/],
    ['absolute path', '/series/{slug}/', false, /relative/],
    ['backslash', 'series\\{slug}/', false, /POSIX/],
    ['empty segment', 'series//{slug}/', false, /empty segment/],
    ['unknown token', 'series/{series}/', false, /unknown token/],
    ['space in a literal', 'my series/{slug}/', false, /kebab-case/],
  ]

  it.each(INVALID)('rejects %s with PLACEMENT_INVALID', (_label, template, hasContainer, hint) => {
    const parsed = parsePlacement(template, { hasContainer })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('PLACEMENT_INVALID')
    expect(parsed.message).toMatch(hint)
  })

  it('allows a reserved word as a non-root literal only where the design allows it (sources below a container)', () => {
    expect(parsePlacement('{container}/sources/{slug}/', { hasContainer: true }).ok).toBe(true)
  })
})

describe('extractBlueprintSchema reads the storage declaration', () => {
  it('reads a mixed declaration: Series and Video distributed, Preset compact', () => {
    const schema = extractBlueprintSchemaFromContent(fixture('video-like_spec_NN.md'))
    const byName = new Map(schema.concepts.map((c) => [c.name, c]))
    expect(byName.get('Series')?.storage).toEqual({ mode: 'distributed', placement: 'series/{slug}/' })
    expect(byName.get('Video')?.storage).toEqual({
      mode: 'distributed',
      container: 'Series',
      placement: '{container}/assets/{slug}/',
    })
    expect(byName.get('Preset')?.storage).toEqual({ mode: 'compact' })
    expect(storageOf(byName.get('Series')!).mode).toBe('distributed')
    expect(storageOf(byName.get('Preset')!).mode).toBe('compact')
  })

  it('an undeclared concept is compact and emits no diagnostic', () => {
    const schema = extractBlueprintSchemaFromContent(fixture('video-like_spec_NN.md'))
    const scene = schema.concepts.find((c) => c.name === 'Scene')!
    expect(scene.storage).toBeUndefined()
    expect(storageOf(scene)).toEqual({ mode: 'compact' })
    expect(validateStorage(schema.concepts)).toEqual([])
  })
})

describe('validateStorage - declaration codes', () => {
  it('STORAGE_UNKNOWN_MODE names the concept and the accepted values', () => {
    const [diag] = validateStorage(concepts(['Video', 'storage:: scattered']))
    expect(diag.code).toBe('STORAGE_UNKNOWN_MODE')
    expect(diag.severity).toBe('error')
    expect(diag.message).toMatch(/Video/)
    expect(diag.message).toMatch(/scattered/)
    expect(diag.message).toMatch(/compact/)
    expect(diag.message).toMatch(/distributed/)
  })

  it('PLACEMENT_REQUIRED names the concept', () => {
    const [diag] = validateStorage(concepts(['Video', 'storage:: distributed']))
    expect(diag.code).toBe('PLACEMENT_REQUIRED')
    expect(diag.message).toMatch(/Video/)
  })

  it('PLACEMENT_FORBIDDEN: a compact concept with a placement or a container', () => {
    expect(codes(concepts(['Preset', 'storage:: compact\nplacement:: "presets/{slug}/"']))).toEqual([
      'PLACEMENT_FORBIDDEN',
    ])
    expect(codes(concepts(['Preset', 'placement:: "presets/{slug}/"']))).toEqual(['PLACEMENT_FORBIDDEN'])
    expect(
      codes(concepts(['Series', DISTRIBUTED('series/{slug}/')], ['Preset', 'container:: Series'])),
    ).toEqual(['PLACEMENT_FORBIDDEN'])
  })

  it('PLACEMENT_INVALID surfaces the placement grammar failure and names the concept', () => {
    const [diag] = validateStorage(concepts(['Series', DISTRIBUTED('series/')]))
    expect(diag.code).toBe('PLACEMENT_INVALID')
    expect(diag.message).toMatch(/Series/)
    expect(diag.message).toMatch(/\{slug\}/)
  })

  it('PLACEMENT_INVALID: a declared container that the placement never names', () => {
    const diags = validateStorage(
      concepts(['Series', DISTRIBUTED('series/{slug}/')], ['Video', DISTRIBUTED('videos/{slug}/', 'Series')]),
    )
    expect(diags.map((d) => d.code)).toEqual(['PLACEMENT_INVALID'])
    expect(diags[0].message).toMatch(/\{container\}/)
  })

  it('CONTAINER_NOT_DISTRIBUTED names both concepts when the container is compact', () => {
    const [diag] = validateStorage(
      concepts(['Folder', 'storage:: compact'], ['Video', DISTRIBUTED('{container}/assets/{slug}/', 'Folder')]),
    )
    expect(diag.code).toBe('CONTAINER_NOT_DISTRIBUTED')
    expect(diag.message).toMatch(/Video/)
    expect(diag.message).toMatch(/Folder/)
  })

  it('CONTAINER_NOT_DISTRIBUTED when the container concept is not declared at all', () => {
    const [diag] = validateStorage(concepts(['Video', DISTRIBUTED('{container}/assets/{slug}/', 'Ghost')]))
    expect(diag.code).toBe('CONTAINER_NOT_DISTRIBUTED')
    expect(diag.message).toMatch(/Video/)
    expect(diag.message).toMatch(/Ghost/)
  })

  it('CONTAINER_CYCLE: two concepts that contain each other, and a self-container', () => {
    const pair = concepts(
      ['A', DISTRIBUTED('{container}/a/{slug}/', 'B')],
      ['B', DISTRIBUTED('{container}/b/{slug}/', 'A')],
    )
    const pairDiags = validateStorage(pair).filter((d) => d.code === 'CONTAINER_CYCLE')
    expect(pairDiags.length).toBeGreaterThan(0)
    expect(pairDiags[0].message).toMatch(/A/)
    expect(pairDiags[0].message).toMatch(/B/)

    expect(codes(concepts(['A', DISTRIBUTED('{container}/a/{slug}/', 'A')]))).toContain('CONTAINER_CYCLE')
  })

  it('PLACEMENT_OVERLAP: two templates of one schema can match the same folder', () => {
    const [diag] = validateStorage(
      concepts(['A', DISTRIBUTED('series/{slug}/')], ['B', DISTRIBUTED('series/{slug}/')]),
    )
    expect(diag.code).toBe('PLACEMENT_OVERLAP')
    expect(diag.message).toMatch(/A/)
    expect(diag.message).toMatch(/B/)

    expect(
      codes(concepts(['A', DISTRIBUTED('series/{slug}/')], ['B', DISTRIBUTED('{slug}/models/')])),
    ).toEqual(['PLACEMENT_OVERLAP'])
  })

  it('does not flag overlap for the real shape (Series and Video nested under it)', () => {
    const schema = extractBlueprintSchemaFromContent(fixture('video-like_spec_NN.md'))
    expect(validateStorage(schema.concepts)).toEqual([])
  })

  it('does not flag overlap between different literals or different depths', () => {
    expect(
      codes(
        concepts(
          ['A', DISTRIBUTED('alpha/{slug}/')],
          ['B', DISTRIBUTED('beta/{slug}/')],
          ['C', DISTRIBUTED('alpha/{slug}/models/')],
        ),
      ),
    ).toEqual([])
  })
})

describe('composition carries and validates storage', () => {
  const resolve = (ref: { name: string }) => (ref.name === 'video-like' ? fixture('video-like_spec_NN.md') : null)
  const NOTE = 'slug:: note\ntype:: list'
  const distributedNote = fixture('local-includer_spec_NN.md').replace(
    NOTE,
    `${NOTE}\n${DISTRIBUTED('{container}/notes/{slug}/', 'Series')}`,
  )

  it('a local bluepriNNt that includes the declaring one inherits storage', () => {
    const { schema, errors } = resolveBlueprintSchema(fixture('local-includer_spec_NN.md'), resolve)
    expect(errors).toEqual([])
    const byName = new Map(schema.concepts.map((c) => [c.name, c]))
    expect(byName.get('Video')?.storage?.mode).toBe('distributed')
    expect(byName.get('Video')?.storage?.container).toBe('Series')
    expect(byName.get('Preset')?.storage?.mode).toBe('compact')
    expect(byName.get('Note')?.storage).toBeUndefined()
  })

  it('a concept alias renames the container reference with the concept', () => {
    const schema = extractBlueprintSchemaFromContent(fixture('video-like_spec_NN.md'))
    const aliased = applyAliasToSchema(schema, { concepts: { Series: 'Season' } })
    const video = aliased.concepts.find((c) => c.name === 'Video')!
    expect(aliased.concepts.some((c) => c.name === 'Season')).toBe(true)
    expect(video.storage?.container).toBe('Season')
    expect(validateStorage(aliased.concepts)).toEqual([])
  })

  it('reports a declaration error from the composed schema', () => {
    const bad = fixture('video-like_spec_NN.md').replace('container:: Series', 'container:: Preset')
    const { errors } = resolveBlueprintSchema(bad)
    expect(errors.map((e) => e.code)).toEqual(['CONTAINER_NOT_DISTRIBUTED'])
  })

  it('does not judge a container it cannot see when an include is unresolved', () => {
    expect(distributedNote).not.toBe(fixture('local-includer_spec_NN.md'))
    const { errors } = resolveBlueprintSchema(distributedNote)
    expect(errors).toEqual([])
  })

  it('validates a container that an include supplies', () => {
    const { errors } = resolveBlueprintSchema(distributedNote, resolve)
    expect(errors).toEqual([])
  })
})
