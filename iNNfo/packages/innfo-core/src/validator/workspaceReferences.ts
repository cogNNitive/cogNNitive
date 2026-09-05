import type { ConceptField, ModelNode } from '../types'
import type { RecursiveParseResult } from '../recursiveParser/types'
import type { WorkspaceIndex } from '../recursiveParser/workspaceIndex'
import type { ReferenceDiagnostic } from './references'

/**
 * `[[Model Title :: Element Name]]` — the ONLY cross-model reference form
 * (no `path#slug`, no bare `[[Element Name]]` across models). Only the
 * first `::` is treated as the title/element delimiter; everything after it
 * (including any further `::`) belongs to the element name.
 */
export const QUALIFIED_REF_RE = /^\[\[\s*([^\]]+?)\s*::\s*([^\]]+?)\s*\]\]$/

export interface QualifiedRef {
  modelTitle: string
  elementName: string
  raw: string
}

/**
 * Parses a single field value as a qualified cross-model reference.
 * Returns `null` for anything else (unqualified `[[Element]]`, positional
 * `path#slug` syntax, bare text, etc.) — those stay the per-file validator's
 * job (`references.ts`, AD-06).
 */
export function parseQualifiedRef(value: string): QualifiedRef | null {
  const match = QUALIFIED_REF_RE.exec(value.trim())
  if (!match) return null
  const [, modelTitle, elementName] = match
  if (!modelTitle || !elementName) return null
  return { modelTitle, elementName, raw: value }
}

/** A typed-field value that parsed as a qualified reference, with everything `checkOne` needs. */
export interface QualifiedRefCandidate {
  /** The document root that owns `element` (walked up from `element.parentId`). */
  root: ModelNode
  /** The element node whose field held the qualified reference. */
  element: ModelNode
  /** The element's owning concept name (`element.type`). */
  concept: string
  /** The template's field definition that declared this value `reference`/`model` typed. */
  fieldDef: ConceptField
  ref: QualifiedRef
}

/** Walks `parentId` up from `node` until a `kind === 'root'` node is found. */
function findRootAncestor(result: RecursiveParseResult, node: ModelNode): ModelNode | undefined {
  const seen = new Set<string>()
  let current: ModelNode | undefined = node
  while (current && current.kind !== 'root') {
    if (seen.has(current.id)) return undefined
    seen.add(current.id)
    current = current.parentId ? result.nodes[current.parentId] : undefined
  }
  return current
}

/**
 * AD-07: re-scans the values `normalizeElementsIntoGraph` already
 * materialized on `ModelNode.fields` — zero additional parses. Iterates
 * every element node, resolves its owning document root and the root's
 * stashed/resolved `TemplateSchema` (`index.nodeSchema`), and collects every
 * `reference`/`model` typed field value that parses as a qualified
 * cross-model reference (typed fields only, v1 — prose and untyped fields
 * are never scanned).
 */
export function collectQualifiedReferenceCandidates(
  result: RecursiveParseResult,
  index: WorkspaceIndex,
): QualifiedRefCandidate[] {
  const candidates: QualifiedRefCandidate[] = []

  for (const node of Object.values(result.nodes)) {
    if (node.kind !== 'element') continue

    const root = findRootAncestor(result, node)
    if (!root) continue

    const schema = index.nodeSchema[root.id]
    if (!schema) continue // no schema resolvable for this node's document => skip gracefully

    const concept = node.type
    const conceptDef = schema.concepts.find((c) => c.name.toLowerCase() === concept.toLowerCase())
    const fieldDefs = conceptDef?.fields ?? []

    for (const [fieldName, fieldValue] of Object.entries(node.fields)) {
      const fieldDef = fieldDefs.find((f) => f.name.toLowerCase() === fieldName.toLowerCase())
      if (!fieldDef || (fieldDef.type !== 'reference' && fieldDef.type !== 'model')) continue

      const raw = fieldValue.value
      if (raw === undefined || raw === null || raw === '') continue

      const values = Array.isArray(raw) ? raw : [raw]
      for (const v of values) {
        const ref = parseQualifiedRef(String(v))
        if (!ref) continue // unqualified => the per-file validator's job (AD-06)
        candidates.push({ root, element: node, concept, fieldDef, ref })
      }
    }
  }

  return candidates
}

/**
 * Runs the four ordered checks for a single qualified reference: target
 * model exists, target element exists, concept membership, template
 * membership (short-circuiting after check 1 or 2 fails).
 *
 * STUBBED for this slice (R5 split seam, PR5a) — always returns `[]`.
 * PR5b implements the checks against `WorkspaceIndex.titleToNodeIds` /
 * `fileNameToNodeIds` / `nodeElementConcepts` / `nodeTemplate`, per
 * design.md §4 Slice 5.
 */
function checkOne(
  _root: ModelNode,
  _element: ModelNode,
  _concept: string,
  _fieldDef: ConceptField,
  _ref: QualifiedRef,
): ReferenceDiagnostic[] {
  return []
}

/**
 * Validates every qualified cross-model reference (`[[Model Title ::
 * Element Name]]`) found in `reference`/`model` typed element fields across
 * the whole parsed workspace. Must run after the host's own
 * `recursiveParse()` and `buildWorkspaceIndex()` — never in place of
 * per-file `validateDocument`/`validateModel`, which deliberately bypasses
 * the qualified form (AD-06).
 */
export function validateWorkspaceReferences(
  result: RecursiveParseResult,
  index: WorkspaceIndex,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = []
  for (const candidate of collectQualifiedReferenceCandidates(result, index)) {
    diagnostics.push(
      ...checkOne(candidate.root, candidate.element, candidate.concept, candidate.fieldDef, candidate.ref),
    )
  }
  return diagnostics
}
