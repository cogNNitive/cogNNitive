import { describe, it, expect } from 'vitest'
import { buildDomainIndex } from '../../src/domain/index'
import { fileLocalDiagnostics } from '../../src/domain/placement'
import type { DomainModelInput } from '../../src/domain/types'
import { VIDEO_SCRIPT, model, resolver, seriesModel, videoModel } from './fixtures'

const diagnose = (...inputs: DomainModelInput[]) => buildDomainIndex(inputs, resolver).diagnostics
const codesOf = (...inputs: DomainModelInput[]) => diagnose(...inputs).map((d) => d.code)

describe('layout diagnostics (placement-validation; design A12)', () => {
  it('PLACEMENT_MISMATCH shows the expected folder and keeps the model listed', () => {
    const misplaced = model('series/x/videos/intro/intro_coNNtent_NN.md', [['Video', 'intro']])
    const index = buildDomainIndex([seriesModel('x'), misplaced], resolver)
    expect(index.diagnostics).toEqual([
      expect.objectContaining({
        code: 'PLACEMENT_MISMATCH',
        severity: 'error',
        paths: [misplaced.path],
        id: 'x/intro',
        message:
          'PLACEMENT_MISMATCH: series/x/videos/intro/intro_coNNtent_NN.md holds Video "intro" - Video instances live at series/x/assets/intro/; move the file there',
      }),
    ])
    expect(index.byPath(misplaced.path)?.id).toBe('x/intro')
  })

  it('PLACEMENT_MISMATCH without a derivable container shows the container folder template', () => {
    const lost = model('kNNowledge/pepper-mapache_coNNtent_NN.md', [['Video', 'pepper-mapache']])
    const [d] = diagnose(lost)
    expect(d.code).toBe('PLACEMENT_MISMATCH')
    expect(d.message).toContain('series/{slug}/assets/pepper-mapache/')
  })

  it('INSTANCE_NAME_MISMATCH shows the expected file name', () => {
    const wrong = model('series/x/assets/pepper-mapache/intro_coNNtent_NN.md', [['Video', 'pepper-mapache']])
    expect(diagnose(seriesModel('x'), wrong)).toEqual([
      expect.objectContaining({
        code: 'INSTANCE_NAME_MISMATCH',
        paths: [wrong.path],
        message:
          'INSTANCE_NAME_MISMATCH: series/x/assets/pepper-mapache/intro_coNNtent_NN.md - the instance in folder pepper-mapache/ must be named pepper-mapache_coNNtent_NN.md; rename the file',
      }),
    ])
  })

  it('INSTANCE_SLUG_MISMATCH names the folder slug as the expected one', () => {
    const wrong = model('series/x/assets/intro/intro_coNNtent_NN.md', [['Video', 'other']])
    const index = buildDomainIndex([seriesModel('x'), wrong], resolver)
    expect(index.diagnostics).toEqual([
      expect.objectContaining({
        code: 'INSTANCE_SLUG_MISMATCH',
        message:
          'INSTANCE_SLUG_MISMATCH: series/x/assets/intro/intro_coNNtent_NN.md - root Video has slug "other" but its folder is "intro"; set slug:: intro or move the folder',
      }),
    ])
    expect(index.byPath(wrong.path)?.id).toBe('x/intro')
  })

  it('CONTAINER_MISSING names the container concept and folder', () => {
    const orphan = videoModel('no-such-series', 'intro')
    expect(diagnose(orphan)).toEqual([
      expect.objectContaining({
        code: 'CONTAINER_MISSING',
        paths: [orphan.path],
        message:
          'CONTAINER_MISSING: series/no-such-series/assets/intro/intro_coNNtent_NN.md - container Series "no-such-series" is not an instance of Series (expected a model in series/no-such-series/); add it or move the file',
      }),
    ])
    expect(codesOf(seriesModel('no-such-series'), orphan)).toEqual([])
  })

  it('DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL covers a registry of Videos', () => {
    const registry = model('kNNowledge/VillabotijosToday_video_NN.md', [
      ['Video', 'pepper-mapache'],
      ['Video', 'intro'],
    ])
    expect(diagnose(registry)).toEqual([
      expect.objectContaining({
        code: 'DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL',
        severity: 'error',
        paths: [registry.path],
        message:
          'DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL: kNNowledge/VillabotijosToday_video_NN.md - Video is distributed but this model holds 2 Video elements (pepper-mapache, intro), which would be instances <series>/pepper-mapache, <series>/intro; run extract_instance for each or remove_element',
      }),
    ])
  })

  it('DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL covers a Video only in a registry', () => {
    const registry = model('kNNowledge/VillabotijosToday_video_NN.md', [['Video', 'intro']])
    const index = buildDomainIndex([registry], resolver)
    expect(index.diagnostics.map((d) => d.code)).toEqual(['DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL'])
    expect(index.byPath(registry.path)?.storage).toEqual({ kind: 'compact' })
  })

  it('names both locations when a Video is stored as an instance model and in a registry', () => {
    const instance = videoModel('villabotijos-today', 'pepper-mapache')
    const registry = model('kNNowledge/VillabotijosToday_video_NN.md', [['Video', 'pepper-mapache']])
    const [d] = diagnose(seriesModel('villabotijos-today'), instance, registry)
    expect(d.code).toBe('DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL')
    expect(d.paths).toEqual([registry.path, instance.path])
    expect(d.message).toContain(`also stored as instance model ${instance.path}`)
  })

  it('MIXED_INSTANCE_MODEL names both concepts', () => {
    const mixed = model('series/x/x_coNNtent_NN.md', [
      ['Series', 'x'],
      ['Video', 'intro'],
    ])
    expect(diagnose(mixed)).toEqual([
      expect.objectContaining({
        code: 'MIXED_INSTANCE_MODEL',
        paths: [mixed.path],
        message:
          'MIXED_INSTANCE_MODEL: series/x/x_coNNtent_NN.md - holds elements of two distributed concepts (Series, Video); each distributed concept is its own model',
      }),
    ])
  })

  it('INSTANCE_SHADOWS_ELEMENT_ASSETS warns when an element slug of the container equals an instance slug', () => {
    const series = model('series/x/x_coNNtent_NN.md', [
      ['Series', 'x'],
      ['Scene', 'intro'],
    ])
    const [d] = diagnose(series, videoModel('x', 'intro'))
    expect(d).toMatchObject({
      code: 'INSTANCE_SHADOWS_ELEMENT_ASSETS',
      severity: 'warning',
      paths: [series.path, 'series/x/assets/intro/intro_coNNtent_NN.md'],
    })
    expect(d.message).toContain('series/x/assets/intro/')
    expect(codesOf(seriesModel('x'), videoModel('x', 'intro'))).toEqual([])
  })

  it('emits nothing for a per-instance folder whose concept declares no storage', () => {
    const alpha = model('proyectos/alpha/models/alpha_business_NN.md', [['Project', 'alpha']], {
      name: 'business_V_0-3-0',
    })
    const index = buildDomainIndex([alpha], resolver)
    expect(index.diagnostics).toEqual([])
    expect(index.byPath(alpha.path)).toMatchObject({ id: 'alpha_business', storage: { kind: 'compact' } })
  })

  it('does not check models that pin a non-declaring bluepriNNt', () => {
    const local = model('series/x/assets/intro/intro_local_NN.md', [['Video', 'intro']], { name: 'local-spec_V_0-1-0' })
    expect(diagnose(local)).toEqual([])
  })
})

describe('fileLocalDiagnostics (single-file validation; A-10)', () => {
  it('reports placement for one file without the domaiNN', () => {
    const misplaced = model('kNNowledge/pepper-mapache_coNNtent_NN.md', [['Video', 'pepper-mapache']])
    expect(fileLocalDiagnostics(misplaced, VIDEO_SCRIPT).map((d) => d.code)).toEqual(['PLACEMENT_MISMATCH'])
  })

  it('reports naming, slug and cardinality findings', () => {
    const name = model('series/x/assets/a/b_coNNtent_NN.md', [['Video', 'a']])
    const slug = model('series/x/assets/a/a_coNNtent_NN.md', [['Video', 'z']])
    const two = model('series/x/assets/a/a_coNNtent_NN.md', [
      ['Video', 'a'],
      ['Video', 'b'],
    ])
    expect(fileLocalDiagnostics(name, VIDEO_SCRIPT).map((d) => d.code)).toEqual(['INSTANCE_NAME_MISMATCH'])
    expect(fileLocalDiagnostics(slug, VIDEO_SCRIPT).map((d) => d.code)).toEqual(['INSTANCE_SLUG_MISMATCH'])
    expect(fileLocalDiagnostics(two, VIDEO_SCRIPT).map((d) => d.code)).toEqual([
      'DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL',
    ])
  })

  it('stays silent on a conforming file and leaves cross-file findings to the index', () => {
    expect(fileLocalDiagnostics(videoModel('no-such-series', 'intro'), VIDEO_SCRIPT)).toEqual([])
    expect(fileLocalDiagnostics(model('kNNowledge/x_coNNtent_NN.md', [['Scene', 'a']]), VIDEO_SCRIPT)).toEqual([])
  })
})
