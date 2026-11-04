import { describe, it, expect } from 'vitest'
import type { ConceptStorage } from '../../src/schema/storage'
import { placementFor } from '../../src/domain/placement'
import { VIDEO_SCRIPT } from './fixtures'

const decl = VIDEO_SCRIPT

describe('placementFor (placement-validation: instance naming; design A2, A4)', () => {
  it('expands a container-nested Video to its instance folder and file', () => {
    expect(placementFor(decl, 'Video', 'villabotijos-today/intro', 'coNNtent')).toEqual({
      folder: 'series/villabotijos-today/assets/intro/',
      file: 'intro_coNNtent_NN.md',
    })
  })

  it('places a container-less Series directly under its literal', () => {
    expect(placementFor(decl, 'Series', 'villabotijos-today', 'coNNtent')).toEqual({
      folder: 'series/villabotijos-today/',
      file: 'villabotijos-today_coNNtent_NN.md',
    })
  })

  it('expands {container} to the container instance root, not its whole folder', () => {
    const custom = new Map<string, ConceptStorage>([
      ['Series', { mode: 'distributed', placement: 'series/{slug}/models/' }],
      ['Video', { mode: 'distributed', container: 'Series', placement: '{container}/assets/{slug}/' }],
    ])
    expect(placementFor(custom, 'Video', 'a/b', 'coNNtent')).toEqual({
      folder: 'series/a/assets/b/',
      file: 'b_coNNtent_NN.md',
    })
    expect(placementFor(custom, 'Series', 'a', 'coNNtent')).toEqual({
      folder: 'series/a/models/',
      file: 'a_coNNtent_NN.md',
    })
  })

  it('puts a compact concept under kNNowledge and rejects an id with a slash', () => {
    expect(placementFor(decl, 'Preset', 'warm', 'coNNtent')).toEqual({
      folder: 'kNNowledge/',
      file: 'warm_coNNtent_NN.md',
    })
    const bad = placementFor(decl, 'Preset', 'a/warm', 'coNNtent')
    expect(bad).toMatchObject({ code: 'MODEL_ID_INVALID', severity: 'error' })
    expect((bad as { message: string }).message).toContain('a/warm')
  })

  it('treats an undeclared concept as compact', () => {
    expect(placementFor(decl, 'Unknown', 'x', 'coNNtent')).toEqual({
      folder: 'kNNowledge/',
      file: 'x_coNNtent_NN.md',
    })
  })

  it('rejects an id whose depth does not match the container chain', () => {
    expect(placementFor(decl, 'Video', 'intro', 'coNNtent')).toMatchObject({ code: 'MODEL_ID_INVALID' })
    expect(placementFor(decl, 'Series', 'a/b', 'coNNtent')).toMatchObject({ code: 'MODEL_ID_INVALID' })
  })

  it('yields equal stems and distinct ids for two distributed concepts sharing a slug', () => {
    const series = placementFor(decl, 'Series', 'intro', 'coNNtent')
    const video = placementFor(decl, 'Video', 'villabotijos-today/intro', 'coNNtent')
    expect(series).toMatchObject({ file: 'intro_coNNtent_NN.md' })
    expect(video).toMatchObject({ file: 'intro_coNNtent_NN.md' })
    expect((series as { folder: string }).folder).not.toBe((video as { folder: string }).folder)
  })
})
