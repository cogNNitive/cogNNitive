import { unitOf, type LoggedChange } from '../changelog/index.js'
import type { AttemptRecord } from './types.js'

/**
 * Each step's attempts, rebuilt from the run model's change log (design B2), oldest first.
 *
 * A run model stores only the latest attempt on its `Step Run` row; every earlier one is in
 * the history of that row. An attempt begins where an applied change raises the row's
 * `attempt` (the runner's claim, which also writes the `inputs` revisions it consumed); a
 * reopened row keeps its attempt, so a loop's reopening is not an attempt. A non-empty
 * `failure` written while an attempt is the latest belongs to that attempt. The actor is the
 * author of the claiming changeset.
 *
 * Pure: the caller passes the log's changes (`ChangeLog.all`) in canonical order.
 */
export function runAttemptsOf(
  changes: readonly LoggedChange[],
  runId: string,
  steps: Iterable<string>,
): Record<string, AttemptRecord[]> {
  const wanted = new Set(steps)
  const prefix = `${runId}@`
  // One applied `set_fields` is logged as one entry per field it set: regroup them per change.
  const groups = new Map<string, { step: string; author?: string; fields: Map<string, string> }>()
  for (const change of changes) {
    if (!change.applied) continue
    const unit = unitOf(change)
    if (!unit.startsWith(prefix)) continue
    const amp = unit.indexOf('&', prefix.length)
    if (amp === -1) continue
    const step = unit.slice(prefix.length, amp)
    if (!wanted.has(step)) continue
    const key = `${change.changeset}#${change.index}`
    let group = groups.get(key)
    if (!group) {
      group = { step, ...(change.author ? { author: change.author } : {}), fields: new Map() }
      groups.set(key, group)
    }
    group.fields.set(unit.slice(amp + 1), change.to ?? '')
  }

  const out: Record<string, AttemptRecord[]> = {}
  for (const { step, author, fields } of groups.values()) {
    const list = (out[step] ??= [])
    const last = list[list.length - 1]
    const attempt = Number(fields.get('attempt'))
    if (Number.isInteger(attempt) && attempt > (last?.attempt ?? 0)) {
      list.push({
        attempt,
        inputs: inputsOf(fields.get('inputs')),
        ...(nonEmpty(fields.get('failure')) ? { failure: fields.get('failure')! } : {}),
        ...(author ? { actor: author } : {}),
      })
    } else if (last && nonEmpty(fields.get('failure'))) {
      last.failure = fields.get('failure')!
    }
  }
  for (const [step, list] of Object.entries(out)) if (list.length === 0) delete out[step]
  return out
}

const nonEmpty = (v: string | undefined): boolean => v !== undefined && v.trim() !== ''

function inputsOf(raw: string | undefined): Record<string, string> {
  if (!nonEmpty(raw)) return {}
  try {
    const parsed: unknown = JSON.parse(raw!)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]))
  } catch {
    return {}
  }
}
