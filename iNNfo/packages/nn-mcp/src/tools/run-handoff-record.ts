import { writeFile } from 'node:fs/promises'
import { fail, foldStoredRun, readRun } from './procedure-state.js'
import type { ToolError } from './procedure-state.js'
import { handoffFile, readHandoff } from './run-handoff.js'
import type { HandoffChoice, RunHandoff } from './run-handoff.js'

/** Checks and writes a run's final handoff choice (see `run-handoff.ts` for what it is). */

/** What a handoff request needs, checked before anything is written. */
export async function checkHandoff(
  root: string,
  run: string,
  choice: HandoffChoice,
): Promise<{ ok: true; recorded: RunHandoff | null } | ToolError> {
  const read = await readRun(root, run)
  if (!read.ok) return fail('RUN_NOT_FOUND', `There is no run "${run}" to hand off.`)
  const folded = await foldStoredRun(root, read.run)
  if (!folded.ok) return folded
  if (folded.folded.state.status !== 'completed')
    return fail(
      'RUN_NOT_COMPLETED',
      `Run "${run}" is ${folded.folded.state.status}; only a completed run is handed off.`,
    )
  const recorded = await readHandoff(root, run)
  if (recorded && recorded.choice !== choice)
    return fail(
      'HANDOFF_CONFLICT',
      `Run "${run}" was already handed off as "${recorded.choice}" by ${recorded.by}; it is not changed to "${choice}".`,
      { recorded: recorded.choice },
    )
  return { ok: true, recorded }
}

/** Writes the choice once. Returns the record that now stands and whether this call wrote it. */
export async function recordHandoff(
  root: string,
  run: string,
  choice: HandoffChoice,
  by: string,
): Promise<{ ok: true; handoff: RunHandoff; written: boolean } | ToolError> {
  const checked = await checkHandoff(root, run, choice)
  if (!checked.ok) return checked
  if (checked.recorded) return { ok: true, handoff: checked.recorded, written: false }
  const handoff: RunHandoff = { run, choice, by, at: new Date().toISOString() }
  try {
    // `wx`: a record that appeared since the check is never overwritten.
    await writeFile(handoffFile(root, run), JSON.stringify(handoff, null, 2) + '\n', {
      encoding: 'utf-8',
      flag: 'wx',
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST')
      return fail('HANDOFF_NOT_RECORDED', `The choice could not be written: ${String(err)}`)
    const again = await checkHandoff(root, run, choice)
    return again.ok && again.recorded
      ? { ok: true, handoff: again.recorded, written: false }
      : again.ok
        ? fail('HANDOFF_NOT_RECORDED', 'The choice could not be written.')
        : again
  }
  return { ok: true, handoff, written: true }
}
