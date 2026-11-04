import { describe, it, expect } from 'vitest'
import {
  axisSlug,
  canonicalUnitModelId,
  resolvedTarget,
} from '../../src/changeset/resolved-target.js'

describe('canonicalUnitModelId', () => {
  it('drops a trailing knowledge-version token', () => {
    expect(canonicalUnitModelId('acme_V_0-1-0')).toBe('acme')
    expect(canonicalUnitModelId('acme')).toBe('acme')
    expect(canonicalUnitModelId(' acme_V_12-3-4 ')).toBe('acme')
  })

  it('keeps a model id that merely looks versioned mid-name', () => {
    expect(canonicalUnitModelId('acme_V_0-1-0_extra')).toBe('acme_V_0-1-0_extra')
  })
})

describe('resolvedTarget', () => {
  it('builds a field address from the frozen slug', () => {
    expect(resolvedTarget.field('m', 'goal-1', 'owner')).toBe('m@goal-1&owner')
  })

  it('builds a prose body address', () => {
    expect(resolvedTarget.body('m', 'goal-1')).toBe('m@goal-1&#body')
  })

  it('builds a matrix cell address from the three slugs', () => {
    expect(resolvedTarget.cell('m', 'swot', 'risk-one', 'q1')).toBe('m@swot&risk-one&q1')
  })

  it('builds a concept address with the canonical concept slug, with and without a field', () => {
    expect(resolvedTarget.concept('m', 'Goal')).toBe('m@concept:goal')
    expect(resolvedTarget.concept('m', 'Goal', 'owner')).toBe('m@concept:goal&owner')
    expect(resolvedTarget.concept('m', 'Vision Mission')).toBe('m@concept:vision-mission')
    expect(resolvedTarget.concept('m', 'concept:Vision--Mission')).toBe('m@concept:vision--mission')
  })

  it('builds an element address', () => {
    expect(resolvedTarget.element('m', 'goal-1')).toBe('m@goal-1')
  })

  it('normalizes an artifact path to POSIX', () => {
    expect(resolvedTarget.artifact('artifacts\\report_20261002T101500Z.md')).toBe(
      'artifacts/report_20261002T101500Z.md',
    )
  })

  it('uses the canonical model id, so two versions of one model do not collide', () => {
    expect(resolvedTarget.field('m_V_0-1-0', 'goal-1', 'owner')).toBe(
      resolvedTarget.field('m_V_0-2-0', 'goal-1', 'owner'),
    )
  })

  it('keeps a-b and ab apart', () => {
    expect(resolvedTarget.field('m', 'a-b', 'owner')).not.toBe(resolvedTarget.field('m', 'ab', 'owner'))
  })

  it('keeps two models apart', () => {
    expect(resolvedTarget.field('m1', 'goal-1', 'owner')).not.toBe(
      resolvedTarget.field('m2', 'goal-1', 'owner'),
    )
  })
})

describe('axisSlug', () => {
  it('prefers the frozen slug of the element named by the label', () => {
    expect(axisSlug('Risk One', 'risk-one')).toBe('risk-one')
  })

  it('falls back to slugifying the label', () => {
    expect(axisSlug('Risk One')).toBe('risk-one')
    expect(axisSlug('Q1')).toBe('q1')
  })
})
