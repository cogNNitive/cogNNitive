/**
 * Source-reference parsing and GitHub-compatible heading slugs.
 *
 * THE single implementation shared by `nn-core` and `nn-mcp`.
 *
 * A source reference is a domaiNN-relative path to a `.md`, `.csv`, or `.json`
 * file, optionally followed by a heading-slug anchor (`<path>.md#<heading-slug>`).
 * The path is taken as written: no folder is implied and no folder name
 * has a special meaning.
 * Line-range anchors (`#L12-L45`) and the legacy `src-NNN` wrapper are rejected.
 */

import { nfc, stripCombiningMarks } from './parser/slug.js'
import { assertNever } from './assertNever.js'
import { isJsonPointer } from './jsonPointer.js'
import { roleOf } from './naming/index.js'
import { isAddressError, parseAddress } from './address/index.js'
import type { AddressError } from './address/index.js'

export interface HeaderUnit {
  /** Markdown heading unit: level is structural rank, slug is the canonical form. */
  kind: 'header'
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** Raw heading text (markers stripped, not slugified). */
  text: string
  slug: string
}

export interface RowUnit {
  /** CSV row unit: explicit key-column value (never positional). Case-sensitive. */
  kind: 'row'
  id: string
}

export interface PointerUnit {
  /** JSON Pointer (RFC 6901) unit for `.json` targets, in raw (escaped) form. The empty pointer is the file-level citation. */
  kind: 'pointer'
  pointer: string
}

export interface ElementUnit {
  /** Semantic model element unit kind (D5). */
  kind: 'element'
  /** Immutable element slug within the model. */
  slug: string
}

export interface MatrixUnit {
  /** Semantic model matrix unit kind (D5). */
  kind: 'matrix'
  matrixSlug: string
  rowSlug?: string
  colSlug?: string
}

export type KnowledgeUnit = HeaderUnit | RowUnit | PointerUnit | ElementUnit | MatrixUnit

export interface SourceRef {
  /** Workspace-relative path, as written. */
  filePath: string
  /** Last path segment. */
  fileName: string
  /** Heading slug after `#`, if present. */
  slug?: string
  /** `model` when the target's role is `knowledge`, otherwise `source`. */
  kind: 'source' | 'model'
  /** Original string as authored. */
  raw: string
  /** Knowledge-unit address when parsed from `@` grammar (set by parseKnowledgeUnitRef only). */
  unit?: KnowledgeUnit
  /** Subunit names (field / column / matrix row+column labels). Names only, never values. */
  subunits?: string[]
}

export type Citation = SourceRef & { legacyHash?: true }

export const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*'

export type CitationResult = { ok: true; citation: Citation } | { ok: false; error: AddressError }

export type UnitPathResult =
  | { ok: true; value: { filePath: string; kind: 'source' | 'model' } }
  | { ok: false; error: AddressError }

/** Folders that no longer exist; a path under one gets no special meaning and dangles in the validator. */
const RETIRED_PREFIX_RE = /^(?:sources\/(?:nn|original|export)|export|models)\//
const SOURCE_FILE_RE = /\.(md|csv|json)$/i
/** `sources/` holds raw files only: an extensionless path under it is never a model id. */
const RAW_AREA_RE = /^sources\//
const REMOVED_PATH_FORMS = new Set(['MODEL_CITED_BY_PATH', 'NN_DOCUMENT_CITED_BY_HEADING'])

function malformedCitation(raw: string): AddressError {
  return {
    kind: 'error',
    code: 'ADDRESS_MALFORMED',
    segment: raw,
    message: `Malformed citation \`${raw}\`; use \`<path>@<unit>\` for a raw file or \`<hierarchical-id>@<slug>\` for a kNNowledge unit.`,
  }
}

/**
 * The removed-form error when `pathAndUnit` cites a kNNowledge or changeset document by
 * file path (or a changeset by heading); null for every other value, including paths under
 * a retired folder.
 */
function removedPathForm(pathAndUnit: string): AddressError | null {
  const at = pathAndUnit.indexOf('@')
  const pathOnly = at === -1 ? pathAndUnit : pathAndUnit.slice(0, at)
  const forward = pathOnly.split(/[/\\]/).join('/')
  if (!SOURCE_FILE_RE.test(forward) || RETIRED_PREFIX_RE.test(forward)) return null
  const classified = parseAddress(at === -1 ? forward : forward + pathAndUnit.slice(at))
  return isAddressError(classified) && REMOVED_PATH_FORMS.has(classified.code) ? classified : null
}

/**
 * Parse a single field value as a source reference.
 * @internal Module-internal legacy parser. External callers should use `parseCitation`.
 */
export function parseSourceRef(input: string): SourceRef | null {
  if (!input || typeof input !== 'string') return null
  const clean = input.trim()

  // Reject legacy line-range anchor: #L13 or #L12-L45
  if (/#L\d+(-L\d+)?$/i.test(clean)) return null
  // Reject src-NNN wrapper
  if (/^src-\d+/i.test(clean)) return null

  const legacy = clean.match(new RegExp(`^([^#:]+?)(?:#(${SLUG}))?$`))
  if (!legacy) return null
  const resolved = resolveUnitPath(legacy[1])
  if (!resolved) return null
  return {
    filePath: resolved.filePath,
    fileName: basename(resolved.filePath),
    slug: legacy[2] || undefined,
    kind: resolved.kind,
    raw: clean,
  }
}

/**
 * Parse a unified Citation (`@` markdown heading/CSV unit, file-level bare path,
 * or legacy `#slug`). Single entry point exported by nn-core.
 */
export function parseCitation(input: string): Citation | null {
  if (!input || typeof input !== 'string') return null
  const clean = input.trim()
  if (!clean) return null

  // Reject legacy line-range anchor: #L13, @L10-L20, #L12-L45
  if (/[#@]L\d+(-L\d+)?$/i.test(clean)) return null
  // Reject src-NNN wrapper
  if (/^src-\d+/i.test(clean)) return null

  if (clean.includes('@')) {
    return parseKnowledgeUnitRef(clean)
  }

  if (clean.includes('#')) {
    // Read-only legacy `#slug` form, kept for published write-once specs and frozen samples.
    const ref = parseSourceRef(clean)
    if (ref && ref.slug) {
      return { ...ref, legacyHash: true }
    }
    return null
  }

  // Bare file-level citation (no anchor)
  const resolved = resolveUnitPath(clean)
  if (!resolved) return null

  return {
    filePath: resolved.filePath,
    fileName: basename(resolved.filePath),
    kind: resolved.kind,
    raw: clean,
  }
}

/**
 * `parseCitation` with the reason for a failure. A model file path and a changeset
 * heading are named as removed forms; any other failure is a generic malformed citation.
 */
export function parseCitationResult(input: string): CitationResult {
  const citation = parseCitation(input)
  if (citation) return { ok: true, citation }
  const raw = typeof input === 'string' ? input.trim() : ''
  return { ok: false, error: removedPathForm(raw) ?? malformedCitation(raw) }
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() || p
}

function cleanSourceItem(v: unknown): string {
  if (v === undefined || v === null) return ''
  let s = String(v).trim()
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim()
  }
  return s.replace(/\\,/g, ',').trim()
}

function parseBracketedSourceList(inner: string): string[] {
  const tokens: string[] = []
  let cur = ''
  let inQuote: '"' | "'" | null = null
  let escaped = false

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (escaped) {
      if (ch === ',') {
        cur += ','
      } else if (ch === inQuote) {
        cur += ch
      } else if (ch === '\\') {
        cur += '\\'
      } else {
        cur += '\\' + ch
      }
      escaped = false
      continue
    }

    if (ch === '\\') {
      escaped = true
      continue
    }

    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        cur += ch
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch
      continue
    }

    if (ch === ',') {
      const cleaned = cleanSourceItem(cur)
      if (cleaned) tokens.push(cleaned)
      cur = ''
      continue
    }

    cur += ch
  }

  if (escaped) {
    cur += '\\'
  }

  const cleaned = cleanSourceItem(cur)
  if (cleaned) tokens.push(cleaned)
  return tokens
}

/**
 * Normalise a `sources`/`source` field value into the list of raw reference
 * strings it holds. Handles the three forms a Citation field takes:
 * - an already-split array (`["a.md#x", "b.md#y"]`);
 * - the bracketed-list string the unified `key:: [a, b]` syntax produces when
 *   the field is untyped (`"[a.md#x, b.md#y]"`), with support for single/double
 *   quotes and escaped commas (`\,`);
 * - a single scalar (`"a.md#x"`).
 * Empty / whitespace-only entries are dropped.
 */
export function splitSourceFieldValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    const out: string[] = []
    for (const v of value) {
      const cleaned = cleanSourceItem(v)
      if (cleaned) out.push(cleaned)
    }
    return out
  }
  const s = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
  if (!s) return []
  if (s.startsWith('[')) {
    const inner = s.endsWith(']') ? s.slice(1, -1) : s.slice(1)
    if (s.endsWith(']') || s.includes(',')) {
      return parseBracketedSourceList(inner)
    }
  }
  const cleaned = cleanSourceItem(s)
  return cleaned ? [cleaned] : []
}

/**
 * Compute the Levenshtein edit distance between two strings (case-insensitive).
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length
  const bn = b.length
  if (an === 0) return bn
  if (bn === 0) return an
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0))
  for (let i = 0; i <= an; i++) matrix[0][i] = i
  for (let j = 0; j <= bn; j++) matrix[j][0] = j
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost,
      )
    }
  }
  return matrix[bn][an]
}

/**
 * Slugify one Markdown heading's text into a GitHub-style anchor slug. THE
 * single algorithm — `skills/nn-sources/scripts/markdown-utils.js`
 * mirrors it exactly (parity is asserted by that skill's `test-slug-parity.js`).
 *
 * Steps: strip a leading `#` marker and `* _ \`` emphasis characters,
 * NFD-normalise and drop combining marks so accented letters transliterate
 * ("Visión" → "vision", "Café" → "cafe"), trim, lowercase, whitespace → `-`,
 * drop the remaining non `[a-z0-9-]`, collapse repeated `-`, trim leading /
 * trailing `-`.
 */
export function slugifyHeading(text: string): string {
  const stripped = nfc(text)
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/[*_`]/g, '')
  // Split on exactly-two hyphens bounded by letters/numbers (the `--` boundary
  // marker), slugify each part with full collapsing, rejoin. Runs of 3+ and
  // whitespace-born doubles still collapse; split+join makes canonical slugs
  // (which contain `--`) stable under re-parsing by construction.
  return stripped
    .split(/(?<=[\p{L}\p{N}])--(?=[\p{L}\p{N}])/gu)
    .map(slugifyFlat)
    .join('--')
}

function slugifyFlat(part: string): string {
  const transliterated = stripCombiningMarks(part)
  const dashed = transliterated.trim().toLowerCase().replace(/\s+/g, '-')
  const filtered = dashed.replace(/[^\p{L}\p{N}-]+/gu, '')
  return filtered.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

export interface HeadingInfo {
  /** Heading level, 1-6 (number of leading `#`). */
  level: number
  /** Raw heading text (emphasis characters stripped, not slugified). */
  text: string
  /** Disambiguated slug for this heading (matches GitHub's anchor behavior). */
  slug: string
  /** Concept (left of `:`) for `## NN Concept: Element` headers, when present. */
  concept?: string
  /** Element (right of `:`) for `## NN Concept: Element` headers, when present. */
  element?: string
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
    const { concept, element, slug: baseSlug } = headingSlugParts(text)
    const occurrence = seen.get(baseSlug) ?? 0
    seen.set(baseSlug, occurrence + 1)
    const slug = occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence}`

    headings.push({ level, text, slug, line: i, concept, element })
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

/**
 * Split a heading into Concept/Element at the FIRST `:` (the structural boundary in
 * `## NN Concept: Element`). Inner colons belong to the element text and slugify away.
 * Returns the canonical slug, keeping the boundary visible as `--`.
 */
export function headingSlugParts(text: string): {
  slug: string
  concept?: string
  element?: string
} {
  const clean = text.trim()
  const boundary = clean.indexOf(':')
  if (boundary > 0) {
    const concept = clean.slice(0, boundary).trim()
    const element = clean.slice(boundary + 1).trim()
    if (concept && element) {
      return {
        slug: `${slugifyHeading(concept)}--${slugifyHeading(element)}`,
        concept,
        element,
      }
    }
  }
  return { slug: slugifyHeading(clean) }
}

/**
 * Slugify one Markdown heading into a knowledge-unit slug, preserving the header level
 * and the Concept/Element boundary (`--`). The level is captured by the caller BEFORE
 * slugification — it is structural metadata, not slug text.
 */
export function slugifyUnitHeading(
  level: number,
  text: string,
): { level: 1 | 2 | 3 | 4 | 5 | 6; text: string; slug: string } {
  const clean = text.trim()
  const { slug } = headingSlugParts(clean)
  const clamped = Math.min(6, Math.max(1, Math.floor(level) || 1)) as 1 | 2 | 3 | 4 | 5 | 6
  return { level: clamped, text: clean, slug }
}

/**
 * Normalise a field/column/filter name: trim, lowercase, inner whitespace to `_`,
 * preserving `_` and non-Latin letters. Gentler than heading slugs — data-world names
 * (`mrr_usd`, `relationship_model`) must survive verbatim modulo case.
 */
export function normalizeName(name: string): string {
  return nfc(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-\p{L}\p{N}]+/gu, '')
}

/**
 * Resolve the path part of a citation, with the reason for a failure. A bare hierarchical
 * model id resolves as a model; a raw-file path (`.md`, `.csv`, `.json`) resolves as a
 * source, with or without a trailing `@<unit>`. A kNNowledge or changeset `_NN.md` path
 * does not resolve and the error names the unified grammar.
 */
export function resolveUnitPathResult(rawPath: string): UnitPathResult {
  const trimmed = rawPath.trim()
  const fail = (): UnitPathResult => ({ ok: false, error: malformedCitation(trimmed) })
  const at = trimmed.indexOf('@')
  const pathOnly = at === -1 ? trimmed : trimmed.slice(0, at)
  if (!pathOnly || /^https?:\/\//i.test(pathOnly)) return fail()
  const segments = pathOnly.split(/[/\\]/)
  if (segments.some((s) => s === '..')) return fail()
  const forward = segments.join('/')
  if (!SOURCE_FILE_RE.test(forward)) {
    if (RAW_AREA_RE.test(forward)) return fail()
    const address = parseAddress(pathOnly)
    if (isAddressError(address)) return { ok: false, error: address }
    return address.kind === 'model' ? { ok: true, value: { filePath: pathOnly, kind: 'model' } } : fail()
  }
  if (/^[a-zA-Z]:[/\\]/.test(pathOnly) || pathOnly.startsWith('/')) return fail()
  const removed = removedPathForm(trimmed)
  if (removed) return { ok: false, error: removed }
  return {
    ok: true,
    value: { filePath: forward, kind: roleOf({ path: forward }) === 'knowledge' ? 'model' : 'source' },
  }
}

export function resolveUnitPath(
  rawPath: string,
): { filePath: string; kind: 'source' | 'model' } | null {
  const result = resolveUnitPathResult(rawPath)
  return result.ok ? result.value : null
}

/** A `<hierarchical-id>@<unit>` citation of a kNNowledge unit, mapped onto the SourceRef unit kinds. */
function parseModelUnitRef(raw: string): SourceRef | null {
  if (RAW_AREA_RE.test(raw)) return null
  const address = parseAddress(raw)
  if (isAddressError(address) || address.kind !== 'unit' || address.model === null) return null
  const { model, unit } = address
  const base = { filePath: model, fileName: basename(model), kind: 'model' as const, raw }
  switch (unit.kind) {
    case 'element':
      return {
        ...base,
        slug: unit.slug,
        unit: { kind: 'element', slug: unit.slug },
        subunits: unit.field === undefined ? [] : [unit.field],
      }
    case 'body':
      return { ...base, slug: unit.slug, unit: { kind: 'element', slug: unit.slug }, subunits: ['#body'] }
    case 'cell':
      return {
        ...base,
        slug: unit.matrix,
        unit: { kind: 'matrix', matrixSlug: unit.matrix, rowSlug: unit.row, colSlug: unit.col },
        subunits: [unit.row, unit.col],
      }
    case 'matrix':
      return { ...base, slug: unit.matrix, unit: { kind: 'matrix', matrixSlug: unit.matrix }, subunits: [] }
    case 'concept': {
      const slug = slugifyHeading(unit.concept)
      return {
        ...base,
        slug,
        unit: { kind: 'header', level: 1, text: slug, slug },
        subunits: unit.field === undefined ? [] : [unit.field],
      }
    }
    default:
      return assertNever(unit, 'address unit kind')
  }
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch (err) {
    // propagate deliberately: a malformed URI segment makes the reference invalid.
    return null
  }
}

const HEADER_UNIT = /^(#{1,6})\s*(.+?)\s*$/

/**
 * JSON Pointer citation: everything after `@` is one RFC 6901 pointer (no
 * subunits). A literal `&` is written `%26` and decoded here; an unencoded `&`
 * is malformed.
 */
function parsePointerRef(
  resolved: { filePath: string; kind: 'source' | 'model' },
  rawPointer: string,
  raw: string,
): SourceRef | null {
  if (rawPointer.includes('&')) return null
  const pointer = decodeSegment(rawPointer)
  if (pointer === null || !isJsonPointer(pointer)) return null
  return {
    filePath: resolved.filePath,
    fileName: basename(resolved.filePath),
    kind: resolved.kind,
    unit: { kind: 'pointer', pointer },
    subunits: [],
    raw,
  }
}

/**
 * Parse a knowledge-unit pointer: `path "@" unit *("&" subunit)`.
 * The file extension disambiguates the unit grammar (`.md` → `#`-level header,
 * `.csv` → explicit key-column value). Subunits are names only, never values.
 * Returns `null` for anything that is not a pointer (bare paths, legacy `#slug`
 * fragments, URLs, absolute paths, line anchors).
 */
export function parseKnowledgeUnitRef(input: string): SourceRef | null {
  if (!input || typeof input !== 'string') return null
  const clean = input.trim()
  const at = clean.indexOf('@')
  if (at === -1) return null
  // No file extension: a kNNowledge unit, parsed by the unified address grammar.
  if (!SOURCE_FILE_RE.test(clean.slice(0, at))) return parseModelUnitRef(clean)
  const resolved = resolveUnitPath(clean.slice(0, at))
  if (!resolved) return null
  if (/\.json$/i.test(resolved.filePath)) return parsePointerRef(resolved, clean.slice(at + 1), clean)
  const rawSegments = clean.slice(at + 1).split('&')
  if (rawSegments.some((s) => s.trim() === '')) return null
  const decoded: string[] = []
  for (const part of rawSegments) {
    const text = decodeSegment(part.trim())
    if (text === null || text.trim() === '') return null
    decoded.push(text.trim())
  }
  const [unitRaw, ...subunits] = decoded
  const isCsv = /\.csv$/i.test(resolved.filePath)
  if (isCsv) {
    if (resolved.kind === 'model') return null
    return {
      filePath: resolved.filePath,
      fileName: basename(resolved.filePath),
      kind: 'source',
      unit: { kind: 'row', id: unitRaw },
      subunits,
      raw: clean,
    }
  }
  const heading = unitRaw.match(HEADER_UNIT)
  if (!heading) return null
  const headed = slugifyUnitHeading(heading[1].length, heading[2])
  if (!headed.text || !headed.slug) return null
  const unit: HeaderUnit = {
    kind: 'header',
    level: headed.level,
    text: headed.text,
    slug: headed.slug,
  }
  return {
    filePath: resolved.filePath,
    fileName: basename(resolved.filePath),
    slug: headed.slug,
    kind: resolved.kind,
    unit,
    subunits,
    raw: clean,
  }
}

/**
 * Serialize a parsed pointer back to its canonical `@` form: header level + slug,
 * verbatim row-id, subunits normalized. `parse(serialize(parse(x)))` is stable.
 */
export function serializeKnowledgeUnitRef(
  filePath: string,
  unit: KnowledgeUnit,
  subunits: string[] = [],
): string {
  // Headings are written in their human-readable form (`@## Q4 Outlook`), the
  // way an author would type them and the way they appear in the source file.
  // The slug stays a READ-side derivation: emitting `@##q4-outlook` turned
  // every citation into something nobody could read back against the document.
  let head: string
  switch (unit.kind) {
    case 'header':
      head = `${'#'.repeat(unit.level)} ${unit.text}`
      break
    case 'row':
      head = unit.id
      break
    case 'pointer':
      // No subunits; `%` and `&` are percent-encoded so parse(serialize(x)) is stable.
      return `${filePath}@${unit.pointer.replace(/%/g, '%25').replace(/&/g, '%26')}`
    case 'element':
      head = unit.slug
      break
    case 'matrix': {
      const row = unit.rowSlug ?? subunits[0]
      const col = unit.colSlug ?? subunits[1]
      if (row && col) {
        return `${filePath}@${unit.matrixSlug}&${normalizeName(row)}&${normalizeName(col)}`
      }
      return `${filePath}@${unit.matrixSlug}`
    }
    default:
      return assertNever(unit, 'knowledge unit kind')
  }
  const tail = subunits.map((s) => normalizeName(s)).filter((s) => s !== '')
  return tail.length > 0 ? `${filePath}@${head}&${tail.join('&')}` : `${filePath}@${head}`
}

/**
 * Compact unit label for pills and badges (`104&mrr_usd`, `##nn-person--dr-egon-spengler&compensation`,
 * `/items/0/name`). Header units use the slug form; this is a display label, not a citation.
 */
export function unitLabel(unit: KnowledgeUnit, subunits: string[] = []): string {
  let head: string
  switch (unit.kind) {
    case 'header':
      head = `${'#'.repeat(unit.level)}${unit.slug}`
      break
    case 'row':
      head = unit.id
      break
    case 'pointer':
      head = unit.pointer
      break
    case 'element':
      head = unit.slug
      break
    case 'matrix': {
      const row = unit.rowSlug ?? subunits[0]
      const col = unit.colSlug ?? subunits[1]
      if (row && col) {
        return `${unit.matrixSlug}&${normalizeName(row)}&${normalizeName(col)}`
      }
      return unit.matrixSlug
    }
    default:
      return assertNever(unit, 'knowledge unit kind')
  }
  return subunits.length > 0 ? `${head}&${subunits.join('&')}` : head
}

/**
 * Split a `key::` field value into matchable items. Bracketed lists split on
 * commas respecting double quotes (`[a, "b,c"]` → two items, quotes stripped);
 * anything else is a single scalar (commas preserved). Contrast
 * `splitSourceFieldValue`, which splits naively and stays untouched for
 * provenance parsing.
 */
export function splitBracketList(value: unknown): string[] {
  if (value === undefined || value === null) return []
  const s = String(value).trim()
  if (s === '') return []
  if (!(s.startsWith('[') && s.endsWith(']'))) return [s]
  const inner = s.slice(1, -1)
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '\\' && i + 1 < inner.length) {
      cur += inner[i + 1]
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out.filter((v) => v !== '')
}
