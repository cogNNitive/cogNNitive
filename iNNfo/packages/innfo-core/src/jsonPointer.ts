/**
 * JSON Pointer (RFC 6901) syntax and resolution. Pure and browser-safe.
 *
 * Pointers are held in raw (escaped) form: `~0` is `~`, `~1` is `/`. Resolution
 * is strict: the array end marker `-` and indexes with leading zeros do not
 * resolve, and only own properties are addressable.
 */

const POINTER_RE = /^(?:\/(?:[^~/]|~[01])*)*$/
const ARRAY_INDEX_RE = /^(?:0|[1-9]\d*)$/

/** True for the empty pointer and for slash-led pointers whose only escapes are `~0` and `~1`. */
export function isJsonPointer(pointer: string): boolean {
  return POINTER_RE.test(pointer)
}

export type JsonPointerResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'invalid-json' | 'unknown-pointer' }

const unescapeToken = (token: string): string => token.replace(/~1/g, '/').replace(/~0/g, '~')

/** Resolves `pointer` against the JSON document `content`. */
export function resolveJsonPointer(content: string, pointer: string): JsonPointerResult {
  let current: unknown
  try {
    current = JSON.parse(content)
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }
  if (!isJsonPointer(pointer)) return { ok: false, reason: 'unknown-pointer' }
  if (pointer === '') return { ok: true, value: current }
  for (const raw of pointer.slice(1).split('/')) {
    const token = unescapeToken(raw)
    if (Array.isArray(current)) {
      if (!ARRAY_INDEX_RE.test(token) || Number(token) >= current.length) {
        return { ok: false, reason: 'unknown-pointer' }
      }
      current = current[Number(token)]
    } else if (current !== null && typeof current === 'object' && Object.hasOwn(current, token)) {
      current = (current as Record<string, unknown>)[token]
    } else {
      return { ok: false, reason: 'unknown-pointer' }
    }
  }
  return { ok: true, value: current }
}
