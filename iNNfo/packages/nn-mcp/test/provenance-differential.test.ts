import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { computeProposalSha, serializeChangeset } from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { checkDomainProvenance } from '../src/tools/provenance-strict.js'

/**
 * Differential guard against A3 divergence: the fold and the strict replay are
 * two adapters over the same applied log. When the file matches the changes,
 * both must agree there is no drift; when a field is edited by hand, both must
 * report it. Seeded, so a failure is reproducible.
 */

const root = join(import.meta.dirname!, '..', 'temp-test-provenance-differential')
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

/** Deterministic 32-bit LCG: the same seed always yields the same op sequence. */
function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function opSequence(seed: number): ChangeItem[] {
  const random = rng(seed)
  const changes: ChangeItem[] = [
    {
      id: 'c-01',
      op: 'add_model',
      target: 'acme_strategy',
      blueprint_name: BLUEPRINT_NAME,
      blueprint_url: BLUEPRINT_URL,
      name: 'ACME Strategy',
    },
  ]
  const known: string[] = []
  let n = 2
  for (let i = 0; i < 12; i++) {
    const roll = random()
    if (roll < 0.4 || known.length === 0) {
      const name = `Pillar ${String.fromCharCode(65 + i)}`
      const slug = `pillar-${String.fromCharCode(65 + i).toLowerCase()}`
      changes.push({ id: `c-${n++}`, op: 'add_element', target: 'acme_strategy@Work', concept: 'Work', name })
      known.push(slug)
    } else {
      const slug = known[Math.floor(random() * known.length)]
      changes.push({
        id: `c-${n++}`,
        op: 'update_field',
        target: `acme_strategy@${slug}&statement`,
        to: `value-${Math.floor(random() * 1000)}`,
      })
    }
  }
  return changes.map((change) => ({ ...change, evidence: 'decision' }))
}

async function applyOps(seed: number): Promise<void> {
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-6-0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(opSequence(seed)),
    },
    changes: opSequence(seed),
  }
  await writeFile(join(changesDir, `seed_${seed}_changes_NN.md`), serializeChangeset(doc), 'utf-8')
  const result = await applyChange(root, `changes/seed_${seed}_changes_NN.md`)
  expect(result.success).toBe(true)
}

async function createdModelPath(): Promise<string> {
  const names = (await readdir(knowledgeDir)).filter((n) => n.endsWith('_NN.md'))
  return join(knowledgeDir, names.sort()[0])
}

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
  await writeFile(
    join(specsDir, 'defiNNition_V_0-1-0_NN.md'),
    '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n',
    'utf-8',
  )
  await writeFile(join(specsDir, 'strategy_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

/* ── move sequences in an instance model (distributed-storage S6c, R5) ─────── */

const moveRoot = join(import.meta.dirname!, '..', 'temp-test-provenance-differential-move')
const moveChangesDir = join(moveRoot, 'changes')
const moveSpecsDir = join(moveRoot, 'specs')
const moveBlueprintsDir = join(moveSpecsDir, 'bluepriNNts')
const moveSeriesDir = join(moveRoot, 'series', 'villabotijos-today')
const MOVE_EPISODE_REL = 'series/villabotijos-today/assets/welcome/welcome_video-script_NN.md'
const MOVE_BLUEPRINT_NAME = 'video-script_V_0-1-0'
const MOVE_BLUEPRINT_REL = 'specs/bluepriNNts/video-script_V_0-1-0_NN.md'

const MOVE_BLUEPRINT = [
  '---',
  'spec_version: "V_0-1-0"',
  'level: 2',
  'title: "Video"',
  'parent_spec:',
  '  name: "iNNfo_V_0-7-0"',
  '  url: "specs/iNNfo_V_0-7-0_NN.md"',
  '---',
  '',
  '# NN Concept Definition',
  '',
  '## NN Concept Definition: Series',
  'type:: list',
  'storage:: distributed',
  'placement:: series/{slug}/',
  '',
  '## NN Concept Definition: Video',
  'type:: list',
  'container:: Series',
  'storage:: distributed',
  'placement:: {container}/assets/{slug}/',
  '',
  '## NN Concept Definition: Scene',
  'type:: list',
  '',
  '# NN Field Definition',
  '',
  '## NN Field Definition: voice',
  'concept:: Scene',
  'type:: string',
  '',
].join('\n')

const MOVE_SERIES = [
  '---',
  'level: 3',
  'title: "Villabotijos Today"',
  'knowledge_version: "V_0-1-0"',
  'parent_spec:',
  `  name: "${MOVE_BLUEPRINT_NAME}"`,
  `  url: "${MOVE_BLUEPRINT_REL}"`,
  '---',
  '',
  '# NN Series',
  '',
  '## NN Series: Villabotijos Today',
  'slug:: villabotijos-today',
  '',
].join('\n')

async function writeMoveCs(changes: ChangeItem[], name: string): Promise<string> {
  const withEvidence = changes.map((c) => (c.evidence === undefined ? { ...c, evidence: 'decision' } : c))
  const doc = {
    frontmatter: {
      spec_version: 'V_0-4-0',
      level: 3 as const,
      parent_spec: { name: 'changes' as const, url: 'https://example.test/changes/spec_NN.md' },
      blueprint_version: 'V_0-6-0',
      status: 'proposed' as const,
      proposal_sha: computeProposalSha(withEvidence),
    },
    changes: withEvidence,
  }
  await writeFile(join(moveChangesDir, name), serializeChangeset(doc), 'utf-8')
  return 'changes/' + name
}

describe('fold and strict replay agree across a move (distributed-storage S6c)', () => {
  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(moveRoot, '.cache')
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await rm(moveRoot, { recursive: true, force: true })
    for (const dir of [moveChangesDir, moveBlueprintsDir, moveSeriesDir]) await mkdir(dir, { recursive: true })
    await writeFile(join(moveSpecsDir, 'defiNNe_V_0-1-0_NN.md'), '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNe"\n---\n', 'utf-8')
    await writeFile(
      join(moveSpecsDir, 'iNNfo_V_0-7-0_NN.md'),
      '---\nspec_version: "V_0-7-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNe_V_0-1-0"\n  url: "specs/defiNNe_V_0-1-0_NN.md"\n---\n',
      'utf-8',
    )
    await writeFile(join(moveBlueprintsDir, 'video-script_V_0-1-0_NN.md'), MOVE_BLUEPRINT, 'utf-8')
    await writeFile(join(moveSeriesDir, 'villabotijos-today_video-script_NN.md'), MOVE_SERIES, 'utf-8')
  })

  afterEach(async () => {
    delete process.env.INNFO_CACHE_DIR
    vi.restoreAllMocks()
    await rm(moveRoot, { recursive: true, force: true })
  })

  it('a created, edited and renamed instance yields no drift in either mode', async () => {
    expect(
      (
        await applyChange(
          moveRoot,
          await writeMoveCs(
            [
              {
                id: 'c-01',
                op: 'add_model',
                target: 'villabotijos-today/intro',
                concept: 'Video',
                blueprint_name: MOVE_BLUEPRINT_NAME,
                blueprint_url: MOVE_BLUEPRINT_REL,
                name: 'Intro',
              },
              { id: 'c-02', op: 'add_element', target: 'villabotijos-today/intro@Scene', concept: 'Scene', name: '00 Gancho' },
              { id: 'c-03', op: 'update_field', target: 'villabotijos-today/intro@00-gancho&voice', to: 'raspy' },
            ],
            'create_changes_NN.md',
          ),
        )
      ).success,
    ).toBe(true)

    expect(
      (
        await applyChange(
          moveRoot,
          await writeMoveCs(
            [{ id: 'c-01', op: 'move_model', target: 'villabotijos-today/intro', to: 'villabotijos-today/welcome' }],
            'move_changes_NN.md',
          ),
        )
      ).success,
    ).toBe(true)

    expect(
      (
        await applyChange(
          moveRoot,
          await writeMoveCs(
            [{ id: 'c-01', op: 'update_field', target: 'villabotijos-today/welcome@00-gancho&voice', to: 'deep' }],
            'edit_changes_NN.md',
          ),
        )
      ).success,
    ).toBe(true)
    expect(await readFile(join(moveRoot, MOVE_EPISODE_REL), 'utf-8')).toContain('voice:: deep')

    const fold = await checkDomainProvenance(moveRoot)
    const strict = await checkDomainProvenance(moveRoot, { strict: true })
    expect(fold.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD' || d.code === 'MODEL_WITHOUT_FILE')).toEqual([])
    expect(strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD' || d.code === 'MODEL_WITHOUT_RECORD' || d.code === 'MODEL_WITHOUT_FILE')).toEqual([])
    expect(fold.ok).toBe(true)
    expect(strict.ok).toBe(true)
  })

  it('both flag a hand edit made after the move', async () => {
    expect(
      (
        await applyChange(
          moveRoot,
          await writeMoveCs(
            [
              {
                id: 'c-01',
                op: 'add_model',
                target: 'villabotijos-today/intro',
                concept: 'Video',
                blueprint_name: MOVE_BLUEPRINT_NAME,
                blueprint_url: MOVE_BLUEPRINT_REL,
                name: 'Intro',
              },
              { id: 'c-02', op: 'add_element', target: 'villabotijos-today/intro@Scene', concept: 'Scene', name: '00 Gancho' },
              { id: 'c-03', op: 'update_field', target: 'villabotijos-today/intro@00-gancho&voice', to: 'raspy' },
            ],
            'create_changes_NN.md',
          ),
        )
      ).success,
    ).toBe(true)
    expect(
      (
        await applyChange(
          moveRoot,
          await writeMoveCs(
            [{ id: 'c-01', op: 'move_model', target: 'villabotijos-today/intro', to: 'villabotijos-today/welcome' }],
            'move_changes_NN.md',
          ),
        )
      ).success,
    ).toBe(true)

    const path = join(moveRoot, MOVE_EPISODE_REL)
    const content = await readFile(path, 'utf-8')
    await writeFile(path, content.replace('voice:: raspy', 'voice:: raspY'), 'utf-8')

    const fold = await checkDomainProvenance(moveRoot)
    const strict = await checkDomainProvenance(moveRoot, { strict: true })
    expect(fold.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toHaveLength(1)
    expect(strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toHaveLength(1)
  })
})

describe.each([7, 42, 1234])('fold and strict replay agree (seed %i)', (seed) => {
  it('reports no drift when the file matches the changes', async () => {
    await applyOps(seed)

    const fold = await checkDomainProvenance(root)
    const strict = await checkDomainProvenance(root, { strict: true })
    expect(fold.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toEqual([])
    expect(strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toEqual([])
    expect(fold.ok).toBe(true)
    expect(strict.ok).toBe(true)
  })

  it('both flag a hand-edited field', async () => {
    await applyOps(seed)
    const path = await createdModelPath()
    const content = await readFile(path, 'utf-8')
    const edited = content.replace(/(statement:: )value-\d+/, '$1hand edited')
    expect(edited).not.toBe(content)
    await writeFile(path, edited, 'utf-8')

    const fold = await checkDomainProvenance(root)
    const strict = await checkDomainProvenance(root, { strict: true })
    expect(fold.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toHaveLength(1)
    expect(strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toHaveLength(1)
    expect(strict.diagnostics[0].severity).toBe('error')
    expect(strict.ok).toBe(false)
  })
})
