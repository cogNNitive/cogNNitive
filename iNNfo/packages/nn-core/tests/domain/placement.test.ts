import { describe, it, expect } from 'vitest'
import type { ConceptStorage } from '../../src/schema/storage'
import { placementFor } from '../../src/domain/placement'
import { VIDEO_SCRIPT } from './fixtures'

const decl = VIDEO_SCRIPT

describe('placementFor (placement-validation: instance naming; design A2, A4)', () => {
  it('expands a container-nested Video to its instance folder and file', () => {
    expect(placementFor(decl, 'Video', 'villabotijos-today/intro', 'video-script')).toEqual({
      folder: 'series/villabotijos-today/assets/intro/',
      file: 'intro_video-script_NN.md',
    })
  })

  it('places a container-less Series directly under its literal', () => {
    expect(placementFor(decl, 'Series', 'villabotijos-today', 'video-script')).toEqual({
      folder: 'series/villabotijos-today/',
      file: 'villabotijos-today_video-script_NN.md',
    })
  })

  it('expands {container} to the container instance root, not its whole folder', () => {
    const custom = new Map<string, ConceptStorage>([
      ['Series', { mode: 'distributed', placement: 'series/{slug}/models/' }],
      ['Video', { mode: 'distributed', container: 'Series', placement: '{container}/assets/{slug}/' }],
    ])
    expect(placementFor(custom, 'Video', 'a/b', 'video-script')).toEqual({
      folder: 'series/a/assets/b/',
      file: 'b_video-script_NN.md',
    })
    expect(placementFor(custom, 'Series', 'a', 'video-script')).toEqual({
      folder: 'series/a/models/',
      file: 'a_video-script_NN.md',
    })
  })

  it('puts a compact concept under kNNowledge and rejects an id with a slash', () => {
    expect(placementFor(decl, 'Preset', 'warm', 'video-script')).toEqual({
      folder: 'kNNowledge/',
      file: 'warm_video-script_NN.md',
    })
    const bad = placementFor(decl, 'Preset', 'a/warm', 'video-script')
    expect(bad).toMatchObject({ code: 'MODEL_ID_INVALID', severity: 'error' })
    expect((bad as { message: string }).message).toContain('a/warm')
  })

  it('treats an undeclared concept as compact', () => {
    expect(placementFor(decl, 'Unknown', 'x', 'video-script')).toEqual({
      folder: 'kNNowledge/',
      file: 'x_video-script_NN.md',
    })
  })

  it('rejects an id whose depth does not match the container chain', () => {
    expect(placementFor(decl, 'Video', 'intro', 'video-script')).toMatchObject({ code: 'MODEL_ID_INVALID' })
    expect(placementFor(decl, 'Series', 'a/b', 'video-script')).toMatchObject({ code: 'MODEL_ID_INVALID' })
  })

  it('yields equal stems and distinct ids for two distributed concepts sharing a slug', () => {
    const series = placementFor(decl, 'Series', 'intro', 'video-script')
    const video = placementFor(decl, 'Video', 'villabotijos-today/intro', 'video-script')
    expect(series).toMatchObject({ file: 'intro_video-script_NN.md' })
    expect(video).toMatchObject({ file: 'intro_video-script_NN.md' })
    expect((series as { folder: string }).folder).not.toBe((video as { folder: string }).folder)
  })
})
