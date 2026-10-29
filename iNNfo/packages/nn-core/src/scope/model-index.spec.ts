import { describe, it, expect } from 'vitest'
import { buildModelIndex, resolveModelId } from './model-index.js'

describe('model-index', () => {
  const samplePaths = [
    'kNNowledge/alpha_NN.md',
    'kNNowledge/beta_NN.md',
    'series/innteresante/spec_NN.md',
    'series/otro/spec_NN.md',
    'series/innteresante/script_procedures_NN.md',
    'single_doc.md',
  ]

  const index = buildModelIndex(samplePaths)

  it('resolves unique bare stem with and without _NN', () => {
    const res1 = resolveModelId(index, 'alpha_NN')
    expect(res1).toEqual({ ok: true, path: 'kNNowledge/alpha_NN.md' })

    const res2 = resolveModelId(index, 'alpha')
    expect(res2).toEqual({ ok: true, path: 'kNNowledge/alpha_NN.md' })

    const res3 = resolveModelId(index, 'single_doc')
    expect(res3).toEqual({ ok: true, path: 'single_doc.md' })
  })

  it('returns AMBIGUOUS_MODEL_ID when bare stem collides', () => {
    const res1 = resolveModelId(index, 'spec_NN')
    expect(res1).toEqual({
      ok: false,
      code: 'AMBIGUOUS_MODEL_ID',
      candidates: ['series/innteresante/spec_NN.md', 'series/otro/spec_NN.md'],
    })

    const res2 = resolveModelId(index, 'spec')
    expect(res2).toEqual({
      ok: false,
      code: 'AMBIGUOUS_MODEL_ID',
      candidates: ['series/innteresante/spec_NN.md', 'series/otro/spec_NN.md'],
    })
  })

  it('resolves path-qualified id when stem collides', () => {
    const res1 = resolveModelId(index, 'series/innteresante/spec_NN')
    expect(res1).toEqual({ ok: true, path: 'series/innteresante/spec_NN.md' })

    const res2 = resolveModelId(index, 'series/innteresante/spec_NN.md')
    expect(res2).toEqual({ ok: true, path: 'series/innteresante/spec_NN.md' })

    const res3 = resolveModelId(index, 'series/otro/spec')
    expect(res3).toEqual({ ok: true, path: 'series/otro/spec_NN.md' })
  })

  it('resolves windows-style backslashes in paths', () => {
    const res = resolveModelId(index, 'series\\innteresante\\spec_NN')
    expect(res).toEqual({ ok: true, path: 'series/innteresante/spec_NN.md' })
  })

  it('returns MODEL_NOT_FOUND when id or path does not exist', () => {
    const res1 = resolveModelId(index, 'nonexistent')
    expect(res1).toEqual({ ok: false, code: 'MODEL_NOT_FOUND' })

    const res2 = resolveModelId(index, 'series/nonexistent/spec_NN')
    expect(res2).toEqual({ ok: false, code: 'MODEL_NOT_FOUND' })
  })

  it('treats stems with different case as collisions (case-insensitive)', () => {
    const caseIndex = buildModelIndex(['docs/Foo_NN.md', 'docs/foo_NN.md'])
    const res = resolveModelId(caseIndex, 'foo_NN')
    expect(res).toEqual({
      ok: false,
      code: 'AMBIGUOUS_MODEL_ID',
      candidates: ['docs/Foo_NN.md', 'docs/foo_NN.md'],
    })
  })
})
