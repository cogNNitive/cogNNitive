import type { JsonValue } from './types.js'

/** Keeps what JSON can carry; anything else (a Date, undefined, a function) becomes its text. */
export function asJson(value: unknown): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value)
  if (Array.isArray(value)) return value.map(asJson)
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, asJson(v)]))
  }
  return String(value)
}
