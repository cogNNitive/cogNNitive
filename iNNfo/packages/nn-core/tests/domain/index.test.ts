import { describe, it, expect } from 'vitest'
import { buildDomainIndex } from '../../src/domain/index'
import { model, resolver, seriesModel, videoModel } from './fixtures'

const idsByPath = (models: ReturnType<typeof buildDomainIndex>['models']) =>
  Object.fromEntries(models.map((m) => [m.path, m.id]))

const tutorias = model('kNNowledge/LC_programas_Tutorias_NN.md', [['Programa', 'programa-alfa']], {
  name: 'tutorias_V_0-1-0',
})

const domain = () => [
  seriesModel('villabotijos-today'),
  seriesModel('innteresante'),
  videoModel('villabotijos-today', 'intro', [['Scene', '00-gancho']]),
  videoModel('innteresante', 'intro', [['Scene', '00-gancho']]),
  tutorias,
]

describe('buildDomainIndex ids (hierarchical-identity; design A5)', () => {
  it('derives the worked table of A5', () => {
    const index = buildDomainIndex(domain(), resolver)
    expect(idsByPath(index.models)).toEqual({
      'series/villabotijos-today/villabotijos-today_video-script_NN.md': 'villabotijos-today',
      'series/innteresante/innteresante_video-script_NN.md': 'innteresante',
      'series/villabotijos-today/assets/intro/intro_video-script_NN.md': 'villabotijos-today/intro',
      'series/innteresante/assets/intro/intro_video-script_NN.md': 'innteresante/intro',
      'kNNowledge/LC_programas_Tutorias_NN.md': 'LC_programas_Tutorias',
    })
    expect(index.diagnostics).toEqual([])
  })

  it('classifies instance models with their concept, container and slug', () => {
    const index = buildDomainIndex(domain(), resolver)
    expect(index.byId('villabotijos-today/intro')?.storage).toEqual({
      kind: 'instance',
      concept: 'Video',
      container: 'villabotijos-today',
      slug: 'intro',
    })
    expect(index.byId('innteresante')?.storage).toEqual({
      kind: 'instance',
      concept: 'Series',
      container: null,
      slug: 'innteresante',
    })
    expect(index.byId('LC_programas_Tutorias')?.storage).toEqual({ kind: 'compact' })
    expect(index.byId('LC_programas_Tutorias')?.blueprint).toEqual({ name: 'tutorias', version: 'V_0-1-0' })
  })

  it('does not depend on discovery order', () => {
    const forward = idsByPath(buildDomainIndex(domain(), resolver).models)
    const reversed = idsByPath(buildDomainIndex(domain().reverse(), resolver).models)
    const rotated = idsByPath(buildDomainIndex([...domain().slice(2), ...domain().slice(0, 2)], resolver).models)
    expect(reversed).toEqual(forward)
    expect(rotated).toEqual(forward)
  })

  it('keeps every other id when a file with the same stem is added elsewhere', () => {
    const before = buildDomainIndex(domain(), resolver)
    const added = videoModel('innteresante', 'pepper-mapache')
    const sameStem = model('series/other/assets/intro/intro_video-script_NN.md', [['Video', 'intro']])
    const after = buildDomainIndex([...domain(), added, sameStem], resolver)
    for (const m of before.models) expect(after.byPath(m.path)?.id).toBe(m.id)
    expect(after.byPath(sameStem.path)?.id).toBe('other/intro')
    expect(after.byId('innteresante/intro')?.path).toBe('series/innteresante/assets/intro/intro_video-script_NN.md')
  })

  it('does not resolve a bare stem or a bare slug', () => {
    const index = buildDomainIndex(domain(), resolver)
    expect(index.byId('intro_video-script')).toBeUndefined()
    expect(index.byId('intro')).toBeUndefined()
    expect(index.byPath('series/innteresante/assets/intro/intro_video-script_NN.md')?.id).toBe('innteresante/intro')
  })

  it('keeps a compact id when a same-stem file appears, and reports the duplicate', () => {
    const twin = model('archive-old/LC_programas_Tutorias_NN.md', [], { name: 'tutorias_V_0-1-0' })
    const index = buildDomainIndex([tutorias, twin], resolver)
    expect(index.byPath(tutorias.path)?.id).toBe('LC_programas_Tutorias')
    expect(index.byId('LC_programas_Tutorias')).toBeUndefined()
  })
})

describe('buildDomainIndex identity diagnostics', () => {
  it('reports DUPLICATE_MODEL_ID with every path and resolves neither file', () => {
    const second = model('series/innteresante/assets/intro/intro2_video-script_NN.md', [['Video', 'intro']])
    const index = buildDomainIndex([seriesModel('innteresante'), videoModel('innteresante', 'intro'), second], resolver)
    const dup = index.diagnostics.filter((d) => d.code === 'DUPLICATE_MODEL_ID')
    expect(dup).toHaveLength(1)
    expect(dup[0].severity).toBe('error')
    expect(dup[0].paths).toEqual([
      'series/innteresante/assets/intro/intro2_video-script_NN.md',
      'series/innteresante/assets/intro/intro_video-script_NN.md',
    ])
    expect(dup[0].message).toBe(
      'DUPLICATE_MODEL_ID: id "innteresante/intro" is carried by series/innteresante/assets/intro/intro2_video-script_NN.md, series/innteresante/assets/intro/intro_video-script_NN.md - ids must be unique in a domaiNN; rename or move one',
    )
    expect(index.byId('innteresante/intro')).toBeUndefined()
  })

  it('reports RESERVED_MODEL_ID for the blueprint head and gives the model no id', () => {
    const reserved = model('series/specs/specs_video-script_NN.md', [['Series', 'specs']])
    const index = buildDomainIndex([reserved], resolver)
    expect(index.models).toEqual([])
    expect(index.diagnostics).toMatchObject([{ code: 'RESERVED_MODEL_ID', severity: 'error', paths: [reserved.path] }])
  })

  it('reports MODEL_UNADDRESSABLE naming the bluepriNNt and assigns no fallback id', () => {
    const lost = model('kNNowledge/lost_unresolvable_NN.md', [], { name: 'unresolvable_V_0-1-0' })
    const index = buildDomainIndex([lost, tutorias], resolver)
    expect(index.byPath(lost.path)).toBeUndefined()
    expect(index.byId('lost_unresolvable')).toBeUndefined()
    expect(index.models.map((m) => m.id)).toEqual(['LC_programas_Tutorias'])
    const [d] = index.diagnostics
    expect(d.code).toBe('MODEL_UNADDRESSABLE')
    expect(d.message).toContain('unresolvable')
    expect(d.paths).toEqual([lost.path])
  })

  it('treats a missing parent_spec as unaddressable', () => {
    const bare = { path: 'kNNowledge/x_NN.md', frontmatter: { level: 3 }, elements: [] }
    expect(buildDomainIndex([bare], resolver).diagnostics[0]).toMatchObject({ code: 'MODEL_UNADDRESSABLE' })
  })

  it('never treats a changeset as an instance model', () => {
    const changes = model('changes/20260101T000000Z_changes_NN.md', [['Video', 'intro']], { name: 'changes_V_0-6-0' })
    const index = buildDomainIndex([changes], () => new Map([['Video', { mode: 'distributed', placement: 'series/{slug}/' }]]))
    expect(index.models).toEqual([])
    expect(index.diagnostics).toEqual([])
  })

  it('computes placement through the index with the pinned bluepriNNt declarations', () => {
    const index = buildDomainIndex([], resolver)
    expect(index.placementFor('Video', 'villabotijos-today/intro', 'video-script')).toEqual({
      folder: 'series/villabotijos-today/assets/intro/',
      file: 'intro_video-script_NN.md',
    })
    expect(index.placementFor('Video', 'a/b', 'unresolvable')).toMatchObject({ code: 'MODEL_UNADDRESSABLE' })
  })
})

describe('DomainIndex.resolve (design section 6; A-11)', () => {
  const index = buildDomainIndex(domain(), resolver)

  it('resolves an element field address', () => {
    const r = index.resolve('villabotijos-today/intro@00-gancho&voice')
    expect(r).toMatchObject({
      ok: true,
      element: { concept: 'Scene', slug: '00-gancho' },
      unit: { kind: 'element', slug: '00-gancho', field: 'voice' },
    })
    expect(r.ok && r.model.id).toBe('villabotijos-today/intro')
  })

  it('resolves an instance model id alone to its instance root', () => {
    expect(index.resolve('villabotijos-today/intro')).toMatchObject({
      ok: true,
      element: { concept: 'Video', slug: 'intro' },
      unit: null,
    })
    expect(index.resolve('LC_programas_Tutorias')).toMatchObject({ ok: true, element: null })
  })

  it('lists candidates sharing the last segment for a bare slug, and none for a bare stem', () => {
    const bare = index.resolve('intro')
    expect(bare).toMatchObject({ ok: false, problem: { code: 'REF_MODEL_NOT_FOUND', severity: 'error' } })
    const message = !bare.ok ? bare.problem.message : ''
    expect(message).toContain('innteresante/intro')
    expect(message).toContain('villabotijos-today/intro')
    const stem = index.resolve('intro_video-script')
    expect(stem).toMatchObject({ ok: false, problem: { code: 'REF_MODEL_NOT_FOUND' } })
    expect(!stem.ok && stem.problem.message).not.toContain('innteresante/intro')
  })

  it('reports an unknown element', () => {
    expect(index.resolve('villabotijos-today/intro@nope')).toMatchObject({
      ok: false,
      problem: { code: 'REF_ELEMENT_NOT_FOUND' },
    })
  })

  it('resolves a relative address against the containing model', () => {
    expect(index.resolve('@00-gancho', 'villabotijos-today/intro')).toMatchObject({
      ok: true,
      element: { concept: 'Scene', slug: '00-gancho' },
    })
    expect(index.resolve('@00-gancho')).toMatchObject({ ok: false, problem: { code: 'ADDRESS_MALFORMED' } })
  })

  it('rejects an absolute self-reference as not canonical', () => {
    expect(index.resolve('villabotijos-today/intro@00-gancho', 'villabotijos-today/intro')).toMatchObject({
      ok: false,
      problem: { code: 'ADDRESS_NOT_CANONICAL' },
    })
    expect(index.resolve('innteresante/intro@00-gancho', 'villabotijos-today/intro')).toMatchObject({ ok: true })
  })

  it('warns when the target concept or bluepriNNt differs from the expectation', () => {
    const r = index.resolve('villabotijos-today/intro@00-gancho', undefined, {
      concepts: ['Video'],
      blueprint: 'tutorias',
    })
    expect(r.ok && r.warnings.map((w) => w.code)).toEqual(['REF_CONCEPT_MISMATCH', 'REF_BLUEPRINT_MISMATCH'])
    const fine = index.resolve('villabotijos-today/intro@00-gancho', undefined, {
      concepts: ['scene'],
      blueprint: 'Video-Script',
    })
    expect(fine.ok && fine.warnings).toEqual([])
  })

  it('does not resolve an id carried by two files', () => {
    const second = model('series/innteresante/assets/intro/intro2_video-script_NN.md', [['Video', 'intro']])
    const dup = buildDomainIndex([seriesModel('innteresante'), videoModel('innteresante', 'intro'), second], resolver)
    expect(dup.resolve('innteresante/intro')).toMatchObject({ ok: false, problem: { code: 'REF_MODEL_NOT_FOUND' } })
  })

  it('passes address errors through (a model path is not an address)', () => {
    expect(index.resolve('kNNowledge/x_NN.md@s')).toMatchObject({ ok: false, problem: { code: 'MODEL_CITED_BY_PATH' } })
  })
})
