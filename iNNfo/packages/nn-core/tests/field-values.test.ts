import { describe, it, expect } from 'vitest'
import {
  valueKey,
  validateFieldValue,
  inheritConceptValues,
} from '../src/schema/field-values.js'
import type { ConceptField } from '../src/types/parser.js'

describe('valueKey (Task 1.2)', () => {
  it('normalizes string with trim and lowercase', () => {
    expect(valueKey('  Pricing  ')).toBe('pricing')
    expect(valueKey('AI')).toBe('ai')
    expect(valueKey('mixed-CASE_Val')).toBe('mixed-case_val')
  })

  it('handles numbers and booleans by string conversion', () => {
    expect(valueKey(123)).toBe('123')
    expect(valueKey(true)).toBe('true')
    expect(valueKey(false)).toBe('false')
  })

  it('handles null and undefined', () => {
    expect(valueKey(null)).toBe('')
    expect(valueKey(undefined)).toBe('')
  })
})

describe('validateFieldValue (Task 1.2)', () => {
  it('validates multi-valued select with open vocabulary (no options)', () => {
    const def: ConceptField = {
      name: 'tags',
      type: 'select',
      multiple: true,
    }

    expect(validateFieldValue(def, ['pricing', 'ai'], 'element.tags')).toEqual([])
    expect(validateFieldValue(def, 'urgent', 'element.tags')).toEqual([])
    expect(validateFieldValue(def, [], 'element.tags')).toEqual([])
  })

  it('warns MULTI_VALUE_UNBRACKETED for unbracketed comma-separated strings', () => {
    const def: ConceptField = {
      name: 'tags',
      type: 'select',
      multiple: true,
    }

    const diags = validateFieldValue(def, 'a, b', 'element.tags')
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('warning')
    expect(diags[0].code).toBe('MULTI_VALUE_UNBRACKETED')
  })

  it('validates multi-valued select with closed vocabulary (options)', () => {
    const def: ConceptField = {
      name: 'scope',
      type: 'select',
      multiple: true,
      options: ['core', 'edge'],
    }

    // Accepts exact and case-insensitive match
    expect(validateFieldValue(def, ['core', 'edge'], 'element.scope')).toEqual([])
    expect(validateFieldValue(def, ['Core'], 'element.scope')).toEqual([])

    // Rejects unknown member
    const diags = validateFieldValue(def, ['core', 'other'], 'element.scope')
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
    expect(diags[0].message).toContain('other')
  })

  it('rejects array for single-valued field', () => {
    const def: ConceptField = {
      name: 'health',
      type: 'select',
      multiple: false,
      options: ['nominal', 'warning', 'critical'],
    }

    const diags = validateFieldValue(def, ['nominal', 'warning'], 'element.health')
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
    expect(diags[0].message).toContain('array')
  })

  it('validates single-valued select with options', () => {
    const def: ConceptField = {
      name: 'health',
      type: 'select',
      options: ['nominal', 'warning', 'critical'],
    }

    expect(validateFieldValue(def, 'nominal', 'element.health')).toEqual([])

    const diags = validateFieldValue(def, 'failing', 'element.health')
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
  })

  it('validates number field', () => {
    const def: ConceptField = {
      name: 'complexity',
      type: 'number',
    }

    expect(validateFieldValue(def, 75, 'element.complexity')).toEqual([])
    expect(validateFieldValue(def, 0, 'element.complexity')).toEqual([])

    const diags = validateFieldValue(def, 'high', 'element.complexity')
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
  })

  it('validates scale bounds and step on number field', () => {
    const def: ConceptField = {
      name: 'complexity',
      type: 'number',
      widget: 'scale',
      widgetConfig: { min: 0, max: 100, step: 5 },
    }

    expect(validateFieldValue(def, 75, 'element.complexity')).toEqual([])
    expect(validateFieldValue(def, 0, 'element.complexity')).toEqual([])
    expect(validateFieldValue(def, 100, 'element.complexity')).toEqual([])

    const diags1 = validateFieldValue(def, 105, 'element.complexity')
    expect(diags1).toHaveLength(1)
    expect(diags1[0].severity).toBe('error')

    const diags2 = validateFieldValue(def, 62, 'element.complexity')
    expect(diags2).toHaveLength(1)
    expect(diags2[0].severity).toBe('error')
  })

  it('validates boolean field', () => {
    const def: ConceptField = {
      name: 'shipped',
      type: 'boolean',
    }

    expect(validateFieldValue(def, true, 'element.shipped')).toEqual([])
    expect(validateFieldValue(def, false, 'element.shipped')).toEqual([])

    const diags = validateFieldValue(def, 'maybe', 'element.shipped')
    expect(diags).toHaveLength(1)
    expect(diags[0].severity).toBe('error')
  })
})

describe('inheritConceptValues (Task 1.2)', () => {
  const defs: ConceptField[] = [
    { name: 'tags', type: 'select', multiple: true },
    { name: 'health', type: 'select', options: ['nominal', 'warning', 'critical'] },
    { name: 'complexity', type: 'number' },
  ]

  it('computes union delta for multi-valued field with provenance', () => {
    const own = { tags: ['ai'] }
    const conceptValues = { tags: ['core', 'ai'] }

    const inherited = inheritConceptValues(own, conceptValues, defs, 'Goals')
    expect(inherited.tags).toEqual({
      value: ['core'],
      from: 'Goals',
    })
  })

  it('yields empty delta when element already has all concept values', () => {
    const own = { tags: ['ai', 'core'] }
    const conceptValues = { tags: ['core'] }

    const inherited = inheritConceptValues(own, conceptValues, defs, 'Goals')
    expect(inherited.tags).toBeUndefined()
  })

  it('applies concept value for single-valued field when element is silent', () => {
    const own = {}
    const conceptValues = { health: 'warning' }

    const inherited = inheritConceptValues(own, conceptValues, defs, 'Projects')
    expect(inherited.health).toEqual({
      value: 'warning',
      from: 'Projects',
    })
  })

  it('does not inherit when element overrides single-valued field', () => {
    const own = { health: 'nominal' }
    const conceptValues = { health: 'warning' }

    const inherited = inheritConceptValues(own, conceptValues, defs, 'Projects')
    expect(inherited.health).toBeUndefined()
  })
})
