import { describe, it, expect } from 'vitest'
import { isNNName, isSidecarName, ensureNNFilename } from '../../src/naming/contract.js'

describe('isNNName', () => {
  it('recognizes _NN.md documents case-insensitively, sidecars included', () => {
    expect(isNNName('Client_business_NN.md')).toBe(true)
    expect(isNNName('Client_business_nn.md')).toBe(true)
    expect(isNNName('report.pdf_sidecar_NN.md')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isNNName('README.md')).toBe(false)
    expect(isNNName('data.csv')).toBe(false)
    expect(isNNName('Client_business_NN')).toBe(false)
  })

  it('reads the basename of a path', () => {
    expect(isNNName('kNNowledge/sub/Client_business_NN.md')).toBe(true)
    expect(isNNName('kNNowledge\\Client_business_NN.md')).toBe(true)
  })
})

describe('isSidecarName', () => {
  it('is true only for <file>.<ext>_sidecar_NN.md', () => {
    expect(isSidecarName('report.pdf_sidecar_NN.md')).toBe(true)
    expect(isSidecarName('sources/import/prices.csv_sidecar_NN.md')).toBe(true)
    expect(isSidecarName('notes_sidecar_NN.md')).toBe(false)
    expect(isSidecarName('Client_business_NN.md')).toBe(false)
    expect(isSidecarName('report.pdf')).toBe(false)
  })
})

describe('ensureNNFilename', () => {
  it('appends _NN.md to a bare name', () => {
    expect(ensureNNFilename('Client_business')).toBe('Client_business_NN.md')
  })

  it('completes a name that already ends with _NN', () => {
    expect(ensureNNFilename('Client_business_NN')).toBe('Client_business_NN.md')
  })

  it('leaves a complete _NN.md name unchanged', () => {
    expect(ensureNNFilename('Client_business_NN.md')).toBe('Client_business_NN.md')
  })
})
