import type { Guard, StepState, Transition } from './types.js'

/** Whether a guard holds for this outcome; prose is asserted only when it is named explicitly. */
export function holds(t: Transition, outcome: string | undefined): boolean | 'asserted' {
  switch (t.guard.kind) {
    case 'none':
      return true
    case 'outcome':
      return t.guard.token === outcome
    case 'artifact':
      return t.guard.holds
    default:
      return 'asserted'
  }
}

export type TargetChoice =
  | { ok: true; next?: string }
  | { ok: false; reason: 'invalid'; next: string }
  | { ok: false; reason: 'ambiguous'; holding: Transition[] }

/**
 * Picks the step a completed step moves to, from its targets and the outcome it reported.
 *
 * One rule for both paths that complete a step (a human/agent `complete` and an engine
 * `action=run`), so branches behave the same whichever executor finished the work:
 *
 * - a named `next` must be one of the targets and its guard must not contradict the outcome;
 * - otherwise a single target is taken as it stands;
 * - otherwise exactly one target whose guard holds is taken, and zero or several is refused.
 */
export function chooseNext(
  targets: ReadonlyArray<Pick<Transition, 'to'> & { guard: Guard }>,
  outcome: string | undefined,
  named?: string,
): TargetChoice {
  if (named !== undefined) {
    const t = targets.find((x) => x.to === named)
    if (!t || holds(t as Transition, outcome) === false)
      return { ok: false, reason: 'invalid', next: named }
    return { ok: true, next: named }
  }
  if (targets.length === 1) return { ok: true, next: targets[0]!.to }
  if (targets.length === 0) return { ok: true }
  const holding = targets.filter((t) => holds(t as Transition, outcome) === true)
  if (holding.length !== 1) return { ok: false, reason: 'ambiguous', holding }
  return { ok: true, next: holding[0]!.to }
}

/** A step the engine may claim: never started, failed, or waiting (a controlled stop is re-runnable). */
export const UNSTARTED_STEP_STATUSES: ReadonlySet<StepState['status']> = new Set([
  'pending',
  'failed',
  'waiting',
])
