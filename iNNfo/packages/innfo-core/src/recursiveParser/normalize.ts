import type {
  ElementNode,
  ParsedModel,
  FieldValue,
  LocalMetamodel,
  ModelNode,
  TaxonomyEdge,
} from '../types'
import { extractTemplateSchema } from '../schema'
import { normalizeSeparators } from '../parser/slug'
import type { ParseContext } from './types'

export function nowIso(): string {
  return new Date().toISOString()
}

/** Extracts a node's own locally-declared metamodel from its body-level
 *  `Concept Definition` / `Marker Definition` elements (level-2 templates
 *  instantiate the root primitives of the Metaplantilla Nivel 1). Level-3
 *  models declare no local metamodel. */
export function toLocalMetamodel(parsed: ParsedModel): LocalMetamodel {
  const schema = extractTemplateSchema(parsed)
  return { concepts: schema.concepts, markers: schema.markers, taxonomy: schema.taxonomy }
}

export function toFieldValues(fields: Record<string, unknown>): Record<string, FieldValue> {
  const result: Record<string, FieldValue> = {}
  for (const [key, value] of Object.entries(fields)) {
    result[key] = {
      value,
      provenance: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
    }
  }
  return result
}

/** Builds a taxonomy parent-lookup: child name -> parent name. */
export function buildTaxonomyParentMap(parsed: ParsedModel): Map<string, string> {
  const parentOf = new Map<string, string>()
  for (const edge of parsed.taxonomy) {
    parentOf.set(edge.child, edge.parent)
  }
  return parentOf
}

/**
 * Normalizes a single already-parsed ParsedModel's elements into ModelNodes,
 * attached under `rootId`. Elements form a flat or taxonomy-derived
 * hierarchy beneath the document root; unrecognized parents fall back to
 * being direct children of the root.
 */
export function normalizeElementsIntoGraph(
  parsed: ParsedModel,
  rootId: string,
  sourcePath: string,
  ctx: ParseContext,
  templateTaxonomy?: TaxonomyEdge[],
): void {
  const effectiveTaxonomy = parsed.taxonomy.length > 0 ? parsed.taxonomy : (templateTaxonomy ?? [])
  const parentOfTaxonomy = buildTaxonomyParentMap({ ...parsed, taxonomy: effectiveTaxonomy })
  const qualifiedIdByElementName = new Map<string, string>()

  // Collect all elements in declaration order, grouped by concept.
  const allElements: ElementNode[] = []
  for (const [, elementNodes] of parsed.elements.entries()) {
    for (const el of elementNodes) {
      allElements.push(el)
    }
  }

  // Re-sort elements by their position in the NN index (if present or inherited from template).
  // The index defines both hierarchy AND display order; elements not listed
  // in the index get a high sort value so they appear after indexed ones.
  if (effectiveTaxonomy.length > 0) {
    const indexOrder = new Map<string, number>()
    let orderIdx = 0
    for (const edge of effectiveTaxonomy) {
      if (!indexOrder.has(edge.parent)) indexOrder.set(edge.parent, orderIdx++)
      if (!indexOrder.has(edge.child)) indexOrder.set(edge.child, orderIdx++)
    }
    allElements.sort((a, b) => {
      const oa = indexOrder.get(a.name) ?? 99999
      const ob = indexOrder.get(b.name) ?? 99999
      return oa - ob
    })
  }

  // First pass: elements whose taxonomy parent has no listed parent themselves
  // (i.e. top-level relative to this document) get created first, so their
  // qualifiedId is available for children referencing them via taxonomy.
  const byName = new Map<string, ElementNode>()
  for (const el of allElements) byName.set(el.name, el)

  function resolveParentQualifiedId(elementName: string, seen: Set<string>): string {
    const taxonomyParentName = parentOfTaxonomy.get(elementName)
    if (!taxonomyParentName || seen.has(elementName)) {
      return rootId
    }
    if (qualifiedIdByElementName.has(taxonomyParentName)) {
      return qualifiedIdByElementName.get(taxonomyParentName)!
    }
    if (byName.has(taxonomyParentName)) {
      seen.add(elementName)
      return resolveParentQualifiedId(taxonomyParentName, seen)
    }
    return rootId
  }

  // Track element names model-wide for uniqueness across all concepts (R-IE-02)
  const modelWideElementNames = new Set<string>()

  for (const el of allElements) {
    try {
      if (modelWideElementNames.has(el.name)) {
        throw new Error(
          `Duplicate element name "${el.name}" — element names must be unique within the whole model`,
        )
      }
      modelWideElementNames.add(el.name)

      const parentQualifiedId = resolveParentQualifiedId(el.name, new Set())
      const qualifiedId = ctx.identity.register(parentQualifiedId, el.name)
      qualifiedIdByElementName.set(el.name, qualifiedId)

      const node: ModelNode = {
        id: qualifiedId,
        name: el.name,
        parentId: parentQualifiedId,
        childIds: [],
        type: el.type,
        kind: 'element',
        slug: el.slug,
        fields: toFieldValues(el.fields),
        markers: { ...(parsed.nodeMarkers[el.name] ?? {}) },
        tags: el.tags,
        relationships: [],
        rawSections: el.description ? { description: el.description } : {},
        source: { path: sourcePath },
      }
      ctx.nodes[qualifiedId] = node
      const parent = ctx.nodes[parentQualifiedId]
      if (parent && !parent.childIds.includes(qualifiedId)) {
        parent.childIds.push(qualifiedId)
      }
    } catch (err) {
      ctx.issues.push({
        path: `${sourcePath}#${el.name}`,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Concept-scoped Marker scores (an `item-markers matrix` row whose subject
  // is a Concept name, permitted when the Marker's `applies_to` includes
  // `Concept`). There is no Concept node in the graph to hang these on, so
  // they are preserved on the document root for a future consumer rather than
  // dropped. Element-scoped rows are already attached to their element above.
  const rootNode = ctx.nodes[rootId]
  if (rootNode) {
    for (const [subject, scores] of Object.entries(parsed.nodeMarkers)) {
      if (!qualifiedIdByElementName.has(subject)) {
        rootNode.conceptMarkers = rootNode.conceptMarkers ?? {}
        rootNode.conceptMarkers[subject] = { ...scores }
      }
    }
  }

  // Attach relationships from matrices between named elements, once all
  // qualified ids are known. Falls back to a separator-normalized lookup
  // (hyphen vs en/em dash/minus) when the exact name isn't found, emitting a
  // warning issue rather than silently treating it as a clean match.
  const normalizedNameById = new Map<string, { id: string; originalName: string }>()
  for (const [name, id] of qualifiedIdByElementName.entries()) {
    const key = normalizeSeparators(name)
    if (!normalizedNameById.has(key)) {
      normalizedNameById.set(key, { id, originalName: name })
    }
  }
  function resolveMatrixEndpoint(
    name: string,
    matrixName: string,
    side: 'row' | 'col',
  ): string | undefined {
    const exact = qualifiedIdByElementName.get(name)
    if (exact) return exact
    const normalized = normalizedNameById.get(normalizeSeparators(name))
    if (normalized) {
      ctx.issues.push({
        path: `${sourcePath}#matrices.${matrixName}.${side}`,
        message: `Matrix reference "${name}" doesn't exactly match element "${normalized.originalName}" — separator character differs (hyphen vs dash). Consider using the exact same character.`,
      })
      return normalized.id
    }
    return undefined
  }
  for (const matrix of parsed.matrices) {
    for (const cell of matrix.cells) {
      const sourceId = resolveMatrixEndpoint(cell.row, matrix.name, 'row')
      const targetId = resolveMatrixEndpoint(cell.col, matrix.name, 'col')
      if (sourceId && targetId && ctx.nodes[sourceId]) {
        ctx.nodes[sourceId].relationships.push({ targetId, label: matrix.name, value: cell.value })
      }
    }
  }

  // Resolve asset paths for elements with asset-typed fields (FR-004)
  resolveElementAssets(parsed, rootId, sourcePath, ctx, qualifiedIdByElementName)
}

/**
 * Resolve asset paths for elements whose concept fields are of type
 * image/file/video/audio. Paths follow the single canonical storage
 * convention: `{modelDir}/assets/{element-slug}/{filename}`.
 */
export function resolveElementAssets(
  parsed: ParsedModel,
  rootId: string,
  sourcePath: string,
  ctx: ParseContext,
  qualifiedIdByElementName: Map<string, string>,
): void {
  // Build a map of concept name -> asset field definitions
  const assetFieldsByConcept = new Map<string, Array<{ name: string; type: string }>>()
  const schemaConcepts = extractTemplateSchema(parsed).concepts
  for (const concept of schemaConcepts) {
    const assetFields = (concept.fields ?? []).filter(
      (f) => f.type === 'image' || f.type === 'file' || f.type === 'video' || f.type === 'audio',
    )
    if (assetFields.length > 0) {
      assetFieldsByConcept.set(
        concept.name,
        assetFields.map((f) => ({ name: f.name, type: f.type })),
      )
    }
  }

  if (assetFieldsByConcept.size === 0) return

  const modelDir = sourcePath.replace(/\/?[^/]+$/, '') // directory of the model file

  for (const [conceptName, elementNodes] of parsed.elements.entries()) {
    const assetFields = assetFieldsByConcept.get(conceptName)
    if (!assetFields) continue

    for (const el of elementNodes) {
      const qualifiedId = qualifiedIdByElementName.get(el.name)
      if (!qualifiedId) continue
      const node = ctx.nodes[qualifiedId]
      if (!node) continue

      const paths: string[] = []
      for (const fieldDef of assetFields) {
        const fieldValue = el.fields[fieldDef.name]
        if (typeof fieldValue === 'string' && fieldValue.trim()) {
          const assetDir = el.slug ? `${modelDir}/assets/${el.slug}` : `${modelDir}/assets`
          paths.push(`${assetDir}/${fieldValue.trim()}`)
        }
      }

      if (paths.length > 0) {
        node.assets = [...(node.assets ?? []), ...paths]
      }
    }
  }
}
