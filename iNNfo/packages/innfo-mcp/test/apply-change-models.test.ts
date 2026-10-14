import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import {
  computeProposalSha,
  serializeChangeset,
  parseChangeset,
  parseKnowledge,
  validateKnowledge as coreValidate,
} from '@cognnitive/innfo-core'
import type { ChangeItem } from '@cognnitive/innfo-core'
import { applyChange } from '../src/tools/apply-change.js'
import { applyWithConsole, type ConsoleWriter } from '../src/tools/console-regeneration.js'

const root = join(import.meta.dirname!, '..', 'temp-test-apply-models')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')

const BLUEPRINT_NAME = 'strategy_V_0-2-0'
const BLUEPRINT_URL = 'specs/strategy_V_0-2-0_NN.md'
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

const LIVE_MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "${BLUEPRINT_NAME}"
  url: "${BLUEPRINT_URL}"
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Vision
statement:: Accelerate green energy
`

const ADD_ACME: ChangeItem = {
  id: 'c-01',
  op: 'add_model',
  target: 'acme',
  blueprint_name: BLUEPRINT_NAME,
  blueprint_url: BLUEPRINT_URL,
  name: 'ACME Strategy',
}

async function writeCs(changes: ChangeItem[], name = 'models_changes_NN.md'): Promise<string> {
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-3-0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(changes),
    },
    changes,
  }
  await writeFile(join(changesDir, name), serializeChangeset(doc), 'utf-8')
  return 'changes/' + name
}

const kFiles = async () => (await readdir(knowledgeDir)).sort()

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, changesDir, specsDir]) await mkdir(dir, { recursive: true })
  await writeFile(
    join(specsDir, 'iNNfo_V_0-3-0_NN.md'),
    '---\nspec_version: "V_0-3-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNition_V_0-1-0"\n  url: "specs/defiNNition_V_0-1-0_NN.md"\n---\n',
    'utf-8',
  )
  await writeFile(join(specsDir, 'defiNNition_V_0-1-0_NN.md'), '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n', 'utf-8')
  await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
  await writeFile(join(knowledgeDir, 'strategy_NN.md'), LIVE_MODEL, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('add_model: model creation', () => {
  it('creates a valid kNNowledge document and records only result_version', async () => {
    const cs = await writeCs([ADD_ACME])
    const res = await applyChange(root, cs)

    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    expect(res.createdModels).toEqual(['acme'])
    expect(await kFiles()).toEqual(['acme_NN.md', 'strategy_NN.md'])

    const created = parseKnowledge(await readFile(join(knowledgeDir, 'acme_NN.md'), 'utf-8'))
    expect(created.frontmatter.title).toBe('ACME Strategy')
    expect(created.frontmatter.parent_spec?.name).toBe(BLUEPRINT_NAME)
    const blueprint = parseKnowledge(BLUEPRINT)
    expect(coreValidate(created, blueprint as never, null, () => null).valid).toBe(true)

    expect(res.models!.acme).toEqual({ result_version: String(created.frontmatter.knowledge_version) })
    expect(res.models!.acme).not.toHaveProperty('base_version')
    const applied = parseChangeset(await readFile(join(root, cs), 'utf-8'))
    expect(applied.frontmatter.models!.acme).not.toHaveProperty('base_version')
    expect(applied.changes[0].status).toBe('applied')
    expect(existsSync(join(knowledgeDir, 'archive'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'acme.tmp'))).toBe(false)
    expect(existsSync(join(changesDir, '.lock'))).toBe(false)
  })

  it('carries an explicit knowledge_version that differs from the parent version', async () => {
    const cs = await writeCs([{ ...ADD_ACME, knowledge_version: 'V_9-9-9' }])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(true)
    expect(await readFile(join(knowledgeDir, 'acme_NN.md'), 'utf-8')).toContain('knowledge_version: "V_9-9-9"')
  })

  it('an existing model conflicts: MODEL_EXISTS, dependants conflicted, file untouched', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const cs = await writeCs([
      { ...ADD_ACME, target: 'strategy' },
      { id: 'c-02', op: 'add_element', target: 'strategy@Work', concept: 'Work', name: 'Extra' },
    ])
    const res = await applyChange(root, cs)

    expect(res.success).toBe(false)
    expect(res.status).toBe('conflict')
    const codes = res.errors!.map((e) => e.code)
    expect(codes).toContain('MODEL_EXISTS')
    expect(codes).toContain('DEPENDS_ON_CONFLICTED_CHANGE')
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
    expect(await kFiles()).toEqual(['strategy_NN.md'])
  })

  it('add_model then add_element in one changeset: scaffold plus element, no extra bump', async () => {
    const cs = await writeCs([
      ADD_ACME,
      { id: 'c-02', op: 'add_element', target: 'acme@Work', concept: 'Work', name: 'Pillar One', fields: { statement: 'Own the market' } },
    ])
    const res = await applyChange(root, cs)

    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    const text = await readFile(join(knowledgeDir, 'acme_NN.md'), 'utf-8')
    expect(text).toContain('Pillar One')
    expect(text).toContain('Own the market')
    expect(text).toContain('Example Work')
    expect(text).toContain('knowledge_version: "V_0-2-0"')
    expect(res.models!.acme).toEqual({ result_version: 'V_0-2-0' })
  })

  it('rejects a change that targets the model before the add_model that creates it', async () => {
    const cs = await writeCs([
      { id: 'c-01', op: 'add_element', target: 'acme@Work', concept: 'Work', name: 'Too Early' },
      { ...ADD_ACME, id: 'c-02' },
    ])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(false)
    expect(res.errors![0].code).toBe('ADD_MODEL_ORDER')
    expect(await kFiles()).toEqual(['strategy_NN.md'])
  })

  it('rejects two add_model changes with the same target', async () => {
    const cs = await writeCs([ADD_ACME, { ...ADD_ACME, id: 'c-02' }])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(false)
    expect(res.errors![0].code).toBe('ADD_MODEL_DUPLICATE')
    expect(await kFiles()).toEqual(['strategy_NN.md'])
  })

  it('an unresolvable bluepriNNt writes nothing', async () => {
    const cs = await writeCs([{ ...ADD_ACME, blueprint_name: 'ghost_V_0-1-0', blueprint_url: 'specs/ghost_V_0-1-0_NN.md' }])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors![0].code).toBe('BLUEPRINT_UNRESOLVED')
    expect(await kFiles()).toEqual(['strategy_NN.md'])
    expect(existsSync(join(changesDir, '.lock'))).toBe(false)
  })

  it('a domain without kNNowledge/ is rejected with DOMAIN_LAYOUT_INVALID', async () => {
    await rm(knowledgeDir, { recursive: true, force: true })
    const cs = await writeCs([ADD_ACME])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(false)
    expect(res.errors![0].code).toBe('DOMAIN_LAYOUT_INVALID')
    expect(existsSync(join(root, 'acme_NN.md'))).toBe(false)
    expect(existsSync(knowledgeDir)).toBe(false)
  })

  it('rejects an unsafe model id', async () => {
    const cs = await writeCs([{ ...ADD_ACME, target: '../outside' }])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(false)
  })

  it.each(['sub/dir/model', 'sub' + String.fromCharCode(92) + 'model'])(
    'rejects a nested model id "%s" without touching kNNowledge/',
    async (target) => {
      const before = await kFiles()
      const cs = await writeCs([{ ...ADD_ACME, target }], 'nested_changes_NN.md').catch((err) => err as Error)
      if (cs instanceof Error) {
        expect(cs.message).toMatch(/plain model id/)
      } else {
        const res = await applyChange(root, cs)
        expect(res.success).toBe(false)
      }
      expect(await kFiles()).toEqual(before)
    },
  )

  it('removes the models this run created when a later persist fails, and keeps pre-existing ones', async () => {
    // A directory squatting on zeta's staging path makes the second write throw.
    await mkdir(join(knowledgeDir, 'zeta.tmp'), { recursive: true })
    const cs = await writeCs([ADD_ACME, { ...ADD_ACME, id: 'c-02', target: 'zeta', name: 'Zeta' }])
    const outcome = await applyChange(root, cs).then(
      (res) => res,
      (err) => err as Error,
    )
    if (!(outcome instanceof Error)) expect(outcome.success).toBe(false)
    expect(existsSync(join(knowledgeDir, 'acme_NN.md'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'zeta_NN.md'))).toBe(false)
    expect(existsSync(join(knowledgeDir, 'strategy_NN.md'))).toBe(true)
    expect(existsSync(join(changesDir, '.lock'))).toBe(false)
  })
})

describe('add_element: concept conformance at mutation time', () => {
  it('an undeclared concept fails in the mutation with the unknown-concept error', async () => {
    const before = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    const cs = await writeCs([{ id: 'c-01', op: 'add_element', target: 'strategy@Unicorn', concept: 'Unicorn', name: 'Sparkle' }])
    const res = await applyChange(root, cs)

    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    const message = res.errors!.map((e) => e.message).join(' ')
    expect(message).toMatch(/Concept "Unicorn" is not declared in the template/)
    expect(message).toMatch(/Declared concepts: Work/)
    expect(await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')).toBe(before)
    expect(existsSync(join(changesDir, '.lock'))).toBe(false)
  })

  it('a declared concept applies in any case', async () => {
    const cs = await writeCs([{ id: 'c-01', op: 'add_element', target: 'strategy@work', concept: 'work', name: 'Second Pillar' }])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(true)
    const text = await readFile(join(knowledgeDir, 'strategy_NN.md'), 'utf-8')
    expect(text).toContain('## NN Work: Second Pillar')
    expect(text).not.toContain('# NN work')
  })

  it('an unresolvable bluepriNNt rejects add_element with BLUEPRINT_UNRESOLVED', async () => {
    await writeFile(
      join(knowledgeDir, 'orphan_NN.md'),
      LIVE_MODEL.replace(BLUEPRINT_NAME, 'ghost_V_0-1-0').replace(BLUEPRINT_URL, 'specs/ghost_V_0-1-0_NN.md'),
      'utf-8',
    )
    const cs = await writeCs([{ id: 'c-01', op: 'add_element', target: 'orphan@Work', concept: 'Work', name: 'X' }])
    const res = await applyChange(root, cs)
    expect(res.success).toBe(false)
    expect(res.errors![0].code).toBe('BLUEPRINT_UNRESOLVED')
  })
})

describe('add_model: manifest reconciliation after commit', () => {
  const writer: ConsoleWriter = async () => ({ path: join(root, 'domaiNN_console.html'), status: 'written', opened: false })

  it('syncs the manifest non-dry after a commit that created a model', async () => {
    const cs = await writeCs([ADD_ACME])
    const syncManifest = vi.fn(async () => ({ written: true, manifest_path: 'domaiNN_NN.md' }))
    const payload = await applyWithConsole(root, () => applyChange(root, cs), { writer, open: false, syncManifest })

    expect(syncManifest).toHaveBeenCalledWith(root, { dry_run: false })
    expect(payload.manifest).toEqual({ written: true, manifest_path: 'domaiNN_NN.md' })
    expect(payload.status).toBe('applied')
  })

  it('a failing sync leaves the apply outcome unchanged', async () => {
    const cs = await writeCs([ADD_ACME])
    const syncManifest = vi.fn(async () => {
      throw new Error('manifest locked')
    })
    const payload = await applyWithConsole(root, () => applyChange(root, cs), { writer, open: false, syncManifest })

    expect(payload.success).toBe(true)
    expect(payload.status).toBe('applied')
    expect((payload.manifest as { error: string }).error).toBe('manifest locked')
    expect((payload.console as { status: string }).status).toBe('written')
  })

  it('does not sync when no model was created', async () => {
    const cs = await writeCs([
      { id: 'c-01', op: 'update_field', target: 'strategy@Vision&statement', from: 'Accelerate green energy', to: 'Accelerate clean energy' },
    ])
    const syncManifest = vi.fn(async () => ({}))
    const payload = await applyWithConsole(root, () => applyChange(root, cs), { writer, open: false, syncManifest })
    expect(payload.status).toBe('applied')
    expect(syncManifest).not.toHaveBeenCalled()
    expect(payload).not.toHaveProperty('manifest')
  })

  it('the default reconciler runs against a domain without a manifest without failing', async () => {
    const cs = await writeCs([ADD_ACME])
    const payload = await applyWithConsole(root, () => applyChange(root, cs), { writer, open: false })
    expect(payload.status).toBe('applied')
    expect((payload.manifest as { written: boolean }).written).toBe(false)
  })
})
