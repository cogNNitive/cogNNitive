/**
 * Declared transitions, enforced at apply (design D6, §2.3).
 *
 * A `select` field whose Field Definition declares `transitions` accepts a write only
 * along a declared edge. The rule compares the value the write produces against the
 * value the element holds when that change runs, in changeset order — so an earlier
 * change of the same changeset counts as the current value.
 *
 * This is a validity rule, not a concurrency guard: it compares nothing the writer
 * observed. Concurrency is `from` on `update_field`/`set_fields`.
 */
import type { FieldTransitions } from '../schema/transitions.js'

/** The error code a write outside the declared edges produces. */
export const TRANSITION_NOT_ALLOWED = 'TRANSITION_NOT_ALLOWED'

/** An unset field is keyed as the empty string in the declaration. */
const UNSET = ''

/** Normalizes a model value to the string form the declaration uses. */
export function transitionValue(raw: unknown): string {
  if (raw === undefined || raw === null) return UNSET
  return String(raw)
}

/**
 * Whether a write is allowed by the declared edges.
 *
 * Writing the value a field already holds is always allowed and never checked: a
 * changeset that re-states a field does not move the lifecycle.
 */
export function transitionAllowed(
  transitions: FieldTransitions,
  current: string,
  next: string,
): boolean {
  if (current === next) return true
  const allowed = transitions[current]
  if (!allowed) return false
  return allowed.includes(next)
}

/**
 * The diagnostic for a refused write, or `undefined` when the edge is declared.
 * Names the field, the value it holds and the value the write asked for, so one error
 * is enough to fix the change.
 */
export function transitionDiagnostic(
  fieldName: string,
  transitions: FieldTransitions,
  current: string,
  next: string,
): string | undefined {
  if (transitionAllowed(transitions, current, next)) return undefined
  const from = current === UNSET ? '(unset)' : `"${current}"`
  const to = next === UNSET ? '(unset)' : `"${next}"`
  const allowed = (transitions[current] ?? []).map((v) => `"${v}"`)
  const options =
    allowed.length > 0 ? `allowed from ${from}: ${allowed.join(', ')}` : `${from} is terminal`
  return `${TRANSITION_NOT_ALLOWED}: field "${fieldName}" cannot move from ${from} to ${to} (${options})`
}
