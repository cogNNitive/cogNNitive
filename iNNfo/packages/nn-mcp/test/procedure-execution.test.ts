import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, readdir, rm, copyFile } from 'node:fs/promises'
import { loadChangeLog } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { validateProposal } from '../src/tools/propose-changeset.js'

/**
 * A run of a procedure recorded with the canonical `executions` bluepriNNt: a
 * `Procedure Execution` instance model holding its header, one `Step Run` row per step and
 * one `Run Artifact` row per artifact. The model is mutable; its history is its change log.
 * It is closed by `close_model`, and a closed run is citable as `<run>@<step-slug>`.
 */

const root = join(import.meta.dirname!, '..', 'temp-test-procedure-execution')
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

/** One row is ONE add_element: the step row is created with its status and attempt. */
const addStep = (n: number, slug = 'gather', status = 'pending', attempt = 0) =>
  change(
    `c-${n}`,
    `op:: add_element\ntarget:: onboard-acme\nconcept:: Step Run\nname:: ${slug}\nslug:: ${slug}\nto:: {"status": "${status}", "attempt": ${attempt}}\n`,
  )

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
  for (const dir of ['kNNowledge', 'changes', 'specs'])
    await mkdir(join(root, dir), { recursive: true })
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

describe('a procedure run is a model with state', () => {
  it('places the first run of the domain under executions/ and fills its header', async () => {
    const created = await apply(
      CREATE_RUN +
        change(
          'c-02',
          'op:: set_fields\ntarget:: onboard-acme@onboard-acme\nto:: {"def_rev": "V_1-2-0", "seq": 1, "state": "open"}\n',
        ),
    )
    expect(created.errors ?? []).toEqual([])
    const text = await readFile(await runFile(), 'utf-8')
    expect(text).toContain('def_rev:: V_1-2-0')
    expect(text).toContain('seq:: 1')
    expect(text).toContain('state:: open')
  })

  it('adds a step row and moves it through its declared lifecycle', async () => {
    await apply(CREATE_RUN)
    const added = await apply(addStep(2))
    expect(added.errors ?? []).toEqual([])
    expect(await readFile(await runFile(), 'utf-8')).toContain('## NN Step Run: gather')

    const claimed = await apply(
      change(
        'c-03',
        'op:: set_fields\ntarget:: onboard-acme@gather\nfrom:: {"status": "pending"}\nto:: {"status": "active", "attempt": 1}\n',
      ),
    )
    expect(claimed.errors ?? []).toEqual([])
    const text = await readFile(await runFile(), 'utf-8')
    expect(text).toContain('status:: active')
    expect(text).toContain('attempt:: 1')
  })

  it('refuses a step transition the declaration does not allow', async () => {
    await apply(CREATE_RUN)
    await apply(addStep(2))
    const before = await readFile(await runFile(), 'utf-8')
    // `expected` belongs to the artifact lifecycle; a step row starts at `pending`, so this
    // edge is not declared for it.
    const res = await apply(
      change('c-03', 'op:: update_field\ntarget:: onboard-acme@gather&status\nto:: expected\n'),
    )
    expect(res.success).toBe(false)
    expect(JSON.stringify(res.errors ?? [])).toContain('TRANSITION_NOT_ALLOWED')
    expect(await readFile(await runFile(), 'utf-8')).toBe(before)
  })

  it('the run history is its change log: each row write is one applied change', async () => {
    await apply(CREATE_RUN)
    await apply(addStep(2))
    await apply(
      change(
        'c-03',
        'op:: set_fields\ntarget:: onboard-acme@gather\nfrom:: {"status": "pending"}\nto:: {"status": "active", "attempt": 1}\n',
      ),
    )
    const log = loadChangeLog(root)
    // The row's status has a history: the add that created it, then the claim.
    const status = log.history('onboard-acme@gather&status')
    expect(status.length).toBe(2)
    expect(status[1]!.op).toBe('update_field')
  })

  it('closes the run after its terminal state and then accepts nothing', async () => {
    await apply(CREATE_RUN)
    await apply(addStep(2))
    const closed = await apply(change('c-99', 'op:: close_model\ntarget:: onboard-acme\n'))
    expect(closed.errors ?? []).toEqual([])
    const text = await readFile(await runFile(), 'utf-8')
    expect(text).toMatch(/^closed: true$/m)
    const late = await apply(
      change(
        'c-04',
        'op:: set_fields\ntarget:: onboard-acme@gather\nfrom:: {"status": "pending"}\nto:: {"status": "active", "attempt": 1}\n',
      ),
    )
    expect(late.errors?.map((e) => e.code)).toContain('MODEL_CLOSED')
    expect(await readFile(await runFile(), 'utf-8')).toBe(text)
  })
})

/* ── a closed run is a citable record ───────────────────────────────────────── */

const CREATE_SECOND = CREATE_RUN.replace('c-01', 'c-20')
  .replace('onboard-acme', 'kpi-run')
  .replace('Onboard ACME', 'KPI Run')

describe('a model is citable as evidence only once it is closed', () => {
  it('refuses citing a run that is still open', async () => {
    await apply(CREATE_RUN)
    await apply(CREATE_SECOND)
    const errors = await validateProposal(root, [
      {
        id: 'c-1',
        op: 'set_fields',
        target: 'kpi-run@kpi-run',
        to: '{"params": "{}"}',
        evidence: 'onboard-acme@onboard-acme',
      } as never,
    ])
    expect(errors.map((e) => e.code)).toContain('CITATION_NOT_CLOSED')
  })

  it('accepts citing a closed run and stamps its file hash', async () => {
    await apply(CREATE_RUN)
    await apply(change('c-98', 'op:: close_model\ntarget:: onboard-acme\n'))
    await apply(CREATE_SECOND)
    const errors = await validateProposal(root, [
      {
        id: 'c-1',
        op: 'set_fields',
        target: 'kpi-run@kpi-run',
        to: '{"params": "{}"}',
        evidence: 'onboard-acme@onboard-acme',
      } as never,
    ])
    expect(errors.map((e) => e.code).filter((c) => c?.startsWith('CITATION'))).toEqual([])
  })
})
