/**
 * Source-reference parsing and heading slugs live in `@cognnitive/innfo-core`
 * (`src/sourceRef.ts`) — the single implementation shared by core, the MCP server,
 * and this editor.
 *
 * This module stays as a thin editor-local adapter for legacy callers and re-exports
 * core citation primitives.
 */
import {
  parseCitation,
  slugifyHeading,
  extractHeadings,
  resolveHeadingSection,
  type HeadingInfo,
  type ResolvedHeadingSection,
  type KnowledgeUnit,
} from '@cognnitive/innfo-core'

export { slugifyHeading, extractHeadings, resolveHeadingSection }
export type { HeadingInfo, ResolvedHeadingSection }

export {
  resolveUnit,
  parseCsvTable,
  serializeKnowledgeUnitRef,
  parseCitation,
  normalizeName,
} from '@cognnitive/innfo-core'
export type { KnowledgeUnit, ResolvedUnit, SourceRef, Citation } from '@cognnitive/innfo-core'

export interface ParsedSourceRef {
  filePath: string
  fileName: string
  slug?: string
  isValid: boolean
}

/**
 * Parse an iNNfo source-reference pointer. Wraps
 * `@cognnitive/innfo-core`'s `parseCitation`, mapping its `Citation | null`
 * return onto the editor's always-defined `ParsedSourceRef`.
 */
export function parseSourceRef(input: string): ParsedSourceRef {
  const ref = parseCitation(input)
  if (!ref) return { filePath: '', fileName: '', isValid: false }
  return { filePath: ref.filePath, fileName: ref.fileName, slug: ref.slug, isValid: true }
}

/**
 * Compact `file@unit` label for pills and badges
 * (`m.csv@104&mrr_usd`, `G.md@##nn-person--dr-egon-spengler&compensation`).
 */
export function unitLabel(unit: KnowledgeUnit, subunits: string[] = []): string {
  const head = unit.kind === 'header' ? `${'#'.repeat(unit.level)}${unit.slug}` : unit.id
  return subunits.length > 0 ? `${head}&${subunits.join('&')}` : head
}
