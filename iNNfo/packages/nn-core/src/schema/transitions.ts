/**
 * Declared transitions on a `select` field (iNNfo V_0-9-0, design D6).
 *
 * A Field Definition may declare `transitions::` as a one-line JSON object mapping a
 * current value (`""` = unset) to the values it may move to. The declaration is a
 * validity rule enforced at apply, never a schema for history: a model whose value was
 * set before the declaration stays valid, and only new writes are checked.
 *
 * This module owns the parse and the shape checks. The apply-time rule (which edge a
 * write takes) lives in `changeset/transitions.ts`, so the schema and the engine share
 * one reading of the declaration.
 */

/** Error codes a malformed `transitions` declaration produces. */
export const TRANSITIONS_INVALID = 'TRANSITIONS_INVALID'
export const TRANSITIONS_UNKNOWN_VALUE = 'TRANSITIONS_UNKNOWN_VALUE'
export const TRANSITIONS_UNKNOWN_OPTION = 'TRANSITIONS_UNKNOWN_OPTION'

/** The declared lifecycle of one `select` field: current value -> allowed next values. */
export type FieldTransitions = Record<string, string[]>

/**
 * Declared transitions per concept and field, both keys lowercased: the shape the apply
 * engine looks a write up by. Built from a composed bluepriNNt schema.
 */
export type DeclaredTransitions = Map<string, Map<string, FieldTransitions>>

/** Looks up the declared transitions of one concept's field, or `undefined`. */
export function declaredTransitionsFor(
  declared: DeclaredTransitions | undefined,
  concept: string | undefined,
  fieldName: string,
): FieldTransitions | undefined {
  if (!declared || !concept) return undefined
  return declared.get(concept.toLowerCase())?.get(fieldName.toLowerCase())
}

/**
 * Collects every declared `transitions` of a bluepriNNt schema into the lookup the apply
 * engine uses. A schema with no declaration yields an empty map, never `undefined`, so a
 * caller can pass it unconditionally.
 */
export function buildDeclaredTransitions(
  concepts: ReadonlyArray<{
    name: string
    fields?: ReadonlyArray<{ name: string; transitions?: FieldTransitions }>
  }>,
): DeclaredTransitions {
  const out: DeclaredTransitions = new Map()
  for (const concept of concepts) {
    if (!concept.fields) continue
    let perField = out.get(concept.name.toLowerCase())
    for (const field of concept.fields) {
      if (!field.transitions) continue
      perField ??= new Map()
      perField.set(field.name.toLowerCase(), field.transitions)
    }
    if (perField) out.set(concept.name.toLowerCase(), perField)
  }
  return out
}

/**
 * Reads a `transitions::` field value. A JSON object is parsed; a value that is not an
 * object, or whose members are not arrays of strings, is malformed and returns
 * `undefined` (the field then behaves as if it declared nothing).
 *
 * Shape only: whether every key and target is one of `options` is checked by
 * `transitionsProblems`, which has the field in hand.
 */
export function parseTransitions(raw: unknown): FieldTransitions | undefined {
  let value: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return undefined
    try {
      value = JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const out: FieldTransitions = {}
  for (const [from, targets] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(targets)) return undefined
    if (!targets.every((t) => typeof t === 'string')) return undefined
    out[from] = targets as string[]
  }
  return out
}

/**
 * Structural problems of a declared `transitions` on one field.
 *
 * Every key MUST be `""` or one of the field's `options`, and every target MUST be one
 * of the field's `options` (`""` is not a target: a value is never unset again). Every
 * option MUST be a key, so a value with no outgoing edge is stated explicitly with `[]`
 * instead of being silently unmovable.
 *
 * Only a `select` field may declare transitions: another type has no value set to move
 * between. An empty problem list means the declaration is well formed.
 */
export function transitionsProblems(field: {
  name: string
  type: string
  options?: string[]
  transitions?: FieldTransitions
}): string[] {
  const { transitions } = field
  if (!transitions) return []
  const problems: string[] = []
  if (field.type !== 'select') {
    problems.push(
      `${TRANSITIONS_INVALID}: field "${field.name}" declares transitions but is not a select field (type ${field.type})`,
    )
    return problems
  }
  const options = new Set(field.options ?? [])
  for (const [from, targets] of Object.entries(transitions)) {
    if (from !== '' && !options.has(from)) {
      problems.push(
        `${TRANSITIONS_UNKNOWN_VALUE}: field "${field.name}" declares transitions from "${from}", which is not one of its options`,
      )
    }
    for (const target of targets) {
      if (!options.has(target)) {
        problems.push(
          `${TRANSITIONS_UNKNOWN_OPTION}: field "${field.name}" declares a transition to "${target}", which is not one of its options`,
        )
      }
    }
  }
  for (const option of options) {
    if (!(option in transitions)) {
      problems.push(
        `${TRANSITIONS_INVALID}: field "${field.name}" declares transitions but "${option}" is not a key; state its outgoing edges explicitly (use [] for a terminal value)`,
      )
    }
  }
  return problems
}
