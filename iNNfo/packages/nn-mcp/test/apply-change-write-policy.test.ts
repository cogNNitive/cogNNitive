import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { applyChange } from '../src/tools/apply-change.js'

/**
 * write-policy: `apply_change` refuses a change whose kind of write the concept's
 * resolved write policy does not allow. The policy is declared on the Concept
 * Definition, defaulted by the bluepriNNt frontmatter, and tightened by the domaiNN.
 */

const root = join(import.meta.dirname!, '..', 'temp-test-write-policy')
const knowledgeDir = join(root, 'kNNowledge')
const specsDir = join(root, 'specs')
const changesDir = join(root, 'changes')

const blueprint = (frontmatterExtra = '') => `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "V_0-2-0"
blueprint_name: "ops"
title: "Ops Template"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "specs/iNNfo_V_0-3-0_NN.md"
${frontmatterExtra}---

# NN Concept Definition
## NN Concept Definition: Work
type:: list

## NN Concept Definition: Log
type:: list
write_policy:: append-only

# NN Field Definition
## NN Field Definition: statement
concept:: Work
type:: string

## NN Field Definition: note
concept:: Log
type:: string
`

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "ops_V_0-2-0"
  url: "specs/ops_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Ops"
---

# NN index
* [[Work]]
* [[Log]]

# NN Work
## NN Work: Vision
statement:: Accelerate green energy

# NN Log
## NN Log: Entry One
note:: first
`

/** A `scope: true` document at the domaiNN root: it supplies the root's Level-3 values. */
const ROOT_SCOPE = (policy: string) => `---
level: 3
scope: true
title: "Root scope"
---

# NN Scope

## NN Scope: Root
write_policy:: ${policy}
`

const DOMAIN = `---
level: 3
parent_spec: domaiNN
workspace_id: "ws-1"
title: "Test"
---

# NN index

* [[domaiNN]]

# NN domaiNN

## NN domaiNN: Test
knowledge_dir:: kNNowledge/
`

function changeset(body: string): string {
  return `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.invalid/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: proposed
title: "Write policy"
workspace_id: "ws-1"
---

# NN index

* [[Change]]

# NN Change

## NN Change: c-01
${body}evidence:: decision
`
}

const UPDATE_LOG = 'op:: update_field\ntarget:: ops@Entry One&note\nto:: rewritten\n'
const UPDATE_WORK = 'op:: update_field\ntarget:: ops@Vision&statement\nto:: Decarbonise\n'
const ADD_LOG = 'op:: add_element\ntarget:: ops\nconcept:: Log\nname:: Entry Two\n'

async function apply(body: string) {
  const rel = 'changes/policy_changes_NN.md'
  await writeFile(join(root, rel), changeset(body), 'utf-8')
  return applyChange(root, rel)
}

const modelText = () => readFile(join(knowledgeDir, 'ops_NN.md'), 'utf-8')

async function setup({ blueprintFm = '', domain }: { blueprintFm?: string; domain?: string } = {}) {
  await writeFile(join(specsDir, 'ops_V_0-2-0_NN.md'), blueprint(blueprintFm), 'utf-8')
  if (domain) {
    await writeFile(join(root, 'domaiNN_NN.md'), DOMAIN, 'utf-8')
    await writeFile(join(root, 'scope_NN.md'), ROOT_SCOPE(domain), 'utf-8')
  }
}

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, specsDir, changesDir]) await mkdir(dir, { recursive: true })
  await writeFile(
    join(specsDir, 'iNNfo_V_0-3-0_NN.md'),
    '---\nspec_version: "V_0-3-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNition_V_0-1-0"\n  url: "specs/defiNNition_V_0-1-0_NN.md"\n---\n',
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNition_V_0-1-0_NN.md'),
    '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n',
    'utf-8',
  )
  await writeFile(join(knowledgeDir, 'ops_NN.md'), MODEL, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('apply_change enforces the concept write policy', () => {
  it('refuses an update on an append-only concept and writes nothing', async () => {
    await setup()
    const res = await apply(UPDATE_LOG)
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
    expect(res.errors?.map((e) => e.message).join(' ')).toContain('"Log" is append-only')
    expect(await modelText()).toBe(MODEL)
  })

  it('accepts an addition on an append-only concept', async () => {
    await setup()
    const res = await apply(ADD_LOG)
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    expect(await modelText()).toContain('## NN Log: Entry Two')
  })

  it('keeps updating a concept that declares nothing (mutable by default)', async () => {
    await setup()
    const res = await apply(UPDATE_WORK)
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    expect(await modelText()).toContain('statement:: Decarbonise')
  })

  it('applies the bluepriNNt frontmatter default to concepts that declare nothing', async () => {
    await setup({ blueprintFm: 'write_policy: read-only\n' })
    const res = await apply(UPDATE_WORK)
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
    expect(await modelText()).toBe(MODEL)
  })

  it('lets the domaiNN tighten a mutable concept', async () => {
    await setup({ domain: 'read-only' })
    const res = await apply(UPDATE_WORK)
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
    expect(await modelText()).toBe(MODEL)
  })

  it('fails closed when the domaiNN scope chain cannot be read', async () => {
    await setup({ domain: 'mutable' })
    await writeFile(join(root, 'scope_NN.md'), '---\nscope: true\ntitle: [unclosed\n---\n', 'utf-8')
    const res = await apply(UPDATE_WORK)
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_UNRESOLVED')
    expect(await modelText()).toBe(MODEL)
  })

  it('does not let the domaiNN loosen an append-only concept', async () => {
    await setup({ domain: 'mutable' })
    const res = await apply(UPDATE_LOG)
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
  })
})

/* ── whole-model operations on distributed instances ───────────────────────── */

const RUNS_BLUEPRINT = (runPolicy: string) => `---
spec_version: "V_0-1-0"
level: 2
title: "Runs"
parent_spec:
  name: "iNNfo_V_0-7-0"
  url: "specs/iNNfo_V_0-7-0_NN.md"
---

# NN Concept Definition

## NN Concept Definition: Run
type:: list
storage:: distributed
placement:: runs/{slug}/
${runPolicy ? `write_policy:: ${runPolicy}\n` : ''}
## NN Concept Definition: Note
type:: list

# NN Field Definition

## NN Field Definition: text
concept:: Note
type:: string
`

/** Distributed storage is read from bluepriNNts under iNNfo V_0-7-0 or later. */
const L1_V07 = `---
spec_version: "V_0-7-0"
level: 1
title: "iNNfo"
parent_spec:
  name: "defiNNition_V_0-1-0"
  url: "specs/defiNNition_V_0-1-0_NN.md"
---
`

const ADD_RUN =
  'op:: add_model\ntarget:: first-run\nconcept:: Run\nblueprint_name:: runs_V_0-1-0\nblueprint_url:: specs/bluepriNNts/runs_V_0-1-0_NN.md\nname:: First Run\n'

async function setupRuns(runPolicy: string): Promise<void> {
  await mkdir(join(specsDir, 'bluepriNNts'), { recursive: true })
  await writeFile(join(specsDir, 'iNNfo_V_0-7-0_NN.md'), L1_V07, 'utf-8')
  // The domain index learns a bluepriNNt's storage from the models that already use it.
  await writeFile(
    join(knowledgeDir, 'notes_NN.md'),
    '---\nlevel: 3\ntitle: "Notes"\nknowledge_version: "V_0-1-0"\nparent_spec:\n  name: "runs_V_0-1-0"\n  url: "specs/bluepriNNts/runs_V_0-1-0_NN.md"\n---\n\n# NN Note\n\n## NN Note: First\ntext:: hello\n',
    'utf-8',
  )
  await writeFile(join(specsDir, 'bluepriNNts', 'runs_V_0-1-0_NN.md'), RUNS_BLUEPRINT(runPolicy), 'utf-8')
}

/** Creates the instance under a mutable Run, then switches the declaration. */
async function createRunThenDeclare(runPolicy: string): Promise<string> {
  await setupRuns('')
  const created = await apply(ADD_RUN)
  expect(created.errors ?? []).toEqual([])
  await setupRuns(runPolicy)
  return readFile(join(root, 'runs', 'first-run', 'first-run_runs_NN.md'), 'utf-8')
}

describe('apply_change enforces the write policy on whole models', () => {
  it('accepts creating an instance of an append-only distributed concept', async () => {
    await setupRuns('append-only')
    const res = await apply(ADD_RUN)
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
  })

  it('refuses creating an instance of a read-only distributed concept', async () => {
    await setupRuns('read-only')
    const res = await apply(ADD_RUN)
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
    expect(res.errors?.map((e) => e.message).join(' ')).toContain('"Run" is read-only')
  })

  it('refuses removing an append-only instance and keeps its file', async () => {
    const before = await createRunThenDeclare('append-only')
    const res = await apply('op:: remove_model\ntarget:: first-run\n')
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
    expect(await readFile(join(root, 'runs', 'first-run', 'first-run_runs_NN.md'), 'utf-8')).toBe(before)
  })

  it('refuses moving an append-only instance', async () => {
    await createRunThenDeclare('append-only')
    const res = await apply('op:: move_model\ntarget:: first-run\nto:: second-run\n')
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('WRITE_POLICY_DENIED')
  })

  it('still removes an instance whose concept declares nothing', async () => {
    await createRunThenDeclare('')
    const res = await apply('op:: remove_model\ntarget:: first-run\n')
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
  })
})

/* ── closing event ─────────────────────────────────────────────────────────── */

describe('close_model records a closing event after which nothing is written', () => {
  it('closes the model by setting closed: true in its frontmatter', async () => {
    await setup()
    const res = await apply('op:: close_model\ntarget:: ops\n')
    expect(res.errors ?? []).toEqual([])
    expect(res.success).toBe(true)
    expect(await modelText()).toMatch(/^closed: true$/m)
  })

  it('refuses an addition to a closed model, even on an append-only concept', async () => {
    await setup()
    await apply('op:: close_model\ntarget:: ops\n')
    const closed = await modelText()
    const res = await apply(ADD_LOG)
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('MODEL_CLOSED')
    expect(await modelText()).toBe(closed)
  })

  it('refuses a write placed after the closing event in the same changeset', async () => {
    await setup()
    const rel = 'changes/policy_changes_NN.md'
    const text = changeset('op:: close_model\ntarget:: ops\n').replace(
      'evidence:: decision\n',
      'evidence:: decision\n\n## NN Change: c-02\n' + ADD_LOG + 'evidence:: decision\n',
    )
    await writeFile(join(root, rel), text, 'utf-8')
    const res = await applyChange(root, rel)
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('MODEL_CLOSED')
    expect(await modelText()).toBe(MODEL)
  })

  it('refuses closing a model twice', async () => {
    await setup()
    await apply('op:: close_model\ntarget:: ops\n')
    const res = await apply('op:: close_model\ntarget:: ops\n')
    expect(res.success).toBe(false)
    expect(res.errors?.map((e) => e.code)).toContain('MODEL_CLOSED')
  })
})
