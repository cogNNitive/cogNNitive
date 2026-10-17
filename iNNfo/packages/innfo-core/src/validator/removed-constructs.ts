import type { ParsedKnowledge, ValidationError } from '../types/index.js'
import { MARKER_DEFINITION } from '../schema/index.js'
import { parseMarkdownTable, normalizeSource } from '../parser/markdown.js'

/**
 * Checks for removed Marker constructs (Marker Definitions and item-markers matrix)
 * in Level-2 and Level-3 documents.
 * Emits exactly ONE `MARKERS_REMOVED` ERROR per document if either or both are found.
 */
export function checkRemovedMarkerConstructs(
  parsed: ParsedKnowledge,
  filePath?: string,
): ValidationError[] {
  const markerDefs = parsed.elements.get(MARKER_DEFINITION) ?? []
  const markers: string[] = markerDefs.map((el) => el.name)

  const matrixColumns: string[] = []
  const raw = parsed.rawContent || ''
  const normalized = normalizeSource(raw)

  // Detect # NN matrices: item-markers matrix in raw content
  const itemMarkersMatch = normalized.match(/^#\s+NN\s+matrices:\s*item-markers(?:\s+matrix)?\s*$/im)
  if (itemMarkersMatch) {
    const afterHeading = normalized.slice(itemMarkersMatch.index! + itemMarkersMatch[0].length)
    const nextSection = afterHeading.search(/^#\s/m)
    const matrixBody = nextSection === -1 ? afterHeading : afterHeading.slice(0, nextSection)
    const rows = parseMarkdownTable(matrixBody)
    if (rows.length > 0) {
      const allCols = Object.keys(rows[0] || {})
      // The first column is Element / Concept (row header), rest are marker columns
      for (let i = 1; i < allCols.length; i++) {
        if (!matrixColumns.includes(allCols[i])) {
          matrixColumns.push(allCols[i])
        }
      }
    }
  }

  if (markers.length === 0 && matrixColumns.length === 0) {
    return []
  }

  const fileName = filePath || 'Document'

  // Construct message according to spec:
  // `<file> uses Marker Definitions (<names>) / an item-markers matrix (<columns>), removed in iNNfo V_0-5-0. A flag marker becomes a value of the tags Field (tags:: [name]). A valued marker becomes a declared Field (concept:: * or a list, with type/widget) whose cells become field:: value lines; concept rows become concept-level values; scores with no declared Field are dropped. Then delete the Marker Definition section or the item-markers matrix. Agents: submit the fix as a changeset.`
  const parts: string[] = []
  if (markers.length > 0) {
    parts.push(`Marker Definitions (${markers.join(', ')})`)
  }
  if (matrixColumns.length > 0) {
    parts.push(`an item-markers matrix (${matrixColumns.join(', ')})`)
  }
  const constructStr = parts.join(' / ')

  const message = `${fileName} uses ${constructStr}, removed in iNNfo V_0-5-0. A flag marker becomes a value of the tags Field (tags:: [name]). A valued marker becomes a declared Field (concept:: * or a list, with type/widget) whose cells become field:: value lines; concept rows become concept-level values; scores with no declared Field are dropped. Then delete the Marker Definition section or the item-markers matrix. Agents: submit the fix as a changeset.`

  return [
    {
      path: markers.length > 0 ? MARKER_DEFINITION : 'matrices.item-markers matrix',
      code: 'MARKERS_REMOVED',
      severity: 'error',
      message,
      promptHint: 'nn-innfo recipe MARKERS_REMOVED',
      filePath,
      meta: {
        markers,
        matrixColumns,
      },
    },
  ]
}
