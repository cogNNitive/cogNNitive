import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { procedureRecord, procedureStart } from '../src/tools/procedure-record.js'

/**
 * The compact form of `procedure_record` (S8: fewer changesets per run). `complete` claims a
 * step that was not started, carries the step's artifacts and can close the run with `finish`,
 * all in the ONE atomic changeset the completion writes. The separate calls keep working.
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

const SPEC_CONTENT = '# Spec\n'
const SPEC_REV = createHash('sha256').update(SPEC_CONTENT).digest('hex')

let root: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-procedure-compact-')))
  cpSync(FIXTURE, root, { recursive: true })
  mkdirSync(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  writeFileSync(join(root, 'spec.md'), SPEC_CONTENT, 'utf-8')
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

/** Every file of the domain except the tool cache, for "writes nothing" checks. */
async function snapshot(dir = root, base = ''): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name
    if (rel === '.cache') continue
    if (e.isDirectory()) Object.assign(out, await snapshot(join(dir, e.name), rel))
    else out[rel] = await readFile(join(dir, e.name), 'utf-8')
  }
  return out
}

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

const start = (procedure: string, run: string) =>
  procedureStart(root, { procedure, params: { doc: 'spec' }, run, actor: 'ana' })

type State = {
  status: string
  currentStep: string | null
  steps: Record<string, Record<string, unknown>>
  artifacts: Record<string, Record<string, unknown>>
}
const stateOf = (r: Result): State => r['state'] as State

describe('procedure_record compact form', SLOW, () => {
  it('complete claims a step that was not started, in the same changeset', async () => {
    ok(await start('review', 'c1'))
    const before = (await changesets()).length
    const done = ok(await procedureRecord(root, { run: 'c1', action: 'complete', actor: 'bot' }))
    expect(stateOf(done).steps['draft']).toMatchObject({ status: 'done', attempt: 1 })
    expect(stateOf(done).currentStep).toBe('review')
    // The claim facts a `start` writes are on the row.
    expect(await stepField('c1', 'draft', 'holder')).toBe('agent')
    expect(await stepField('c1', 'draft', 'claimed_at')).toMatch(/^\d{4}-\d\d-\d\dT/)
    // The frozen input revs, stored as a start stores them (a JSON string).
    expect(await stepField('c1', 'draft', 'inputs')).toBe('"{}"')
    expect((await changesets()).length).toBe(before + 1)
  })

  it('an implicit claim follows the start rules: a paused run refuses and writes nothing', async () => {
    ok(await start('review', 'c1'))
    ok(await procedureRecord(root, { run: 'c1', action: 'pause' }))
    const before = await snapshot()
    expect(await procedureRecord(root, { run: 'c1', action: 'complete' })).toMatchObject({
      ok: false,
      code: 'RUN_PAUSED',
    })
    expect(await snapshot()).toEqual(before)
  })

  it('wait still needs a started step', async () => {
    ok(await start('review', 'c1'))
    const before = await snapshot()
    expect(
      await procedureRecord(root, { run: 'c1', action: 'wait', value: 'human' }),
    ).toMatchObject({ ok: false, code: 'STEP_NOT_STARTED' })
    expect(await snapshot()).toEqual(before)
  })

  it('complete records its artifacts in the same changeset, before the output gate', async () => {
    ok(await start('gated', 'g1'))
    const before = (await changesets()).length
    const done = ok(
      await procedureRecord(root, {
        run: 'g1',
        action: 'complete',
        artifacts: [{ fact: 'validated', field: 'draft-doc', value: 'spec.md', rev: SPEC_REV }],
      }),
    )
    expect(stateOf(done).steps['draft']).toMatchObject({ status: 'done', attempt: 1 })
    expect(stateOf(done).artifacts['draft-doc']).toMatchObject({ status: 'validated' })
    expect(stateOf(done).currentStep).toBe('review')
    expect((await changesets()).length).toBe(before + 1)
  })

  it('complete without the required artifact still refuses, and the claim is not written', async () => {
    ok(await start('gated', 'g1'))
    const before = await snapshot()
    expect(await procedureRecord(root, { run: 'g1', action: 'complete' })).toMatchObject({
      ok: false,
      code: 'MISSING_OUTPUT',
    })
    expect(await snapshot()).toEqual(before)
  })

  it('an invalid artifact refuses the whole completion and writes nothing', async () => {
    ok(await start('gated', 'g1'))
    const before = await snapshot()
    expect(
      await procedureRecord(root, {
        run: 'g1',
        action: 'complete',
        artifacts: [
          { fact: 'validated', field: 'draft-doc', rev: SPEC_REV },
          { fact: 'validated', field: 'no-such-artifact' },
        ],
      }),
    ).toMatchObject({ ok: false, code: 'UNKNOWN_ARTIFACT' })
    expect(
      await procedureRecord(root, {
        run: 'g1',
        action: 'complete',
        artifacts: [{ fact: 'shipped', field: 'draft-doc' }],
      }),
    ).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    expect(
      await procedureRecord(root, { run: 'g1', action: 'complete', artifacts: 'draft-doc' }),
    ).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    expect(await snapshot()).toEqual(before)
  })

  it('artifacts and finish travel only with complete', async () => {
    ok(await start('review', 'c1'))
    const before = await snapshot()
    expect(
      await procedureRecord(root, {
        run: 'c1',
        action: 'start',
        artifacts: [{ fact: 'validated', field: 'draft-doc' }],
      }),
    ).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    expect(
      await procedureRecord(root, { run: 'c1', action: 'start', finish: 'completed' }),
    ).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    expect(await snapshot()).toEqual(before)
  })

  it('finish rides on the last complete and closes the run in the same changeset', async () => {
    ok(await start('review', 'c1'))
    ok(await procedureRecord(root, { run: 'c1', action: 'complete' }))
    ok(await procedureRecord(root, { run: 'c1', action: 'complete', outcome: 'approve' }))
    const before = (await changesets()).length
    const closed = ok(
      await procedureRecord(root, { run: 'c1', action: 'complete', finish: 'completed' }),
    )
    expect(closed['closed']).toBe(true)
    expect(stateOf(closed)).toMatchObject({ status: 'completed', currentStep: null })
    expect(stateOf(closed).steps['publish']).toMatchObject({ status: 'done', attempt: 1 })
    expect((await changesets()).length).toBe(before + 1)
  })

  it('finish: true means completed, and failed closes the run as failed', async () => {
    ok(await start('review', 'c1'))
    ok(await procedureRecord(root, { run: 'c1', action: 'complete' }))
    ok(await procedureRecord(root, { run: 'c1', action: 'complete', outcome: 'approve' }))
    const closed = ok(await procedureRecord(root, { run: 'c1', action: 'complete', finish: true }))
    expect(stateOf(closed)).toMatchObject({ status: 'completed' })

    ok(await start('review', 'c2'))
    const failed = ok(
      await procedureRecord(root, { run: 'c2', action: 'complete', finish: 'failed' }),
    )
    expect(failed['closed']).toBe(true)
    expect(stateOf(failed)).toMatchObject({ status: 'failed' })
  })

  it('finish on a completion that leaves the run open refuses and writes nothing', async () => {
    ok(await start('review', 'c1'))
    const before = await snapshot()
    expect(
      await procedureRecord(root, { run: 'c1', action: 'complete', finish: 'completed' }),
    ).toMatchObject({ ok: false, code: 'CANNOT_COMPLETE' })
    expect(
      await procedureRecord(root, { run: 'c1', action: 'complete', finish: 'done' }),
    ).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    expect(await snapshot()).toEqual(before)
  })

  it('a compact review run takes four changesets', async () => {
    ok(await start('review', 'c1'))
    ok(
      await procedureRecord(root, {
        run: 'c1',
        action: 'complete',
        artifacts: [{ fact: 'validated', field: 'draft-doc', value: 'spec.md', rev: SPEC_REV }],
      }),
    )
    ok(await procedureRecord(root, { run: 'c1', action: 'complete', outcome: 'approve' }))
    const closed = ok(
      await procedureRecord(root, { run: 'c1', action: 'complete', finish: 'completed' }),
    )
    expect(stateOf(closed)).toMatchObject({ status: 'completed' })
    expect(await changesets()).toHaveLength(4)
  })

  it('the full sequence still takes ten changesets and ends in the same run state', async () => {
    ok(await start('review', 'full'))
    ok(await procedureRecord(root, { run: 'full', action: 'start' }))
    ok(
      await procedureRecord(root, {
        run: 'full',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        value: 'spec.md',
        rev: SPEC_REV,
      }),
    )
    ok(await procedureRecord(root, { run: 'full', action: 'complete' }))
    ok(await procedureRecord(root, { run: 'full', action: 'start' }))
    ok(await procedureRecord(root, { run: 'full', action: 'wait', value: 'human' }))
    ok(await procedureRecord(root, { run: 'full', action: 'complete', outcome: 'approve' }))
    ok(await procedureRecord(root, { run: 'full', action: 'start' }))
    ok(await procedureRecord(root, { run: 'full', action: 'complete' }))
    const full = ok(await procedureRecord(root, { run: 'full', action: 'finish' }))
    expect(await changesets()).toHaveLength(10)

    // The compact run that also waits on the human decision: start + wait stay two calls.
    ok(await start('review', 'compact'))
    ok(
      await procedureRecord(root, {
        run: 'compact',
        action: 'complete',
        artifacts: [{ fact: 'validated', field: 'draft-doc', value: 'spec.md', rev: SPEC_REV }],
      }),
    )
    ok(await procedureRecord(root, { run: 'compact', action: 'start' }))
    ok(await procedureRecord(root, { run: 'compact', action: 'wait', value: 'human' }))
    ok(await procedureRecord(root, { run: 'compact', action: 'complete', outcome: 'approve' }))
    const compact = ok(
      await procedureRecord(root, { run: 'compact', action: 'complete', finish: 'completed' }),
    )
    expect(await changesets()).toHaveLength(16)

    const settled = (r: Result) => {
      const s = stateOf(r)
      return {
        status: s.status,
        currentStep: s.currentStep,
        steps: Object.fromEntries(
          Object.entries(s.steps).map(([k, v]) => [
            k,
            { status: v['status'], attempt: v['attempt'], outcome: v['outcome'], next: v['next'] },
          ]),
        ),
        artifacts: s.artifacts,
      }
    }
    expect(settled(compact)).toEqual(settled(full))
    expect(compact['closed']).toBe(true)
  })
})
