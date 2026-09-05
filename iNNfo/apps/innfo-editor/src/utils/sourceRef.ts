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
  slugifyHeading,
  extractHeadings,
  resolveHeadingSection,
  type HeadingInfo,
  type ResolvedHeadingSection,
} from '@cognnitive/innfo-core'

export { slugifyHeading, extractHeadings, resolveHeadingSection }
export type { HeadingInfo, ResolvedHeadingSection }

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
