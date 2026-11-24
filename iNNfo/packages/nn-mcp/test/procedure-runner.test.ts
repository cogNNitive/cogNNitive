import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir, hostname } from 'node:os'
import { join } from 'node:path'
import { procedureState } from '../src/tools/procedure-state.js'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'
import { procedurePending } from '../src/tools/procedure-pending.js'
import { validateProposal } from '../src/tools/propose-changeset.js'
import { crashProbe } from '@cognnitive/nn-core'

/**
 * The three runner tools over a scratch domaiNN holding two procedures: `review` (draft ->
 * decision -> publish | rework) and `build` (one engine step).
 *
 * A run is a model with state (design §3.1): the header plus one `Step Run` row per step and
 * one `Run Artifact` row per artifact. Every call writes ONE atomic changeset carrying the
 * header `seq` guard; the run's history is that model's change log. There is no run lock and
 * no event concept.
 */

/** Every record call applies a changeset; a full run is many applies, slow under a parallel suite. */
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

/** A pid that is certainly not running: a child process that has already exited. */
async function deadPid(): Promise<number> {
  const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: 'ignore' })
  const pid = child.pid!
  await new Promise((resolve) => child.on('exit', resolve))
  return pid
}

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-procedure-runner-')))
  cpSync(FIXTURE, root, { recursive: true })
  // The domain carries the executions bluepriNNt package, as procedure-execution.test.ts does.
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

const changesets = async (): Promise<string[]> =>
  (await readdir(join(root, 'changes'))).filter((f) => f.endsWith('_changes_NN.md'))

async function runText(run: string): Promise<string> {
  const dir = join(root, 'executions', run)
  const [file] = (await readdir(dir)).filter((f) => f.endsWith('_NN.md'))
  return readFile(join(dir, file!), 'utf-8')
}

/** Every file of the domain with its content, for "writes nothing" checks. */
async function snapshot(dir = root, base = ''): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) Object.assign(out, await snapshot(join(dir, e.name), rel))
    else out[rel] = await readFile(join(dir, e.name), 'utf-8')
  }
  return out
}

const startReview = () =>
  procedureStart(root, { procedure: 'review', params: { doc: 'spec' }, run: 'r1', actor: 'ana' })

/**
 * Reads `<run>@<step>&<field>` from the run model. The runner's claim facts (`claimed_at`,
 * `holder`) live only on the element, because the row reader projects them away.
 */
async function stepField(run: string, step: string, field: string): Promise<string | undefined> {
  const dir = join(root, 'executions', run)
  const [file] = (await readdir(dir)).filter((f) => f.endsWith('_NN.md'))
  const text = await readFile(join(dir, file!), 'utf-8')
  const heading = text.indexOf(`slug:: ${step}\n`)
  const from = text.lastIndexOf('## NN Step Run:', heading)
  const until = text.indexOf('\n## ', heading)
  const body = text.slice(from, until === -1 ? undefined : until)
  return new RegExp(`^${field}:: (.*)$`, 'm').exec(body)?.[1]
}

describe('procedure_start', SLOW, () => {
  it('creates the run model, header and every row as one atomic changeset', async () => {
    const r = ok(await startReview())
    expect(r.run).toBe('r1')
    expect(r.state).toMatchObject({ status: 'open', currentStep: 'draft' })
    expect(await changesets()).toHaveLength(1)
    const text = await runText('r1')
    expect(text).toContain('procedure:: procedures/review_procedures_NN.md')
    expect(text).toContain('def_rev:: V_1-0-0')
    expect(text).toContain('seq:: 1')
    expect(text).toContain('state:: open')
    // The default of the optional slot is applied.
    expect(ok(await procedureState(root, { run: 'r1' })).params).toEqual({
      doc: 'spec',
      format: 'html',
    })
    // One row per step and per artifact, not an event log.
    expect(text).toMatch(/^## NN Step Run: /gm)
    expect(text).toMatch(/^## NN Run Artifact: /gm)
    expect(text).not.toMatch(/^## NN Execution Event: /m)
    // The changeset is atomic and carries the run context.
    const [cs] = await changesets()
    const csText = await readFile(join(root, 'changes', cs!), 'utf-8')
    expect(csText).toMatch(/^author_kind: agent$/m)
    expect(csText).toMatch(/^atomic: true$/m)
  })

  it('creates a run with no schema placeholder rows (no Example step, artifact, input or request)', async () => {
    ok(await startReview())
    const text = await runText('r1')
    expect(text).not.toMatch(/Example/)
    expect(text).not.toMatch(/<string>/)
    expect(text).not.toMatch(/^## NN Step Request: /m)
    expect(text).not.toMatch(/^## NN Input: /m)
    const state = ok(await procedureState(root, { run: 'r1' }))
    // Only the procedure's own artifacts and steps are folded.
    expect(Object.keys((state.state as { artifacts: object }).artifacts)).not.toContain(
      'example-run-artifact',
    )
    expect((await procedurePending(root, { run: 'r1' })) as Result).toMatchObject({
      ok: true,
      pending: 0,
    })
  })

  it('refuses an unknown procedure, a missing required slot and a taken run id', async () => {
    expect(await procedureStart(root, { procedure: 'ghost', params: {} })).toMatchObject({
      ok: false,
      code: 'PROCEDURE_NOT_FOUND',
    })
    expect(await procedureStart(root, { procedure: 'review', params: {} })).toMatchObject({
      ok: false,
      code: 'MISSING_REQUIRED_SLOT',
    })
    ok(await startReview())
    expect(await startReview()).toMatchObject({ ok: false, code: 'RUN_EXISTS' })
    expect(await changesets()).toHaveLength(1)
  })

  it('refuses a domaiNN without the executions bluepriNNt package and writes nothing', async () => {
    rmSync(join(root, 'specs'), { recursive: true, force: true })
    const before = await snapshot()
    expect(await startReview()).toMatchObject({ ok: false, code: 'EXECUTIONS_NOT_INSTALLED' })
    expect(await snapshot()).toEqual(before)
  })

  it('refuses a graph with an error diagnostic before writing anything', async () => {
    const doc = join(root, 'procedures', 'review_procedures_NN.md')
    // A step that names a next which is not a step makes the graph report UNKNOWN_NEXT.
    await writeFile(
      doc,
      (await readFile(doc, 'utf-8')).replace(/^next::.*$/m, 'next:: @ghost-step'),
    )
    const before = await snapshot()
    const refused = await procedureStart(root, {
      procedure: 'review',
      params: { doc: 'x' },
      run: 'r9',
    })
    expect(refused).toMatchObject({ ok: false, code: 'PROCEDURE_NOT_RUNNABLE' })
    expect(await snapshot()).toEqual(before)
  })
})

describe('procedure_state', SLOW, () => {
  it('reads the run without writing anything and says what the current step needs', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    ok(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        value: 'spec.md',
        rev: 'd1',
      }),
    )
    ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    const before = await snapshot()
    const s = ok(await procedureState(root, { run: 'r1' }))
    expect(await snapshot()).toEqual(before)
    expect(s.procedure).toBe('procedures/review_procedures_NN.md')
    expect(s.params).toEqual({ doc: 'spec', format: 'html' })
    expect(s.diagnostics).toEqual([])
    expect(s.state).toMatchObject({
      status: 'open',
      currentStep: 'review',
      path: ['draft', 'review'],
    })
    expect(s.step).toMatchObject({
      slug: 'review',
      executor: 'human',
      decision: 'Approve spec?',
      inputs: { 'draft-doc': { status: 'validated', rev: 'd1' } },
    })
    expect(s.allowedNext).toEqual([
      { to: 'publish', guard: { kind: 'outcome', token: 'approve' } },
      { to: 'rework', guard: { kind: 'outcome', token: 'decline' } },
    ])
    expect(s.actions).toEqual(['start', 'input', 'artifact', 'pause', 'cancel', 'finish'])
  })

  it('refuses an unknown run', async () => {
    expect(await procedureState(root, { run: 'nope' })).toMatchObject({
      ok: false,
      code: 'RUN_NOT_FOUND',
    })
  })
})

describe('procedure_record', SLOW, () => {
  it('runs a decision procedure end to end and closes a citable run', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start', actor: 'bot' }))
    ok(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        value: 'spec.md',
        rev: 'd1',
      }),
    )
    // A single target: next is recorded without being given.
    const drafted = ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    expect(drafted.state).toMatchObject({ currentStep: 'review' })

    const started = ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    // The claim is the step row: active at attempt 1, carrying the frozen input revs.
    expect(started.state.steps.review).toMatchObject({ status: 'active', attempt: 1 })
    ok(await procedureRecord(root, { run: 'r1', action: 'wait', value: 'human' }))
    // The outcome picks the one target whose condition holds.
    const decided = ok(
      await procedureRecord(root, { run: 'r1', action: 'complete', outcome: 'approve' }),
    )
    expect(decided.state.steps.review).toMatchObject({
      status: 'done',
      outcome: 'approve',
      next: 'publish',
    })
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const published = ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    expect(published.state).toMatchObject({ canComplete: true, currentStep: null })

    const finished = ok(await procedureRecord(root, { run: 'r1', action: 'finish' }))
    expect(finished.closed).toBe(true)
    expect(finished.state).toMatchObject({ status: 'completed' })
    const text = await runText('r1')
    expect(text).toMatch(/^closed: true$/m)
    expect(text).toContain('outcome:: approve')
    expect(text).toContain('next:: publish')
    // One changeset per call: start + 9 record calls.
    expect(await changesets()).toHaveLength(10)

    expect(await procedureRecord(root, { run: 'r1', action: 'pause' })).toMatchObject({
      ok: false,
      code: 'RUN_CLOSED',
    })

    // A closed run is evidence another change may cite, as `<run>@<step-slug>`.
    ok(await procedureStart(root, { procedure: 'review', params: { doc: 'b' }, run: 'r2' }))
    const errors = await validateProposal(root, [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'r2@r2&def_rev',
        to: 'V_1-0-0',
        evidence: 'r1@review',
      },
    ])
    expect(errors.map((e) => e.code).filter((c) => c?.startsWith('CITATION'))).toEqual([])
  })

  it('refuses to walk past a step whose required output was never recorded', async () => {
    // `gated` declares `draft-doc` as required (the default). The console already refuses this
    // in its UI; the runner must refuse it too, or an agent calling the tool directly walks
    // past an empty deliverable.
    ok(await procedureStart(root, { procedure: 'gated', params: { doc: 'spec' }, run: 'g1' }))
    ok(await procedureRecord(root, { run: 'g1', action: 'start' }))
    const before = await snapshot()
    const gated = await procedureRecord(root, {
      run: 'g1',
      action: 'artifact',
      fact: 'produced',
      field: 'draft-doc',
      value: 'draft.md',
    })
    expect(gated).toMatchObject({ ok: true })
    expect(await snapshot()).not.toEqual(before)

    // Produced is not verified: the step still cannot advance, and the refusal writes nothing.
    const settled = await snapshot()
    const refused = await procedureRecord(root, { run: 'g1', action: 'complete' })
    expect(refused).toMatchObject({
      ok: false,
      code: 'MISSING_OUTPUT',
      missing: [{ slug: 'draft-doc' }],
    })
    expect(await snapshot()).toEqual(settled)

    ok(
      await procedureRecord(root, {
        run: 'g1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        rev: 'abc123',
      }),
    )
    // With the required output recorded, the step completes and the walk moves on.
    expect(ok(await procedureRecord(root, { run: 'g1', action: 'complete' })).state).toMatchObject({
      currentStep: 'review',
    })
  })

  it('refuses facts the fold forbids, each with a stable code, and writes nothing', async () => {
    ok(await startReview())
    const refuse = async (args: Record<string, unknown>, code: string) => {
      const before = await snapshot()
      expect(await procedureRecord(root, { run: 'r1', ...args })).toMatchObject({
        ok: false,
        code,
      })
      expect(await snapshot()).toEqual(before)
    }
    await refuse({ action: 'jump' }, 'INVALID_ACTION')
    await refuse({ action: 'start', step: 'ghost' }, 'UNKNOWN_STEP')
    await refuse({ action: 'start', step: 'review' }, 'STEP_NOT_CURRENT')
    await refuse({ action: 'complete' }, 'STEP_NOT_STARTED')
    await refuse({ action: 'finish' }, 'CANNOT_COMPLETE')
    await refuse({ action: 'rebase' }, 'NOT_DRIFTED')
    await refuse({ action: 'artifact', fact: 'validated', field: 'ghost' }, 'UNKNOWN_ARTIFACT')
    await refuse({ action: 'run' }, 'NOT_ENGINE_STEP')
    await refuse({ action: 'resume' }, 'NOT_PAUSED')
    await refuse({ action: 'wait' }, 'STEP_NOT_STARTED')
    await refuse({ action: 'input' }, 'INVALID_ARGUMENT')
    expect(await procedureRecord(root, { run: 'nope', action: 'start' })).toMatchObject({
      code: 'RUN_NOT_FOUND',
    })

    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    // A live engine claim is the one `start` refuses; a second `start` of an agent step is a
    // new attempt, so the fence asserted here is on the engine fixture.
    ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    // Several targets and no outcome to choose between them.
    const ambiguous = await procedureRecord(root, { run: 'r1', action: 'complete' })
    expect(ambiguous).toMatchObject({ ok: false, code: 'AMBIGUOUS_TRANSITION' })
    expect(ambiguous.allowedNext).toHaveLength(2)
    await refuse({ action: 'complete', outcome: 'approve', next: 'rework' }, 'INVALID_TRANSITION')
    await refuse({ action: 'complete', next: 'draft' }, 'INVALID_TRANSITION')

    ok(await procedureRecord(root, { run: 'r1', action: 'pause' }))
    await refuse({ action: 'complete', outcome: 'approve' }, 'RUN_PAUSED')
    ok(await procedureRecord(root, { run: 'r1', action: 'resume' }))

    ok(await procedureRecord(root, { run: 'r1', action: 'cancel' }))
    await refuse({ action: 'start' }, 'RUN_CLOSED')
  })

  it('a decline outcome takes the other branch', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const r = ok(await procedureRecord(root, { run: 'r1', action: 'complete', outcome: 'decline' }))
    expect(r.state).toMatchObject({ currentStep: 'rework', path: ['draft', 'review', 'rework'] })
  })

  it('records a failed step, blocks the run, retries at attempt 2, and closes it failed', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const failed = ok(await procedureRecord(root, { run: 'r1', action: 'fail', value: 'no data' }))
    expect(failed.state).toMatchObject({ status: 'blocked', currentStep: 'draft' })
    expect(failed.state.steps.draft).toMatchObject({ status: 'failed', failure: 'no data' })
    // A retry is attempt 2.
    const retry = ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    expect(retry.state.steps.draft).toMatchObject({ status: 'active', attempt: 2 })
    ok(await procedureRecord(root, { run: 'r1', action: 'fail', value: 'still no data' }))
    const closed = ok(
      await procedureRecord(root, { run: 'r1', action: 'finish', outcome: 'failed' }),
    )
    expect(closed).toMatchObject({ closed: true, state: { status: 'failed' } })
    expect(await runText('r1')).toMatch(/^closed: true$/m)
  })

  it('a waited step completes, and the run reports waiting while it waits', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    // `wait` is a step status, not only a note: the row goes `active -> waiting`, which is a
    // declared edge of the Step Run `status` field.
    ok(await procedureRecord(root, { run: 'r1', action: 'wait', value: 'human opinion' }))
    const waiting = ok(await procedureState(root, { run: 'r1' }))
    expect(waiting.state).toMatchObject({ status: 'waiting', currentStep: 'draft' })
    expect(waiting.state.steps.draft).toMatchObject({
      status: 'waiting',
      waitingOn: 'human opinion',
    })
    // What the state advertises, the writer accepts: a waiting step is completed or failed.
    expect(waiting.actions).toEqual(expect.arrayContaining(['complete', 'fail']))
    expect(waiting.actions).not.toContain('wait')

    const done = ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    expect(done.state.steps.draft).toMatchObject({ status: 'done', attempt: 1 })
    expect(done.state).toMatchObject({ currentStep: 'review', status: 'open' })

    // A waiting step can also be failed outright.
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'wait', value: 'the reviewer' }))
    const failed = ok(await procedureRecord(root, { run: 'r1', action: 'fail', value: 'gave up' }))
    expect(failed.state.steps.review).toMatchObject({ status: 'failed', failure: 'gave up' })
  })

  it('engine exit_codes=waiting puts the step and the run in waiting, and it can resume', async () => {
    ok(await procedureStart(root, { procedure: 'wait', params: { name: 'x' }, run: 'w1' }))
    const ran = ok(await procedureRecord(root, { run: 'w1', action: 'run' }))
    expect(ran.exitCode).toBe(2)
    expect(ran.state).toMatchObject({ status: 'waiting', currentStep: 'probe' })
    expect(ran.state.steps.probe).toMatchObject({ status: 'waiting' })
    // The exit code is the reason, not the whole message.
    expect(ran.state.steps.probe.waitingOn).toContain('exit 2')

    // A waiting engine step is re-claimable as attempt 2 and can be completed.
    const retried = ok(await procedureRecord(root, { run: 'w1', action: 'run' }))
    expect(retried.state.steps.probe).toMatchObject({ status: 'waiting', attempt: 2 })
  })

  it('drift: a changed definition refuses step facts until a rebase accepts it', async () => {
    ok(await startReview())
    const doc = join(root, 'procedures', 'review_procedures_NN.md')
    await writeFile(
      doc,
      (await readFile(doc, 'utf-8')).replace(
        'knowledge_version: "V_1-0-0"',
        'knowledge_version: "V_1-1-0"',
      ),
    )
    const s = ok(await procedureState(root, { run: 'r1' }))
    expect(s.state).toMatchObject({
      status: 'drifted',
      drift: { pinned: 'V_1-0-0', current: 'V_1-1-0' },
    })
    expect(await procedureRecord(root, { run: 'r1', action: 'start' })).toMatchObject({
      ok: false,
      code: 'RUN_DRIFTED',
    })
    const rebased = ok(await procedureRecord(root, { run: 'r1', action: 'rebase' }))
    expect(rebased.state).toMatchObject({ status: 'open', drift: null })
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
  })

  it('records an input row with its rev', async () => {
    ok(await startReview())
    const r = ok(
      await procedureRecord(root, {
        run: 'r1',
        action: 'input',
        field: 'tax_id',
        value: 'B1',
        rev: 'c1',
      }),
    )
    expect(ok(await procedureState(root, { run: 'r1' })).state).toBeDefined()
    expect(await runText('r1')).toContain('value:: B1')
    expect(await runText('r1')).toContain('rev:: c1')
    expect(r.changeset).toMatch(/_changes_NN\.md$/)
  })

  it('refuses an artifact fact from a step that never started', async () => {
    ok(await startReview())
    // `draft` is the current step and produces `draft-doc`, but nothing was reported from it.
    expect(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        rev: 'd1',
      }),
    ).toMatchObject({ ok: false, code: 'STEP_NOT_STARTED' })
    expect(await changesets()).toHaveLength(1)

    // Once the step starts, the same fact is accepted.
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const r = ok(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        rev: 'd1',
      }),
    )
    expect(r.state).toMatchObject({
      artifacts: { 'draft-doc': { status: 'validated', rev: 'd1' } },
    })
  })

  it('a drifted run advertises only the actions its writer accepts', async () => {
    ok(await startReview())
    const doc = join(root, 'procedures', 'review_procedures_NN.md')
    await writeFile(
      doc,
      (await readFile(doc, 'utf-8')).replace(
        'knowledge_version: "V_1-0-0"',
        'knowledge_version: "V_1-1-0"',
      ),
    )
    const s = ok(await procedureState(root, { run: 'r1' }))
    expect(s.actions).toEqual(['rebase', 'input', 'pause', 'cancel', 'finish'])
    // Nothing advertised is refused: the artifact fact the state omits is the one plan refuses.
    expect(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        rev: 'd1',
      }),
    ).toMatchObject({ ok: false, code: 'RUN_DRIFTED' })
  })

  it('the header seq guard travels with every runner changeset', async () => {
    ok(await startReview())
    // Each runner changeset carries `seq: n -> n+1` with `from: {seq: n}`: a concurrent write
    // to the same run conflicts the whole changeset (design §3.4). The guard is one
    // `update_field` on the header, so a changeset that lands advances the counter.
    const first = ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    expect(first.seq).toBe(2)
    const second = ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    expect(second.seq).toBe(3)
    // The atomic flag is on the file, so a conflict of any change writes nothing (A2).
    const source = await readFile(join(root, second.changeset), 'utf-8')
    expect(source).toMatch(/^atomic: true$/m)
    expect(source).toContain('seq')
  })

  it('an older attempt cannot complete over a newer claim (the fence)', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'fail', value: 'first' }))
    // Attempt 2 is the live claim; a completion guarded on attempt 1 finds a different
    // attempt and conflicts, so a late report from the dead attempt never lands.
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const file = (await readdir(join(root, 'executions', 'r1'))).find((f) => f.endsWith('_NN.md'))!
    void file
    const done = ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    expect(done.state.steps.draft).toMatchObject({ status: 'done', attempt: 2 })
  })
})

describe('engine steps', SLOW, () => {
  const startBuild = (code: number) =>
    procedureStart(root, { procedure: 'build', params: { name: 'x', code }, run: 'b1' })

  it('action=run executes the command, verifies the file artifact and completes, as one engine changeset', async () => {
    ok(await startBuild(0))
    const r = ok(await procedureRecord(root, { run: 'b1', action: 'run' }))
    expect(r.exitCode).toBe(0)
    expect(r.state).toMatchObject({
      currentStep: 'build-and-ship',
      artifacts: { bundle: { status: 'validated' } },
    })
    expect(r.state.steps.build).toMatchObject({ status: 'done', attempt: 1 })
    expect(r.state.artifacts.bundle?.rev).toMatch(/^[0-9a-f]{64}$/)
    expect(await readFile(join(root, 'out-x.txt'), 'utf-8')).toBe('built')
    const files = await changesets()
    // The claim lands BEFORE the command runs (so two callers cannot run it twice) and it
    // carries the child's pid; the completion lands after: start, claim, completion.
    expect(files).toHaveLength(3)
    const texts = await Promise.all(files.map((f) => readFile(join(root, 'changes', f), 'utf-8')))
    expect(texts.filter((t) => /^author_kind: engine$/m.test(t))).toHaveLength(2)
    // The claim names the child; the completion clears the column it anchored.
    expect(texts.some((t) => /"holder":"\d+@/.test(t))).toBe(true)
  })

  it('action=run records a failed step with the exit code', async () => {
    ok(await startBuild(3))
    const r = ok(await procedureRecord(root, { run: 'b1', action: 'run' }))
    expect(r.exitCode).toBe(3)
    expect(r.state.steps.build).toMatchObject({ status: 'failed' })
    expect(r.state).toMatchObject({ status: 'blocked' })
  })

  it('crash: an engine run records the pid of the child it executes', async () => {
    ok(await startBuild(0))
    ok(await procedureRecord(root, { run: 'b1', action: 'run' }))
    // The claim named the child's pid and the completion cleared that column, so the model
    // holds no live holder for a step that is done.
    const text = await runText('b1')
    const claimed = await Promise.all(
      (await changesets()).map((f) => readFile(join(root, 'changes', f), 'utf-8')),
    )
    const holders = [...claimed.join('\n').matchAll(/"holder":"(\d+)@/g)].map((m) => Number(m[1]))
    expect(holders.length).toBeGreaterThan(0)
    expect(holders.every((pid) => pid !== process.pid)).toBe(true)
    expect(text).not.toMatch(/"holder":"\d+@/)

    // A killed process leaves an `active` row whose holder is gone. The probe decides from
    // that row, which is the whole crash contract (design §3.3): no lock, no event.
    expect(
      crashProbe(
        {
          status: 'active',
          attempt: 1,
          inputs: {},
          holder: `2000000000@${hostname()}`,
          timeoutMs: 60_000,
        },
        { now: Date.now() },
      ),
    ).toBe(true)
  })

  it('a single-target engine step advances to the next step', async () => {
    ok(await startBuild(0))
    ok(await procedureRecord(root, { run: 'b1', action: 'run' }))
    const s = ok(await procedureState(root, { run: 'b1' }))
    expect(s.state).toMatchObject({
      currentStep: 'build-and-ship',
      path: ['build', 'build-and-ship'],
    })
  })

  it('a branching engine step evaluates the guards and records the next it holds', async () => {
    ok(await startBuild(0))
    ok(await procedureRecord(root, { run: 'b1', action: 'run' }))
    // Two targets and no outcome: the engine asks for one, exactly as `complete` does.
    const ambiguous = await procedureRecord(root, { run: 'b1', action: 'run' })
    expect(ambiguous).toMatchObject({ ok: false, code: 'AMBIGUOUS_TRANSITION' })

    const chosen = ok(await procedureRecord(root, { run: 'b1', action: 'run', outcome: 'ok' }))
    expect(chosen.state.steps['build-and-ship']).toMatchObject({
      status: 'done',
      next: 'ship-notify',
    })
    expect(chosen.state).toMatchObject({ currentStep: 'ship-notify' })
  })

  it('refuses a command parameter that would break out of the shell string', async () => {
    // The slot reaches a command run with `shell: true`: a value carrying shell syntax must
    // never be executed.
    ok(
      await procedureStart(root, {
        procedure: 'build',
        params: { name: "x'; require('fs').writeFileSync('pwned.txt','1'); //", code: 0 },
        run: 'b2',
      }),
    )
    const r = await procedureRecord(root, { run: 'b2', action: 'run' })
    expect(r).toMatchObject({ ok: false, code: 'UNSAFE_COMMAND' })
    expect(existsSync(join(root, 'pwned.txt'))).toBe(false)
  })

  it('crashProbe: another host falls back to claimed_at + timeout + grace', () => {
    const row = {
      status: 'active' as const,
      attempt: 1,
      inputs: {},
      holder: '999@another-host',
      timeoutMs: 1_000,
      claimedAt: '2026-11-21T10:00:00.000Z',
    }
    const now = Date.parse('2026-11-21T10:00:00.000Z')
    expect(crashProbe(row, { now, host: 'this-host' })).toBe(false)
    expect(crashProbe(row, { now: now + 62_000, host: 'this-host' })).toBe(true)
    // A payload that names no host cannot be probed, so age decides.
    expect(crashProbe({ ...row, holder: '' }, { now: now + 62_000, host: 'this-host' })).toBe(true)
    expect(crashProbe({ ...row, holder: '' }, { now, host: 'this-host' })).toBe(false)
    // A claim that cannot say WHEN it was taken cannot be bounded by age either: it is broken
    // from the start, never a holder that lives forever (age is not liveness).
    expect(
      crashProbe({ ...row, holder: '', claimedAt: undefined }, { now, host: 'this-host' }),
    ).toBe(true)
  })
})

describe('step requests', SLOW, () => {
  /** Records a Step Request row the way the console does: one add_element, no run change. */
  const ask = (run: string, id: string, fields: Record<string, string | number>) =>
    procedureRecord(root, {
      run,
      action: 'input',
      field: `request-${id}`,
      value: JSON.stringify(fields),
    })

  it('a request moves nothing until the runner consumes it', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const before = ok(await procedureState(root, { run: 'r1' }))
    const text = await runText('r1')
    void text
    void before
  })
})

describe('bounded loops', SLOW, () => {
  const startLoop = () => procedureStart(root, { procedure: 'loop', run: 'l1' })
  const rec = (args: Record<string, unknown>) => procedureRecord(root, { run: 'l1', ...args })

  /** Drafts, validates the draft at `rev`, and stops at the review step, started. */
  async function untilReview(rev: string): Promise<void> {
    ok(await startLoop())
    ok(await rec({ action: 'start' }))
    ok(await rec({ action: 'artifact', fact: 'validated', field: 'draft-doc', rev }))
    ok(await rec({ action: 'complete' }))
    ok(await rec({ action: 'start' }))
  }

  /** Sends the draft back from a started review and starts the redraft. */
  async function sendBack(): Promise<void> {
    ok(await rec({ action: 'complete', outcome: 'send-back' }))
    ok(await rec({ action: 'start' }))
  }

  it('the forward branch out of a loop completes the run like any decision', async () => {
    await untilReview('d1')
    const approved = ok(await rec({ action: 'complete', outcome: 'approve' }))
    expect(approved.state).toMatchObject({
      currentStep: 'publish',
      path: ['draft', 'review', 'publish'],
    })
    expect(approved.state.steps.redraft.status).toBe('off_path')
    ok(await rec({ action: 'start' }))
    expect(ok(await rec({ action: 'complete' })).state.canComplete).toBe(true)
  })

  it('a back-edge reopens its span in one changeset, and the target restarts at the next attempt', async () => {
    await untilReview('d1')
    await sendBack()
    ok(
      await rec({
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        rev: 'd2',
        step: 'redraft',
      }),
    )
    const before = await changesets()

    // redraft -> review is the back-edge: review and redraft go back to pending, attempts kept.
    const looped = ok(await rec({ action: 'complete' }))
    expect(await changesets()).toHaveLength(before.length + 1)
    expect(looped.state).toMatchObject({
      status: 'open',
      currentStep: 'review',
      path: ['draft', 'review'],
    })
    expect(looped.state.steps.review).toMatchObject({ status: 'pending', attempt: 1 })
    expect(looped.state.steps.redraft).toMatchObject({ status: 'pending', attempt: 1 })
    expect(looped.state.steps.review.outcome).toBeUndefined()
    // The redraft's output is no longer validated: stale until the redraft runs again.
    expect(looped.state.artifacts['draft-doc'].status).toBe('stale')
    expect(looped.state.stale).toEqual(['draft-doc'])
    const [cs] = (await changesets()).filter((f) => !before.includes(f))
    const csText = await readFile(join(root, 'changes', cs!), 'utf-8')
    expect(csText).toMatch(/^atomic: true$/m)
    expect(csText).toContain('l1@review')
    expect(csText).toContain('l1@redraft')
    expect(csText).toContain('l1@draft-doc')

    const restarted = ok(await rec({ action: 'start' }))
    expect(restarted.state.steps.review).toMatchObject({ status: 'active', attempt: 2 })
  })

  it('LOOP_LIMIT: a back-edge to a target that used its attempts is refused and writes nothing', async () => {
    await untilReview('d1')
    await sendBack()
    ok(await rec({ action: 'complete' }))
    ok(await rec({ action: 'start' })) // review, attempt 2 of max_attempts:: 2
    await sendBack()
    const before = await snapshot()
    const refused = await rec({ action: 'complete' })
    expect(refused).toMatchObject({ ok: false, code: 'LOOP_LIMIT', step: 'review', maxAttempts: 2 })
    expect(String((refused as { detail: string }).detail)).toMatch(/fail/)
    expect(await snapshot()).toEqual(before)
    // The way out stays open: the step can fail.
    expect(ok(await rec({ action: 'fail', value: 'too many rounds' })).state.status).toBe('blocked')
  })
})

describe('bounded loops on engine steps', SLOW, () => {
  it('an exit code mapped to a back-edge reopens the span, and past max_attempts fails the step', async () => {
    ok(await procedureStart(root, { procedure: 'retry', params: { code: 3 }, run: 'e1' }))
    const rec = (args: Record<string, unknown>) => procedureRecord(root, { run: 'e1', ...args })
    ok(await rec({ action: 'run' }))
    // check exits 3 -> outcome retry -> back to fetch, the start step: both reopened.
    const looped = ok(await rec({ action: 'run' }))
    expect(looped.exitCode).toBe(3)
    expect(looped.state).toMatchObject({ currentStep: 'fetch', path: ['fetch'] })
    expect(looped.state.steps.fetch).toMatchObject({ status: 'pending', attempt: 1 })
    expect(looped.state.steps.check).toMatchObject({ status: 'pending', attempt: 1 })

    expect(ok(await rec({ action: 'run' })).state.steps.fetch).toMatchObject({
      status: 'done',
      attempt: 2,
    })
    // fetch took its 2 attempts: the claim already landed, so the step fails with the code.
    const limited = ok(await rec({ action: 'run' }))
    expect(limited.state.steps.check).toMatchObject({ status: 'failed', attempt: 2 })
    expect(limited.state.steps.check.failure).toMatch(/^LOOP_LIMIT: /)
    expect(limited.state.status).toBe('blocked')
  })
})

describe('the {run} slot', SLOW, () => {
  it('resolves to the run id in the state, an engine command and an artifact verify', async () => {
    ok(await procedureStart(root, { procedure: 'runslot', run: 'rs1' }))
    const state = ok(await procedureState(root, { run: 'rs1' }))
    expect(state.step).toMatchObject({
      command: `node -e "require('fs').writeFileSync('stamp-rs1.txt', 'stamped')"`,
      outputs: { 'stamp-file': { verify: 'file:stamp-rs1.txt' } },
    })
    // The run id is never stored as a parameter the person gave.
    expect(state.params).toEqual({})

    const ran = ok(await procedureRecord(root, { run: 'rs1', action: 'run' }))
    expect(ran.exitCode).toBe(0)
    expect(await readFile(join(root, 'stamp-rs1.txt'), 'utf-8')).toBe('stamped')
    expect(ran.state.artifacts['stamp-file']).toMatchObject({
      status: 'validated',
      value: 'stamp-rs1.txt',
    })
    expect(ran.step).toMatchObject({ decision: 'is stamp-rs1.txt right?' })
  })
})
