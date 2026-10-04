import { describe, it, expect } from 'vitest'
import { checkNameInvariant, blueprintNameOf } from '../../src/naming/contract.js'
import { validateFormatContent } from '../../src/validator/content.js'

describe('checkNameInvariant', () => {
  it.each([
    ['kNNowledge/Client_business_NN.md', 'business'],
    ['kNNowledge/Client_Business_NN.md', 'business'],
    ['kNNowledge/Client_business_NN.md', 'BUSINESS'],
    ['sources_NN.md', 'sources'],
    ['Sources_NN.md', 'sources'],
    ['sources/import/report.pdf_sidecar_NN.md', 'sidecar'],
    ['kNNowledge/Acme_business-model_NN.md', 'business-model'],
    ['procedures/generate_video_script_procedures_NN.md', 'procedures'],
  ])('%s conforms to %s', (path, bp) => {
    expect(checkNameInvariant(path, bp)).toBeNull()
  })

  it('reports a missing blueprint segment and the expected form', () => {
    expect(checkNameInvariant('kNNowledge/Client_NN.md', 'business')).toEqual({
      expected: 'Client_business_NN.md',
    })
  })

  it('reports a blueprint segment that is not last', () => {
    expect(checkNameInvariant('kNNowledge/Client_business_extra_NN.md', 'business')).toEqual({
      expected: 'Client_business_extra_business_NN.md',
    })
  })

  it('does not accept a partial token as the blueprint', () => {
    expect(checkNameInvariant('Client_mybusiness_NN.md', 'business')).not.toBeNull()
  })

  it('reports a version token in the name even when the blueprint ends the stem', () => {
    expect(checkNameInvariant('kNNowledge/Client_V_1-0-0_business_NN.md', 'business')).toEqual({
      expected: 'Client_business_NN.md',
    })
    expect(checkNameInvariant('kNNowledge/Client_V_1-0-0_NN.md')).toEqual({ expected: 'Client_NN.md' })
  })

  it.each([
    'domaiNN_NN.md',
    'bluepriNNts/sidecar/spec_NN.md',
    'spec_NN.md',
    'iNNfo_V_0-3-0_NN.md',
    'defiNNition_V_0-1-0_NN.md',
    'defiNNe_V_0-1-0_NN.md',
    'meta-bluepriNNt_V_0-1-0_NN.md',
  ])('structural exemption: %s', (path) => {
    expect(checkNameInvariant(path, 'business')).toBeNull()
  })

  it('ignores names that are not _NN.md documents', () => {
    expect(checkNameInvariant('artifacts/report_20261002T101500Z.md', 'business')).toBeNull()
  })

  it('cannot judge the blueprint without one, so only the version rule applies', () => {
    expect(checkNameInvariant('kNNowledge/Client_NN.md')).toBeNull()
  })
})

describe('blueprintNameOf', () => {
  it('strips a trailing version suffix from a parent_spec name', () => {
    expect(blueprintNameOf('business_V_0-2-2')).toBe('business')
    expect(blueprintNameOf('business')).toBe('business')
    expect(blueprintNameOf(' business-model ')).toBe('business-model')
  })
})

describe('validator rule NN_NAME_INVARIANT', () => {
  const doc = (parent: string) =>
    `---\nlevel: 3\nspec_version: V_0-3-0\nknowledge_version: V_1-0-0\nparent_spec:\n  name: ${parent}\n  url: https://example.com/${parent}\n---\n\n# Client\n`

  it('is a warning naming the file, the blueprint, and the expected form', () => {
    const report = validateFormatContent(doc('business'), 'Client_NN.md')
    const check = report.checks.find((c) => c.id === 'NN_NAME_INVARIANT')
    expect(check).toBeDefined()
    expect(check?.severity).toBe('warning')
    expect(check?.passed).toBe(false)
    expect(check?.message).toContain('Client_NN.md')
    expect(check?.message).toContain('business')
    expect(check?.message).toContain('Client_business_NN.md')
  })

  it('is absent for a conforming name', () => {
    const report = validateFormatContent(doc('business'), 'Client_business_NN.md')
    expect(report.checks.find((c) => c.id === 'NN_NAME_INVARIANT')).toBeUndefined()
  })

  it('reads the blueprint from a versioned parent_spec name', () => {
    const report = validateFormatContent(doc('business_V_0-2-2'), 'Client_business_NN.md')
    expect(report.checks.find((c) => c.id === 'NN_NAME_INVARIANT')).toBeUndefined()
  })
})
