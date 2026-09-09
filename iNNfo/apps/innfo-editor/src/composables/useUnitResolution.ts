import {
  resolveUnit,
  type KnowledgeUnit,
  type ResolvedUnit,
  type SourceRef,
} from '../utils/sourceRef'

/**
 * Shared unit-resolution behavior for preview surfaces (FilePreviewModal):
 * resolve a knowledge-unit pointer against loaded content, then scroll the
 * preview container to it. One implementation instead of per-kind branches.
 */
export function useUnitResolution() {
  function resolveTarget(
    content: string,
    filePath: string,
    fileName: string,
    unit: KnowledgeUnit,
    subunits: string[] = [],
  ): ResolvedUnit | null {
    // `kind` only labels the provenance domain; resolvers ignore it.
    const ref: SourceRef = { filePath, fileName, kind: 'source', raw: '', unit, subunits }
    return resolveUnit(content, ref)
  }

  /**
   * Data-row index behind a resolved row/cell (`row.index` vs `cell.row` live
   * on different shapes — read through here, never directly). `null` for
   * section/field units or null resolutions.
   */
  function resolvedRowIndex(resolved: ResolvedUnit | null): number | null {
    if (!resolved) return null
    if (resolved.kind === 'row') return resolved.index
    if (resolved.kind === 'cell') return resolved.row
    return null
  }

  /**
   * Scroll to a resolved target inside the preview container. Understands the
   * `line-N` code-line ids and the `data-csv-row` table rows. Returns true
   * when an element was found and scrolled to.
   */
  function scrollToResolved(resolved: ResolvedUnit | null): boolean {
    if (!resolved) return false
    let selector: string | null = null
    if (resolved.kind === 'field' && resolved.lines.length > 0) {
      selector = `#line-${resolved.lines[0] + 1}`
    } else if (resolved.kind === 'section') {
      selector = `#line-${resolved.startLine + 1}`
    } else if (resolved.kind === 'row' || resolved.kind === 'cell') {
      const rowIdx = resolvedRowIndex(resolved)
      selector = rowIdx === null ? null : `[data-csv-row="${rowIdx}"]`
    }
    if (!selector) return false
    const el = document.querySelector(selector)
    if (!el) return false
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return true
  }

  return { resolveTarget, resolvedRowIndex, scrollToResolved }
}
