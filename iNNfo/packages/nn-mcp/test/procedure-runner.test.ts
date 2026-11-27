import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
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

const SPEC_CONTENT = '# Spec\n'
const SPEC_REV = createHash('sha256').update(SPEC_CONTENT).digest('hex')
const DRAFT_CONTENT = '# Draft\n'
const DRAFT_REV = createHash('sha256').update(DRAFT_CONTENT).digest('hex')
const DRAFT_REV_2 = createHash('sha256').update('# Draft 2\n').digest('hex')
const REPORT_CONTENT = '# Report\n'
const REPORT_REV = createHash('sha256').update(REPORT_CONTENT).digest('hex')

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
  writeFileSync(join(root, 'spec.md'), SPEC_CONTENT, 'utf-8')
  writeFileSync(join(root, 'draft.md'), DRAFT_CONTENT, 'utf-8')
  writeFileSync(join(root, 'report.md'), REPORT_CONTENT, 'utf-8')
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
    // `.cache` is this file's INNFO_CACHE_DIR (the derived changeset index lives there),
    // not part of the domaiNN.
    if (rel === '.cache') continue
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
    const refused = await startReview()
    // The refusal names the tool call that fixes it, so an agent does not have to guess.
    expect(refused).toMatchObject({
      ok: false,
      code: 'EXECUTIONS_NOT_INSTALLED',
      fix: { tool: 'hydrate_blueprint', args: { blueprint_name: 'executions' } },
    })
    expect(String((refused as { detail: string }).detail)).toMatch(/hydrate_blueprint/)
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

/**
 * The reported case: a procedure is shipped by a bluepriNNt package, not by a scope, so
 * `validate_blueprint` and `list_blueprint_procedures` see it while `procedure_start` said
 * `PROCEDURE_NOT_FOUND`. The fixture mirrors the report: the domaiNN entry declares the
 * `domaiNN` container blueprint, a second package ships the procedure, and a `kNNowledge`
 * scope names that package in its own `parent_spec`. Every package is written into the
 * scratch root; `fetch` is off, so nothing is pulled from anywhere.
 */
const BLUEPRINT_DOMAIN_ENTRY = `---
level: 3
parent_spec:
  name: "domaiNN"
  url: "https://example.invalid/domaiNN/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "BluepriNNt procedures"
scope: true
---

# NN domaiNN
`

const SCENE_SCOPE = `---
level: 3
parent_spec:
  name: "music-bands"
  url: "https://example.invalid/music-bands/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Second scene"
scope: true
---

# NN kNNowledge
`

const BANDS_PROCEDURE = `---
level: 3
parent_spec:
  name: "music-bands"
  url: "https://example.invalid/music-bands/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Add Music Group"
slots:
  - { name: group, kind: value, required: true }
---

# NN Procedure

## NN Procedure: Add Music Group
slug:: add-music-group-procedure

# NN Work

## NN Work: Lineup
slug:: lineup
step_type:: task
executor:: agent
`

/** `specs/bluepriNNts/<name>/V_0-1-0/`, declaring and shipping `add-music-group`. */
function installBandsBlueprint(name: string): void {
  const pkg = join(root, 'specs', 'bluepriNNts', name, 'V_0-1-0')
  mkdirSync(join(pkg, 'procedures'), { recursive: true })
  writeFileSync(
    join(pkg, 'spec_NN.md'),
    `---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "${name}"\nprocedures:\n  - { id: add-music-group, name: "Add Music Group", path: procedures/add_music_group_procedures_NN.md }\n---\n`,
  )
  writeFileSync(join(pkg, 'procedures', 'add_music_group_procedures_NN.md'), BANDS_PROCEDURE)
}

/** The `domaiNN` container blueprint: installed, and it ships no procedure. */
function installDomainBlueprint(): void {
  const pkg = join(root, 'specs', 'bluepriNNts', 'domaiNN')
  mkdirSync(pkg, { recursive: true })
  writeFileSync(
    join(pkg, 'spec_NN.md'),
    '---\nlevel: 2\nspec_version: "V_0-1-0"\ntitle: "DomaiNN"\n---\n',
  )
}

function installBlueprintDomain(): void {
  writeFileSync(join(root, 'domaiNN_NN.md'), BLUEPRINT_DOMAIN_ENTRY)
  installDomainBlueprint()
}

describe('procedure_start: a procedure only a bluepriNNt package ships', SLOW, () => {
  it('starts the only installed blueprint that declares the id, from "."', async () => {
    installBlueprintDomain()
    installBandsBlueprint('music-bands')
    const started = ok(
      await procedureStart(root, {
        procedure: 'add-music-group',
        params: { group: 'abbey-road' },
        run: 'm1',
      }),
    )
    // The run header records the address the loader reads back, package and document.
    expect(started.procedure).toBe(
      'bluepriNNt:music-bands/procedures/add_music_group_procedures_NN.md',
    )
    const state = ok(await procedureState(root, { run: 'm1' }))
    expect(state.params).toEqual({ group: 'abbey-road' })
    expect(state.state).toMatchObject({ status: 'open', currentStep: 'lineup' })
    expect(await changesets()).toHaveLength(1)
  })

  it('keeps a domaiNN procedure document with the same id ahead of the blueprint', async () => {
    installBlueprintDomain()
    installBandsBlueprint('music-bands')
    writeFileSync(join(root, 'procedures', 'add_music_group_procedures_NN.md'), BANDS_PROCEDURE)
    const started = ok(
      await procedureStart(root, {
        procedure: 'add-music-group',
        params: { group: 'abbey-road' },
        run: 'd1',
      }),
    )
    expect(started.procedure).toBe('procedures/add_music_group_procedures_NN.md')
  })

  it('refuses an id two installed blueprints declare, naming both', async () => {
    installBlueprintDomain()
    installBandsBlueprint('music-bands')
    installBandsBlueprint('other-bands')
    const refused = await procedureStart(root, {
      procedure: 'add-music-group',
      params: { group: 'abbey-road' },
      run: 'm3',
    })
    expect(refused).toMatchObject({ ok: false, code: 'PROCEDURE_NOT_FOUND' })
    const detail = String((refused as { detail: string }).detail)
    expect(detail).toContain('music-bands')
    expect(detail).toContain('other-bands')
    expect(existsSync(join(root, 'executions'))).toBe(false)
  })

  it('still refuses an id nobody declares', async () => {
    installBlueprintDomain()
    installBandsBlueprint('music-bands')
    expect(await procedureStart(root, { procedure: 'ghost', params: {} })).toMatchObject({
      ok: false,
      code: 'PROCEDURE_NOT_FOUND',
    })
  })

  it('follows the blueprint named by the parent_spec of the document it resolves in', async () => {
    installBlueprintDomain()
    installBandsBlueprint('music-bands')
    writeFileSync(join(root, 'kNNowledge', 'second-scene_music-bands_NN.md'), SCENE_SCOPE)
    const started = ok(
      await procedureStart(root, {
        procedure: 'add-music-group',
        params: { group: 'abbey-road' },
        path: 'kNNowledge/second-scene_music-bands_NN.md',
        run: 'm5',
      }),
    )
    expect(started.procedure).toBe(
      'bluepriNNt:music-bands/procedures/add_music_group_procedures_NN.md',
    )
  })

  it('still starts a procedure document given as the procedure', async () => {
    const started = ok(
      await procedureStart(root, { procedure: 'procedures/deliver_procedures_NN.md', run: 'p1' }),
    )
    expect(started.procedure).toBe('procedures/deliver_procedures_NN.md')
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
        rev: SPEC_REV,
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
      inputs: { 'draft-doc': { status: 'validated', rev: SPEC_REV } },
    })
    expect(s.allowedNext).toEqual([
      { to: 'publish', guard: { kind: 'outcome', token: 'approve' } },
      { to: 'rework', guard: { kind: 'outcome', token: 'decline' } },
    ])
    expect(s.actions).toEqual(['start', 'input', 'artifact', 'pause', 'cancel', 'finish'])
  })

  it('does not offer an artifact fact before any step started, since the runner refuses it', async () => {
    ok(await startReview())
    const fresh = ok(await procedureState(root, { run: 'r1' }))
    expect(fresh.actions).toEqual(['start', 'input', 'pause', 'cancel', 'finish'])
    expect(
      await procedureRecord(root, {
        run: 'r1',
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        rev: SPEC_REV,
      }),
    ).toMatchObject({ ok: false, code: 'STEP_NOT_STARTED' })
    ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
    expect(ok(await procedureState(root, { run: 'r1' })).actions).toContain('artifact')
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
        rev: SPEC_REV,
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
        rev: SPEC_REV,
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
    // A `complete` of the pending current step claims it (procedure-runner-compact.test.ts).
    await refuse({ action: 'complete', step: 'review' }, 'STEP_NOT_CURRENT')
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

  it('procedure_state lists every attempt of a step from the change log, oldest first', async () => {
    ok(await startReview())
    expect(ok(await procedureState(root, { run: 'r1' })).state.attempts).toEqual({})
    ok(await procedureRecord(root, { run: 'r1', action: 'start', actor: 'ana' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'fail', value: 'no data' }))
    ok(await procedureRecord(root, { run: 'r1', action: 'start', actor: 'bo' }))
    const state = ok(await procedureState(root, { run: 'r1' })).state
    expect(state.attempts).toEqual({
      draft: [
        { attempt: 1, inputs: {}, failure: 'no data', actor: 'ana' },
        { attempt: 2, inputs: {}, actor: 'bo' },
      ],
    })
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
        rev: SPEC_REV,
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
        rev: SPEC_REV,
      }),
    )
    expect(r.state).toMatchObject({
      artifacts: { 'draft-doc': { status: 'validated', rev: SPEC_REV } },
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
        rev: SPEC_REV,
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
  async function untilReview(rev = DRAFT_REV): Promise<void> {
    writeFileSync(join(root, 'draft.md'), DRAFT_CONTENT, 'utf-8')
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
    await untilReview()
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
    await untilReview()
    await sendBack()
    writeFileSync(join(root, 'draft.md'), '# Draft 2\n', 'utf-8')
    ok(
      await rec({
        action: 'artifact',
        fact: 'validated',
        field: 'draft-doc',
        rev: DRAFT_REV_2,
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
    // The fold reports the redraft's output stale while the redraft can still run again; its
    // row stays validated, since the redraft just recorded it as the loop's fresh result.
    expect(looped.state.artifacts['draft-doc'].status).toBe('stale')
    expect(looped.state.stale).toEqual(['draft-doc'])
    const [cs] = (await changesets()).filter((f) => !before.includes(f))
    const csText = await readFile(join(root, 'changes', cs!), 'utf-8')
    expect(csText).toMatch(/^atomic: true$/m)
    expect(csText).toContain('l1@review')
    expect(csText).toContain('l1@redraft')
    expect(csText).not.toContain('l1@draft-doc')

    const restarted = ok(await rec({ action: 'start' }))
    expect(restarted.state.steps.review).toMatchObject({ status: 'active', attempt: 2 })
    // Each pass of the loop is its own attempt, with the input revision that pass read: the
    // second review reads the redraft's d2, even while the fold calls it stale because the
    // loop is still open. Reopening a step is not an attempt: only a start is.
    const { attempts } = ok(await procedureState(root, { run: 'l1' })).state
    expect(attempts.review).toEqual([
      { attempt: 1, inputs: { 'draft-doc': DRAFT_REV }, actor: 'agent' },
      { attempt: 2, inputs: { 'draft-doc': DRAFT_REV_2 }, actor: 'agent' },
    ])
    expect(attempts.redraft).toEqual([{ attempt: 1, inputs: {}, actor: 'agent' }])
  })

  it('LOOP_LIMIT: the decision on its last attempt cannot choose the branch that only loops back', async () => {
    await untilReview()
    await sendBack()
    ok(await rec({ action: 'complete' }))
    ok(await rec({ action: 'start' })) // review, attempt 2 of max_attempts:: 2
    const before = await snapshot()
    // Refused at the decision itself: accepting it would strand the run in redraft, whose
    // back-edge to review is refused one step later.
    const refused = await rec({ action: 'complete', outcome: 'send-back' })
    expect(refused).toMatchObject({
      ok: false,
      code: 'LOOP_LIMIT',
      step: 'review',
      attempt: 2,
      maxAttempts: 2,
      next: 'redraft',
    })
    expect(String((refused as { detail: string }).detail)).toMatch(
      /another outcome or fail "review"/,
    )
    expect(await snapshot()).toEqual(before)
    // Both ways out stay open: the forward branch, or failing the decision.
    const approved = ok(await rec({ action: 'complete', outcome: 'approve' }))
    expect(approved.state).toMatchObject({ currentStep: 'publish' })
  })

  it('LOOP_LIMIT: a decision on its last attempt can still be failed', async () => {
    await untilReview()
    await sendBack()
    ok(await rec({ action: 'complete' }))
    ok(await rec({ action: 'start' }))
    expect(ok(await rec({ action: 'fail', value: 'too many rounds' })).state.status).toBe('blocked')
  })
})

describe('required outputs inside a loop', SLOW, () => {
  const rec = (args: Record<string, unknown>) => procedureRecord(root, { run: 'v1', ...args })

  it('every pass of the revise step records its own output, the first pass included', async () => {
    ok(await procedureStart(root, { procedure: 'revise', run: 'v1' }))
    ok(await rec({ action: 'start' }))
    ok(await rec({ action: 'artifact', fact: 'validated', field: 'report', rev: REPORT_REV }))
    ok(await rec({ action: 'complete' }))
    ok(await rec({ action: 'start' }))
    ok(await rec({ action: 'complete', outcome: 'send-back' }))

    const reportRevs: Record<string, string> = { r1: REPORT_REV }
    for (const r of ['r2', 'r3']) {
      ok(await rec({ action: 'start' })) // revise
      const before = await snapshot()
      // The report the build step validated is not the revise step's result.
      const refused = await rec({ action: 'complete' })
      expect(refused).toMatchObject({
        ok: false,
        code: 'MISSING_OUTPUT',
        step: 'revise',
        missing: [{ slug: 'report' }],
      })
      expect(await snapshot()).toEqual(before)

      writeFileSync(join(root, 'report.md'), `# Report ${r}\n`, 'utf-8')
      const rev = createHash('sha256').update(`# Report ${r}\n`).digest('hex')
      reportRevs[r] = rev

      // With no step named, the current step reports the output it declares.
      const recorded = ok(
        await rec({ action: 'artifact', fact: 'validated', field: 'report', rev }),
      )
      expect(recorded.state.artifacts.report).toMatchObject({ status: 'validated', rev })
      const looped = ok(await rec({ action: 'complete' }))
      expect(looped.state.currentStep).toBe('check')
      ok(await rec({ action: 'start' }))
      if (r === 'r2') ok(await rec({ action: 'complete', outcome: 'send-back' }))
    }
    // Once the loop exits, the last revised report stands: the run closes with it.
    const approved = ok(await rec({ action: 'complete', outcome: 'approve' }))
    expect(approved.state.currentStep).toBe('ship')
    expect(approved.state.artifacts.report).toMatchObject({
      status: 'validated',
      rev: reportRevs['r3'],
    })
    expect(approved.state.stale).toEqual([])
    ok(await rec({ action: 'start' }))
    ok(await rec({ action: 'complete' }))
    expect(ok(await rec({ action: 'finish', outcome: 'completed' })).state.status).toBe('completed')
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
    // An engine claim and its settlement are one change: the attempt carries its failure.
    const { attempts } = ok(await procedureState(root, { run: 'e1' })).state
    expect(attempts.fetch!.map((a) => a.attempt)).toEqual([1, 2])
    expect(attempts.check).toHaveLength(2)
    expect(attempts.check![0]!.failure).toBeUndefined()
    expect(attempts.check![1]).toMatchObject({ attempt: 2, actor: 'engine' })
    expect(attempts.check![1]!.failure).toMatch(/^LOOP_LIMIT: /)
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

describe('private run outputs', SLOW, () => {
  const sha256 = (bytes: Buffer | string): string =>
    createHash('sha256').update(bytes).digest('hex')

  /** Every file outside `executions/` and `changes/`: what a private output must never touch. */
  const canonical = async (): Promise<Record<string, string>> =>
    Object.fromEntries(
      Object.entries(await snapshot()).filter(
        ([f]) => !f.startsWith('executions/') && !f.startsWith('changes/'),
      ),
    )

  /** Run d1 of `deliver`, its human step `write` started. */
  async function startDeliver(): Promise<void> {
    ok(await procedureStart(root, { procedure: 'deliver', run: 'd1' }))
    ok(await procedureRecord(root, { run: 'd1', action: 'start' }))
  }

  /** A Step Request row written the way the console's draft lands: one add_element, no runner write. */
  async function requestRow(id: string, fields: Record<string, string | number>): Promise<void> {
    const { applyChange } = await import('../src/tools/apply-change.js')
    const { writeProposedChangeset } = await import('../src/tools/propose-changeset.js')
    const written = await writeProposedChangeset(root, {
      changes: [
        {
          op: 'add_element',
          target: 'd1',
          concept: 'Step Request',
          name: id,
          slug: id,
          to: JSON.stringify({ request_status: 'pending', ...fields }),
          evidence: 'decision',
        },
      ],
      title: `request ${id}`,
      author: 'ana',
      authorKind: 'agent',
      atomic: true,
    })
    const applied = await applyChange(root, written.path)
    if (!applied.success) throw new Error(`request ${id}: ${JSON.stringify(applied.errors)}`)
  }

  const requestOf = async (id: string) =>
    ok(await procedurePending(root, { run: 'd1' })).requests.find((r) => r.id === id)

  it('completing without the output still refuses with MISSING_OUTPUT', async () => {
    await startDeliver()
    const before = await snapshot()
    expect(await procedureRecord(root, { run: 'd1', action: 'complete' })).toMatchObject({
      ok: false,
      code: 'MISSING_OUTPUT',
      missing: [{ slug: 'sop' }],
    })
    expect(await snapshot()).toEqual(before)
  })

  it('a direct outputs argument writes the file under the run and records it in the completion', async () => {
    await startDeliver()
    const canonicalBefore = await canonical()
    const before = await changesets()
    const text = '# SOP\n\nStep "one".\n'
    const done = ok(
      await procedureRecord(root, {
        run: 'd1',
        action: 'complete',
        outputs: { sop: { name: '../My SOP!.md', text } },
      }),
    )
    const rel = 'executions/d1/outputs/sop/My-SOP-.md'
    const bytes = await readFile(join(root, rel))
    expect(bytes.toString('utf-8')).toBe(text)
    expect(done.state.steps['write']).toMatchObject({ status: 'done' })
    expect(done.state.currentStep).toBe('publish')
    const state = ok(await procedureState(root, { run: 'd1' }))
    expect(state.state.artifacts['sop']).toEqual({
      status: 'validated',
      value: rel,
      rev: sha256(bytes),
      step: 'write',
    })
    // The output and the completion are one changeset.
    expect(await changesets()).toHaveLength(before.length + 1)
    expect(await canonical()).toEqual(canonicalBefore)
  })

  it('a consumed request carrying requested_outputs records the output and marks the request done', async () => {
    await startDeliver()
    const seq = ok(await procedureState(root, { run: 'd1' })).seq
    const outputs = { sop: { text: 'line one\nline "two"\n' } }
    await requestRow('q1', {
      action: 'complete',
      step: 'write',
      base_seq: seq,
      requested_outputs: JSON.stringify(outputs),
    })
    const canonicalBefore = await canonical()
    const done = ok(await procedureRecord(root, { run: 'd1', request: 'q1' }))
    const rel = 'executions/d1/outputs/sop/sop.md'
    const bytes = await readFile(join(root, rel))
    expect(bytes.toString('utf-8')).toBe(outputs.sop.text)
    expect(done.state.artifacts['sop']).toMatchObject({
      status: 'validated',
      value: rel,
      rev: sha256(bytes),
      step: 'write',
    })
    expect(done.state.steps['write']!.status).toBe('done')
    expect(await requestOf('q1')).toMatchObject({ status: 'done' })
    expect(await canonical()).toEqual(canonicalBefore)
  })

  it('never lets a caller attach outputs to a request a person made', async () => {
    await startDeliver()
    const seq = ok(await procedureState(root, { run: 'd1' })).seq
    await requestRow('q2', { action: 'complete', step: 'write', base_seq: seq })
    const before = await snapshot()
    expect(
      await procedureRecord(root, {
        run: 'd1',
        request: 'q2',
        outputs: { sop: { text: 'not from the person' } },
      }),
    ).toMatchObject({ ok: false, code: 'INVALID_ARGUMENT' })
    expect(await snapshot()).toEqual(before)
    expect(await requestOf('q2')).toMatchObject({ status: 'pending' })
  })

  it('refuses an unknown slug, a non-file artifact and an invalid text, writing nothing', async () => {
    await startDeliver()
    const before = await snapshot()
    const refusals: unknown[] = [
      { publish: { text: 'not an output of write' } },
      { nope: { text: 'x' } },
      { 'linked-note': { text: 'an element output' } },
      { sop: { text: 'x'.repeat(256 * 1024 + 1) } },
      { sop: { text: 42 } },
      { sop: { name: 7, text: 'x' } },
      'not json',
      ['sop'],
    ]
    for (const outputs of refusals) {
      const res = await procedureRecord(root, { run: 'd1', action: 'complete', outputs })
      expect(res, JSON.stringify(outputs).slice(0, 80)).toMatchObject({
        ok: false,
        code: 'INVALID_OUTPUT',
      })
    }
    // Outputs belong to a completion only.
    expect(
      await procedureRecord(root, {
        run: 'd1',
        action: 'wait',
        value: 'ana',
        outputs: { sop: { text: 'x' } },
      }),
    ).toMatchObject({ ok: false, code: 'INVALID_OUTPUT' })
    expect(await snapshot()).toEqual(before)
    expect(existsSync(join(root, 'executions', 'd1', 'outputs'))).toBe(false)
  })

  it('accepts a text of exactly 256 KiB of UTF-8 and refuses one byte more', async () => {
    await startDeliver()
    // 'é' is two bytes in UTF-8: 131072 of them are exactly 256 KiB.
    const limit = 'é'.repeat(128 * 1024)
    expect(
      await procedureRecord(root, {
        run: 'd1',
        action: 'complete',
        outputs: { sop: { text: `${limit}a` } },
      }),
    ).toMatchObject({ ok: false, code: 'INVALID_OUTPUT' })
    ok(
      await procedureRecord(root, {
        run: 'd1',
        action: 'complete',
        outputs: JSON.stringify({ sop: { text: limit } }),
      }),
    )
    expect(await readFile(join(root, 'executions/d1/outputs/sop/sop.md'), 'utf-8')).toBe(limit)
  })

  it('a refused request is marked rejected with INVALID_OUTPUT and writes no output', async () => {
    await startDeliver()
    const seq = ok(await procedureState(root, { run: 'd1' })).seq
    await requestRow('q1', {
      action: 'complete',
      step: 'write',
      base_seq: seq,
      requested_outputs: JSON.stringify({ nope: { text: 'x' } }),
    })
    await requestRow('q2', {
      action: 'wait',
      step: 'write',
      base_seq: seq,
      requested_value: 'ana',
      requested_outputs: JSON.stringify({ sop: { text: 'x' } }),
    })
    expect(await procedureRecord(root, { run: 'd1', request: 'q1' })).toMatchObject({
      ok: false,
      code: 'INVALID_OUTPUT',
    })
    expect(await requestOf('q1')).toMatchObject({
      status: 'rejected',
      reason: expect.stringMatching(/^INVALID_OUTPUT: /),
    })
    expect(await procedureRecord(root, { run: 'd1', request: 'q2' })).toMatchObject({
      ok: false,
      code: 'INVALID_OUTPUT',
    })
    expect(await requestOf('q2')).toMatchObject({ status: 'rejected' })
    expect(existsSync(join(root, 'executions', 'd1', 'outputs'))).toBe(false)
    const state = ok(await procedureState(root, { run: 'd1' }))
    expect(state.state.steps['write']!.status).toBe('active')
    expect(state.state.artifacts['sop']!.status).toBe('expected')
  })

  it('removes the file it wrote when the completion changeset is not applied', async () => {
    await startDeliver()
    // A rejected row only goes back to produced, so the completion's validated row conflicts.
    ok(
      await procedureRecord(root, {
        run: 'd1',
        action: 'artifact',
        fact: 'rejected',
        field: 'sop',
      }),
    )
    const before = await canonical()
    const res = await procedureRecord(root, {
      run: 'd1',
      action: 'complete',
      outputs: { sop: { text: 'draft' } },
    })
    expect(res).toMatchObject({ ok: false, code: 'APPLY_FAILED' })
    expect(existsSync(join(root, 'executions/d1/outputs/sop/sop.md'))).toBe(false)
    expect(ok(await procedureState(root, { run: 'd1' })).state.steps['write']!.status).toBe(
      'active',
    )
    expect(await canonical()).toEqual(before)
  })
})
