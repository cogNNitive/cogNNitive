import { describe, it, expect } from 'vitest'
import { checkInstanceName, instanceFileName, roleOf } from '../../src/naming/contract'

describe('instance model file name (nn-naming-contract)', () => {
  it('derives the stem from the folder slug, never from the parent', () => {
    const file = instanceFileName('pepper-mapache', 'video-script')
    expect(file).toBe('pepper-mapache_video-script_NN.md')
    expect(file).not.toContain('villabotijos-today')
  })

  it('does not repeat the suffix when the slug already ends with the bluepriNNt name', () => {
    expect(instanceFileName('video-script', 'video-script')).toBe('video-script_NN.md')
    expect(instanceFileName('my_video-script', 'video-script')).toBe('my_video-script_NN.md')
  })

  it('accepts equal stems in different folders', () => {
    const a = 'series/villabotijos-today/assets/intro/intro_video-script_NN.md'
    const b = 'series/innteresante/assets/intro/intro_video-script_NN.md'
    expect(checkInstanceName(a, 'intro', 'video-script')).toBeNull()
    expect(checkInstanceName(b, 'intro', 'video-script')).toBeNull()
  })

  it('names the expected file when the stem derives from another slug', () => {
    const path = 'series/s/assets/pepper-mapache/intro_video-script_NN.md'
    expect(checkInstanceName(path, 'pepper-mapache', 'video-script')).toEqual({
      expected: 'pepper-mapache_video-script_NN.md',
    })
  })

  it('compares the bluepriNNt suffix case-insensitively', () => {
    expect(checkInstanceName('a/intro_Video-Script_NN.md', 'intro', 'video-script')).toBeNull()
  })

  it('gives the same role to the same bytes at two paths (placement is not role)', () => {
    const compact = roleOf({ path: 'kNNowledge/intro_video-script_NN.md', parentSpecName: 'video-script_V_0-15-0' })
    const instance = roleOf({
      path: 'series/x/assets/intro/intro_video-script_NN.md',
      parentSpecName: 'video-script_V_0-15-0',
    })
    expect(compact).toBe('knowledge')
    expect(instance).toBe('knowledge')
  })
})
