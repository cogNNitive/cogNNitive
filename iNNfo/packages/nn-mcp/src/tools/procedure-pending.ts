import { fail, foldStoredRun, readRun } from './procedure-state.js'
import type { ToolError } from './procedure-state.js'
import { buildNodeDomainIndex } from './domain-index.js'
import type { StepRequestRow } from '@cognnitive/nn-core'

/**
 * `procedure_pending`: the queue a person fills and the runner drains (executions spec,
 * "Requests, not writes"). A request is intent, never state, so this tool only reads: it lists
 * the `Step Request` rows of one run, or of every run in the domaiNN.
 */

export interface PendingRequest extends StepRequestRow {
  /** The row's own slug, which is what a consumer names. */
  id: string
}

export interface PendingResult {
  ok: true
  run: string | null
  requests: Array<PendingRequest & { run: string }>
  /** How many of them nobody has consumed yet. */
  pending: number
}

export async function procedurePending(
  root: string,
  args: Record<string, unknown>,
): Promise<PendingResult | ToolError> {
  const runArg = args['run']
  if (runArg !== undefined && (typeof runArg !== 'string' || runArg.trim() === ''))
    return fail('INVALID_ARGUMENT', 'run must be a non-empty run id when given.')

  const runs = runArg === undefined ? await listRuns(root) : [String(runArg).trim()]
  const requests: Array<PendingRequest & { run: string }> = []
  // One domain index for the whole sweep: this tool only reads, so nothing moves under it.
  const index = runs.length > 0 ? await buildNodeDomainIndex(root) : undefined
  for (const run of runs) {
    const read = await readRun(root, run, { index })
    // A named run that does not exist is an error; a sweep over the domaiNN skips what it
    // cannot read rather than failing the whole queue.
    if (!read.ok) {
      if (runArg !== undefined) return read
      continue
    }
    const folded = await foldStoredRun(root, read.run)
    if (!folded.ok) {
      if (runArg !== undefined) return folded
      continue
    }
    for (const [id, row] of Object.entries(folded.folded.run.requests))
      requests.push({ ...row, id, run })
  }
  requests.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? '') || a.id.localeCompare(b.id))
  return {
    ok: true,
    run: runArg === undefined ? null : String(runArg).trim(),
    requests,
    pending: requests.filter((r) => r.status === 'pending').length,
  }
}

/** The run ids under `executions/`, in name order. */
async function listRuns(root: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises')
  const { join } = await import('node:path')
  try {
    const entries = await readdir(join(root, 'executions'), { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}
