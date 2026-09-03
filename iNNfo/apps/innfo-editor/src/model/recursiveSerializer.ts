import {
  parseModel,
  serializeModel,
  type ParsedModel,
  type MatrixCell,
  type ElementNode,
  ElementsMap,
} from '@cognnitive/innfo-core'
import type { ModelNode } from './types'
import type { ModelDriver } from '@cognnitive/innfo-core'
import { useModelStore } from '../stores/modelStore'
import { getActivePinia } from 'pinia'

export interface WriteReport {
  path: string
  fidelity: 'exact' | 'canonical'
  nodeId: string
}

/**
 * Synchronizes matrix cell values stored in `node.fields` (key format: `matrixName||row||col`)
 * into `parsed.matrices` so they are correctly serialized by `serializeModel`.
 */
export function syncMatrixFieldsToParsedModel(node: ModelNode, parsed: ParsedModel): void {
  if (!node.fields) return

  // Group matrix cell values by matrixName and track which matrices have keys in node.fields
  const cellsByMatrix = new Map<string, Map<string, string>>()
  const matrixKeysPresent = new Set<string>()

  for (const [key, fv] of Object.entries(node.fields)) {
    const parts = key.split('||')
    if (parts.length === 3) {
      const [matrixName, row, col] = parts
      matrixKeysPresent.add(matrixName.toLowerCase())

      const rawVal = (fv as any)?.value !== undefined ? (fv as any).value : fv
      if (rawVal !== undefined && rawVal !== null && rawVal !== '' && rawVal !== false) {
        if (!cellsByMatrix.has(matrixName)) {
          cellsByMatrix.set(matrixName, new Map())
        }
        cellsByMatrix.get(matrixName)!.set(`${row}||${col}`, String(rawVal))
      }
    }
  }

  // If node.fields has no matrix cell keys at all, leave parsed.matrices untouched
  if (matrixKeysPresent.size === 0) return

  const fmMatrices = (parsed.frontmatter?.matrices as any[]) ?? []
  const defsField = (node.fields['__matrix_defs'] as any)?.value ?? []
  const allDecls = [...fmMatrices, ...defsField]

  for (const matrix of parsed.matrices) {
    const lowerName = matrix.name.toLowerCase()
    if (!matrixKeysPresent.has(lowerName)) {
      continue
    }

    let foundName: string | undefined
    for (const k of cellsByMatrix.keys()) {
      if (k.toLowerCase() === lowerName) {
        foundName = k
        break
      }
    }

    const cellMap = foundName ? cellsByMatrix.get(foundName) : undefined
    const existingKeys = new Set<string>()

    // Update existing cells in-place
    for (const cell of matrix.cells) {
      const key = `${cell.row}||${cell.col}`
      existingKeys.add(key)
      if (cellMap && cellMap.has(key)) {
        cell.value = cellMap.get(key)!
      } else {
        cell.value = '-'
      }
    }

    // Add any new cells that were not in matrix.cells originally
    if (cellMap) {
      for (const [cellKey, val] of cellMap.entries()) {
        if (!existingKeys.has(cellKey) && val !== '-') {
          const [r, c] = cellKey.split('||')
          matrix.cells.push({ row: r, col: c, value: val })
        }
      }
    }
  }

  for (const [matrixName, cellMap] of cellsByMatrix.entries()) {
    const alreadyParsed = parsed.matrices.some(
      (m) => m.name.toLowerCase() === matrixName.toLowerCase(),
    )
    if (!alreadyParsed && cellMap.size > 0) {
      const decl = allDecls.find((d) => String(d.name).toLowerCase() === matrixName.toLowerCase())
      const updatedCells: MatrixCell[] = []
      for (const [cellKey, val] of cellMap.entries()) {
        if (val !== '-') {
          const [r, c] = cellKey.split('||')
          updatedCells.push({ row: r, col: c, value: val })
        }
      }
      if (updatedCells.length > 0) {
        parsed.matrices.push({
          name: matrixName,
          source: decl?.source ?? '',
          target: decl?.target ?? '',
          cells: updatedCells,
        })
      }
    }
  }
}

/**
 * Rebuilds the serialized text for a root node. Returns the content and
 * fidelity indicator:
 * - 'exact': rawContent was preserved (no edit, byte-identical write)
 * - 'canonical': content was re-serialized through serializeModel (lossy path)
 */
function serializeNodeContent(node: ModelNode): {
  content: string
  fidelity: 'exact' | 'canonical'
} {
  if (node.rawContent === undefined) {
    throw new Error(`Node "${node.id}" has no rawContent to serialize from`)
  }
  const parsed = parseModel(node.rawContent)

  // Synchronize memory-modified child elements of the root node
  const childElements: ModelNode[] = []

  let modelStore: any = null
  try {
    const pinia = getActivePinia()
    if (pinia) {
      modelStore = useModelStore(pinia)
    }
  } catch {
    // Pinia not active
  }

  if (modelStore) {
    function collectElements(id: string) {
      const curr = modelStore.getNode(id)
      if (!curr) return
      if (curr.kind === 'element') {
        childElements.push(curr)
      }
      for (const cid of curr.childIds) {
        collectElements(cid)
      }
    }

    collectElements(node.id)

    if (childElements.length > 0) {
      const elementsMap = new ElementsMap()
      for (const child of childElements) {
        const conceptName = child.type
        if (!elementsMap.has(conceptName)) {
          elementsMap.set(conceptName, [])
        }
        const elFields: Record<string, unknown> = {}
        if (child.fields) {
          for (const [key, fVal] of Object.entries(child.fields)) {
            elFields[key] = (fVal as any)?.value !== undefined ? (fVal as any).value : fVal
          }
        }
        elementsMap.get(conceptName)!.push({
          type: child.type,
          name: child.name,
          description: child.rawSections?.description || '',
          fields: elFields,
          markers: child.markers || {},
          slug: child.slug,
          tags: child.tags,
        })
      }
      parsed.elements = elementsMap

      // Synchronize hierarchy taxonomy
      const elementNames = new Set(childElements.map((c) => c.name))
      const conceptEdges = parsed.taxonomy.filter((edge) => !elementNames.has(edge.child))

      const elementEdges: Array<{ parent: string; child: string }> = []
      for (const child of childElements) {
        let parentName = ''
        if (child.parentId) {
          if (child.parentId.startsWith('virtual:')) {
            const parts = child.parentId.split(':')
            parentName = parts[2] || ''
          } else {
            const parentNode = modelStore.getNode(child.parentId)
            if (parentNode && parentNode.kind === 'element') {
              parentName = parentNode.name
            } else {
              parentName = child.type || ''
            }
          }
        }
        elementEdges.push({ parent: parentName, child: child.name })
      }
      parsed.taxonomy = [...conceptEdges, ...elementEdges]

      // Synchronize item node markers
      const nodeMarkers: Record<string, Record<string, number | string>> = {}
      for (const child of childElements) {
        if (child.markers && Object.keys(child.markers).length > 0) {
          nodeMarkers[child.name] = { ...child.markers }
        }
      }
      parsed.nodeMarkers = nodeMarkers
    }
  }

  // Preserve concept-level tags from root node
  if (node.kind === 'root' && node.conceptTags) {
    parsed.conceptTags = { ...(parsed.conceptTags ?? {}), ...node.conceptTags }
  }

  // Apply any edited `text`-concept sections (rawSections) onto the parsed
  // model so they round-trip back to disk.
  if (node.rawSections && Object.keys(node.rawSections).length > 0) {
    parsed.rawSections = { ...(parsed.rawSections ?? {}), ...node.rawSections }
  }

  // Synchronize dynamic relational matrices declarations (__matrix_defs)
  const matrixDefs = (node.fields['__matrix_defs'] as any)?.value
  if (Array.isArray(matrixDefs)) {
    const isLevel3 = parsed.frontmatter?.level === 3
    if (!isLevel3) {
      parsed.frontmatter.matrices = matrixDefs.map((m: any) => ({
        name: m.name,
        source: m.source,
        target: m.target,
        params: m.params,
        values: m.values,
        widgetType: m.widgetType,
        ...(m.widgetConfig && Object.keys(m.widgetConfig).length > 0
          ? { widget_config: m.widgetConfig }
          : {}),
        description: m.description,
        min_color: m.min_color,
        max_color: m.max_color,
        label: m.label,
      }))
    } else {
      for (const def of matrixDefs) {
        const existing = parsed.matrices.find(
          (m) => m.name.toLowerCase() === String(def.name).toLowerCase(),
        )
        if (!existing) {
          // A `# NN matrices:` body block carries only the grid itself: name,
          // axis labels and cells. Widget metadata lives in the frontmatter
          // `matrices:` declaration, which L3 models do not emit — serializeModel
          // reads none of it off MatrixData, so passing it here would be a no-op.
          parsed.matrices.push({
            name: def.name,
            source: def.source || '',
            target: def.target || '',
            cells: [],
          })
        }
      }
    }
  }

  // Apply matrix cell edits from node.fields into parsed.matrices
  syncMatrixFieldsToParsedModel(node, parsed)

  const serialized = serializeModel(parsed)
  const fidelity: 'exact' | 'canonical' = serialized === node.rawContent ? 'exact' : 'canonical'
  if (fidelity === 'canonical') {
    console.warn(`[fidelity] Node "${node.id}" serialized through lossy canonical path`)
  }
  node.rawContent = serialized
  return { content: serialized, fidelity }
}

/**
 * Serializes dirty nodes back to disk. No tree walk — iterates nodes directly.
 * When `driver` is provided, writes go through `driver.writeModel()`.
 * Without a driver, returns a report of what would be written (caller must
 * handle actual file writes).
 */
export async function recursiveSerialize(
  nodes: Record<string, ModelNode>,
  dirtyIds: Set<string>,
  driver?: ModelDriver,
): Promise<WriteReport[]> {
  if (dirtyIds.size === 0) return []
  const report: WriteReport[] = []

  for (const node of Object.values(nodes)) {
    if (!dirtyIds.has(node.id) || node.rawContent === undefined) continue

    const { content, fidelity } = serializeNodeContent(node)

    if (driver) {
      const parsed = parseModel(content)
      await driver.writeModel(node.source.path, parsed)
    }

    report.push({ path: node.source.path, fidelity, nodeId: node.id })
  }

  return report
}
