/**
 * safe-url.ts
 *
 * URL scheme guard for values that originate in document content.
 *
 * Frontmatter fields such as `source_file` are author-supplied: a model opened
 * from a remote or shared workspace can carry any string. Handing one straight
 * to `window.open` or `location.href` executes `javascript:` and
 * `data:text/html` payloads in the app's own context, so every navigation
 * target derived from document content must pass through here first.
 *
 * Returns `null` when the value is not safe to navigate to; callers surface
 * that as an error rather than navigating.
 */

/** Schemes that may never be navigated to from document-supplied content. */
const DANGEROUS_SCHEME = /^\s*(javascript|data|vbscript|file|blob|about):/i

/**
 * Validate a document-supplied navigation target.
 *
 * Accepts absolute `http:`/`https:` URLs and workspace-relative paths (which
 * resolve against the app origin). Everything else — including scheme-relative
 * `//host` URLs, which inherit the page scheme and point off-origin — is
 * refused.
 */
export function toSafeNavigationUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null

  if (DANGEROUS_SCHEME.test(value)) return null
  if (value.startsWith('//')) return null

  // Any remaining explicit scheme must be http(s).
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(value)
  if (scheme && !/^https?$/i.test(scheme[1])) return null

  return value
}
