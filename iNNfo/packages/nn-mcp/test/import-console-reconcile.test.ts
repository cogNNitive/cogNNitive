import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { dispatchTool } from '../src/server.js'

/**
 * Resuming one private run and reconciling repeated imports (T5 points 1 and 2). Every call
 * goes through the public MCP dispatcher and every console is a real export of the scratch
 * domaiNN, so these tests see what an agent and a recipient see: a saved HTML can be imported
 * again, in part again, or after the run moved on, and the run must end up as if each answer
 * had been imported exactly once.
 */

const SLOW = { timeout: 180_000 }
const REPO = join(import.meta.dirname!, '..', '..', '..', '..')
const FIXTURE = join(import.meta.dirname!, 'fixtures', 'procedure-runner')
const EXECUTIONS_SPEC = join(REPO, 'iNNfo', 'specs', 'bluepriNNts', 'executions', 'spec_NN.md')

const scratch: string[] = []
let root: string
let inbox: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-reconcile-')))
  scratch.push(root)
  cpSync(FIXTURE, root, { recursive: true })
  mkdirSync(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  inbox = realpathSync(mkdtempSync(join(tmpdir(), 'nn-reconcile-inbox-')))
  scratch.push(inbox)
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  process.env.INNFO_GLOBAL_DIR = join(root, '.global')
  process.env.INNFO_SKILLS_DIR = join(root, '.skills')
  process.env.INNFO_CONSOLE_NO_OPEN = '1'
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
})

afterEach(() => {
  delete process.env.INNFO_CACHE_DIR
  delete process.env.INNFO_GLOBAL_DIR
  delete process.env.INNFO_SKILLS_DIR
  delete process.env.INNFO_CONSOLE_NO_OPEN
  vi.restoreAllMocks()
  for (const d of scratch.splice(0)) rmSync(d, { recursive: true, force: true })
})

type Json = Record<string, any>

/** One public MCP call, parsed. Refusals come back as `{ ok: false, code }`. */
async function call(name: string, args: Json = {}): Promise<Json> {
  const res = await dispatchTool(name, { domain: root, ...args })
  return JSON.parse((res.content[0] as { text: string }).text) as Json
}

async function ok(name: string, args: Json = {}): Promise<Json> {
  const res = await call(name, args)
  if (!res['ok']) throw new Error(`${name} refused: ${JSON.stringify(res)}`)
  return res
}

/** Every file of a folder with its content, for "writes nothing" checks. */
async function snapshot(dir: string, base = ''): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '.cache' || e.name === '.global' || e.name === '.skills') continue
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) Object.assign(out, await snapshot(join(dir, e.name), rel))
    else out[rel] = await readFile(join(dir, e.name), 'utf-8')
  }
  return out
}

interface ConsoleModule {
  writeConsole: (o: Json) => Promise<{ path: string }>
  readConsoleModel: (html: string) => Json | null
}
const consoleModule = async (): Promise<ConsoleModule> =>
  (await import(pathToFileURL(join(REPO, 'scripts', 'export-console.mjs')).href)) as ConsoleModule

async function exportConsole(): Promise<string> {
  const written = await (
    await consoleModule()
  ).writeConsole({
    rootDir: root,
    scope: 'domain',
    open: false,
  })
  return readFile(written.path, 'utf-8')
}

/** What Save Snapshot leaves in the file: the drafts and the UI state as plain JSON. */
function saveSnapshot(html: string, drafts: unknown[], savedAt = '2026-11-23T10:00:00.000Z') {
  const slot = JSON.stringify({ drafts, uiState: { reviewer: 'ana', savedAt } }).replace(
    /</g,
    '\\u003c',
  )
  return html.replace(
    /<script type="application\/json" id="nn-drafts">[\s\S]*?<\/script>/,
    () => `<script type="application/json" id="nn-drafts">${slot}</script>`,
  )
}

/** A Step Request draft exactly as the procedure stepper proposes it. */
function requestDraft(id: string, name: string, fields: Json, run = 'r1') {
  return {
    id,
    element_id: '',
    concept: 'Step Request',
    element: name,
    base_hash: '',
    kind: 'new',
    created_at: '2026-11-23T09:59:00.000Z',
    knowledge_id: run,
    element_slug: name,
    proposed: JSON.stringify({ request_status: 'pending', ...fields }),
  }
}

/** A run_start draft exactly as the stepper proposes it: no run id of its own. */
const runStartDraft = (id: string, params: Json = { doc: 'guide' }) => ({
  id,
  kind: 'run_start',
  procedure: 'review',
  params,
  created_at: `2026-11-23T09:5${id.slice(-1)}:00.000Z`,
})

/** Run r1 of `review`, its agent step done, waiting on the human decision. */
async function startRun(): Promise<number> {
  await writeFile(join(root, 'spec.md'), '# spec\n')
  await ok('procedure_start', { procedure: 'review', params: { doc: 'spec' }, run: 'r1' })
  await ok('procedure_record', { run: 'r1', action: 'start', step: 'draft' })
  await ok('procedure_record', { run: 'r1', action: 'complete', step: 'draft' })
  return seqOf('r1')
}

const seqOf = async (run: string): Promise<number> => (await ok('procedure_state', { run }))['seq']

/** Saves `drafts` over a fresh export of the domaiNN and returns the saved file. */
async function saved(name: string, drafts: unknown[], savedAt?: string): Promise<string> {
  const file = join(inbox, name)
  await writeFile(file, saveSnapshot(await exportConsole(), drafts, savedAt))
  return file
}

const apply = (path: string | undefined, extra: Json = {}) =>
  call('import_console', { ...(path ? { path } : {}), apply: true, consume: true, ...extra })

const runDirs = (): string[] => readdirSync(join(root, 'executions')).sort()

describe('an exported console writes nothing', SLOW, () => {
  it('leaves the private run exactly as it was: only the console file appears', async () => {
    await startRun()
    const before = await snapshot(root)
    await exportConsole()
    const after = await snapshot(root)
    const added = Object.keys(after).filter((f) => !(f in before))
    expect(added).toEqual(['domaiNN_console.html'])
    for (const f of Object.keys(before)) expect(after[f]).toBe(before[f])
  })
})

describe('resuming the same private run', SLOW, () => {
  it('continues from the regenerated console, not from the HTML that was already imported', async () => {
    const seq0 = await startRun()
    const first = await saved('first.html', [
      requestDraft('fb-001', 'q-001', { action: 'start', step: 'review', base_seq: seq0 }),
    ])
    const imported = await apply(first)
    expect(imported['requests']).toEqual([
      expect.objectContaining({ run: 'r1', request: 'q-001', status: 'done' }),
    ])

    // The domaiNN regenerated its console: it already carries the run where it now stands.
    const consolePath = join(root, 'domaiNN_console.html')
    const html = await readFile(consolePath, 'utf-8')
    const graphs = (await consoleModule()).readConsoleModel(html)!['procedureGraphs'] as Json[]
    const entry = graphs.find((g) => (g['runs'] as Json[]).some((r) => r['id'] === 'r1'))!
    const [run] = entry['runs'] as Json[]
    expect(run['seq']).toBe(await seqOf('r1'))
    expect(run['requests']['q-001'].status).toBe('done')

    // The next answer is saved over THAT console and imported without a path.
    await writeFile(
      consolePath,
      saveSnapshot(
        html,
        [
          requestDraft('fb-002', 'q-002', {
            action: 'complete',
            step: 'review',
            requested_outcome: 'approve',
            base_seq: run['seq'],
          }),
        ],
        '2026-11-23T11:00:00.000Z',
      ),
    )
    const resumed = await apply(undefined)
    expect(resumed['ok']).toBe(true)
    expect(resumed['requests']).toEqual([
      expect.objectContaining({ run: 'r1', request: 'q-002', status: 'done' }),
    ])
    const state = (await ok('procedure_state', { run: 'r1' }))['state']
    expect(state.steps.review.status).toBe('done')
    expect(state.currentStep).toBe('publish')
    // One run, no clone, nothing left pending.
    expect(runDirs()).toEqual(['r1'])
    expect((await ok('procedure_pending', { run: 'r1' }))['pending']).toBe(0)
  })
})

describe('repeated imports of the same profile', SLOW, () => {
  it('importing the same saved HTML twice is a no-op the second time', async () => {
    const seq0 = await startRun()
    const file = await saved('a.html', [
      requestDraft('fb-001', 'q-001', { action: 'start', step: 'review', base_seq: seq0 }),
    ])
    const first = await apply(file)
    expect(first['requests']).toEqual([
      expect.objectContaining({ request: 'q-001', status: 'done' }),
    ])
    const seq1 = await seqOf('r1')
    const before = await snapshot(join(root, 'executions'))
    const changes = await readdir(join(root, 'changes'))

    const again = await apply(file)
    expect(again['ok']).toBe(true)
    expect(again['applied']).toBe(true)
    expect(again['changeset']).toBeNull()
    expect(again['duplicates']).toBe(1)
    expect(again['requests']).toEqual([
      { run: 'r1', request: 'q-001', status: 'duplicate', row_status: 'done' },
    ])
    expect(await seqOf('r1')).toBe(seq1)
    expect(await snapshot(join(root, 'executions'))).toEqual(before)
    expect(await readdir(join(root, 'changes'))).toEqual(changes)
  })

  it('a later save that still carries the old drafts imports only the new one', async () => {
    const seq0 = await startRun()
    const d1 = requestDraft('fb-001', 'q-001', { action: 'start', step: 'review', base_seq: seq0 })
    await apply(await saved('a.html', [d1]))
    const seq1 = await seqOf('r1')
    const d2 = requestDraft('fb-002', 'q-002', {
      action: 'complete',
      step: 'review',
      requested_outcome: 'decline',
      base_seq: seq1,
    })

    const second = await apply(await saved('b.html', [d1, d2], '2026-11-23T11:00:00.000Z'))
    expect(second['ok']).toBe(true)
    expect(second['duplicates']).toBe(1)
    expect(second['requests']).toEqual([
      { run: 'r1', request: 'q-001', status: 'duplicate', row_status: 'done' },
      expect.objectContaining({ run: 'r1', request: 'q-002', status: 'done' }),
    ])
    const state = (await ok('procedure_state', { run: 'r1' }))['state']
    expect(state.steps.review).toMatchObject({ status: 'done', outcome: 'decline' })
    expect(state.currentStep).toBe('rework')
    expect((await ok('procedure_pending', { run: 'r1' }))['pending']).toBe(0)
  })

  it('a pending request imported without consume is consumed by the next import of the same HTML', async () => {
    const seq0 = await startRun()
    const file = await saved('a.html', [
      requestDraft('fb-001', 'q-001', { action: 'start', step: 'review', base_seq: seq0 }),
    ])
    await call('import_console', { path: file, apply: true })
    expect((await ok('procedure_pending', { run: 'r1' }))['pending']).toBe(1)

    const again = await apply(file)
    expect(again['requests']).toEqual([
      expect.objectContaining({ run: 'r1', request: 'q-001', status: 'done' }),
    ])
    expect((await ok('procedure_pending', { run: 'r1' }))['pending']).toBe(0)
    expect(
      ((await ok('procedure_state', { run: 'r1' }))['state'] as Json).steps.review.status,
    ).toBe('active')
  })

  it('refuses a request name that exists with other content, writing nothing', async () => {
    const seq0 = await startRun()
    await apply(
      await saved('a.html', [
        requestDraft('fb-001', 'q-001', { action: 'start', step: 'review', base_seq: seq0 }),
      ]),
    )
    const seq1 = await seqOf('r1')
    // Another profile's console used the same name for a different answer.
    const other = await saved('other.html', [
      requestDraft('fb-009', 'q-001', {
        action: 'complete',
        step: 'review',
        requested_outcome: 'approve',
        base_seq: seq1,
      }),
      requestDraft('fb-010', 'q-002', { action: 'wait', step: 'review', base_seq: seq1 }),
    ])
    const before = await snapshot(root)

    const res = await apply(other)
    expect(res).toMatchObject({ ok: false, code: 'REQUEST_CONFLICT' })
    expect(res['conflicts']).toEqual([{ run: 'r1', request: 'q-001' }])
    expect(await snapshot(root)).toEqual(before)
  })

  it('two answers to the same step in one save record it once', async () => {
    await startRun()
    await ok('procedure_record', { run: 'r1', action: 'start', step: 'review' })
    const seq = await seqOf('r1')
    const answer = (id: string, name: string) =>
      requestDraft(id, name, {
        action: 'complete',
        step: 'review',
        requested_outcome: 'approve',
        base_seq: seq,
      })

    const res = await apply(
      await saved('twice.html', [answer('fb-001', 'q-001'), answer('fb-002', 'q-002')]),
    )
    const statuses = (res['requests'] as Json[]).map((r) => r['status']).sort()
    expect(statuses).toEqual(['done', 'stale'])
    const state = (await ok('procedure_state', { run: 'r1' }))['state']
    expect(state.steps.review).toMatchObject({ status: 'done', outcome: 'approve', attempt: 1 })
    expect(state.currentStep).toBe('publish')
    expect((await ok('procedure_pending', { run: 'r1' }))['pending']).toBe(0)
  })

  it('a requested run starts once however many times its HTML is imported', async () => {
    const file = await saved('start.html', [runStartDraft('fb-001')])
    const first = await apply(file)
    const [started] = first['runs_started'] as Json[]
    expect(started).toMatchObject({ procedure: 'review', ok: true })
    expect(runDirs()).toEqual([started['run']])

    const again = await apply(file)
    expect(again['ok']).toBe(true)
    expect(again['runs_started']).toEqual([
      { procedure: 'review', run: started['run'], ok: true, already_started: true },
    ])
    expect(runDirs()).toEqual([started['run']])

    // A different draft asking for the same procedure is a different request: a second run.
    const second = await apply(
      await saved('start2.html', [runStartDraft('fb-002')], '2026-11-23T12:00:00.000Z'),
    )
    const [other] = second['runs_started'] as Json[]
    expect(other).toMatchObject({ ok: true })
    expect(other['already_started']).toBeUndefined()
    expect(other['run']).not.toBe(started['run'])
    expect(runDirs()).toHaveLength(2)
  })
})

/**
 * What the domaiNN publishes: its models and procedures. The private run area (executions/),
 * the changes ledger and the regenerated manifest and console are bookkeeping of an import and
 * are checked apart (`ledgerModels`).
 */
async function canonical(): Promise<Record<string, string>> {
  const all = await snapshot(root)
  for (const f of Object.keys(all))
    if (
      f.startsWith('executions/') ||
      f.startsWith('changes/') ||
      f === 'domaiNN_NN.md' ||
      f === 'domaiNN_console.html'
    )
      delete all[f]
  return all
}

/** The models the changes ledger says it changed, across every changeset the imports left. */
async function ledgerModels(): Promise<string[]> {
  const ids = new Set<string>()
  const files = await readdir(join(root, 'changes')).catch(() => [] as string[])
  for (const f of files) {
    const text = await readFile(join(root, 'changes', f), 'utf-8')
    const header = /^models:\r?\n((?: {2}.*\r?\n)+)/m.exec(text)?.[1] ?? ''
    for (const m of header.matchAll(/^ {2}([a-z0-9][a-z0-9-]*):\s*$/gm)) ids.add(m[1]!)
  }
  return [...ids].sort()
}

/** Run r1 taken to completion through the public tools: review approved, publish done, finished. */
async function completeRun(): Promise<void> {
  await startRun()
  await ok('procedure_record', { run: 'r1', action: 'start', step: 'review' })
  await ok('procedure_record', {
    run: 'r1',
    action: 'complete',
    step: 'review',
    outcome: 'approve',
  })
  await ok('procedure_record', { run: 'r1', action: 'start', step: 'publish' })
  await ok('procedure_record', { run: 'r1', action: 'complete', step: 'publish' })
  await ok('procedure_record', { run: 'r1', action: 'finish', outcome: 'completed' })
  const state = await ok('procedure_state', { run: 'r1' })
  expect(state['state'].status).toBe('completed')
}

const handoffDraft = (id: string, choice: string, run = 'r1') => ({
  id,
  kind: 'run_handoff',
  run,
  choice,
  created_at: '2026-11-23T10:30:00.000Z',
})

describe('the final handoff of a completed run', SLOW, () => {
  it('answers on a private run write nothing to the domaiNN before the choice', async () => {
    const seq0 = await startRun()
    const before = await canonical()
    // Every answer a person can give while the run is open: start, decide, and ask for a run.
    await apply(
      await saved('a.html', [
        requestDraft('fb-001', 'q-001', { action: 'start', step: 'review', base_seq: seq0 }),
      ]),
    )
    const seq1 = await seqOf('r1')
    await apply(
      await saved(
        'b.html',
        [
          requestDraft('fb-002', 'q-002', {
            action: 'complete',
            step: 'review',
            requested_outcome: 'approve',
            base_seq: seq1,
          }),
          runStartDraft('fb-003'),
        ],
        '2026-11-23T11:00:00.000Z',
      ),
    )
    expect((await ok('procedure_state', { run: 'r1' }))['handoff']).toBeUndefined()
    // The runs live under executions/; no model, procedure or changeset of the domaiNN moved.
    const after = await canonical()
    const moved = Object.keys({ ...before, ...after }).filter((f) => before[f] !== after[f])
    expect(moved).toEqual([])
    // What the imports did log concerns only the private runs.
    expect(await ledgerModels()).toEqual(runDirs())
  })

  it('names a run its answers brought to its end, so the agent can finish it', async () => {
    const seq0 = await startRun()
    // An answer that leaves the run open asks the agent for nothing.
    const mid = await apply(
      await saved('a.html', [
        requestDraft('fb-001', 'q-001', { action: 'start', step: 'review', base_seq: seq0 }),
        requestDraft('fb-002', 'q-002', {
          action: 'complete',
          step: 'review',
          requested_outcome: 'approve',
          base_seq: seq0,
        }),
      ]),
    )
    expect(mid['ready_to_finish']).toEqual([])
    const seq1 = await seqOf('r1')
    const before = await canonical()
    const res = await apply(
      await saved(
        'b.html',
        [
          requestDraft('fb-003', 'q-003', { action: 'start', step: 'publish', base_seq: seq1 }),
          requestDraft('fb-004', 'q-004', { action: 'complete', step: 'publish', base_seq: seq1 }),
        ],
        '2026-11-23T11:00:00.000Z',
      ),
    )
    // Closing a run is never a request: the import says which run the agent may finish now.
    expect(res['ready_to_finish']).toEqual(['r1'])
    expect(res['next_steps'].notice).toMatch(
      /Run r1 reached its end: record procedure_record action=finish outcome=completed/,
    )
    const state = await ok('procedure_state', { run: 'r1' })
    expect(state['state']).toMatchObject({ status: 'open', canComplete: true })
    expect(await canonical()).toEqual(before)
  })

  it('records the choice with the run and publishes nothing', async () => {
    await completeRun()
    const before = await canonical()
    const file = await saved('done.html', [handoffDraft('fb-001', 'administrator')])

    const res = await apply(file)
    expect(res['ok']).toBe(true)
    expect(res['changeset']).toBeNull()
    expect(res['handoffs']).toEqual([{ run: 'r1', choice: 'administrator', status: 'recorded' }])
    const state = await ok('procedure_state', { run: 'r1' })
    expect(state['handoff']).toMatchObject({ run: 'r1', choice: 'administrator', by: 'ana' })
    expect(Date.parse(state['handoff'].at)).not.toBeNaN()
    // The only new file is the private record beside the run; the domaiNN's own files are as they were.
    expect(await canonical()).toEqual(before)
    expect(Object.keys(await snapshot(join(root, 'executions', 'r1'))).sort()).toEqual([
      'handoff.json',
      'r1_executions_NN.md',
    ])
    // The domaiNN still validates with the record in place.
    const checked = await call('check_domain')
    expect(checked['aggregate'].invalid).toBe(0)
    expect(checked['layout']).toEqual({ ok: true, diagnostics: [] })
  })

  it('choosing again is a no-op, and a different choice is refused without a write', async () => {
    await completeRun()
    await apply(await saved('done.html', [handoffDraft('fb-001', 'agent')]))
    const recorded = (await ok('procedure_state', { run: 'r1' }))['handoff']
    const other = await saved('other.html', [handoffDraft('fb-010', 'administrator')])
    const before = await snapshot(root)

    const same = await apply(await saved('same.html', [handoffDraft('fb-009', 'agent')]))
    expect(same['handoffs']).toEqual([{ run: 'r1', choice: 'agent', status: 'duplicate' }])
    expect((await ok('procedure_state', { run: 'r1' }))['handoff']).toEqual(recorded)

    const mid = await snapshot(root)
    const conflict = await apply(other)
    expect(conflict).toMatchObject({ ok: false, code: 'HANDOFF_CONFLICT' })
    expect(await snapshot(root)).toEqual(mid)
    expect(mid['executions/r1/handoff.json']).toBe(before['executions/r1/handoff.json'])
    expect((await ok('procedure_state', { run: 'r1' }))['handoff']).toEqual(recorded)
  })

  it('refuses a run that is not complete or not there, and still imports the rest', async () => {
    const seq0 = await startRun()
    const file = await saved('early.html', [
      handoffDraft('fb-001', 'administrator'),
      handoffDraft('fb-002', 'agent', 'ghost'),
      requestDraft('fb-003', 'q-003', { action: 'start', step: 'review', base_seq: seq0 }),
    ])
    const res = await apply(file)
    expect(res['ok']).toBe(true)
    expect(res['handoffs']).toEqual([
      expect.objectContaining({ run: 'r1', status: 'refused', code: 'RUN_NOT_COMPLETED' }),
      expect.objectContaining({ run: 'ghost', status: 'refused', code: 'RUN_NOT_FOUND' }),
    ])
    expect(res['requests']).toEqual([expect.objectContaining({ request: 'q-003', status: 'done' })])
    expect((await ok('procedure_state', { run: 'r1' }))['handoff']).toBeUndefined()
    expect(runDirs()).toEqual(['r1'])
    expect(Object.keys(await snapshot(join(root, 'executions', 'r1')))).not.toContain(
      'handoff.json',
    )
  })

  it('without apply it reports what it would record and writes nothing', async () => {
    await completeRun()
    const file = await saved('done.html', [handoffDraft('fb-001', 'agent')])
    const before = await snapshot(root)
    const res = await call('import_console', { path: file })
    expect(res['applied']).toBe(false)
    expect(res['handoffs']).toEqual([{ run: 'r1', choice: 'agent', status: 'ready' }])
    expect(res['changeset']).toBeNull()
    expect(await snapshot(root)).toEqual(before)
  })

  it('refuses a handoff draft that names no valid choice, writing nothing', async () => {
    await completeRun()
    const file = await saved('bad.html', [handoffDraft('fb-001', 'publish')])
    const before = await snapshot(root)
    const res = await apply(file)
    expect(res).toMatchObject({ ok: false, code: 'INVALID_DRAFT' })
    expect(await snapshot(root)).toEqual(before)
  })
})

describe('a private run output written in the console', SLOW, () => {
  /** Run d1 of `deliver`, its human step `write` started: the person owes the SOP. */
  async function startDeliver(): Promise<number> {
    await ok('procedure_start', { procedure: 'deliver', run: 'd1' })
    await ok('procedure_record', { run: 'd1', action: 'start', step: 'write' })
    return seqOf('d1')
  }

  /** The domaiNN outside the run folder, the changesets and the regenerated console. */
  const canonical = async (): Promise<Record<string, string>> =>
    Object.fromEntries(
      Object.entries(await snapshot(root)).filter(
        ([f]) =>
          !f.startsWith('executions/') && !f.startsWith('changes/') && f !== 'domaiNN_console.html',
      ),
    )

  /** About 100 KiB of text with newlines, quotes and backslashes, on one JSON line once stored. */
  const longText = Array.from(
    { length: 2100 },
    (_, i) => `${i}. Say "hello" to C:\\path\\${i} and 'bye'.\tdone\n`,
  ).join('')

  const completeDraft = (seq: number, text: string, id = 'fb-001') =>
    requestDraft(
      id,
      'q-001',
      {
        action: 'complete',
        step: 'write',
        base_seq: seq,
        requested_outputs: JSON.stringify({ sop: { name: 'Our SOP.md', text } }),
      },
      'd1',
    )

  it('the import writes the deliverable under the run, records it with the completion, once', async () => {
    expect(Buffer.byteLength(longText)).toBeGreaterThan(90 * 1024)
    const seq = await startDeliver()
    const canonicalBefore = await canonical()
    const file = await saved('deliver.html', [completeDraft(seq, longText)])

    const imported = await apply(file)
    expect(imported['requests']).toEqual([
      expect.objectContaining({ run: 'd1', request: 'q-001', status: 'done' }),
    ])
    const rel = 'executions/d1/outputs/sop/Our-SOP.md'
    const bytes = await readFile(join(root, rel))
    // The long one-line JSON field survived the save, the changeset and the run model intact.
    expect(bytes.toString('utf-8')).toBe(longText)
    const state = (await ok('procedure_state', { run: 'd1' }))['state'] as Json
    expect(state.artifacts.sop).toEqual({
      status: 'validated',
      value: rel,
      rev: createHash('sha256').update(bytes).digest('hex'),
      step: 'write',
    })
    expect(state.steps.write.status).toBe('done')
    expect(state.currentStep).toBe('publish')
    const pending = await ok('procedure_pending', { run: 'd1' })
    expect(pending['requests']).toEqual([expect.objectContaining({ id: 'q-001', status: 'done' })])
    expect(await canonical()).toEqual(canonicalBefore)

    // Importing the same save again is a duplicate: the file is not written a second time.
    const written = statSync(join(root, rel)).mtimeMs
    const runBefore = await snapshot(join(root, 'executions'))
    const again = await apply(file)
    expect(again['duplicates']).toBe(1)
    expect(again['requests']).toEqual([
      { run: 'd1', request: 'q-001', status: 'duplicate', row_status: 'done' },
    ])
    expect(statSync(join(root, rel)).mtimeMs).toBe(written)
    expect(await snapshot(join(root, 'executions'))).toEqual(runBefore)
  })

  it('the same request name with another deliverable is a conflict, writing nothing', async () => {
    const seq = await startDeliver()
    await apply(await saved('a.html', [completeDraft(seq, 'first text\n')]))
    const other = await saved('b.html', [completeDraft(seq, 'second text\n', 'fb-009')])
    const before = await snapshot(root)
    const res = await apply(other)
    expect(res).toMatchObject({ ok: false, code: 'REQUEST_CONFLICT' })
    expect(res['conflicts']).toEqual([{ run: 'd1', request: 'q-001' }])
    expect(await snapshot(root)).toEqual(before)
  })

  it('a deliverable for a slug the step does not produce is rejected and writes no output', async () => {
    const seq = await startDeliver()
    const file = await saved('bad.html', [
      requestDraft(
        'fb-001',
        'q-001',
        {
          action: 'complete',
          step: 'write',
          base_seq: seq,
          requested_outputs: JSON.stringify({ publish: { text: 'x' } }),
        },
        'd1',
      ),
    ])
    const canonicalBefore = await canonical()
    const res = await apply(file)
    expect(res['requests']).toEqual([
      expect.objectContaining({
        run: 'd1',
        request: 'q-001',
        status: 'rejected',
        code: 'INVALID_OUTPUT',
      }),
    ])
    expect(existsSync(join(root, 'executions', 'd1', 'outputs'))).toBe(false)
    const state = (await ok('procedure_state', { run: 'd1' }))['state'] as Json
    expect(state.steps.write.status).toBe('active')
    expect(await canonical()).toEqual(canonicalBefore)
  })
})
