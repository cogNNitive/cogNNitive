import { describe, it, expect } from 'vitest'
import {
  DEFAULT_INNFO_VERSION,
  DEFAULT_TEMPLATE_VERSION,
  buildSpecificationUrl,
  buildTemplateUrl,
} from '../../src/utils/constants'

/**
 * TDD gate for design.md D3 — the V_0-2-0 adoption of the editor's
 * single-source-of-truth version constants. `DEFAULT_TEMPLATE_VERSION`
 * stays a scalar scaffolding fallback (it names no template); the
 * per-template registry lives in `SHIPPED_TEMPLATE_VERSIONS`.
 */
describe('constants — V_0-2-0 adoption (D3)', () => {
  it('DEFAULT_INNFO_VERSION is the current L1 spec version V_0-2-0', () => {
    expect(DEFAULT_INNFO_VERSION).toBe('V_0-2-0')
  })

  it('buildSpecificationUrl() defaults to the V_0-2-0 L1 spec file', () => {
    expect(buildSpecificationUrl()).toMatch(/iNNfo_V_0-2-0_NN\.md$/)
  })

  it('DEFAULT_TEMPLATE_VERSION is the current scaffolding fallback V_0-2-0', () => {
    expect(DEFAULT_TEMPLATE_VERSION).toBe('V_0-2-0')
  })

  it('buildTemplateUrl() defaults to the V_0-2-0 template file', () => {
    expect(buildTemplateUrl('procedures')).toMatch(/procedures_V_0-2-0_NN\.md$/)
  })
})
