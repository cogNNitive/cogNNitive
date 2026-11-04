import { describe, it, expect } from 'vitest'
import { buildDomainIndex } from '../../src/domain/index'
import { model, resolver, seriesModel, videoModel } from './fixtures'

const plain = { name: 'plain_V_0-1-0' }

describe('DomainIndex.collection (distributed-collection-resolution; design A8)', () => {
  it('returns the same Videos whether they are instance models or compact elements', () => {
    const distributed = buildDomainIndex(
      [seriesModel('x'), videoModel('x', 'a'), videoModel('x', 'b'), videoModel('x', 'c')],
      resolver,
    )
    const compact = buildDomainIndex(
      [
        model('kNNowledge/x_plain_NN.md', [['Video', 'a'], ['Video', 'b'], ['Video', 'c']], plain),
      ],
      resolver,
    )
    const first = distributed.collection('Video')
    const second = compact.collection('Video')
    expect(first.map((m) => m.slug)).toEqual(['a', 'b', 'c'])
    expect(second.map((m) => m.slug)).toEqual(['a', 'b', 'c'])
    expect(first.map((m) => m.storage)).toEqual(['distributed', 'distributed', 'distributed'])
    expect(second.map((m) => m.storage)).toEqual(['compact', 'compact', 'compact'])
    expect(first.map((m) => m.address)).toEqual(['x/a', 'x/b', 'x/c'])
    expect(second.map((m) => m.address)).toEqual(['x_plain@a', 'x_plain@b', 'x_plain@c'])
  })

  it('returns every instance of each concept under mixed storage', () => {
    const index = buildDomainIndex(
      [
        seriesModel('x'),
        videoModel('x', 'a', [['Preset', 'warm'], ['Scene', '00-gancho']]),
        videoModel('x', 'b', [['Preset', 'cool']]),
      ],
      resolver,
    )
    expect(index.collection('Series').map((m) => m.address)).toEqual(['x'])
    expect(index.collection('Video').map((m) => m.address)).toEqual(['x/a', 'x/b'])
    expect(index.collection('Preset')).toEqual([
      expect.objectContaining({ address: 'x/a@warm', modelId: 'x/a', storage: 'compact' }),
      expect.objectContaining({ address: 'x/b@cool', modelId: 'x/b', storage: 'compact' }),
    ])
    expect(index.collection('Scene').map((m) => m.address)).toEqual(['x/a@00-gancho'])
  })

  it('addresses compact element members by model id and slug, scoped to the owning instance', () => {
    const index = buildDomainIndex(
      [
        seriesModel('x'),
        seriesModel('y'),
        videoModel('x', 'intro', [['Scene', '00-gancho']]),
        videoModel('y', 'intro', [['Scene', '00-gancho']]),
      ],
      resolver,
    )
    expect(index.collection('Scene').map((m) => m.address)).toEqual(['x/intro@00-gancho', 'y/intro@00-gancho'])
  })

  it('keeps a misplaced instance in the collection and flags it', () => {
    const misplaced = model('series/x/videos/intro/intro_coNNtent_NN.md', [['Video', 'intro']])
    const index = buildDomainIndex([seriesModel('x'), videoModel('x', 'ok'), misplaced], resolver)
    const members = index.collection('Video')
    expect(members.map((m) => m.address)).toEqual(['x/intro', 'x/ok'])
    expect(members[0].flags).toEqual(['PLACEMENT_MISMATCH'])
    expect(members[1].flags).toBeUndefined()
  })

  it('lists each stored copy of a double-stored Video once, with its own location', () => {
    const instance = videoModel('x', 'pepper-mapache')
    const registry = model('kNNowledge/X_video_NN.md', [['Video', 'pepper-mapache']])
    const index = buildDomainIndex([seriesModel('x'), instance, registry], resolver)
    const members = index.collection('Video')
    expect(members.map((m) => [m.address, m.storage, m.path])).toEqual([
      ['X_video@pepper-mapache', 'compact', registry.path],
      ['x/pepper-mapache', 'distributed', instance.path],
    ])
    expect(members.every((m) => m.flags?.includes('DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL'))).toBe(true)
  })

  it('matches the concept name case-insensitively and returns nothing for an unknown concept', () => {
    const index = buildDomainIndex([seriesModel('x'), videoModel('x', 'a')], resolver)
    expect(index.collection('video').map((m) => m.address)).toEqual(['x/a'])
    expect(index.collection('Nope')).toEqual([])
  })
})
