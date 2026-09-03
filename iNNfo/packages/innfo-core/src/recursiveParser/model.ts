import { parseModel } from '../parser'
import type { ParsedModel, ModelNode } from '../types'
import { IdentityRegistry } from '../identity'
import { normalizeMatrixDecl } from '../matrix'
import { resolveGraphEdgeTarget } from './paths'
import { nowIso, toLocalMetamodel, toFieldValues, normalizeElementsIntoGraph } from './normalize'
import type { ParseContext, ParseIssue } from './types'

/**
 * Parses a single model file and registers its root node and elements into ctx.
 * Shared by the wikilink-driven path (index.md present) and the fallback path
 * (index.md missing — standalone _NN.md files).
 */
/**
 * Normalizes a single model content string, returning the parsed nodes and issues.
 *
 * @param content - Raw markdown contents of the model file
 * @param refPath - Source file path or URL of the model
 * @param refName - Derived name/identifier of the model (e.g. rootId)
 * @param identity - Optional identity registry for ID qualification
 * @returns An object containing the normalized ModelNode records and parsed issues
 */
export function normalizeSingleModel(
  content: string,
  refPath: string,
  refName: string,
  identity?: IdentityRegistry,
): { nodes: Record<string, ModelNode>; issues: ParseIssue[] } {
  const resolvedIdentity = identity ?? new IdentityRegistry()
  const ctx: ParseContext = {
    nodes: {},
    identity: resolvedIdentity,
    issues: [],
  }

  let parsed: ParsedModel
  try {
    parsed = parseModel(content)
  } catch (err) {
    ctx.issues.push({
      path: refPath,
      message: err instanceof Error ? err.message : String(err),
    })
    return { nodes: ctx.nodes, issues: ctx.issues }
  }

  // Skip files without iNNfo frontmatter — not a model (§2.1).
  // When the filename follows the `_NN` convention, surface the problem so an
  // "empty folder" report isn't misleading: the file was found but could not
  // be parsed as a model (e.g. broken YAML delimiters).
  const fm = parsed.frontmatter
  const hasSpecVersion = typeof fm.spec_version === 'string' && fm.spec_version.length > 0
  const hasLevel = typeof fm.level === 'number'
  const hasParent = !!(fm.parent || fm.parent_spec)

  if (!hasSpecVersion && !hasLevel && !hasParent) {
    const isNnNamed =
      refName.toLowerCase().endsWith('_nn') || refPath.toLowerCase().endsWith('_nn.md')
    if (isNnNamed) {
      ctx.issues.push({
        path: refPath,
        message:
          'File uses the _NN naming convention but has no valid iNNfo frontmatter (missing level, parent or spec_version) — skipped',
      })
    }
    return { nodes: ctx.nodes, issues: ctx.issues }
  }

  // Create root node for this model
  const qualifiedId = ctx.identity.register(null, refName)
  const rootNode: ModelNode = {
    id: qualifiedId,
    name: refName,
    parentId: null,
    childIds: [],
    type: (parsed.frontmatter.title as string) || 'document',
    kind: 'root',
    fields: toFieldValues(parsed.frontmatter as Record<string, unknown>),
    markers: {},
    tags: [],
    conceptTags: parsed.conceptTags,
    relationships: [],
    rawSections: parsed.rawSections ?? {},
    rawContent: content,
    localMetamodel: toLocalMetamodel(parsed),
    sourceMode: 'parsed',
    source: { path: refPath },
  }

  // Parse graph_edges from frontmatter into relationships
  if (parsed.frontmatter.graph_edges) {
    const graphEdges = parsed.frontmatter.graph_edges as Array<{
      target: string
      label: string
      weight?: number
    }>
    for (const edge of graphEdges) {
      rootNode.relationships.push({
        targetId: resolveGraphEdgeTarget(edge.target, refPath),
        label: edge.label,
        value: edge.weight,
      })
    }
  }

  // Store matrix definitions as __matrix_defs for UI components.
  // Priority: frontmatter `matrices` first (explicit declarations), then the
  // model's own `# NN matrices:` body blocks. The body-block fallback keeps the
  // matrices visible in the navigation tree even when the parent template could
  // not be resolved (source/target then come from the blocks or stay empty) —
  // the app renders them from model data with a warning instead of hiding them.
  const fmMatrices = (parsed.frontmatter as any)?.matrices
  if (Array.isArray(fmMatrices) && fmMatrices.length > 0) {
    rootNode.fields['__matrix_defs'] = {
      value: fmMatrices.map((m: any) => normalizeMatrixDecl(m)),
      provenance: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
    }
  } else if (parsed.matrices.length > 0) {
    rootNode.fields['__matrix_defs'] = {
      value: parsed.matrices.map((m) =>
        normalizeMatrixDecl({ name: m.name, source: m.source, target: m.target }),
      ),
      provenance: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
    }
  }

  // Store matrix cell values as root node fields for MatricesGrid
  for (const matrix of parsed.matrices) {
    const prefix = matrix.name + '||'
    for (const cell of matrix.cells) {
      if (cell.row && cell.col) {
        rootNode.fields[prefix + cell.row + '||' + cell.col] = {
          value: cell.value,
          provenance: { author: { kind: 'system', id: 'parser' }, timestamp: nowIso() },
        }
      }
    }
  }

  ctx.nodes[qualifiedId] = rootNode

  // Surface slug collisions as warnings (R-IE-05)
  if (parsed.slugCollisions && parsed.slugCollisions.length > 0) {
    for (const sc of parsed.slugCollisions) {
      ctx.issues.push({
        path: refPath,
        message: `Slug collision: "${sc.slug}" is shared by elements: ${sc.elements.join(', ')}`,
      })
    }
  }

  // Normalize in-file elements
  normalizeElementsIntoGraph(parsed, qualifiedId, refPath, ctx)

  return { nodes: ctx.nodes, issues: ctx.issues }
}

export async function parseAndRegisterModel(
  content: string,
  refPath: string,
  refName: string,
  ctx: ParseContext,
  elementNameToModel: Map<string, string>,
): Promise<void> {
  let result: { nodes: Record<string, ModelNode>; issues: ParseIssue[] }
  try {
    result = normalizeSingleModel(content, refPath, refName, ctx.identity)
  } catch (err) {
    ctx.issues.push({
      path: refPath,
      message: err instanceof Error ? err.message : String(err),
    })
    return
  }

  // Merge resulting nodes and issues into context
  for (const [id, node] of Object.entries(result.nodes)) {
    ctx.nodes[id] = node
  }
  for (const issue of result.issues) {
    ctx.issues.push(issue)
  }

  // Track element names per model for cross-model collision detection (FR-005)
  for (const node of Object.values(result.nodes)) {
    if (node.kind === 'element') {
      if (elementNameToModel.has(node.name)) {
        const existingModel = elementNameToModel.get(node.name)!
        ctx.issues.push({
          path: '<root>',
          message: `Element "${node.name}" appears in both "${existingModel}" and "${refName}" — consider renaming to "${node.name} (${refName})"`,
        })
      } else {
        elementNameToModel.set(node.name, refName)
      }
    }
  }
}
