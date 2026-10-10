/** Shared helpers for the changeset module (address parsing, regex escaping). */

/** Escape a literal string for use inside a RegExp. */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The model-slug prefix of a D5 target address `model@element&field` (or a bare `model`). */
export function extractModelSlug(target: string): string {
  const atIdx = target.indexOf('@')
  if (atIdx !== -1) {
    return target.slice(0, atIdx).trim()
  }
  return target.trim()
}
