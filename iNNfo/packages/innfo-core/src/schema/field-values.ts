import type { ConceptField } from '../types/parser.js'
import type { ValidationError } from '../types/validation.js'

/**
 * Normalizes a field value for membership comparison, union deduplication,
 * filter matching, and tag color hashing.
 * For multiple selects, trim and lowercase.
 */
export function valueKey(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim().toLowerCase()
}

/**
 * Validates a single field value against its Field Definition.
 * Supports multi-valued selects (open/closed vocabulary, case-insensitive comparison),
 * single-valued selects, number (including scale bounds and step), and boolean.
 */
export function validateFieldValue(
  def: ConceptField,
  value: unknown,
  path: string,
): ValidationError[] {
  const diagnostics: ValidationError[] = []

  if (value === undefined || value === null) {
    return diagnostics
  }

  if (def.multiple) {
    if (typeof value === 'string' && value.includes(',') && !value.trim().startsWith('[')) {
      diagnostics.push({
        path,
        message: `Field "${def.name}" has unbracketed comma-separated value "${value}". Multi-valued fields should use [val1, val2]`,
        severity: 'warning',
        code: 'MULTI_VALUE_UNBRACKETED',
      })
    }

    const items = Array.isArray(value) ? value : [value]

    if (def.type === 'select' && def.options && def.options.length > 0) {
      const allowedKeys = new Set(def.options.map(valueKey))
      for (const item of items) {
        if (!allowedKeys.has(valueKey(item))) {
          diagnostics.push({
            path,
            message: `Invalid value "${String(item)}" for "${def.name}". Allowed: ${def.options.join(', ')}`,
            severity: 'error',
          })
        }
      }
    }
    return diagnostics
  }

  // Single-valued select field rejects an array
  if (def.type === 'select' && Array.isArray(value)) {
    diagnostics.push({
      path,
      message: `Single-valued field "${def.name}" does not accept array values`,
      severity: 'error',
    })
    return diagnostics
  }

  if (def.type === 'select' && def.options && def.options.length > 0) {
    const valStr = String(value)
    if (!def.options.includes(valStr)) {
      diagnostics.push({
        path,
        message: `Invalid value "${valStr}" for "${def.name}". Allowed: ${def.options.join(', ')}`,
        severity: 'error',
      })
    }
  } else if (def.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      diagnostics.push({
        path,
        message: `Invalid numeric value "${String(value)}" for "${def.name}"`,
        severity: 'error',
      })
    } else if (def.widget === 'scale' && def.widgetConfig) {
      const { min, max, step } = def.widgetConfig as {
        min?: number
        max?: number
        step?: number
      }
      if (
        (typeof min === 'number' && value < min) ||
        (typeof max === 'number' && value > max)
      ) {
        diagnostics.push({
          path,
          message: `Value ${value} for "${def.name}" is outside declared bounds [${min ?? '-Infinity'}..${max ?? 'Infinity'}]`,
          severity: 'error',
        })
      }
      if (typeof step === 'number' && step > 0) {
        const base = typeof min === 'number' ? min : 0
        const rem = Math.abs((value - base) % step)
        if (rem > 1e-9 && Math.abs(rem - step) > 1e-9) {
          diagnostics.push({
            path,
            message: `Value ${value} for "${def.name}" does not match declared step ${step}`,
            severity: 'error',
          })
        }
      }
    }
  } else if (def.type === 'boolean') {
    if (typeof value !== 'boolean') {
      diagnostics.push({
        path,
        message: `Invalid boolean value "${String(value)}" for "${def.name}"`,
        severity: 'error',
      })
    }
  }

  return diagnostics
}

/**
 * Computes the inheritance delta for an element from its concept's values.
 * - Multi-valued fields: holds only the concept values the element does not already have (by valueKey).
 * - Single-valued fields: holds the concept value only when the element has none.
 */
export function inheritConceptValues(
  own: Record<string, unknown> | undefined,
  conceptValues: Record<string, unknown> | undefined,
  defs: ConceptField[] | undefined,
  concept: string,
): Record<string, { value: unknown; from: string }> {
  const result: Record<string, { value: unknown; from: string }> = {}
  if (!conceptValues || !defs || defs.length === 0) return result

  const ownFields = own || {}

  for (const def of defs) {
    const cVal = conceptValues[def.name]
    if (cVal === undefined || cVal === null) continue

    if (def.multiple) {
      const cArr = Array.isArray(cVal) ? cVal : [cVal]
      const ownVal = ownFields[def.name]
      const ownArr = Array.isArray(ownVal)
        ? ownVal
        : ownVal !== undefined && ownVal !== null
          ? [ownVal]
          : []
      const ownKeys = new Set(ownArr.map(valueKey))
      const delta = cArr.filter((v) => !ownKeys.has(valueKey(v)))
      if (delta.length > 0) {
        result[def.name] = { value: delta, from: concept }
      }
    } else {
      if (ownFields[def.name] === undefined || ownFields[def.name] === null) {
        result[def.name] = { value: cVal, from: concept }
      }
    }
  }

  return result
}
