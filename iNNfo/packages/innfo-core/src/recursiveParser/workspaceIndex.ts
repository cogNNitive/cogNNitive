import type { TemplateSchema } from '../schema'
import { normalizeSeparators } from '../parser/slug'
import type { ParseIssue, RecursiveParseResult, TemplateSchemaResolver } from './types'
import { normalizePathKey, stripMdSuffix } from './paths'

export interface WorkspaceIndex {
  /** normalizePathKey(path) -> root node id */
  pathToNodeId: Record<string, string>
  /** lowercased frontmatter `title` -> node id(s). >1 id === title collision (error). */
  titleToNodeIds: Record<string, string[]>
  /** lowercased stripMdSuffix(basename) -> node id(s). Repeats are ambiguity, not error (AD-05). */
  fileNameToNodeIds: Record<string, string[]>
  /** root node id -> resolved template identity from `parent_spec` */
  nodeTemplate: Record<string, { name: string; url?: string }>
  /** root node id -> (lowercased element name -> owning concept name[]) */
  nodeElementConcepts: Record<string, Record<string, string[]>>
  /** root node id -> composed TemplateSchema (from ModelNode.templateSchema, or the fallback resolver) */
  nodeSchema: Record<string, TemplateSchema>
  /** diamond: child node id -> parent ids other than ModelNode.parentId */
  extraParents: Record<string, string[]>
  /** paths referenced but never parsed (ParseIssue code MODEL_NOT_FOUND) — lets hosts
   *  distinguish "title unknown" from "file absent from the workspace" */
  missing: string[]
  /** entrypoint frontmatter workspace_id, when present */
  workspaceId?: string
  /** collisions/ambiguities found while indexing; fed to the validator */
  issues: ParseIssue[]
}

/** Last path segment of a workspace-relative path, tolerating backslashes. */
function basename(p: string): string {
  const normalized = p.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

/**
 * Minimal inline reimplementation of PR2's `readWorkspaceId(result)`.
 *
 * PR2 (workspace_id) is a sibling branch, not yet merged into this branch's
 * ancestry. Its `readWorkspaceId` reads `result.entrypointPath` — a field
 * this branch's `RecursiveParseResult` does not have — to identify exactly
 * which root node is the workspace entrypoint before reading its
 * `workspace_id` frontmatter field.
 *
 * As a narrow, self-contained substitute for this slice, the entrypoint is
 * approximated as the sole node with `parentId === null`: in every
 * `recursiveParse` traversal that reaches the worklist loop, that is
 * precisely the node `findPrimaryWorkspaceFile` (or the `index.md`
 * fallback) parsed first — every other node ends up linked as someone's
 * child. This intentionally returns `undefined` for the root-directory-scan
 * fallback (multiple standalone roots, no defined entrypoint), which is
 * consistent with "exactly one document... MAY declare workspace_id".
 *
 * TODO(reconcile at merge with PR2): once `entrypointPath` lands on
 * `RecursiveParseResult`, replace this with the real `readWorkspaceId`
 * import from `./workspaceId` and delete this function.
 */
function readWorkspaceIdInline(result: RecursiveParseResult): string | undefined {
  if (result.rootIds.length !== 1) return undefined
  const entrypoint = result.nodes[result.rootIds[0]]
  const value = entrypoint?.fields['workspace_id']?.value
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

/**
 * Derives a pure, standalone view over a `RecursiveParseResult`: title,
 * template, element/concept, schema, and multi-parent lookups needed by
 * cross-model reference validation, manifest reconciliation, and host UIs.
 *
 * Pure and synchronous — performs no I/O and never mutates `result`.
 */
export function buildWorkspaceIndex(
  result: RecursiveParseResult,
  resolveTemplateSchema?: TemplateSchemaResolver,
): WorkspaceIndex {
  const pathToNodeId: Record<string, string> = {}
  const titleToNodeIds: Record<string, string[]> = {}
  const fileNameToNodeIds: Record<string, string[]> = {}
  const nodeTemplate: Record<string, { name: string; url?: string }> = {}
  const nodeElementConcepts: Record<string, Record<string, string[]>> = {}
  const nodeSchema: Record<string, TemplateSchema> = {}
  const extraParents: Record<string, string[]> = {}
  const issues: ParseIssue[] = []

  const roots = Object.values(result.nodes).filter((n) => n.kind === 'root')

  for (const root of roots) {
    const path = root.source?.path

    if (path) {
      pathToNodeId[normalizePathKey(path)] = root.id
    }

    const title = String(root.fields['title']?.value ?? '')
      .trim()
      .toLowerCase()
    if (title) {
      titleToNodeIds[title] = [...(titleToNodeIds[title] ?? []), root.id]
    }

    if (path) {
      const fileNameKey = stripMdSuffix(basename(path)).toLowerCase()
      fileNameToNodeIds[fileNameKey] = [...(fileNameToNodeIds[fileNameKey] ?? []), root.id]
    }

    const parentSpec = root.fields['parent_spec']?.value as
      | { name?: string; url?: string }
      | undefined
    if (parentSpec?.name) {
      nodeTemplate[root.id] = { name: parentSpec.name, url: parentSpec.url }
    }

    if (root.templateSchema) {
      nodeSchema[root.id] = root.templateSchema
    } else if (resolveTemplateSchema) {
      const frontmatter: Record<string, unknown> = {}
      for (const [key, fieldValue] of Object.entries(root.fields)) {
        frontmatter[key] = fieldValue.value
      }
      try {
        const schema = resolveTemplateSchema({
          path: path ?? '',
          name: root.name,
          content: root.rawContent ?? '',
          frontmatter,
        })
        if (schema) nodeSchema[root.id] = schema
      } catch {
        // AD-04: a throwing resolver degrades this node — no schema, no abort.
      }
    }

    // nodeElementConcepts: walk descendants of this root, stopping at any
    // node that is itself a document root (diamond/submodel boundary) — its
    // elements belong to its own entry in `roots`, not this one.
    const elementConcepts: Record<string, string[]> = {}
    const stack = [...root.childIds]
    while (stack.length > 0) {
      const id = stack.pop()!
      const node = result.nodes[id]
      if (!node || node.kind === 'root') continue
      if (node.kind === 'element') {
        const key = node.name.toLowerCase()
        const owners = elementConcepts[key] ?? []
        if (!owners.includes(node.type)) owners.push(node.type)
        elementConcepts[key] = owners

        const normalizedKey = normalizeSeparators(key)
        if (normalizedKey !== key) {
          const normalizedOwners = elementConcepts[normalizedKey] ?? []
          if (!normalizedOwners.includes(node.type)) normalizedOwners.push(node.type)
          elementConcepts[normalizedKey] = normalizedOwners
        }
      }
      stack.push(...(node.childIds ?? []))
    }
    if (Object.keys(elementConcepts).length > 0) {
      nodeElementConcepts[root.id] = elementConcepts
    }

    // extraParents (AD-02): derived, never stored on ModelNode.
    for (const childId of root.childIds) {
      const child = result.nodes[childId]
      if (child && child.parentId !== root.id) {
        extraParents[childId] = [...(extraParents[childId] ?? []), root.id]
      }
    }
  }

  // Duplicate-title errors come ONLY from titleToNodeIds (AD-05) — filename
  // repeats across directories are ambiguity at lookup time, not an error.
  for (const [title, ids] of Object.entries(titleToNodeIds)) {
    if (ids.length > 1) {
      const paths = ids.map((id) => result.nodes[id]?.source?.path ?? id)
      issues.push({
        path: '<workspace>',
        message: `Duplicate model title "${title}" in models: ${paths.join(', ')}`,
        severity: 'error',
      })
    }
  }

  const missingSet = new Set<string>()
  for (const issue of result.issues) {
    if (issue.code === 'MODEL_NOT_FOUND') {
      missingSet.add(normalizePathKey(issue.path))
    }
  }

  return {
    pathToNodeId,
    titleToNodeIds,
    fileNameToNodeIds,
    nodeTemplate,
    nodeElementConcepts,
    nodeSchema,
    extraParents,
    missing: [...missingSet],
    workspaceId: readWorkspaceIdInline(result),
    issues,
  }
}
