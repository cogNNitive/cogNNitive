import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { parseChangeset } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { writeProposedChangeset } from '../src/tools/propose-changeset.js'

const root = join(import.meta.dirname!, '..', 'temp-test-rejected')
const knowledgeDir = join(root, 'kNNowledge')
const specsDir = join(root, 'specs')

const BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "V_0-2-0"
blueprint_name: "strategy"
title: "Strategy Template"
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
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Vision
statement:: Accelerate green energy
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
  await writeFile(join(specsDir, 'defiNNition_V_0-1-0_NN.md'), '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n', 'utf-8')
  await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
  await writeFile(join(knowledgeDir, 'strategy_NN.md'), MODEL, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('a rejected changeset is persisted', () => {
  it('an unresolved citation is returned as rejected but the file stays proposed and can be retried', async () => {
    const written = await writeProposedChangeset(root, {
      changes: [
        { id: 'c-01', op: 'update_field', target: 'strategy@Vision&statement', to: 'x', evidence: 'sources/import/missing.md' },
      ],
    })
    const before = await readFile(written.absolutePath, 'utf-8')
    const res = await applyChange(root, written.path)
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors![0].code).toBe('CITATION_UNRESOLVED')
    expect(await readFile(written.absolutePath, 'utf-8')).toBe(before)
    expect(parseChangeset(before).frontmatter.status).toBe('proposed')

    // The source arrives later: the same changeset now applies.
    await mkdir(join(root, 'sources', 'import'), { recursive: true })
    await writeFile(join(root, 'sources', 'import', 'missing.md'), '# Now here', 'utf-8')
    const again = await applyChange(root, written.path)
    expect(again.success).toBe(true)
    expect(again.status).toBe('applied')
  })

  it('a validation failure is returned-only: the file stays proposed', async () => {
    const written = await writeProposedChangeset(root, {
      changes: [{ id: 'c-01', op: 'update_field', target: 'strategy@Vision&statement', to: 'x' }],
    })
    await writeFile(join(knowledgeDir, 'strategy_NN.md'), MODEL.replace('level: 3', 'level: 9'), 'utf-8')
    const before = await readFile(written.absolutePath, 'utf-8')
    const res = await applyChange(root, written.path)
    expect(res.success).toBe(false)
    expect(await readFile(written.absolutePath, 'utf-8')).toBe(before)
  })

  it('a rejected changeset with unchanged content returns the recorded rejection', async () => {
    const written = await writeProposedChangeset(root, {
      changes: [{ id: 'c-01', op: 'add_element', target: 'strategy@Nope', concept: 'Nope', name: 'Ghost' }],
    })
    await applyChange(root, written.path)
    const before = await readFile(written.absolutePath, 'utf-8')
    expect(parseChangeset(before).frontmatter.status).toBe('rejected')
    const again = await applyChange(root, written.path)
    expect(again.success).toBe(false)
    expect(again.errors![0].code).toBe('CHANGESET_REJECTED')
    expect(await readFile(written.absolutePath, 'utf-8')).toBe(before)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL)
  })

  it('an edited rejected changeset is re-sealed and re-enters apply', async () => {
    const written = await writeProposedChangeset(root, {
      changes: [{ id: 'c-01', op: 'add_element', target: 'strategy@Nope', concept: 'Nope', name: 'Ghost' }],
    })
    await applyChange(root, written.path)
    const edited = (await readFile(written.absolutePath, 'utf-8')).replaceAll('Nope', 'Work')
    await writeFile(written.absolutePath, edited, 'utf-8')
    const res = await applyChange(root, written.path)
    expect(res.errors ?? []).toEqual([])
    expect(res.status).toBe('applied')
    const doc = parseChangeset(await readFile(written.absolutePath, 'utf-8'))
    expect(doc.frontmatter.status).toBe('applied')
    expect(doc.frontmatter.resolution).toBeUndefined()
    expect(doc.changes[0].status).toBe('applied')
  })

  it('a mutation the bluepriNNt refuses persists the rejection and keeps earlier annotations out', async () => {
    const written = await writeProposedChangeset(root, {
      changes: [
        { id: 'c-01', op: 'update_field', target: 'strategy@Vision&statement', to: 'Fine' },
        { id: 'c-02', op: 'add_element', target: 'strategy@Nope', concept: 'Nope', name: 'Ghost' },
      ],
    })
    const res = await applyChange(root, written.path)
    expect(res.status).toBe('rejected')

    const doc = parseChangeset(await readFile(written.absolutePath, 'utf-8'))
    expect(doc.frontmatter.status).toBe('rejected')
    expect(doc.changes[0].status).toBeUndefined()
    expect(doc.changes[1].status).toBe('rejected')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(MODEL)
  })

  it('a tampered proposal is not persisted as rejected', async () => {
    const written = await writeProposedChangeset(root, {
      changes: [{ id: 'c-01', op: 'update_field', target: 'strategy@Vision&statement', to: 'x' }],
    })
    const tampered = (await readFile(written.absolutePath, 'utf-8')).replace('to:: x', 'to:: y')
    await writeFile(written.absolutePath, tampered, 'utf-8')
    const res = await applyChange(root, written.path)
    expect(res.errors![0].code).toBe('PROPOSAL_TAMPERED')
    expect(await readFile(written.absolutePath, 'utf-8')).toBe(tampered)
    expect(parseChangeset(tampered).frontmatter.status).toBe('proposed')
  })
})
