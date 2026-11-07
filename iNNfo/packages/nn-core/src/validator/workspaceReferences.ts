import type { ConceptField, KnowledgeNode } from '../types/index.js'
import type { RecursiveParseResult } from '../recursiveParser/types.js'
import type { WorkspaceIndex } from '../recursiveParser/workspaceIndex.js'
import type { ReferenceDiagnostic } from './references.js'
import { isAddressError, parseAddress } from '../address/index.js'
import { buildDomainIndex, type DomainIndex, type StorageDeclarationsResolver } from '../domain/index.js'
import { normalizePathKey } from '../recursiveParser/paths.js'
import { slugify } from '../parser/slug.js'
import { matchesTargetBlueprint } from './blueprintMatching.js'
import { parseMirrorAddress, type MirrorAddress, type MirrorLookup } from '../sync/address.js'

/**
 * Thrown when a workspace-scope validator is called without a resolvable
 * `WorkspaceIndex`. Without this guard, the missing-argument case surfaces as
 * a raw `TypeError: Cannot read properties of undefined (reading 'nodeSchema')`
 * from deep inside `iterateTypedFieldValues`, which gives the caller no hint
 * about what was actually missing or how to fix it.
 */
export class MissingWorkspaceIndexError extends Error {
  constructor() {
    super(
      'validateWorkspaceReferences requires a WorkspaceIndex. Build one with ' +
        '`buildWorkspaceIndex(result)` (from `recursiveParser/workspaceIndex`) and pass it as the ' +
        'second argument.',
    )
    this.name = 'MissingWorkspaceIndexError'
  }
}

/** Throws `MissingWorkspaceIndexError` when `index` is not a resolvable `WorkspaceIndex`. */
function assertWorkspaceIndex(index: WorkspaceIndex): asserts index is WorkspaceIndex {
  if (!index || typeof index !== 'object' || !('nodeSchema' in index)) {
    throw new MissingWorkspaceIndexError()
  }
}

/**
 * Stable code for non-canonical multivalue reference syntax. Frozen once
 * shipped: baseline fingerprints and tests assert this string, not prose.
 */
export const MULTIVALUE_SYNTAX_CODE = 'MULTIVALUE_SYNTAX'

/**
 * Splits one raw field value into its canonical multivalue tokens: a YAML
 * sequence already arrives as an array (one token per item); a scalar holds
 * one address per line (newline-separated). Commas NEVER split: an address
 * list is written as the standard `[a, b]` field list, and a comma-joined
 * scalar fails with `MULTIVALUE_SYNTAX` instead of resolving silently.
 */
export function splitCanonicalMultivalue(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

/** True when a scalar value joins several addresses with commas on one line (`@a, @b`). */
export function isCommaJoinedMultivalue(value: string): boolean {
  return value.includes(',') && !/^\s*\[[^\]]*\]\s*$/.test(value)
}

/** Domain-relative POSIX path, case preserved (ids derive from file stems, so the case is identity). */
const posixPath = (path: string): string => path.replace(/\\/g, '/').replace(/^\.\//, '')

/** Walks `parentId` up from `node` until a `kind === 'root'` node is found. */
function findRootAncestor(result: RecursiveParseResult, node: KnowledgeNode): KnowledgeNode | undefined {
  const seen = new Set<string>()
  let current: KnowledgeNode | undefined = node
  while (current && current.kind !== 'root') {
    if (seen.has(current.id)) return undefined
    seen.add(current.id)
    current = current.parentId ? result.nodes[current.parentId] : undefined
  }
  return current
}

/**
 * The domain index of a parsed workspace: one `DomainModelInput` per root
 * node (domain-relative path, frontmatter, `(concept, slug)` of every element).
 * Hosts that already hold a richer index (declared storage) pass their own.
 */
export function domainIndexOfResult(
  result: RecursiveParseResult,
  declarations: StorageDeclarationsResolver = () => new Map(),
): DomainIndex {
  const inputs = Object.values(result.nodes)
    .filter((n) => n.kind === 'root' && n.source?.path)
    .map((root) => {
      const frontmatter: Record<string, unknown> = {}
      for (const [key, fieldValue] of Object.entries(root.fields)) frontmatter[key] = fieldValue.value
      const elements: Array<{ concept: string; slug: string }> = []
      const stack = [...root.childIds]
      while (stack.length > 0) {
        const node = result.nodes[stack.pop()!]
        if (!node || node.kind === 'root') continue
        if (node.kind === 'element') elements.push({ concept: node.type, slug: node.slug ?? slugify(node.name) })
        stack.push(...(node.childIds ?? []))
      }
      return { path: posixPath(root.source.path), frontmatter, elements }
    })
  return buildDomainIndex(inputs, declarations)
}

/** A `reference`/`knowledge` typed field value on an element node, with everything
 *  workspace-scope passes need: the owning document root, the element, its
 *  concept name, the template field definition, and the raw stored value. */
interface TypedFieldValue {
  root: KnowledgeNode
  element: KnowledgeNode
  concept: string
  fieldDef: ConceptField
  raw: unknown
}

/**
 * Iterates every `reference`/`knowledge` typed field value on every element node
 * whose document root has a resolvable template schema - the shared traversal
 * for address validation and multivalue-syntax validation, so both passes
 * agree on which values are in scope. Prose and untyped fields are never scanned.
 */
function* iterateTypedFieldValues(
  result: RecursiveParseResult,
  index: WorkspaceIndex,
): Generator<TypedFieldValue> {
  assertWorkspaceIndex(index)

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
      if (!fieldDef || (fieldDef.type !== 'reference' && fieldDef.type !== 'knowledge')) continue

      const raw = fieldValue.value
      if (raw === undefined || raw === null || raw === '') continue

      yield { root, element: node, concept, fieldDef, raw }
    }
  }
}

/** The tokens of a stored value: one per YAML item, one per line of a scalar. */
function tokensOf(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.flatMap((v) => splitCanonicalMultivalue(String(v)))
    : splitCanonicalMultivalue(String(raw))
}

/** Builds the `elements.<Concept>.<Element>.fields.<field>` diagnostic path, prefixed by the referring model's file path so a workspace-scope diagnostic is attributable to a file. */
function diagnosticPath(root: KnowledgeNode, concept: string, element: KnowledgeNode, fieldDef: ConceptField): string {
  return `${root.source.path}#elements.${concept}.${element.name}.fields.${fieldDef.name}`
}

/**
 * Resolves a mirror address (`sources/sync/<alias>/<path>_NN.md@<slug>`) through the
 * index the host built over that alias folder. A missing alias folder or file is
 * `REF_MODEL_NOT_FOUND`; the unit and concept checks are the ordinary index ones.
 */
function checkMirrorToken(
  token: string,
  mirror: MirrorAddress,
  ctx: TypedFieldValue,
  mirrors?: MirrorLookup,
): ReferenceDiagnostic[] {
  const { root, element, concept, fieldDef } = ctx
  const path = diagnosticPath(root, concept, element, fieldDef)
  const where = `${root.source.path} (${concept} "${element.name}", field "${fieldDef.name}")`
  const model = mirrors?.(mirror.alias)?.byPath(mirror.path)
  if (!mirrors || !model) {
    return [
      {
        path,
        message: `REF_MODEL_NOT_FOUND: ${token} - no mirrored model "${mirror.path}" under alias "${mirror.alias}"; run the synchronization or fix the address; referenced from ${where}`,
        severity: 'error',
        code: 'REF_MODEL_NOT_FOUND',
        meta: { field: fieldDef.name },
      },
    ]
  }
  const resolved = mirrors(mirror.alias)!.resolve(
    { kind: 'unit', model: model.id, unit: mirror.unit },
    undefined,
    fieldDef.target_concepts ? { concepts: fieldDef.target_concepts } : undefined,
  )
  if (!resolved.ok) {
    return [
      {
        path,
        message: `${resolved.problem.code}: ${token} - ${resolved.problem.message.split(' - ').slice(1).join(' - ')}; referenced from ${where}`,
        severity: 'error',
        code: resolved.problem.code,
        meta: { field: fieldDef.name },
      },
    ]
  }
  const diagnostics: ReferenceDiagnostic[] = resolved.warnings.map((w) => ({
    path,
    message: w.message.replace(/^(\w+): [^ ]+ - /, `$1: ${token} - `),
    severity: 'warning' as const,
    code: w.code,
    meta: { field: fieldDef.name },
  }))
  if (fieldDef.target_blueprint && !matchesTargetBlueprint(fieldDef.target_blueprint, { name: resolved.model.blueprint.name })) {
    diagnostics.push({
      path,
      message: `REF_BLUEPRINT_MISMATCH: ${token} - field "${fieldDef.name}" expects bluepriNNt "${fieldDef.target_blueprint}", but the mirrored model uses "${resolved.model.blueprint.name}"; point it at a model of that bluepriNNt`,
      severity: 'warning',
      code: 'REF_BLUEPRINT_MISMATCH',
      meta: { field: fieldDef.name },
    })
  }
  return diagnostics
}

/**
 * Checks one address token of a typed field: malformed or removed forms are
 * errors (`[[Title :: Name]]`, `[[Name]]`, a bare title), a relative `@slug`
 * is the per-file validator's job, and an absolute address must resolve
 * exactly through the domain index. Concept and bluepriNNt membership only warn.
 */
function checkToken(
  token: string,
  ctx: TypedFieldValue,
  index: WorkspaceIndex,
  domain: DomainIndex,
  successor?: (id: string) => string | undefined,
  mirrors?: MirrorLookup,
): ReferenceDiagnostic[] {
  const { root, element, concept, fieldDef } = ctx
  const path = diagnosticPath(root, concept, element, fieldDef)
  const mirror = fieldDef.type === 'reference' ? parseMirrorAddress(token) : null
  if (mirror) return checkMirrorToken(token, mirror, ctx, mirrors)
  const parsed = parseAddress(token)

  if (isAddressError(parsed)) {
    // A `knowledge` field holds submodel file paths; those stay with the per-file resolver.
    if (fieldDef.type === 'knowledge' && parsed.code === 'MODEL_CITED_BY_PATH') return []
    return [
      {
        path,
        message: `${parsed.code}: field "${fieldDef.name}" value "${token}" - ${parsed.message}`,
        severity: 'error',
        code: parsed.code,
        promptHint: 'Write the target as an address: `<hierarchical-id>@<slug>` (or `@<slug>` inside the same model).',
        meta: { field: fieldDef.name },
      },
    ]
  }
  if (parsed.kind === 'blueprint' || parsed.kind === 'source') {
    if (fieldDef.type === 'knowledge') return []
    return [
      {
        path,
        message: `ADDRESS_MALFORMED: field "${fieldDef.name}" value "${token}" - not a model address; use \`<hierarchical-id>@<slug>\``,
        severity: 'error',
        code: 'ADDRESS_MALFORMED',
        meta: { field: fieldDef.name },
      },
    ]
  }
  if (parsed.model === null) return [] // relative `@slug`: the per-file validator resolves it

  const from = domain.byPath(posixPath(root.source.path))?.id
  const resolved = domain.resolve(parsed, from, fieldDef.target_concepts ? { concepts: fieldDef.target_concepts } : undefined)
  if (!resolved.ok) {
    const where = `${root.source.path} (${concept} "${element.name}", field "${fieldDef.name}")`
    // A stale address after a recorded move names the old id AND its recorded
    // successor (design A11), so the fix is unambiguous and never guessed.
    const moved = parsed.model !== null && resolved.problem.code === 'REF_MODEL_NOT_FOUND' ? successor?.(parsed.model) : undefined
    const hint = moved ? ` (recorded successor: "${moved}" — retarget the reference to it)` : ''
    return [
      {
        path,
        message: `${resolved.problem.message}; referenced from ${where}${hint}`,
        severity: 'error',
        code: resolved.problem.code,
        meta: { field: fieldDef.name, ...(moved ? { successor: moved } : {}) },
      },
    ]
  }

  const diagnostics: ReferenceDiagnostic[] = resolved.warnings.map((w) => ({
    path,
    message: w.message,
    severity: 'warning' as const,
    code: w.code,
    meta: { field: fieldDef.name },
  }))
  if (fieldDef.target_blueprint) {
    const targetNodeId = index.pathToNodeId[normalizePathKey(resolved.model.path)]
    const actual = targetNodeId ? index.nodeBlueprint[targetNodeId] : undefined
    if (!actual || !matchesTargetBlueprint(fieldDef.target_blueprint, actual)) {
      diagnostics.push({
        path,
        message: `REF_BLUEPRINT_MISMATCH: ${token} - field "${fieldDef.name}" expects bluepriNNt "${fieldDef.target_blueprint}", but model "${resolved.model.id}" uses "${actual?.name ?? actual?.url ?? 'unknown'}"; point it at a model of that bluepriNNt`,
        severity: 'warning',
        code: 'REF_BLUEPRINT_MISMATCH',
        meta: { field: fieldDef.name },
      })
    }
  }
  return diagnostics
}

/**
 * Reports one `MULTIVALUE_SYNTAX` error per reference typed field value that
 * joins several addresses with commas outside the standard `[a, b]` list. The
 * hint shows the canonical form with the actual values, one per line. Runs
 * before resolution: a non-canonical value never resolves, so no dangling
 * noise is emitted alongside the syntax error.
 */
export function validateMultivalueSyntax(
  result: RecursiveParseResult,
  index: WorkspaceIndex,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = []

  for (const { root, element, concept, fieldDef, raw } of iterateTypedFieldValues(result, index)) {
    const scalars = Array.isArray(raw) ? raw.map(String) : [String(raw)]
    for (const scalar of scalars) {
      if (!isCommaJoinedMultivalue(scalar)) continue
      const tokens = scalar
        .replace(/^\s*\[|\]\s*$/g, '')
        .split(/\s*,\s*/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
      diagnostics.push({
        path: diagnosticPath(root, concept, element, fieldDef),
        message: `Non-canonical multivalue reference syntax in field "${fieldDef.name}": comma-joined values are not resolved; use a YAML sequence or one address per line`,
        severity: 'error',
        code: MULTIVALUE_SYNTAX_CODE,
        promptHint: `Replace the comma-joined value with one address per line or a YAML sequence, e.g.:\n${tokens.join('\n')}`,
        meta: { field: fieldDef.name, tokenCount: tokens.length },
      })
    }
  }

  return diagnostics
}

/**
 * Validates every address held by `reference`/`knowledge` typed element
 * fields across the whole parsed workspace through the domain index (built
 * from `result` unless the host passes its own). Must run after the host's own
 * `recursiveParse()` and `buildWorkspaceIndex()`; per-file validation keeps
 * the relative `@slug` form.
 */
export function validateWorkspaceReferences(
  result: RecursiveParseResult,
  index: WorkspaceIndex,
  domain: DomainIndex = domainIndexOfResult(result),
  /**
   * The recorded successor of a moved model id (`ChangeLog.successorOf`). Hosts
   * that hold the change log pass it so a stale address names where the instance
   * went; without it the error still names the old id (design A11).
   */
  successor?: (id: string) => string | undefined,
  /** Resolves a `sources/sync/<alias>/...` address through the index of that mirror folder. */
  mirrors?: MirrorLookup,
): ReferenceDiagnostic[] {
  const diagnostics: ReferenceDiagnostic[] = [...validateMultivalueSyntax(result, index)]
  for (const value of iterateTypedFieldValues(result, index)) {
    const scalars = Array.isArray(value.raw) ? value.raw.map(String) : [String(value.raw)]
    if (scalars.some(isCommaJoinedMultivalue)) continue // reported once as MULTIVALUE_SYNTAX
    for (const token of tokensOf(value.raw)) diagnostics.push(...checkToken(token, value, index, domain, successor, mirrors))
  }
  return diagnostics
}
