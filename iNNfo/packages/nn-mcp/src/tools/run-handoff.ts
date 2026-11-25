import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The final handoff of a completed run: the person chooses to send the result to the
 * administrator or to register it with the agent. This module records THAT CHOICE and nothing
 * else: it is a private fact of the run, kept beside the run model under `executions/<run>/`,
 * and it publishes nothing to the domaiNN's models. The run model itself is closed by then
 * (`close_model`), so the choice cannot live in its rows.
 *
 * One choice per run, written once. Recording the same choice again changes nothing; a
 * different one is refused, so what an earlier import recorded is never rewritten.
 */

export const HANDOFF_CHOICES = ['administrator', 'agent'] as const
export type HandoffChoice = (typeof HANDOFF_CHOICES)[number]

export interface RunHandoff {
  run: string
  choice: HandoffChoice
  /** Who imported the person's response. */
  by: string
  /** When the choice was recorded (ISO 8601, UTC). */
  at: string
}

export const isHandoffChoice = (v: unknown): v is HandoffChoice =>
  typeof v === 'string' && (HANDOFF_CHOICES as readonly string[]).includes(v)

export const handoffFile = (root: string, run: string): string =>
  join(root, 'executions', run, 'handoff.json')

/** The choice recorded for a run, or null when none was (or the file is not a valid record). */
export async function readHandoff(root: string, run: string): Promise<RunHandoff | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(handoffFile(root, run), 'utf-8'))
    if (parsed === null || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    if (!isHandoffChoice(o['choice']) || typeof o['by'] !== 'string' || typeof o['at'] !== 'string')
      return null
    return { run, choice: o['choice'], by: o['by'], at: o['at'] }
  } catch {
    return null
  }
}
