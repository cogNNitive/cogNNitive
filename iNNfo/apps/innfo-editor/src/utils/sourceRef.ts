export interface ParsedSourceRef {
  filePath: string
  fileName: string
  slug?: string
  isValid: boolean
}

/**
 * Parser for iNNfo source-reference pointers.
 * Canonical format is a workspace-relative path under `sources/nn/`,
 * optionally followed by a heading-slug anchor: `sources/nn/<path>.md#<heading-slug>`.
 * Example: `sources/nn/clientA/report.md#market-overview`
 *
 * The `sources/nn/` prefix is the disambiguation signal that a string
 * is a genuine source reference (rather than arbitrary plain-string field
 * content) — no synthetic `src-NNN` id is used anymore.
 *
 * No legacy fallbacks or tolerant heuristics permitted (including the
 * older `#L<start>-L<end>` line-range anchor format).
 */
export function parseSourceRef(input: string): ParsedSourceRef {
  if (!input || typeof input !== 'string') {
    return { filePath: '', fileName: '', isValid: false }
  }

  const clean = input.trim()

  // Canonical pattern: sources/nn/path/file.ext#heading-slug
  const canonicalRegex = /^(sources\/nn\/[^#]+?)(?:#([a-z0-9]+(?:-[a-z0-9]+)*))?$/
  const match = clean.match(canonicalRegex)
  if (!match) {
    return { filePath: '', fileName: '', isValid: false }
  }

  const filePath = match[1].trim()
  const fileName = filePath.split(/[/\\]/).pop() || filePath
  const slug = match[2] || undefined

  return {
    filePath,
    fileName,
    slug,
    isValid: true,
  }
}

/**
 * Slugify a single Markdown heading's text into a GitHub-style anchor slug.
 * Must match exactly the algorithm used on the producer (actioNN) side so
 * slugs computed here from a document's real headings line up with slugs
 * embedded in citation strings.
 *
 * Steps:
 * 1. Strip markdown emphasis/formatting characters (`*`, `_`, backtick) and a
 *    leading `#` marker from the heading text.
 * 2. Trim and lowercase.
 * 3. Replace runs of whitespace with a single `-`.
 * 4. Remove any character that isn't `[a-z0-9-]`.
 * 5. Collapse multiple consecutive `-` into one; trim leading/trailing `-`.
 *
 * Note: duplicate-slug disambiguation (`-1`, `-2`, ...) is a document-wide
 * concern, not a per-heading one — see `extractHeadings`.
 */
export function slugifyHeading(text: string): string {
  const stripped = text.replace(/^#+\s*/, '').replace(/[*_`]/g, '')
  const lowered = stripped.trim().toLowerCase()
  const dashed = lowered.replace(/\s+/g, '-')
  const filtered = dashed.replace(/[^a-z0-9-]/g, '')
  return filtered.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

export interface HeadingInfo {
  /** Heading level, 1-6 (number of leading `#`). */
  level: number
  /** Raw heading text (formatting characters stripped, not slugified). */
  text: string
  /** Disambiguated slug for this heading (matches GitHub's anchor behavior). */
  slug: string
  /** 0-based line index of the heading line within the document. */
  line: number
}

/**
 * Scan a Markdown document's `#`/`##`/... headings in top-to-bottom order
 * and compute each one's disambiguated slug.
 */
export function extractHeadings(markdown: string): HeadingInfo[] {
  const lines = markdown.split('\n')
  const seen = new Map<string, number>()
  const headings: HeadingInfo[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/)
    if (!match) continue

    const level = match[1].length
    const text = match[2].replace(/[*_`]/g, '').trim()
    const baseSlug = slugifyHeading(text)
    const occurrence = seen.get(baseSlug) ?? 0
    seen.set(baseSlug, occurrence + 1)
    const slug = occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence}`

    headings.push({ level, text, slug, line: i })
  }

  return headings
}

export interface ResolvedHeadingSection {
  heading: HeadingInfo
  /** 0-based line index where the section starts (the heading line itself). */
  startLine: number
  /**
   * 0-based line index where the section ends, exclusive: the line index of
   * the next heading at the same-or-higher level, or the document's total
   * line count if this is the last such section.
   */
  endLine: number
}

/**
 * Resolve a citation slug to the section of the document it points at: the
 * matching heading plus every line up to (but not including) the next
 * heading of the same or higher level.
 */
export function resolveHeadingSection(markdown: string, slug: string): ResolvedHeadingSection | null {
  const headings = extractHeadings(markdown)
  const index = headings.findIndex((h) => h.slug === slug)
  if (index === -1) return null

  const heading = headings[index]
  const lines = markdown.split('\n')
  let endLine = lines.length

  for (let j = index + 1; j < headings.length; j++) {
    if (headings[j].level <= heading.level) {
      endLine = headings[j].line
      break
    }
  }

  return { heading, startLine: heading.line, endLine }
}
