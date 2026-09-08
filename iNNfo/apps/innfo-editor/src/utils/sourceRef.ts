/**
 * @deprecated Source-reference parsing and heading slugs now live in
 * `@cognnitive/innfo-core` (`src/sourceRef.ts`) — the single implementation
 * shared by core, the MCP server, and this editor. Import from
 * `@cognnitive/innfo-core` directly in new code.
 *
 * This module stays as a thin editor-local adapter: it keeps the
 * `ParsedSourceRef` shape (`isValid` boolean, never `null`) that the widget
 * components already consume, delegating all real logic to core.
 */
import {
  parseSourceRef as coreParseSourceRef,
  parseKnowledgeUnitRef as coreParseKnowledgeUnitRef,
  serializeKnowledgeUnitRef as coreSerializeKnowledgeUnitRef,
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
  parseKnowledgeUnitRef,
  normalizeName,
} from '@cognnitive/innfo-core'
export type { KnowledgeUnit, ResolvedUnit, SourceRef } from '@cognnitive/innfo-core'

export interface ParsedSourceRef {
  filePath: string
  fileName: string
  slug?: string
  isValid: boolean
}

/**
 * Parse an iNNfo source-reference pointer. Wraps
 * `@cognnitive/innfo-core`'s `parseSourceRef`, mapping its `SourceRef | null`
 * return onto the editor's always-defined `ParsedSourceRef`.
 */
export function parseSourceRef(input: string): ParsedSourceRef {
  const ref = coreParseSourceRef(input)
  if (!ref) return { filePath: '', fileName: '', isValid: false }
  return { filePath: ref.filePath, fileName: ref.fileName, slug: ref.slug, isValid: true }
}

export interface ParsedUnitRef {
  filePath: string
  fileName: string
  slug?: string
  unit?: KnowledgeUnit
  subunits?: string[]
  canonical?: string
  isValid: boolean
}

/**
 * Single entry point for pill rendering: tries the `@` pointer grammar first,
 * falls back to the legacy `#slug` form. Returns `null` for non-references,
 * replacing the three copy-pasted local parsers in the widgets.
 */
export function parseForPill(input: unknown): ParsedUnitRef | null {
  if (typeof input !== 'string') return null
  const unitRef = coreParseKnowledgeUnitRef(input)
  if (unitRef?.unit) {
    const subunits = unitRef.subunits ?? []
    return {
      filePath: unitRef.filePath,
      fileName: unitRef.fileName,
      slug: unitRef.slug,
      unit: unitRef.unit,
      subunits,
      canonical: coreSerializeKnowledgeUnitRef(unitRef.filePath, unitRef.unit, subunits),
      isValid: true,
    }
  }
  const legacy = coreParseSourceRef(input)
  if (!legacy) return null
  return { filePath: legacy.filePath, fileName: legacy.fileName, slug: legacy.slug, isValid: true }
}

/**
 * Compact `file@unit` label for pills and badges
 * (`m.csv@104&mrr_usd`, `G.md@##nn-person--dr-egon-spengler&compensation`).
 */
export function unitLabel(unit: KnowledgeUnit, subunits: string[] = []): string {
  const head = unit.kind === 'header' ? `${'#'.repeat(unit.level)}${unit.slug}` : unit.id
  return subunits.length > 0 ? `${head}&${subunits.join('&')}` : head
}
