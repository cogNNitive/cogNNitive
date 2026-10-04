/**
 * Pure citation resolution and origin classification logic.
 */
import {
  parseCsvTable,
  parseFrontmatter,
  parseCitation,
  resolveHeadingSection,
  resolveUnit,
  extractHeadings,
  SOURCE_FIELD_NAMES,
} from '../index.js'
import { assertNever } from '../assertNever.js'
import type {
  SourceResolver,
  ResolvedUnit,
  SourceRef,
  HeadingInfo,
} from '../index.js'

/** Hard cap on a returned excerpt's character length. */
export const EXCERPT_CHAR_CAP = 500

/** Origin classification for a resolved citation. */
export type CitationOrigin = 'agent' | 'human' | 'reviewer' | 'document'

/** The `concept` half of a `## NN Agent Modification: <slug>` heading. */
export const AGENT_MODIFICATION_CONCEPT = 'NN Agent Modification'

/** Known agent tool ids. */
export const KNOWN_AGENT_TOOL_IDS: readonly string[] = ['ClaudeCode', 'OpenCode', 'Antigravity']

export interface ResolvedCitation {
  path: string
  anchor?: string
  exists: boolean
  field: string
  origin: CitationOrigin
  author?: string
  excerpt?: string
  truncated?: boolean
  sha256?: string
  /** Derivative hash of a normalized source's companion media (`media_sha256`). */
  media_sha256?: string
  version?: string
  error?: 'MALFORMED' | 'DANGLING_FILE' | 'UNKNOWN_ANCHOR' | 'ELEMENT_NOT_FOUND' | 'MODEL_NOT_FOUND'
}

/**
 * Normalise a tool-id string for comparison against `KNOWN_AGENT_TOOL_IDS`.
 */
export function normalizeToolId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export const NORMALIZED_KNOWN_AGENT_TOOL_IDS = new Set(KNOWN_AGENT_TOOL_IDS.map(normalizeToolId))

/**
 * Walk from the target heading up through its structural ancestors looking for an enclosing Agent Modification block.
 */
export function findEnclosingAgentModification(
  headings: HeadingInfo[],
  idx: number,
): HeadingInfo | undefined {
  const isAgentModification = (h: HeadingInfo): boolean =>
    h.concept?.trim().toLowerCase() === AGENT_MODIFICATION_CONCEPT.toLowerCase()

  if (isAgentModification(headings[idx])) return headings[idx]

  let level = headings[idx].level
  for (let j = idx - 1; j >= 0; j--) {
    if (headings[j].level < level) {
      if (isAgentModification(headings[j])) return headings[j]
      level = headings[j].level
    }
  }
  return undefined
}

/**
 * Read the author line from an Agent Modification block.
 */
export function readAgentModificationAuthor(
  content: string,
  amHeading: HeadingInfo,
): { origin: CitationOrigin; author: string } {
  const lines = content.split('\n')
  let endLine = lines.length
  for (let i = amHeading.line + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) {
      endLine = i
      break
    }
  }

  const authorLineRe = /^\s*author\s*::\s*(.*?)\s*$/i
  let value = ''
  for (let i = amHeading.line + 1; i < endLine; i++) {
    const match = lines[i].match(authorLineRe)
    if (match) {
      value = (match[1] ?? '').trim()
      break
    }
  }

  if (!value || value === '_') {
    return { origin: 'agent', author: 'unknown' }
  }
  if (NORMALIZED_KNOWN_AGENT_TOOL_IDS.has(normalizeToolId(value))) {
    return { origin: 'agent', author: value }
  }
  return { origin: 'human', author: value }
}

/** Classify citation from frontmatter metadata. */
export function classifyFromFrontmatter(fm: { source_type?: string; author?: string } | null): {
  origin: CitationOrigin
  author?: string
} {
  if (fm?.source_type === 'feedback') {
    return { origin: 'reviewer', ...(fm.author ? { author: fm.author } : {}) }
  }
  return { origin: 'document' }
}

/** Matches the heading a citation addresses: header units also pin the level. */
function headingMatcher(ref: SourceRef): (h: HeadingInfo) => boolean {
  const unit = ref.unit
  if (!unit) return (h) => h.slug === ref.slug
  switch (unit.kind) {
    case 'header':
      return (h) => h.slug === ref.slug && h.level === unit.level
    case 'row':
    case 'pointer':
      return (h) => h.slug === ref.slug
    default:
      return assertNever(unit, 'knowledge unit kind')
  }
}

/** The anchor reported for a citation: heading slug, CSV row id, or JSON Pointer. */
function anchorOf(ref: SourceRef): string | undefined {
  const unit = ref.unit
  if (!unit) return ref.slug
  switch (unit.kind) {
    case 'header':
      return ref.slug
    case 'row':
      return ref.slug ?? unit.id
    case 'pointer':
      return unit.pointer
    default:
      return assertNever(unit, 'knowledge unit kind')
  }
}

/**
 * Classify a citation origin by inspecting headings, enclosing Agent Modification blocks, or frontmatter.
 */
export function classifyOrigin(
  content: string,
  fm: { source_type?: string; author?: string } | null,
  ref: SourceRef,
): { origin: CitationOrigin; author?: string } {
  if (ref.slug) {
    const headings = extractHeadings(content)
    const idx = headings.findIndex(headingMatcher(ref))

    if (idx !== -1) {
      const amHeading = findEnclosingAgentModification(headings, idx)
      if (amHeading) return readAgentModificationAuthor(content, amHeading)
    }
  }

  return classifyFromFrontmatter(fm)
}

export function capExcerpt(text: string): { text: string; truncated: boolean } {
  if (text.length <= EXCERPT_CHAR_CAP) return { text, truncated: false }
  return { text: text.slice(0, EXCERPT_CHAR_CAP), truncated: true }
}

export function extractExcerpt(content: string, unit: ResolvedUnit): { text: string; truncated: boolean } {
  const lines = content.split('\n')
  switch (unit.kind) {
    case 'section':
      return capExcerpt(lines.slice(unit.startLine, unit.endLine).join('\n'))
    case 'field':
      return capExcerpt(unit.lines.map((i) => lines[i]).join('\n'))
    case 'cell':
      return capExcerpt(String(unit.value))
    case 'row': {
      const row = parseCsvTable(content).rows[unit.index]
      return capExcerpt(row ? row.join(',') : '')
    }
    case 'pointer':
      return capExcerpt(typeof unit.value === 'string' ? unit.value : JSON.stringify(unit.value))
    default:
      return assertNever(unit, 'resolved unit kind')
  }
}

/**
 * Resolve a single citation string using an injected SourceResolver.
 */
export function resolveCitation(
  raw: string,
  field: string,
  resolver: SourceResolver,
  modelPath: string = '',
): ResolvedCitation {
  const ref = parseCitation(raw)
  if (!ref) {
    return { path: raw, exists: false, field, origin: 'document', error: 'MALFORMED' }
  }

  const anchor = anchorOf(ref)
  const resolved = resolver(ref.filePath, modelPath)
  if (!resolved || !resolved.exists) {
    return { path: ref.filePath, anchor, exists: false, field, origin: 'document', error: 'DANGLING_FILE' }
  }

  const content = resolved.content
  if (!content) {
    return { path: ref.filePath, anchor, exists: true, field, origin: 'document' }
  }

  const fm = parseFrontmatter(content) as
    | {
        sha256?: string
        media_sha256?: string
        version?: string
        knowledge_version?: string
        source_type?: string
        author?: string
      }
    | null
  const sha256 = fm?.sha256
  const mediaSha256 = fm?.media_sha256
  const version = fm?.version ?? fm?.knowledge_version

  let excerpt: { text: string; truncated: boolean } | undefined
  if (ref.unit) {
    const unitResult = resolveUnit(content, ref)
    if (!unitResult) {
      const fmOnly = classifyFromFrontmatter(fm)
      return {
        path: ref.filePath,
        anchor,
        exists: true,
        field,
        origin: fmOnly.origin,
        ...(fmOnly.author ? { author: fmOnly.author } : {}),
        error: 'UNKNOWN_ANCHOR',
      }
    }
    excerpt = extractExcerpt(content, unitResult)
  } else if (ref.slug) {
    const section = resolveHeadingSection(content, ref.slug)
    if (!section) {
      const fmOnly = classifyFromFrontmatter(fm)
      return {
        path: ref.filePath,
        anchor,
        exists: true,
        field,
        origin: fmOnly.origin,
        ...(fmOnly.author ? { author: fmOnly.author } : {}),
        error: 'UNKNOWN_ANCHOR',
      }
    }
    const lines = content.split('\n')
    excerpt = capExcerpt(lines.slice(section.startLine, section.endLine).join('\n'))
  }

  const classified = classifyOrigin(content, fm, ref)

  return {
    path: ref.filePath,
    anchor,
    exists: true,
    field,
    origin: classified.origin,
    ...(classified.author ? { author: classified.author } : {}),
    ...(excerpt ? { excerpt: excerpt.text, ...(excerpt.truncated ? { truncated: true } : {}) } : {}),
    ...(sha256 ? { sha256 } : {}),
    ...(mediaSha256 ? { media_sha256: mediaSha256 } : {}),
    ...(version ? { version } : {}),
  }
}

/**
 * Groups an array of ResolvedCitation by field name, omitting the `field` property from each entry.
 */
export function groupCitationsByField(
  citations: ResolvedCitation[],
): Record<string, Omit<ResolvedCitation, 'field'>[]> {
  const grouped: Record<string, Omit<ResolvedCitation, 'field'>[]> = {}
  for (const c of citations) {
    const fieldName = c.field || 'sources'
    if (!grouped[fieldName]) {
      grouped[fieldName] = []
    }
    const { field: _, ...rest } = c
    grouped[fieldName].push(rest)
  }
  return grouped
}

/**
 * Determines which fields in an element carry citations (name-based or schema type:: citation).
 */
export function citationFieldsFor(
  conceptName: string,
  fields: Record<string, unknown>,
  schema?: any,
): string[] {
  const result = new Set<string>()
  for (const fieldName of Object.keys(fields)) {
    if (SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())) {
      result.add(fieldName)
    }
  }

  if (schema) {
    const schemaFields: any[] = Array.isArray(schema.fields)
      ? schema.fields
      : typeof schema.fields === 'object' && schema.fields !== null
        ? Object.values(schema.fields).flat()
        : []

    for (const sf of schemaFields) {
      if (
        sf &&
        sf.concept === conceptName &&
        sf.type === 'citation' &&
        fields[sf.name] !== undefined
      ) {
        result.add(sf.name)
      }
    }
  }

  return Array.from(result)
}

