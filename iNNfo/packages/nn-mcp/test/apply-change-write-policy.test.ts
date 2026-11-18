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
