import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { procedureState } from '../src/tools/procedure-state.js'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'
import { validateProposal } from '../src/tools/propose-changeset.js'

/**
 * The three runner tools over a scratch domaiNN holding two procedures: `review` (draft ->
 * decision -> publish | rework) and `build` (one engine step). Every write goes through a
 * synthesized changeset, one per call; `procedure_state` writes nothing.
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

describe('procedure_start', SLOW, () => {
  it('creates the run with its header and started event as one changeset', async () => {
    const r = ok(await startReview())
    expect(r.run).toBe('r1')
    expect(r.state).toMatchObject({ status: 'open', currentStep: 'draft' })
    expect(await changesets()).toHaveLength(1)
    const text = await runText('r1')
    expect(text).toContain('procedure:: procedures/review_procedures_NN.md')
    expect(text).toContain('def_rev:: V_1-0-0')
    // The default of the optional slot is applied; the engine stores the JSON as a quoted string.
    expect(text).toContain('params:: "{\\"doc\\":\\"spec\\",\\"format\\":\\"html\\"}"')
    expect(ok(await procedureState(root, { run: 'r1' })).params).toEqual({
      doc: 'spec',
      format: 'html',
    })
    expect(text).toContain('## NN Execution Event: e-001')
    expect(text).toContain('kind:: started')
    expect(text).toContain('actor:: ana')
    // The scaffold seeds no placeholder event: the log holds only what was recorded.
    expect(text).not.toContain('Example')
    expect(text.match(/^## NN Execution Event:/gm)).toHaveLength(1)
    const [cs] = await changesets()
    expect(await readFile(join(root, 'changes', cs!), 'utf-8')).toMatch(/^author_kind: agent$/m)
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
    expect(started.recorded).toEqual([
      { kind: 'step_started', step: 'review', attempt: 1, inputs: { 'draft-doc': 'd1' } },
    ])
    ok(await procedureRecord(root, { run: 'r1', action: 'wait', value: 'human' }))
    // The outcome picks the one target whose condition holds.
    const decided = ok(
      await procedureRecord(root, { run: 'r1', action: 'complete', outcome: 'approve' }),
    )
    expect(decided.recorded).toEqual([
      { kind: 'step_completed', step: 'review', outcome: 'approve', next: 'publish' },
    ])
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const published = ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
    expect(published.state).toMatchObject({ canComplete: true, currentStep: null })

    const finished = ok(await procedureRecord(root, { run: 'r1', action: 'finish' }))
    expect(finished.closed).toBe(true)
    expect(finished.state).toMatchObject({ status: 'completed' })
    const text = await runText('r1')
    expect(text).toMatch(/^closed: true$/m)
    expect(text).toContain('kind:: completed')
    expect(text).toContain('outcome:: approve')
    expect(text).toContain('inputs:: "{\\"draft-doc\\":\\"d1\\"}"')
    expect(text).toContain('## NN Execution Event: e-010')
    // One changeset per call: start + 9 record calls.
    expect(await changesets()).toHaveLength(10)

    expect(await procedureRecord(root, { run: 'r1', action: 'pause' })).toMatchObject({
      ok: false,
      code: 'RUN_CLOSED',
    })

    // A closed run is evidence another change may cite.
    ok(await procedureStart(root, { procedure: 'review', params: { doc: 'b' }, run: 'r2' }))
    const errors = await validateProposal(root, [
      {
        id: 'c-01',
        op: 'update_field',
        target: 'r2@r2&def_rev',
        to: 'V_1-0-0',
        evidence: 'r1@e-001',
      },
    ])
    expect(errors.map((e) => e.code).filter((c) => c?.startsWith('CITATION'))).toEqual([])
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
    await refuse({ action: 'start' }, 'STEP_ALREADY_STARTED')
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

  it('records a failed step, blocks the run, and closes it with a failed finish', async () => {
    ok(await startReview())
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    const failed = ok(await procedureRecord(root, { run: 'r1', action: 'fail', value: 'no data' }))
    expect(failed.state).toMatchObject({ status: 'blocked', currentStep: 'draft' })
    // A retry is attempt 2.
    const retry = ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    expect(retry.recorded).toMatchObject([{ kind: 'step_started', attempt: 2 }])
    ok(await procedureRecord(root, { run: 'r1', action: 'fail', value: 'still no data' }))
    const closed = ok(
      await procedureRecord(root, { run: 'r1', action: 'finish', outcome: 'failed' }),
    )
    expect(closed).toMatchObject({ closed: true, state: { status: 'failed' } })
    expect(await runText('r1')).toMatch(/^closed: true$/m)
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
    expect(rebased.recorded).toEqual([{ kind: 'rebased', value: 'V_1-1-0' }])
    expect(rebased.state).toMatchObject({ status: 'open', drift: null })
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
  })

  it('records an input with its rev', async () => {
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
    expect(r.state).toMatchObject({ inputs: { tax_id: { value: 'B1', rev: 'c1' } } })
    expect(await runText('r1')).toContain('kind:: input_recorded')
  })
})

describe('engine steps', SLOW, () => {
  const startBuild = (code: number) =>
    procedureStart(root, { procedure: 'build', params: { name: 'x', code }, run: 'b1' })

  it('action=run executes the command, verifies the file artifact and completes, as one engine changeset', async () => {
    ok(await startBuild(0))
    const r = ok(await procedureRecord(root, { run: 'b1', action: 'run' }))
    expect(r.exitCode).toBe(0)
    expect(r.recorded).toMatchObject([
      { kind: 'step_started', step: 'build', attempt: 1 },
      { kind: 'artifact_validated', step: 'build', field: 'bundle', value: 'out-x.txt' },
      { kind: 'step_completed', step: 'build' },
    ])
    const recorded = r.recorded as Array<{ rev?: string }>
    expect(recorded[1]!.rev).toMatch(/^[0-9a-f]{64}$/)
    expect(r.state).toMatchObject({
      canComplete: true,
      artifacts: { bundle: { status: 'validated' } },
    })
    expect(await readFile(join(root, 'out-x.txt'), 'utf-8')).toBe('built')
    const files = await changesets()
    expect(files).toHaveLength(2)
    const texts = await Promise.all(files.map((f) => readFile(join(root, 'changes', f), 'utf-8')))
    expect(texts.filter((t) => /^author_kind: engine$/m.test(t))).toHaveLength(1)
  })

  it('action=run records a failed step with the exit code', async () => {
    ok(await startBuild(3))
    const r = ok(await procedureRecord(root, { run: 'b1', action: 'run' }))
    expect(r.exitCode).toBe(3)
    expect(r.recorded).toMatchObject([
      { kind: 'step_started' },
      { kind: 'step_failed', step: 'build', value: 'exit 3' },
    ])
    expect(r.state).toMatchObject({ status: 'blocked' })
  })

  it('crash: an engine step started with no later event is a crash while the apply lock is free', async () => {
    ok(await startBuild(0))
    ok(await procedureRecord(root, { run: 'b1', action: 'start' }))
    const crashed = ok(await procedureState(root, { run: 'b1' }))
    expect(crashed).toMatchObject({ lockFree: true, state: { crashed: true, status: 'blocked' } })

    await writeFile(join(root, 'changes', '.lock'), '{}')
    const running = ok(await procedureState(root, { run: 'b1' }))
    expect(running).toMatchObject({ lockFree: false, state: { crashed: false, status: 'open' } })
  })
})
