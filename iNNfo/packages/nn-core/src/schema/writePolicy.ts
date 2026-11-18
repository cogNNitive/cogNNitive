/**
 * Write policy of a Concept (write-policy, slice 1). Pure and browser-safe: no `fs`,
 * no `path`.
 *
 * A write policy says which kinds of write the instances of a concept accept:
 *
 * - `mutable` (the default): elements may be added, updated and removed.
 * - `append-only`: elements may only be added; an existing element never changes.
 * - `read-only`: nothing may be written.
 *
 * It is declared at three levels and resolved as a cascade:
 *
 * 1. the bluepriNNt (`write_policy` in the spec frontmatter) - default for its concepts;
 * 2. the Concept Definition (`write_policy::`) - overrides the bluepriNNt default;
 * 3. the domaiNN root and its `scope: true` folders - may only tighten, never loosen.
 *
 * Levels 1-2 belong to the bluepriNNt author, so the concept wins outright. Level 3
 * belongs to the domaiNN owner and folds with the `restrict` strategy (set
 * intersection of the allowed operations). An `isolate` scope does NOT cut the chain
 * here: isolation must never become a way to loosen a write policy.
 *
 * An unrecognised value fails closed: it resolves as `read-only`.
 */
import { resolve, type ExplainTrace } from '../scope/resolve.js'
import type { ScopeNode } from '../scope/types.js'
import type { ChangeOp } from '../changeset/types.js'

export type WritePolicy = 'mutable' | 'append-only' | 'read-only'

export const WRITE_POLICIES: readonly WritePolicy[] = ['mutable', 'append-only', 'read-only']

/** The property name at every level. */
export const WRITE_POLICY_KEY = 'write_policy'

/** The policy of a concept that declares none, under a bluepriNNt that declares none. */
export const DEFAULT_WRITE_POLICY: WritePolicy = 'mutable'

/** The kinds of write a change performs on concept instances. */
export type WriteOperation = 'add' | 'update' | 'remove'

const ALLOWED: Readonly<Record<WritePolicy, readonly WriteOperation[]>> = {
  mutable: ['add', 'update', 'remove'],
  'append-only': ['add'],
  'read-only': [],
}

/** The operations a policy allows. */
export function allowedOperations(policy: WritePolicy): readonly WriteOperation[] {
  return ALLOWED[policy]
}

/** Parses one declared value; `undefined` when it is not a known policy. */
export function parseWritePolicy(raw: unknown): WritePolicy | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim().toLowerCase()
  return WRITE_POLICIES.find((p) => p === value)
}

/** What a Concept Definition declares through `write_policy::`. */
export interface ConceptWritePolicy {
  /** The accepted policy; absent when the raw value is unknown. */
  policy?: WritePolicy
  /** The raw value when it is not a known policy (validation reports it). */
  unknown?: string
}

/** Reads `write_policy::` from a Concept Definition's fields; `undefined` when absent. */
export function readWritePolicy(fields: Record<string, unknown>): ConceptWritePolicy | undefined {
  const raw = fields[WRITE_POLICY_KEY]
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return undefined
  const policy = parseWritePolicy(raw)
  return policy ? { policy } : { unknown: String(raw).trim() }
}

export interface WritePolicyDiagnostic {
  path: string
  message: string
  severity: 'error'
  code: 'WRITE_POLICY_UNKNOWN'
}

/** Reports every Concept Definition whose `write_policy::` is not a known policy. */
export function validateWritePolicy(
  concepts: ReadonlyArray<{ name: string; writePolicy?: ConceptWritePolicy }>,
): WritePolicyDiagnostic[] {
  const diagnostics: WritePolicyDiagnostic[] = []
  for (const concept of concepts) {
    const unknown = concept.writePolicy?.unknown
    if (unknown === undefined) continue
    diagnostics.push({
      code: 'WRITE_POLICY_UNKNOWN',
      severity: 'error',
      path: `Concept Definition.${concept.name}.${WRITE_POLICY_KEY}`,
      message: `WRITE_POLICY_UNKNOWN: concept "${concept.name}" - write_policy "${unknown}" is not a known policy; use one of: ${WRITE_POLICIES.join(', ')}`,
    })
  }
  return diagnostics
}

/**
 * The kind of write a changeset operation performs on concept instances, or `null`
 * when the operation is outside the policy (schema, matrix, model metadata, gates).
 * `extract_instance` removes the subtree from its source, so it counts as `remove`.
 */
export function writeOperationOf(op: ChangeOp): WriteOperation | null {
  switch (op) {
    case 'add_element':
    case 'add_model':
      return 'add'
    case 'update_field':
    case 'set_fields':
    case 'rename_element':
    case 'update_element_text':
    case 'move_model':
      return 'update'
    case 'remove_element':
    case 'remove_model':
    case 'extract_instance':
      return 'remove'
    default:
      return null
  }
}

export interface WritePolicyInput {
  /** `write_policy` of the bluepriNNt frontmatter (raw). */
  blueprint?: unknown
  /** `write_policy::` of the Concept Definition. */
  concept?: ConceptWritePolicy
  /** The domaiNN chain, outermost first (root, then `scope: true` folders). */
  scopes?: readonly ScopeNode[]
}

export interface WritePolicyResolution {
  policy: WritePolicy
  allowed: readonly WriteOperation[]
  /** Where the bluepriNNt-level policy came from. */
  declaredBy: 'concept' | 'blueprint' | 'default'
  /** Scopes whose value was not a known policy (each one resolved as `read-only`). */
  unknownScopes: Array<{ scope: string; value: string }>
  /** The level-3 fold, or null when no scope was given. */
  explain: ExplainTrace | null
}

function policyOfAllowed(allowed: readonly string[]): WritePolicy {
  const set = new Set(allowed)
  if (set.has('add') && set.has('update') && set.has('remove')) return 'mutable'
  if (set.has('add')) return 'append-only'
  return 'read-only'
}

/** Resolves the effective write policy of one concept at one place in the domaiNN. */
export function resolveWritePolicy(input: WritePolicyInput): WritePolicyResolution {
  let base: WritePolicy
  let declaredBy: WritePolicyResolution['declaredBy']
  if (input.concept) {
    base = input.concept.policy ?? 'read-only'
    declaredBy = 'concept'
  } else if (input.blueprint !== undefined && input.blueprint !== null && String(input.blueprint).trim() !== '') {
    base = parseWritePolicy(input.blueprint) ?? 'read-only'
    declaredBy = 'blueprint'
  } else {
    base = DEFAULT_WRITE_POLICY
    declaredBy = 'default'
  }

  const scopes = input.scopes ?? []
  const unknownScopes: WritePolicyResolution['unknownScopes'] = []
  if (scopes.length === 0) {
    return { policy: base, allowed: ALLOWED[base], declaredBy, unknownScopes, explain: null }
  }

  // Translate every declared policy to its allowlist and drop `isolate`, so the
  // generic `restrict` fold can only intersect, over the whole chain.
  const nodes: ScopeNode[] = scopes.map((node) => {
    if (!Object.hasOwn(node.values, WRITE_POLICY_KEY)) return { ...node, isolate: false }
    const raw = node.values[WRITE_POLICY_KEY]
    const parsed = parseWritePolicy(raw)
    if (!parsed) unknownScopes.push({ scope: node.id, value: String(raw) })
    const values = { ...node.values, [WRITE_POLICY_KEY]: [...ALLOWED[parsed ?? 'read-only']] }
    return { ...node, isolate: false, values }
  })
  const floor: ScopeNode = {
    id: `bluepriNNt:${declaredBy}`,
    kind: 'floor',
    doc: null,
    isolate: false,
    values: { [WRITE_POLICY_KEY]: [...ALLOWED[base]] },
  }

  const folded = resolve({ floor, nodes }, WRITE_POLICY_KEY, 'restrict')
  if (!folded.ok) {
    // `restrict` is a known strategy; this branch only guards the type.
    return { policy: 'read-only', allowed: [], declaredBy, unknownScopes, explain: null }
  }
  const allowedRaw = Array.isArray(folded.value) ? folded.value.map(String) : []
  const policy = policyOfAllowed(allowedRaw)
  return { policy, allowed: ALLOWED[policy], declaredBy, unknownScopes, explain: folded.explain }
}

export interface WritePolicyViolation {
  code: 'WRITE_POLICY_DENIED'
  message: string
}

/** Whether a changeset operation is allowed under a policy; `null` when it is. */
export function writePolicyViolation(
  policy: WritePolicy,
  op: ChangeOp,
  concept: string,
): WritePolicyViolation | null {
  const operation = writeOperationOf(op)
  if (operation === null || ALLOWED[policy].includes(operation)) return null
  return {
    code: 'WRITE_POLICY_DENIED',
    message: `WRITE_POLICY_DENIED: concept "${concept}" is ${policy}; "${op}" is a ${operation} and only ${
      ALLOWED[policy].length === 0 ? 'no write' : ALLOWED[policy].join(', ')
    } is allowed`,
  }
}
