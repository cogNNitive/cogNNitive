import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm, copyFile } from 'node:fs/promises'
import { applyChange } from '../src/tools/apply-change.js'
import { validateProposal } from '../src/tools/propose-changeset.js'

/**
 * A run of a procedure recorded with the canonical `executions` bluepriNNt: a
 * `Procedure Execution` instance model whose `Execution Event` elements are
 * append-only (write once), closed by `close_model` after its terminal event.
 * The domain holds no run yet: the first one must still land in its placement.
 */

const root = join(import.meta.dirname!, '..', 'temp-test-procedure-execution')
const EXECUTIONS_SPEC = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'executions', 'spec_NN.md')
/** The installed package, addressed the way a domain pins a local bluepriNNt. */
const EXECUTIONS_URL = 'specs/bluepriNNts/executions/spec_NN.md'

let seq = 0
async function apply(changes: string): Promise<Awaited<ReturnType<typeof applyChange>>> {
  seq += 1
  const rel = `changes/run-${seq}_changes_NN.md`
  const text = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.invalid/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: proposed
title: "Run ${seq}"
---

# NN Change
${changes}`
  await writeFile(join(root, rel), text, 'utf-8')
  return applyChange(root, rel)
}

const change = (id: string, body: string) => `\n## NN Change: ${id}\n${body}evidence:: decision\n`

const CREATE_RUN = change(
  'c-01',
  `op:: add_model\ntarget:: onboard-acme\nconcept:: Procedure Execution\nblueprint_name:: executions\nblueprint_url:: ${EXECUTIONS_URL}\nname:: Onboard ACME\n`,
)

/** An event is added, then its empty values are filled once (append-only is write-once). */
const addEvent = (n: number) =>
  change(`c-${n}a`, `op:: add_element\ntarget:: onboard-acme\nconcept:: Execution Event\nname:: e-00${n}\n`)

const fillEvent = (n: number, kind: string, extra = '') =>
  change(
    `c-${n}b`,
    `op:: set_fields\ntarget:: onboard-acme@e-00${n}\nto:: {"kind": "${kind}", "actor": "ana", "at": "2026-11-18T09:0${n}:00Z"${extra}}\n`,
  )

async function event(n: number, kind: string, extra = ''): Promise<void> {
  const added = await apply(addEvent(n))
  expect(added.errors ?? []).toEqual([])
  const filled = await apply(fillEvent(n, kind, extra))
  expect(filled.errors ?? []).toEqual([])
}

async function runFile(): Promise<string> {
  const dir = join(root, 'executions', 'onboard-acme')
  const [file] = (await readdir(dir)).filter((f) => f.endsWith('_NN.md'))
  return join(dir, file!)
}

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  // Resolve the canonical bluepriNNt, never a copy installed for the user.
  process.env.INNFO_GLOBAL_DIR = join(root, '.global')
  process.env.INNFO_SKILLS_DIR = join(root, '.skills')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of ['kNNowledge', 'changes', 'specs']) await mkdir(join(root, dir), { recursive: true })
  // The domain carries its bluepriNNt package, as init_domain installs it.
  await mkdir(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  await copyFile(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  delete process.env.INNFO_GLOBAL_DIR
  delete process.env.INNFO_SKILLS_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('a procedure run is an append-only record', () => {
  it('places the first run of the domain under executions/ and fills its header', async () => {
    const created = await apply(
      CREATE_RUN + change('c-02', 'op:: update_field\ntarget:: onboard-acme@Onboard ACME&def_rev\nto:: V_1-2-0\n'),
    )
    expect(created.errors ?? []).toEqual([])
    expect(await readFile(await runFile(), 'utf-8')).toContain('def_rev:: V_1-2-0')
  })

  it('appends events and fills each one once', async () => {
    await apply(CREATE_RUN)
    await event(1, 'started')
    await event(2, 'input_recorded', ', "field": "tax_id", "value": "B12345678"')
    const text = await readFile(await runFile(), 'utf-8')
    expect(text).toContain('## NN Execution Event: e-002')
    expect(text).toContain('value:: B12345678')
  })

  it('refuses changing a value an event already holds', async () => {
    await apply(CREATE_RUN)
    await event(1, 'started')
    const before = await readFile(await runFile(), 'utf-8')
    const res = await apply(change('c-09', 'op:: update_field\ntarget:: onboard-acme@e-001&actor\nto:: mallory\n'))
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
    expect(res.errors?.map((e) => e.message).join(' ')).toContain('"Execution Event" is append-only')
    expect(await readFile(await runFile(), 'utf-8')).toBe(before)
  })

  it('refuses removing an event and removing the run', async () => {
    await apply(CREATE_RUN)
    await event(1, 'started')
    const removeEvent = await apply(change('c-09', 'op:: remove_element\ntarget:: onboard-acme@e-001\n'))
    expect(removeEvent.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
    const removeRun = await apply(change('c-10', 'op:: remove_model\ntarget:: onboard-acme\n'))
    expect(removeRun.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
  })

  it('closes the run after its terminal event and then accepts nothing', async () => {
    await apply(CREATE_RUN)
    await event(1, 'completed')
    const closed = await apply(change('c-99', 'op:: close_model\ntarget:: onboard-acme\n'))
    expect(closed.errors ?? []).toEqual([])
    const text = await readFile(await runFile(), 'utf-8')
    expect(text).toMatch(/^closed: true$/m)
    const late = await apply(addEvent(2))
    expect(late.errors?.map((e) => e.code)).toContain('MODEL_CLOSED')
    expect(await readFile(await runFile(), 'utf-8')).toBe(text)
  })
})

/* ── a closed run is a citable record ───────────────────────────────────────── */

const CREATE_SECOND = CREATE_RUN.replace('c-01', 'c-20').replace('onboard-acme', 'kpi-run').replace('Onboard ACME', 'KPI Run')

/** A change on the second run whose evidence cites the first one. */
const citing = (evidence: string) =>
  change('c-21', 'op:: update_field\ntarget:: kpi-run@KPI Run&params\nto:: {"source": "onboard-acme"}\n').replace(
    'evidence:: decision',
    `evidence:: ${evidence}`,
  )

describe('a model is citable as evidence only once it is closed', () => {
  it('refuses citing a run that is still open', async () => {
    await apply(CREATE_RUN)
    await event(1, 'started')
    await apply(CREATE_SECOND)
    const res = await apply(citing('onboard-acme@e-001'))
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('CITATION_NOT_CLOSED')
  })

  it('accepts citing a closed run and stamps its file hash', async () => {
    await apply(CREATE_RUN)
    await event(1, 'completed')
    await apply(change('c-99', 'op:: close_model\ntarget:: onboard-acme\n'))
    await apply(CREATE_SECOND)
    const res = await apply(citing('onboard-acme@e-001'))
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    const recorded = await readFile(join(root, res.changesetPath!), 'utf-8')
    expect(recorded).toMatch(/evidence_sha256/)
  })

  it('refuses citing an element the closed run does not hold', async () => {
    await apply(CREATE_RUN)
    await apply(change('c-99', 'op:: close_model\ntarget:: onboard-acme\n'))
    await apply(CREATE_SECOND)
    const res = await apply(citing('onboard-acme@e-404'))
    expect(res.errors?.map((e) => e.code)).toContain('CITATION_UNRESOLVED')
  })

  it('propose_changeset applies the same rule', async () => {
    await apply(CREATE_RUN)
    await event(1, 'started')
    const errors = await validateProposal(root, [
      { id: 'c-01', op: 'update_field', target: 'onboard-acme@Onboard ACME&params', to: '{}', evidence: 'onboard-acme@e-001' },
    ])
    expect(errors.map((e) => e.code)).toContain('CITATION_NOT_CLOSED')
  })
})
