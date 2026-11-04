import { describe, it, expect } from 'vitest'
import { buildDomainIndex } from '../../src/domain/index'
import { versionSkew } from '../../src/domain/skew'
import type { DomainModelInput } from '../../src/domain/types'
import { model, resolver, seriesModel, videoModel } from './fixtures'

const at = (n: number, name: string, extra: Record<string, unknown> = {}): DomainModelInput => ({
  path: `kNNowledge/m${String(n).padStart(2, '0')}_NN.md`,
  frontmatter: { level: 3, parent_spec: { name, ...extra } },
  elements: [],
})

const pinned = (count: number, name: string, from = 0) =>
  Array.from({ length: count }, (_, i) => at(from + i, name))

const PACKAGED_URL =
  'https://raw.githubusercontent.com/org/repo/main/iNNfo/specs/bluepriNNts/coNNtent/V_0-14-1/spec_NN.md'

describe('versionSkew (version-uniformity-check; design A14, A-16)', () => {
  it('passes 24 uniform pins', () => {
    expect(versionSkew(pinned(24, 'coNNtent_V_0-14-1'))).toEqual([])
  })

  it('reports exactly one error per bluepriNNt with the structured meta', () => {
    const models = [...pinned(20, 'coNNtent_V_0-14-1'), ...pinned(4, 'coNNtent_V_0-13-6', 20)]
    const findings = versionSkew(models)
    expect(findings).toHaveLength(1)
    const [d] = findings
    expect(d.code).toBe('BLUEPRINT_VERSION_SKEW')
    expect(d.severity).toBe('error')
    expect(d.paths).toHaveLength(24)
    expect(d.meta).toMatchObject({
      blueprint: 'coNNtent',
      concepts: [],
      incomparable: [],
      versions: [
        { version: 'V_0-14-1', count: 20 },
        { version: 'V_0-13-6', count: 4, paths: models.slice(20).map((m) => m.path) },
      ],
    })
    const versions = d.meta?.versions as { paths: string[] }[]
    expect(versions[0].paths).toHaveLength(10)
  })

  it('names both versions, counts and the minority paths in the message', () => {
    const models = [...pinned(3, 'coNNtent_V_0-14-1'), at(3, 'coNNtent_V_0-13-6')]
    const [d] = versionSkew(models)
    expect(d.message).toBe(
      'BLUEPRINT_VERSION_SKEW: bluepriNNt "coNNtent" - pinned at 2 versions across 4 models: V_0-14-1 (3: kNNowledge/m00_NN.md, kNNowledge/m01_NN.md, kNNowledge/m02_NN.md), V_0-13-6 (1: kNNowledge/m03_NN.md); a domaiNN uses one version per bluepriNNt, run nn-upgrade',
    )
  })

  it('truncates long path lists in the message with an ellipsis', () => {
    const [d] = versionSkew([...pinned(5, 'coNNtent_V_0-14-1'), at(5, 'coNNtent_V_0-13-6')])
    expect(d.message).toContain('V_0-14-1 (5: kNNowledge/m00_NN.md, kNNowledge/m01_NN.md, kNNowledge/m02_NN.md...)')
  })

  it('lists a bare name as unpinned and incomparable', () => {
    const [d] = versionSkew([...pinned(2, 'coNNtent_V_0-14-1'), at(2, 'coNNtent')])
    expect(d.meta?.versions).toEqual([
      { version: 'V_0-14-1', count: 2, paths: ['kNNowledge/m00_NN.md', 'kNNowledge/m01_NN.md'] },
      { version: 'unpinned', count: 1, paths: ['kNNowledge/m02_NN.md'] },
    ])
    expect(d.meta?.incomparable).toEqual([{ path: 'kNNowledge/m02_NN.md', reason: 'unpinned' }])
  })

  it('lists an unclassifiable parent_spec.url as incomparable, and accepts a classifiable one', () => {
    const models = [
      at(0, 'coNNtent_V_0-14-1', { url: PACKAGED_URL }),
      at(1, 'coNNtent_V_0-14-1', { url: PACKAGED_URL }),
      at(2, 'coNNtent_V_0-14-1', { url: '../local/coNNtent_spec_NN.md' }),
    ]
    const [d] = versionSkew(models)
    expect(d.meta?.incomparable).toEqual([{ path: 'kNNowledge/m02_NN.md', reason: 'unclassifiable-url' }])
    expect(versionSkew(models.slice(0, 2))).toEqual([])
  })

  it('treats different bluepriNNts as different concepts', () => {
    const models = [at(0, 'villabotijos-today_V_0-1-0'), at(1, 'innteresante_V_0-1-0')]
    expect(versionSkew(models)).toEqual([])
    const same = [at(0, 'villabotijos-today_V_0-1-0'), at(1, 'villabotijos-today_V_0-2-0'), at(2, 'innteresante_V_0-1-0')]
    const findings = versionSkew(same)
    expect(findings).toHaveLength(1)
    expect(findings[0].meta?.blueprint).toBe('villabotijos-today')
  })

  it('applies to compact models and groups names case-insensitively', () => {
    const findings = versionSkew([at(0, 'Tutorias_V_0-1-0'), at(1, 'tutorias_V_0-2-0')])
    expect(findings).toHaveLength(1)
    expect(findings[0].meta?.blueprint).toBe('Tutorias')
  })

  it('reports one finding per skewed bluepriNNt, not one per model', () => {
    const models = [
      ...pinned(6, 'coNNtent_V_0-14-1'),
      ...pinned(6, 'coNNtent_V_0-13-6', 6),
      ...pinned(2, 'tutorias_V_0-1-0', 12),
      ...pinned(2, 'tutorias_V_0-2-0', 14),
    ]
    expect(versionSkew(models).map((d) => d.meta?.blueprint)).toEqual(['coNNtent', 'tutorias'])
  })

  it('says nothing about a single model', () => {
    expect(versionSkew([at(0, 'coNNtent_V_0-14-1')])).toEqual([])
  })

  it('carries the concepts the skewed models hold', () => {
    const models = [
      { ...at(0, 'coNNtent_V_0-14-1'), concepts: ['Video'] },
      { ...at(1, 'coNNtent_V_0-13-6'), concepts: ['Video', 'Series'] },
    ]
    const [d] = versionSkew(models)
    expect(d.meta?.concepts).toEqual(['Series', 'Video'])
    expect(d.message).toContain('bluepriNNt "coNNtent" (concepts: Series, Video) - pinned')
  })
})

describe('buildDomainIndex reports version skew', () => {
  it('adds one BLUEPRINT_VERSION_SKEW with the instance concepts', () => {
    const old = model('series/x/assets/a/a_coNNtent_NN.md', [['Video', 'a']], { name: 'coNNtent_V_0-14-0' })
    const index = buildDomainIndex([seriesModel('x'), old, videoModel('x', 'b')], resolver)
    const skew = index.diagnostics.filter((d) => d.code === 'BLUEPRINT_VERSION_SKEW')
    expect(skew).toHaveLength(1)
    expect(skew[0].meta).toMatchObject({ blueprint: 'coNNtent', concepts: ['Series', 'Video'] })
    expect(index.collection('Video').find((m) => m.slug === 'a')?.flags).toEqual(['BLUEPRINT_VERSION_SKEW'])
  })

  it('stays silent for a uniform domaiNN', () => {
    const index = buildDomainIndex([seriesModel('x'), videoModel('x', 'a'), videoModel('x', 'b')], resolver)
    expect(index.diagnostics).toEqual([])
  })
})
