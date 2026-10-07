import { describe, it, expect } from 'vitest'
import {
  parseCitation,
  serializeKnowledgeUnitRef,
  type ElementUnit,
  type MatrixUnit,
} from '../src/sourceRef.js'

describe('Phase 2: Addressing Grammar & Universal Citation Resolution', () => {
  it('2.1.1 parseCitation("model-slug@element-slug") parses as kind: model with ElementUnit', () => {
    const cit = parseCitation('customer-journey@onboarding-step')
    expect(cit).not.toBeNull()
    expect(cit?.kind).toBe('model')
    expect(cit?.filePath).toBe('customer-journey')
    expect(cit?.unit).toEqual({
      kind: 'element',
      slug: 'onboarding-step',
    })
    expect(cit?.subunits).toEqual([])
  })

  it('2.1.2 parseCitation("model-slug@element-slug&field_name") parses as ElementUnit with subunits', () => {
    const cit = parseCitation('customer-journey@onboarding-step&completion_rate')
    expect(cit).not.toBeNull()
    expect(cit?.kind).toBe('model')
    expect(cit?.filePath).toBe('customer-journey')
    expect(cit?.unit).toEqual({
      kind: 'element',
      slug: 'onboarding-step',
    })
    expect(cit?.subunits).toEqual(['completion_rate'])
  })

  it('2.1.3 parseCitation("model-slug@matrix-slug&row&col") parses as MatrixUnit', () => {
    const cit = parseCitation('portfolio@coverage-matrix&security&compliance')
    expect(cit).not.toBeNull()
    expect(cit?.kind).toBe('model')
    expect(cit?.filePath).toBe('portfolio')
    expect(cit?.unit).toEqual({
      kind: 'matrix',
      matrixSlug: 'coverage-matrix',
      rowSlug: 'security',
      colSlug: 'compliance',
    })
  })

  it('2.1.4 serializeKnowledgeUnitRef round-trips ElementUnit and MatrixUnit back to valid strings', () => {
    const elUnit: ElementUnit = { kind: 'element', slug: 'onboarding-step' }
    expect(serializeKnowledgeUnitRef('customer-journey', elUnit)).toBe('customer-journey@onboarding-step')
    expect(serializeKnowledgeUnitRef('customer-journey', elUnit, ['completion_rate'])).toBe('customer-journey@onboarding-step&completion_rate')

    const matrixUnit: MatrixUnit = {
      kind: 'matrix',
      matrixSlug: 'coverage-matrix',
      rowSlug: 'security',
      colSlug: 'compliance',
    }
    expect(serializeKnowledgeUnitRef('portfolio', matrixUnit)).toBe('portfolio@coverage-matrix&security&compliance')
  })

  it('2.1.5 Backwards compatibility: .md@## Heading, .csv@42, and .json@/pointer parse identically', () => {
    const mdCit = parseCitation('sources/report.md@## Overview')
    expect(mdCit?.kind).toBe('source')
    expect(mdCit?.unit?.kind).toBe('header')

    const csvCit = parseCitation('sources/data.csv@42')
    expect(csvCit?.kind).toBe('source')
    expect(csvCit?.unit?.kind).toBe('row')

    const jsonCit = parseCitation('sources/data.json@/items/0/id')
    expect(jsonCit?.kind).toBe('source')
    expect(jsonCit?.unit?.kind).toBe('pointer')
  })
})
