/**
 * #637: a document of the `procedures` bluepriNNt is not a discoverable model (its
 * role is `procedure` or `catalog`), yet `apply_change` writes it. The provenance
 * inventory must still see its file, or `check_domain` tells the reader to restore a
 * file that exists.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { applyChange } from '../src/tools/apply-change.js'
import { checkDomain } from '../src/tools/check-workspace.js'

const root = join(import.meta.dirname!, '..', 'temp-test-provenance-procedures')
const knowledgeDir = join(root, 'kNNowledge')
const specsDir = join(root, 'specs')

const BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "V_0-1-0"
blueprint_name: "procedures"
title: "Procedures"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "specs/iNNfo_V_0-3-0_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Work
type:: list

# NN Field Definition
## NN Field Definition: statement
concept:: Work
type:: string
`

const MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "procedures_V_0-1-0"
  url: "specs/procedures_V_0-1-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Demo procedures"
---

# NN Work
## NN Work: First step
slug:: first-step
statement:: Start
`

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, specsDir]) await mkdir(dir, { recursive: true })
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
  await writeFile(join(specsDir, 'procedures_V_0-1-0_NN.md'), BLUEPRINT, 'utf-8')
  await writeFile(join(knowledgeDir, 'demo_procedures_NN.md'), MODEL, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('provenance of a procedures document (#637)', () => {
  it('reports no MODEL_WITHOUT_FILE after a changeset touches an existing procedures document', async () => {
    const applied = await applyChange(root, 'demo_procedures', 'add_element', {
      conceptName: 'Work',
      elementName: 'Second step',
      slug: 'second-step',
    })
    expect(applied.errors ?? []).toEqual([])
    expect(applied.success).toBe(true)

    const report = await checkDomain(root, { offline: true })
    const missing = report.provenance.diagnostics.filter((d) => d.code === 'MODEL_WITHOUT_FILE')
    expect(missing).toEqual([])
  })

  it('still reports MODEL_WITHOUT_FILE when that procedures document is deleted', async () => {
    await applyChange(root, 'demo_procedures', 'add_element', {
      conceptName: 'Work',
      elementName: 'Second step',
      slug: 'second-step',
    })
    await rm(join(knowledgeDir, 'demo_procedures_NN.md'))

    const report = await checkDomain(root, { offline: true })
    const missing = report.provenance.diagnostics.filter((d) => d.code === 'MODEL_WITHOUT_FILE')
    expect(missing).toHaveLength(1)
    expect(missing[0]!.message).toContain('demo_procedures')
  })
})
