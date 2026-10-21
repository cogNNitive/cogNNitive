/**
 * Element content hash shared by the console payload (`hash`), the feedback ledger and the
 * changeset engine (`base_hash` precondition). Kept free of parser/index imports so the
 * changeset module can use it without an import cycle.
 */
import { computeSha256 } from '../validator/crypto.js'

/**
 * Computes canonical JSON string with sorted keys recursively.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJsonStringify).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const sortedKeys = Object.keys(obj).sort()
  const pairs: string[] = []
  for (const k of sortedKeys) {
    if (obj[k] !== undefined) {
      pairs.push(JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k]))
    }
  }
  return '{' + pairs.join(',') + '}'
}

/**
 * Computes 16-hex-character element content hash.
 */
export function computeElementHash(element: {
  concept: string
  name: string
  description?: string
  fields?: Record<string, unknown>
  markers?: Record<string, unknown>
}): string {
  const canonical = canonicalJsonStringify({
    concept: element.concept,
    description: element.description ?? '',
    fields: element.fields ?? {},
    name: element.name,
  })
  return computeSha256(canonical).slice(0, 16)
}

/**
 * Hash of a parsed element node exactly as the console payload computes it: `concept`,
 * `name` and `description` are lifted out of the fields before hashing.
 */
export function hashParsedElement(
  concept: string,
  node: {
    name?: string
    description?: string
    fields?: Record<string, unknown>
    markers?: Record<string, unknown>
  },
): string {
  const fields: Record<string, unknown> = { ...(node.fields || {}) }
  delete fields.concept
  delete fields.name
  const description = node.description || (fields.description as string) || ''
  if (fields.description) delete fields.description
  return computeElementHash({
    concept,
    name: node.name || 'Element',
    description,
    fields,
  })
}
