import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { procedureState } from '../src/tools/procedure-state.js'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'
import { procedurePending } from '../src/tools/procedure-pending.js'

/**
 * The `Step Request` queue: a person records intent, the runner consumes it.
 *
 * A request is one `add_element` on the run model with no runner changeset of its own, so a
 * request on its own writes nothing about the run. Everything here goes through the real tools,
 * never through the store the console uses.
 */

const SLOW = { timeout: 120_000 }

const FIXTURE = join(import.meta.dirname!, 'fixtures', 'procedure-runner')
const EXECUTIONS_SPEC = join(
  import.meta.dirname!,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'executions',
  'spec_NN.md',
)

let root: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-step-request-')))
  cpSync(FIXTURE, root, { recursive: true })
  mkdirSync(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  process.env.INNFO_GLOBAL_DIR = join(root, '.global')
  process.env.INNFO_SKILLS_DIR = join(root, '.skills')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
})

afterEach(() => {
  delete process.env.INNFO_CACHE_DIR
  delete process.env.INNFO_GLOBAL_DIR
  delete process.env.INNFO_SKILLS_DIR
  vi.restoreAllMocks()
  rmSync(root, { recursive: true, force: true })
})

type Result = { ok: boolean; code?: string; [key: string]: unknown }

function ok<T extends Result>(r: T): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${JSON.stringify(r)}`)
  return r
}

const startReview = () =>
  procedureStart(root, { procedure: 'review', params: { doc: 'spec' }, run: 'r1', actor: 'ana' })

/**
 * Writes a `Step Request` row exactly as the console's draft does: one `add_element` on the
 * run model. It uses `apply_change` through a proposal, so nothing here is the runner.
 */
async function requestRow(id: string, fields: Record<string, string | number>): Promise<void> {
  const { writeProposedChangeset } = await import('../src/tools/propose-changeset.js')
  const { applyChange } = await import('../src/tools/apply-change.js')
  // The test speaks the runner's vocabulary (`value`, `outcome`); the concept stores them as
  // `requested_value` and `requested_outcome` so an action's own field names stay free.
  const { value, outcome, ...rest } = fields
  const to: Record<string, string | number> = { request_status: 'pending', ...rest }
  if (value !== undefined) to['requested_value'] = value
  if (outcome !== undefined) to['requested_outcome'] = outcome
  const written = await writeProposedChangeset(root, {
    changes: [
      {
        op: 'add_element',
        target: 'r1',
        concept: 'Step Request',
        name: id,
        slug: id,
        to: JSON.stringify(to),
        evidence: 'decision',
      },
    ],
    title: `request ${id}`,
    author: 'ana',
    authorKind: 'agent',
    atomic: true,
  })
  const applied = await applyChange(root, written.path)
  if (!applied.success) throw new Error(`request ${id} not applied: ${JSON.stringify(applied.errors)}`)
}

/** The run's header seq, which is what a request pins. */
async function runSeq(): Promise<number> {
  return ok(await procedureState(root, { run: 'r1' })).seq
}

describe('Step Request queue', SLOW, () => {
  it('procedure_pending lists a pending request without touching the run', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const seq = await runSeq()
    await requestRow('q1', { action: 'complete', step: 'draft', base_seq: seq })

    const listed = ok(await procedurePending(root, { run: 'r1' }))
    expect(listed.pending).toBe(1)
    expect(listed.requests).toEqual([
      expect.objectContaining({ id: 'q1', run: 'r1', action: 'complete', step: 'draft' }),
    ])
    // Reading the queue wrote nothing: the seq is where the request left it.
    expect(await runSeq()).toBe(seq)
  })

  it('consuming a request records the action and marks it done in one changeset', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const seq = await runSeq()
    await requestRow('q1', { action: 'complete', step: 'draft', base_seq: seq })

    const done = ok(await procedureRecord(root, { run: 'r1', request: 'q1' }))
    expect(done.state.steps.draft).toMatchObject({ status: 'done' })
    // The action and the mark landed together: one changeset, one seq step.
    expect(done.seq).toBe(seq + 1)
    const after = ok(await procedurePending(root, { run: 'r1' }))
    expect(after.pending).toBe(0)
    expect(after.requests[0]).toMatchObject({ id: 'q1', status: 'done' })
  })

  it('a request cannot be consumed twice', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    await requestRow('q1', { action: 'complete', step: 'draft', base_seq: await runSeq() })
    ok(await procedureRecord(root, { run: 'r1', request: 'q1' }))
    expect(await procedureRecord(root, { run: 'r1', request: 'q1' })).toMatchObject({
      ok: false,
      code: 'REQUEST_NOT_PENDING',
    })
  })

  it('a request made before the run advanced is marked stale and records nothing', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const old = await runSeq()
    await requestRow('q1', { action: 'complete', step: 'draft', base_seq: old })
    // Somebody else moves the step on before the request is consumed.
    ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))

    const refused = await procedureRecord(root, { run: 'r1', request: 'q1' })
    expect(refused).toMatchObject({ ok: false, code: 'REQUEST_STALE' })
    const after = ok(await procedurePending(root, { run: 'r1' }))
    expect(after.requests[0]).toMatchObject({ id: 'q1', status: 'stale' })
    expect(after.requests[0]!.reason).toContain('moved')
  })

  it('a request the planner refuses is marked rejected with the reason', async () => {
    ok(await startReview())
    // Nothing started: completing is a refusal the planner knows well.
    await requestRow('q1', { action: 'complete', step: 'draft', base_seq: await runSeq() })
    const refused = await procedureRecord(root, { run: 'r1', request: 'q1' })
    expect(refused).toMatchObject({ ok: false, code: 'STEP_NOT_STARTED' })
    const after = ok(await procedurePending(root, { run: 'r1' }))
    expect(after.requests[0]).toMatchObject({ id: 'q1', status: 'rejected' })
    expect(after.requests[0]!.reason).toContain('STEP_NOT_STARTED')
    // The step never moved.
    expect(ok(await procedureState(root, { run: 'r1' })).state.steps.draft).toMatchObject({
      status: 'pending',
    })
  })

  it('a request and an action together are refused', async () => {
    ok(await startReview())
    await requestRow('q1', { action: 'wait', step: 'draft', value: 'ana', base_seq: await runSeq() })
    expect(
      await procedureRecord(root, { run: 'r1', request: 'q1', action: 'wait' }),
    ).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
  })

  it('an unknown request is refused and nothing is written', async () => {
    ok(await startReview())
    const seq = await runSeq()
    expect(await procedureRecord(root, { run: 'r1', request: 'ghost' })).toMatchObject({
      ok: false,
      code: 'REQUEST_NOT_FOUND',
    })
    expect(await runSeq()).toBe(seq)
  })

  it('procedure_pending without a run lists every run of the domaiNN', async () => {
    ok(await startReview())
    await requestRow('q1', { action: 'wait', step: 'draft', value: 'ana', base_seq: await runSeq() })
    ok(await procedureStart(root, { procedure: 'review', params: { doc: 'b' }, run: 'r2' }))
    const all = ok(await procedurePending(root, {}))
    expect(all.run).toBeNull()
    expect(all.requests.map((r) => r.run)).toEqual(['r1'])
    expect(all.pending).toBe(1)
  })

  it('a request waits on a step, and a fail request carries its reason', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    await requestRow('q-wait', { action: 'wait', step: 'draft', value: 'ana', base_seq: await runSeq() })
    const waited = ok(await procedureRecord(root, { run: 'r1', request: 'q-wait' }))
    expect(waited.state.steps.draft).toMatchObject({ status: 'waiting', waitingOn: 'ana' })

    await requestRow('q-fail', {
      action: 'fail',
      step: 'draft',
      value: 'no data',
      base_seq: await runSeq(),
    })
    const failed = ok(await procedureRecord(root, { run: 'r1', request: 'q-fail' }))
    expect(failed.state.steps.draft).toMatchObject({ status: 'failed', failure: 'no data' })
  })

  it('the model keeps every request, resolved or not', async () => {
    ok(await startReview())
    await requestRow('q1', { action: 'wait', step: 'draft', value: 'ana', base_seq: await runSeq() })
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    await requestRow('q2', { action: 'complete', step: 'draft', base_seq: await runSeq() })
    ok(await procedureRecord(root, { run: 'r1', request: 'q2' }))
    const listed = ok(await procedurePending(root, { run: 'r1' }))
    expect(listed.requests.map((r) => r.id)).toEqual(['q1', 'q2'])
    expect(listed.requests.map((r) => r.status)).toEqual(['pending', 'done'])
  })
})
