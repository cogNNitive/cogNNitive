/**
 * Source-reference parsing and GitHub-compatible heading slugs.
 *
 * THE single implementation shared by `innfo-core`, `innfo-mcp`, and
 * `innfo-editor` (which re-exports this module). Previously duplicated in
 * `apps/innfo-editor/src/utils/sourceRef.ts`.
 *
 * Canonical source-reference form is a workspace-relative path under
 * `sources/nn/`, optionally followed by a heading-slug anchor:
 * `sources/nn/<path>.md#<heading-slug>`. Unqualified paths (`<path>.md#<slug>`)
 * resolve under `sources/nn/`. A `models/<path>.md#<slug>` form is accepted for
 * cross-domain model references. Line-range anchors (`#L12-L45`) and the legacy
 * `src-NNN` wrapper are rejected.
 */

export interface SourceRef {
  /** Workspace-relative path, always normalised to start with `sources/nn/` (or `models/`). */
  filePath: string
  /** Last path segment. */
  fileName: string
  /** Heading slug after `#`, if present. */
  slug?: string
  /** `model` for a `models/…` reference, `source` for a `sources/nn/…` one. */
  kind: 'source' | 'model'
  /** Original string as authored. */
  raw: string
}

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*'

/**
 * Parse a single field value as a source reference. Returns `null` for anything
 * that is not a reference (plain prose, URLs, line-range anchors, `src-NNN`
 * wrappers, `sources/original/` paths).
 */
export function parseSourceRef(input: string): SourceRef | null {
  if (!input || typeof input !== 'string') return null
  const clean = input.trim()

  // Reject legacy line-range anchor: #L13 or #L12-L45
  if (/#L\d+(-L\d+)?$/i.test(clean)) return null
  // Reject src-NNN wrapper
  if (/^src-\d+/i.test(clean)) return null

  const explicit = clean.match(new RegExp(`^(sources/nn/[^#]+?)(?:#(${SLUG}))?$`))
  if (explicit) {
    const filePath = explicit[1].trim()
    return {
      filePath,
      fileName: basename(filePath),
      slug: explicit[2] || undefined,
      kind: 'source',
      raw: clean,
    }
  }

  const model = clean.match(new RegExp(`^(models/[^#]+?\\.md)(?:#(${SLUG}))?$`))
  if (model) {
    const filePath = model[1].trim()
    return {
      filePath,
      fileName: basename(filePath),
      slug: model[2] || undefined,
      kind: 'model',
      raw: clean,
    }
  }

  const unqualified = clean.match(
    new RegExp(`^((?!https?://)(?!\\.\\.?/)[^#:]+?\\.md)(?:#(${SLUG}))?$`),
  )
  if (unqualified) {
    const rawPath = unqualified[1].trim()
    if (rawPath.startsWith('sources/original/')) return null
    const filePath = `sources/nn/${rawPath}`
    return {
      filePath,
      fileName: basename(rawPath),
      slug: unqualified[2] || undefined,
      kind: 'source',
      raw: clean,
    }
  }

  return null
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() || p
}

/**
 * Normalise a `sources`/`source` field value into the list of raw reference
 * strings it holds. Handles the three forms a Citation field takes:
 * - an already-split array (`["a.md#x", "b.md#y"]`);
 * - the bracketed-list string the unified `key:: [a, b]` syntax produces when
 *   the field is untyped (`"[a.md#x, b.md#y]"`);
 * - a single scalar (`"a.md#x"`).
 * Empty / whitespace-only entries are dropped.
 */
export function splitSourceFieldValue(value: unknown): string[] {
  const out: string[] = []
  const push = (v: unknown) => {
    if (v === undefined || v === null) return
    const s = String(v).trim()
    if (s) out.push(s)
  }
  if (Array.isArray(value)) {
    for (const v of value) push(v)
    return out
  }
  const s = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  const bracketed = s.match(/^\[(.*)\]$/s)
  if (bracketed) {
    for (const part of bracketed[1].split(',')) push(part)
    return out
  }
  push(s)
  return out
}

/**
 * Slugify one Markdown heading's text into a GitHub-style anchor slug.
 *
 * PR 1 keeps the historical editor behaviour byte-for-byte: characters outside
 * `[a-z0-9-]` are dropped, NOT transliterated (so "Visión" → "visin"). PR 10 of
 * the provenance-lineage-consolidation change adds NFD accent transliteration.
 *
 * Steps: strip a leading `#` marker and `* _ \`` emphasis characters, trim,
 * lowercase, whitespace → `-`, drop non `[a-z0-9-]`, collapse repeated `-`,
 * trim leading/trailing `-`.
 */
export function slugifyHeading(text: string): string {
  const stripped = text.replace(/^\s*#{1,6}\s*/, '').replace(/[*_`]/g, '')
  const lowered = stripped.trim().toLowerCase()
  const dashed = lowered.replace(/\s+/g, '-')
  const filtered = dashed.replace(/[^a-z0-9-]/g, '')
  return filtered.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

export interface HeadingInfo {
  /** Heading level, 1-6 (number of leading `#`). */
  level: number
  /** Raw heading text (emphasis characters stripped, not slugified). */
  text: string
  /** Disambiguated slug for this heading (matches GitHub's anchor behavior). */
  slug: string
  /** 0-based line index of the heading line within the document. */
  line: number
}

/**
 * Scan a Markdown document's `#`/`##`/... headings top-to-bottom and compute
 * each one's disambiguated slug (first occurrence bare, later ones `-1`, `-2`).
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
   * 0-based line index where the section ends, exclusive: the next heading at
   * the same-or-higher level, or the document's total line count.
   */
  endLine: number
}

/**
 * Resolve a citation slug to the section it points at: the matching heading plus
 * every line up to (not including) the next heading of the same or higher level.
 */
export function resolveHeadingSection(
  markdown: string,
  slug: string,
): ResolvedHeadingSection | null {
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
