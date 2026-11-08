import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDomainIndex } from '../src/domain/index'
import type { DomainModelInput } from '../src/domain/types'
import type { ConceptStorage } from '../src/schema/storage'
import { extractBlueprintSchemaFromContent } from '../src/schema/extract'
import { blueprintNameOf, roleOf } from '../src/naming/contract'
import { parseChangeset } from '../src/changeset/parser'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', 'specs')
const read = (relative: string) => readFileSync(join(specsRoot, relative), 'utf-8')

const CONNTENT = read('bluepriNNts/coNNtent/spec_NN.md')

/** The declarations the SHIPPED `coNNtent` bluepriNNt carries, not a test double. */
const declared = ((): ReadonlyMap<string, ConceptStorage> => {
  const schema = extractBlueprintSchemaFromContent(CONNTENT)
  return new Map<string, ConceptStorage>(schema.concepts.map((c) => [c.name, c.storage ?? { mode: 'compact' }]))
})()

const storageOf = (concept: string): ConceptStorage | undefined => declared.get(concept)

/** Resolves coNNtent to its real declarations; every other bluepriNNt declares nothing. */
const resolver = ({ name }: { name: string }) =>
  blueprintNameOf(name).toLowerCase() === 'conntent' ? declared : new Map<string, ConceptStorage>()

function model(
  path: string,
  elements: ReadonlyArray<[concept: string, slug: string]>,
  pin = 'coNNtent_V_0-15-1',
): DomainModelInput {
  return {
    path,
    frontmatter: { level: 3, parent_spec: { name: pin, url: 'specs/bluepriNNts/coNNtent/spec_NN.md' } },
    elements: elements.map(([concept, slug]) => ({ concept, slug })),
  }
}

const seriesModel = (slug: string, pin?: string) =>
  model(`series/${slug}/${slug}_coNNtent_NN.md`, [['Series', slug]], pin)
const episodeModel = (
  series: string,
  slug: string,
  extra: ReadonlyArray<[string, string]> = [],
  pin?: string,
) => model(`series/${series}/assets/${slug}/${slug}_coNNtent_NN.md`, [['Video', slug], ...extra], pin)

const codesOf = (...inputs: DomainModelInput[]) =>
  buildDomainIndex(inputs, resolver).diagnostics.map((d) => d.code)

describe('coNNtent declares its storage (video-blueprint; design A16, section 5)', () => {
  it('pins bluepriNNt V_0-15-2 against iNNfo V_0-7-0', () => {
    expect(CONNTENT).toMatch(/^blueprint_version: "V_0-15-2"$/m)
    expect(CONNTENT).toMatch(/^ {2}name: "iNNfo_V_0-7-0"$/m)
  })

  it('declares Series and Video distributed, with the Video nested in its Series', () => {
    expect(storageOf('Series')).toEqual({ mode: 'distributed', placement: 'series/{slug}/' })
    expect(storageOf('Video')).toEqual({
      mode: 'distributed',
      container: 'Series',
      placement: '{container}/assets/{slug}/',
    })
  })

  it('keeps Scene, Layer, Preset and Video Defaults compact', () => {
    for (const concept of ['Scene', 'Layer', 'Preset', 'Video Defaults']) {
      expect(storageOf(concept), concept).toEqual({ mode: 'compact' })
    }
  })
})

describe('episodes follow the declared placement (placement-validation)', () => {
  it('accepts an episode at series/<s>/assets/<slug>/ with no layout finding', () => {
    const index = buildDomainIndex(
      [
        seriesModel('villabotijos-today'),
        episodeModel('villabotijos-today', 'pepper-mapache', [
          ['Scene', '00-gancho'],
          ['Layer', '00-gancho-presenter'],
        ]),
      ],
      resolver,
    )
    expect(index.diagnostics).toEqual([])
    expect(index.byId('villabotijos-today/pepper-mapache')?.storage).toEqual({
      kind: 'instance',
      concept: 'Video',
      container: 'villabotijos-today',
      slug: 'pepper-mapache',
    })
  })

  it('reports PLACEMENT_MISMATCH for an episode under kNNowledge/', () => {
    const misplaced = model('kNNowledge/pepper-mapache_coNNtent_NN.md', [['Video', 'pepper-mapache']])
    const [finding] = buildDomainIndex([misplaced], resolver).diagnostics
    expect(finding.code).toBe('PLACEMENT_MISMATCH')
    expect(finding.severity).toBe('error')
    expect(finding.message).toContain('Video instances live at series/{slug}/assets/pepper-mapache/')
  })

  it('reports double storage when the same Video is also a registry element', () => {
    const instance = episodeModel('villabotijos-today', 'pepper-mapache')
    const registry = model('kNNowledge/VillabotijosToday_coNNtent_NN.md', [['Video', 'pepper-mapache']])
    const [finding] = buildDomainIndex([seriesModel('villabotijos-today'), instance, registry], resolver).diagnostics
    expect(finding.code).toBe('DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL')
    expect(finding.paths).toEqual([registry.path, instance.path])
    expect(finding.message).toContain(`also stored as instance model ${instance.path}`)
  })
})

describe('Scenes and Layers are elements, not models (coNNtent-model)', () => {
  const domain = () =>
    buildDomainIndex(
      [
        seriesModel('villabotijos-today'),
        seriesModel('innteresante'),
        episodeModel('villabotijos-today', 'intro', [
          ['Scene', '00-gancho'],
          ['Layer', '00-gancho-presenter'],
        ]),
        episodeModel('innteresante', 'intro', [['Scene', '00-gancho']]),
      ],
      resolver,
    )

  it('addresses a Scene and a Layer through their Video instance model', () => {
    const index = domain()
    const scene = index.resolve('villabotijos-today/intro@00-gancho')
    expect(scene.ok).toBe(true)
    if (scene.ok) expect(scene.element).toEqual({ concept: 'Scene', slug: '00-gancho' })
    const layer = index.resolve('villabotijos-today/intro@00-gancho-presenter')
    expect(layer.ok).toBe(true)
    if (layer.ok) expect(layer.element).toEqual({ concept: 'Layer', slug: '00-gancho-presenter' })
  })

  it('gives each episode its own Scenes instead of one shared Scene model', () => {
    const scenes = domain().collection('Scene')
    expect(scenes.map((s) => s.address)).toEqual([
      'innteresante/intro@00-gancho',
      'villabotijos-today/intro@00-gancho',
    ])
    expect(scenes.every((s) => s.storage === 'compact')).toBe(true)
    expect(scenes.map((s) => s.modelId)).toEqual(['innteresante/intro', 'villabotijos-today/intro'])
  })

  it('rejects a second Video in one script (one Video per script)', () => {
    const two = model('series/villabotijos-today/assets/intro/intro_coNNtent_NN.md', [
      ['Video', 'intro'],
      ['Video', 'outro'],
    ])
    const [finding] = buildDomainIndex([seriesModel('villabotijos-today'), two], resolver).diagnostics
    expect(finding.code).toBe('DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL')
    expect(finding.message).toContain('holds 2 Video elements (intro, outro)')
    expect(finding.meta).toMatchObject({ concept: 'Video', slugs: ['intro', 'outro'] })
  })
})

describe('existing episodes pinning other versions (video-blueprint; placement-validation)', () => {
  it('reports a V_0-14-1 episode among V_0-15-1 as skew and leaves its pin untouched', () => {
    const old = episodeModel('villabotijos-today', 'intro', [], 'coNNtent_V_0-14-1')
    const current = episodeModel('villabotijos-today', 'nuevo')
    const index = buildDomainIndex([seriesModel('villabotijos-today'), old, current], resolver)
    const finding = index.diagnostics.find((d) => d.code === 'BLUEPRINT_VERSION_SKEW')
    expect(finding).toBeDefined()
    expect(finding!.message).toContain('bluepriNNt "coNNtent"')
    expect(finding!.paths).toContain(old.path)
    expect(finding!.paths).toContain(current.path)
    expect(index.byPath(old.path)?.blueprint).toEqual({ name: 'coNNtent', version: 'V_0-14-1' })
  })

  it('reports no placement finding for a model pinning a non-declaring bluepriNNt', () => {
    const legacy = episodeModel('villabotijos-today', 'intro', [], 'villabotijos-today_V_0-1-0')
    const index = buildDomainIndex([legacy], resolver)
    expect(index.diagnostics.filter((d) => d.code.startsWith('PLACEMENT'))).toEqual([])
    expect(index.byPath(legacy.path)?.storage).toEqual({ kind: 'compact' })
    expect(index.byPath(legacy.path)?.blueprint.version).toBe('V_0-1-0')
  })
})

describe('changes regression (changes-collection)', () => {
  const CHANGES = read('bluepriNNts/changes/spec_NN.md')

  it('keeps nature: members/derived and declares no storage', () => {
    expect(CHANGES).toMatch(/^nature:\n {2}structure: members\n {2}ownership: derived$/m)
    expect(CHANGES).not.toContain('storage:: ')
    expect(CHANGES).toMatch(/^blueprint_version: "V_0-8-1"$/m)
  })

  it('keeps a Change unit id as <batch>#<change-id> and never an instance model', () => {
    const batch = 'testlab_lucas_20261012T173127Z'
    const changeset = [
      '---',
      'spec_version: "V_0-4-0"',
      'level: 3',
      'parent_spec:',
      '  name: changes',
      '  url: "specs/bluepriNNts/changes/spec_NN.md"',
      'blueprint_version: "V_0-7-0"',
      'status: proposed',
      'title: "Batch"',
      '---',
      '',
      '# NN index',
      '',
      '* [[Change]]',
      '',
      '# NN Change',
      '',
      '## NN Change: c-01',
      'op:: update_field',
      'target:: strategy@vision&statement',
      'to:: "x"',
      'evidence:: decision',
      '',
    ].join('\n')
    const parsed = parseChangeset(changeset)
    expect(`${batch}#${parsed.changes[0].id}`).toBe('testlab_lucas_20261012T173127Z#c-01')
    const path = `changes/${batch}_changes_NN.md`
    expect(roleOf({ path: 'batch_changes_NN.md', parentSpecName: 'changes_V_0-7-0' })).toBe('changeset')
    expect(buildDomainIndex([model(path, [['Change', 'c-01']], 'changes_V_0-7-0')], resolver).models).toEqual([])
  })
})
