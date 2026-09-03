import { describe, it, expect } from 'vitest'
import { normalizeId } from '../src/tools/list-read.js'

describe('normalizeId', () => {
  it('strips trailing _NN suffix', () => {
    expect(normalizeId('defiNNe_V_1-0_NN')).toBe('defiNNe_V_1-0')
  })

  it('strips trailing _NN.md suffix', () => {
    expect(normalizeId('defiNNe_V_1-0_NN.md')).toBe('defiNNe_V_1-0')
  })

  it('strips trailing .md suffix', () => {
    expect(normalizeId('defiNNe_V_1-0.md')).toBe('defiNNe_V_1-0')
  })

  it('handles duplicate _NN suffixes like model_NN_NN.md', () => {
    expect(normalizeId('model_NN_NN.md')).toBe('model')
    expect(normalizeId('model_NN_NN')).toBe('model')
  })

  it('leaves clean model IDs unchanged', () => {
    expect(normalizeId('my_model_v1')).toBe('my_model_v1')
  })
})
