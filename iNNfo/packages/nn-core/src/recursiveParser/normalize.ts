import type {
  ElementNode,
  ParsedKnowledge,
  FieldValue,
  LocalMetamodel,
  KnowledgeNode,
  TaxonomyEdge,
} from '../types/index.js'
import { extractBlueprintSchema, findDeclaredField, type BlueprintSchema } from '../schema/index.js'
import { normalizeSeparators } from '../parser/slug.js'
import {
  parseCitation,
  splitSourceFieldValue,
  type SourceRef,
} from '../sourceRef.js'
import type { ParseContext } from './types.js'
import { DuplicateNameError } from '../identity.js'
import { addFieldAndMentionEdges } from './relationships.js'
import type { ChangeLog } from '../changelog/index.js'
import { splitEvidence } from '../changeset/evidence.js'
import { slugifyHeading } from '../sourceRef.js'

/**
 * Graph edges from the schema: any field the schema declares `type:: citation`
 * is resolved to `node.sources` plus one `origin: 'source'` relationship.
 */
export function attachSchemaTypedCitations(node: KnowledgeNode, schema: BlueprintSchema | undefined): void {
  if (!schema) return
  for (const [fieldName, fv] of Object.entries(node.fields)) {
    const declared = findDeclaredField(schema, node.type, fieldName)
    if (declared?.type !== 'citation') continue

    const refs: SourceRef[] = []
    for (const raw of splitSourceFieldValue(fv.value)) {
      const ref = parseCitation(raw)
      if (ref) refs.push(ref)
    }
    if (refs.length > 0) {
      node.sources = [...(node.sources ?? []), ...refs]
      for (const ref of refs) {
        node.relationships.push({ targetId: ref.filePath, label: fieldName, origin: 'source' })
      }
    }
  }
}

export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Graph edges from the change log (change-provenance): the source edges of an
 * element are the evidence of the LIVE units of that element — the last applied
 * change of each unit after the epoch cut. A superseded change contributes no
 * edge, and a removed element contributes none. The schema-typed citation fields
 * (`attachSchemaTypedCitations`) still contribute edges until the L3 ban lands.
 */
export function attachLiveEvidence(node: KnowledgeNode, log: ChangeLog): void {
  const slug = node.slug ?? slugifyHeading(node.name)
  const refs: SourceRef[] = []
  const seen = new Set<string>()

  for (const unit of log.units()) {
    const at = unit.key.indexOf('@')
    if (at === -1) continue
    const parts = unit.key.slice(at + 1).split('&')
    if (parts[0] !== slug) continue
    const origin = log.origin(unit.key)
    if (!origin) continue

    const label = parts.slice(1).join('&')
    for (const item of origin.evidenceItems ?? splitEvidence(origin.evidence)) {
      const keyword = item.toLowerCase()
      if (keyword === 'decision' || keyword === 'unknown') continue
      const ref = parseCitation(item)
      if (!ref || seen.has(ref.filePath)) continue
      seen.add(ref.filePath)
      refs.push(ref)
      node.relationships.push({ targetId: ref.filePath, label, origin: 'source' })
    }
  }

  if (refs.length > 0) node.sources = [...(node.sources ?? []), ...refs]
}
/** Extracts a node's own locally-declared metamodel from its body-level
 *  `Concept Definition` / `Field Definition` / `Matrix Definition` elements
 *  (level-2 templates instantiate the root primitives of the Metaplantilla
 *  Nivel 1). Level-3 models declare no local metamodel. */
export function toLocalMetamodel(parsed: ParsedKnowledge): LocalMetamodel {
  const schema = extractBlueprintSchema(parsed)
  return { concepts: schema.concepts, taxonomy: schema.taxonomy }
}

export function toFieldValues(fields: Record<string, unknown>): Record<string, FieldValue> {
  const result: Record<string, FieldValue> = {}
  for (const [key, value] of Object.entries(fields)) {
    result[key] = {
      value,
      editAttribution: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
    }
  }
  return result
}

/** Builds a taxonomy parent-lookup: child name -> parent name. */
export function buildTaxonomyParentMap(parsed: ParsedKnowledge): Map<string, string> {
  const parentOf = new Map<string, string>()
  for (const edge of parsed.taxonomy) {
    parentOf.set(edge.child, edge.parent)
  }
  return parentOf
}

/**
 * Normalizes a single already-parsed ParsedKnowledge's elements into ModelNodes,
 * attached under `rootId`. Elements form a flat or taxonomy-derived
 * hierarchy beneath the document root; unrecognized parents fall back to
 * being direct children of the root.
 */
export function normalizeElementsIntoGraph(
  parsed: ParsedKnowledge,
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
  const bySlug = new Map<string, ElementNode>()
  for (const el of allElements) {
    byName.set(el.name, el)
    if (el.slug) bySlug.set(el.slug, el)
  }

  function resolveExplicitParentNode(el: ElementNode): ElementNode | undefined {
    if (el.parentSlug && bySlug.has(el.parentSlug)) {
      return bySlug.get(el.parentSlug)
    }
    if (el.parentElement) {
      if (el.parentElement.slug && bySlug.has(el.parentElement.slug)) {
        return bySlug.get(el.parentElement.slug)
      }
      if (byName.has(el.parentElement.name)) {
        const found = byName.get(el.parentElement.name)
        if (found && (!el.parentElement.concept || found.type.toLowerCase() === el.parentElement.concept.toLowerCase())) {
          return found
        }
      }
    }
    return undefined
  }

  function resolveExplicitParentQualifiedId(el: ElementNode): string | undefined {
    if (el.parentSlug && qualifiedIdByElementName.has(el.parentSlug)) {
      return qualifiedIdByElementName.get(el.parentSlug)
    }
    if (el.parentElement) {
      if (el.parentElement.slug && qualifiedIdByElementName.has(el.parentElement.slug)) {
        return qualifiedIdByElementName.get(el.parentElement.slug)
      }
      const conceptNameKey = `${el.parentElement.concept}/${el.parentElement.name}`
      if (qualifiedIdByElementName.has(conceptNameKey)) {
        return qualifiedIdByElementName.get(conceptNameKey)
      }
      if (qualifiedIdByElementName.has(el.parentElement.name)) {
        return qualifiedIdByElementName.get(el.parentElement.name)
      }
    }
    return undefined
  }

  function resolveActualParentId(el: ElementNode, seen: Set<string>): string | null {
    const explicitId = resolveExplicitParentQualifiedId(el)
    if (explicitId) return explicitId

    const parentNode = resolveExplicitParentNode(el)
    if (parentNode && !seen.has(el.name)) {
      seen.add(el.name)
      return resolveActualParentId(parentNode, seen)
    }

    const taxonomyParentName = parentOfTaxonomy.get(el.name)
    if (taxonomyParentName && !seen.has(el.name)) {
      if (qualifiedIdByElementName.has(taxonomyParentName)) {
        return qualifiedIdByElementName.get(taxonomyParentName)!
      }
      if (byName.has(taxonomyParentName)) {
        seen.add(el.name)
        return resolveActualParentId(byName.get(taxonomyParentName)!, seen)
      }
    }
    return rootId || null
  }

  for (const el of allElements) {
    try {
      const actualParentId = resolveActualParentId(el, new Set())
      // Identity is the slug, scoped by the model: a repeated NAME is legal, a repeated slug is not.
      const slug = el.slug ?? slugifyHeading(el.name)
      ctx.identity.register(rootId, slug)
      const qualifiedId = `${ctx.modelId ?? ''}@${slug}`
      if (!qualifiedIdByElementName.has(el.name)) {
        qualifiedIdByElementName.set(el.name, qualifiedId)
      }
      qualifiedIdByElementName.set(`${el.type}/${el.name}`, qualifiedId)
      if (el.slug) {
        qualifiedIdByElementName.set(el.slug, qualifiedId)
      }

      const node: KnowledgeNode = {
        id: qualifiedId,
        name: el.name,
        parentId: actualParentId,
        childIds: [],
        type: el.type,
        kind: 'element',
        slug: el.slug,
        fields: toFieldValues(el.fields),
        relationships: [],
        rawSections: el.description ? { description: el.description } : {},
        source: { path: sourcePath },
      }
      if (ctx.changeLog) attachLiveEvidence(node, ctx.changeLog)
      ctx.nodes[qualifiedId] = node
      if (actualParentId && ctx.nodes[actualParentId] && !ctx.nodes[actualParentId].childIds.includes(qualifiedId)) {
        ctx.nodes[actualParentId].childIds.push(qualifiedId)
      }
      if (ctx.nodes[rootId] && !ctx.nodes[rootId].childIds.includes(qualifiedId)) {
        ctx.nodes[rootId].childIds.push(qualifiedId)
      }
    } catch (err) {
      const duplicate = err instanceof DuplicateNameError
      ctx.issues.push({
        path: `${sourcePath}#${el.name}`,
        message: duplicate
          ? `DUPLICATE_SLUG: slug "${err.duplicateName}" is carried by more than one element of model "${ctx.modelId ?? sourcePath}" (${el.type} "${el.name}" is dropped); give each element its own slug`
          : err instanceof Error
            ? err.message
            : String(err),
        // This element is dropped from the graph, so the issue is an error,
        // not advice. It previously carried no severity at all, which left
        // hosts unable to triage it.
        severity: 'error',
        ...(duplicate ? { code: 'DUPLICATE_SLUG' as const } : {}),
      })
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
      const valStr = String(cell.value ?? '').trim()
      if (!valStr || valStr === '-' || valStr === '—' || valStr === 'false') continue
      const sourceId = resolveMatrixEndpoint(cell.row, matrix.name, 'row')
      const targetId = resolveMatrixEndpoint(cell.col, matrix.name, 'col')
      if (sourceId && targetId && ctx.nodes[sourceId]) {
        ctx.nodes[sourceId].relationships.push({
          targetId,
          label: matrix.name,
          value: cell.value,
          origin: 'matrix',
        })
      }
    }
  }

  // Attach field and mention relationships (relationship-types)
  addFieldAndMentionEdges(parsed, rootId, sourcePath, ctx, qualifiedIdByElementName, allElements)

  // Resolve asset paths for elements with asset-typed fields (FR-004)
  resolveElementAssets(parsed, rootId, sourcePath, ctx, qualifiedIdByElementName)
}

/**
 * Resolve asset paths for elements whose concept fields are of type
 * image/file/video/audio. Paths follow the single canonical storage
 * convention: `{modelDir}/assets/{element-slug}/{filename}`.
 */
export function resolveElementAssets(
  parsed: ParsedKnowledge,
  rootId: string,
  sourcePath: string,
  ctx: ParseContext,
  qualifiedIdByElementName: Map<string, string>,
): void {
  // Build a map of concept name -> asset field definitions
  const assetFieldsByConcept = new Map<string, Array<{ name: string; type: string }>>()
  const schemaConcepts = extractBlueprintSchema(parsed).concepts
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
