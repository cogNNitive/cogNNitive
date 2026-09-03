import { describe, it, expect } from 'vitest'
import { envelope, envelopeList, envelopeVersion, ENVELOPE_MAJOR } from './envelope'

describe('versioned envelope (machine output contract)', () => {
  it('builds a version string as <contract>@<major>', () => {
    expect(envelopeVersion('innfo-validate-model')).toBe('innfo-validate-model@1')
    expect(envelopeVersion('innfo-calc', 2)).toBe('innfo-calc@2')
    expect(envelopeVersion('innfo-validate-model', ENVELOPE_MAJOR)).toBe('innfo-validate-model@1')
  })

  it('wraps an object payload with a version field while preserving every payload key', () => {
    const payload = { valid: false, errors: [{ path: 'a', message: 'b' }], warnings: [] }
    const wrapped = envelope('innfo-validate-model', payload)
    expect(wrapped.version).toBe('innfo-validate-model@1')
    expect(wrapped.valid).toBe(false)
    expect(wrapped.errors).toEqual(payload.errors)
    expect(wrapped.warnings).toEqual([])
  })

  it('does not overwrite a payload field that is not named version', () => {
    const wrapped = envelope('innfo-get-spec', { spec: null, specCache: null })
    expect(wrapped).toEqual({ version: 'innfo-get-spec@1', spec: null, specCache: null })
  })

  it('wraps an array payload under a named key', () => {
    const items = [{ id: 'Alpha_NN' }, { id: 'Beta_NN' }]
    const wrapped = envelopeList('innfo-list-models', 'models', items)
    expect(wrapped.version).toBe('innfo-list-models@1')
    expect(wrapped.models).toEqual(items)
    expect(Array.isArray(wrapped.models)).toBe(true)
  })
})