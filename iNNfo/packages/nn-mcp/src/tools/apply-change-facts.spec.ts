import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  parseChangeset,
  verifyProposalSha,
  computeProposalSha,
  serializeChangeset,
  parseKnowledge,
} from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'
import { proposeChangeset } from './propose-changeset'
import { applyChange } from './apply-change'
import { validateKnowledge } from './validate'
import { rmWithRetry } from '../../test/helpers/fs-retry'
import type { ConsoleWriter } from './console-regeneration'

const root = join(import.meta.dirname!, '..', '..', 'temp-test-facts')
const knowledgeDir = join(root, 'kNNowledge')
const changesDir = join(root, 'changes')
const specsDir = join(root, 'specs')
const sourcesDir = join(root, 'sources', 'import')
const consolePath = join(root, 'domaiNN_console.html')

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
  name: "strategy_V_0-2-0"
  url: "specs/strategy_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Strategy"
---

# NN index
* [[Work]]

# NN Work
## NN Work: Vision
slug:: vision
statement:: Accelerate green energy
`

const writer: ConsoleWriter = async () => ({ path: consolePath, status: 'written', opened: false })
const propose = (operations: unknown[]) =>
  proposeChangeset(root, { operations, open: false }, { writer })

const UPDATE = {
  op: 'update_field',
  target: 'strategy@vision&statement',
  from: 'Accelerate green energy',
  to: 'Accelerate clean energy',
}

function sha(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

async function readApplied(): Promise<ReturnType<typeof parseChangeset>> {
  const files = await (await import('node:fs/promises')).readdir(changesDir)
  expect(files).toHaveLength(1)
  return parseChangeset(await readFile(join(changesDir, files[0]), 'utf-8'))
}

beforeEach(async () => {
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  await rm(root, { recursive: true, force: true })
  for (const dir of [knowledgeDir, specsDir, sourcesDir, changesDir]) await mkdir(dir, { recursive: true })
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
  await writeFile(join(knowledgeDir, 'strategy_NN.md'), LIVE_MODEL, 'utf-8')
  await writeFile(join(sourcesDir, 'a.md'), '# One\nA body\n', 'utf-8')
  await writeFile(join(sourcesDir, 'b.md'), '# Two\nB body\n', 'utf-8')
})

afterEach(async () => {
  delete process.env.INNFO_CACHE_DIR
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('execution facts at apply', () => {
  it('stamps resolved_target on applied changes only', async () => {
    const proposed = await propose([
      { ...UPDATE, evidence: 'sources/import/a.md' },
      { ...UPDATE, to: 'other', evidence: 'sources/import/a.md' },
    ])
    expect(proposed.success).toBe(true)
    const applied = await applyChange(root, proposed.changeset!)
    expect(applied.success).toBe(true)

    const doc = await readApplied()
    const appliedChange = doc.changes.find((c) => c.id === 'c-01')!
    expect(appliedChange.resolved_target).toBe('strategy@vision&statement')
  })

  it('stamps one evidence sha per entry, in order, and none for unknown', async () => {
    const proposed = await propose([
      { ...UPDATE, evidence: '[sources/import/a.md, sources/import/b.md]' },
    ])
    await applyChange(root, proposed.changeset!)
    const doc = await readApplied()
    expect(doc.changes[0].evidence_sha256).toEqual([
      sha('# One\nA body\n'),
      sha('# Two\nB body\n'),
    ])
  })

  it('leaves decision and unknown evidence without a sha', async () => {
    const proposed = await propose([
      { ...UPDATE, to: 'by decision', evidence: 'decision' },
      { ...UPDATE, to: 'by unknown', evidence: 'unknown' },
    ])
    await applyChange(root, proposed.changeset!)
    const doc = await readApplied()
    expect(doc.changes.map((c) => c.evidence_sha256)).toEqual([undefined, undefined])
  })

  it('keeps the seal valid after the facts are written back', async () => {
    const proposed = await propose([{ ...UPDATE, evidence: 'sources/import/a.md' }])
    await applyChange(root, proposed.changeset!)
    const doc = await readApplied()
    expect(doc.changes[0].resolved_target).toBe('strategy@vision&statement')
    expect(verifyProposalSha(doc)).toBe(true)
  })

  it('overwrites a resolved_target a proposal pre-carried', async () => {
    const proposed = await propose([
      { ...UPDATE, evidence: 'sources/import/a.md', resolved_target: 'other@x&y' },
    ])
    await applyChange(root, proposed.changeset!)
    const doc = await readApplied()
    expect(doc.changes[0].resolved_target).toBe('strategy@vision&statement')
  })

  it('shares applied_at across the batch and clamps it past the latest applied change', async () => {
    const future = '2099-01-01T00:00:00.000Z'
    await writeFile(
      join(changesDir, 'seed_agent_20261010T120000Z_changes_NN.md'),
      [
        '---',
        'spec_version: "V_0-4-0"',
        'level: 3',
        'parent_spec:',
        '  name: changes',
        '  url: "https://example.test/changes/spec_NN.md"',
        'blueprint_version: "V_0-6-0"',
        'status: applied',
        `applied_at: "${future}"`,
        '---',
        '',
        '# NN Change',
        '',
        '## NN Change: c-01',
        'op:: update_field',
        'target:: strategy@vision&statement',
        'to:: seeded',
        'evidence:: decision',
        `status:: applied`,
        `applied_at:: ${future}`,
      ].join('\n'),
      'utf-8',
    )

    const second = await propose([
      { ...UPDATE, to: 'second', evidence: 'sources/import/a.md' },
      { ...UPDATE, to: 'third', evidence: 'sources/import/a.md' },
    ])
    await applyChange(root, second.changeset!)
    const doc = parseChangeset(await readFile(join(root, second.changeset!), 'utf-8'))
    const times = doc.changes.map((c) => c.applied_at)
    expect(new Set(times).size).toBe(1)
    expect(times[0]! > future).toBe(true)
  })
})

/* ── add_model of a distributed instance (distributed-storage S6a) ───────────
 *
 * A self-contained domaiNN whose local bluepriNNt declares `Series` and `Video`
 * as distributed (design A1/A2): `Series` is the container stored at
 * `series/{slug}/`, a `Video` instance at `{container}/assets/{slug}/`. The
 * placement path is therefore real, not mocked, and no network is needed.
 */
const iRoot = join(import.meta.dirname!, '..', '..', 'temp-test-facts-instance')
const iChangesDir = join(iRoot, 'changes')
const iSpecsDir = join(iRoot, 'specs')
const iBlueprintsDir = join(iSpecsDir, 'bluepriNNts')
const iKnowledgeDir = join(iRoot, 'kNNowledge')
const iSeriesDir = join(iRoot, 'series', 'villabotijos-today')
const EPISODE_REL = 'series/villabotijos-today/assets/new-episode/new-episode_video-script_NN.md'

const VIDEO_BLUEPRINT_NAME = 'video-script_V_0-1-0'
const VIDEO_BLUEPRINT_REL = 'specs/bluepriNNts/video-script_V_0-1-0_NN.md'

const VIDEO_BLUEPRINT = [
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
  '## NN Field Definition: mood',
  'concept:: Scene',
  'type:: select',
  'options:: [calm, tense]',
  '',
  '## NN Field Definition: related',
  'concept:: Video',
  'type:: reference',
  '',
].join('\n')

const LEVEL1_CONTENT = [
  '---',
  'spec_version: "V_0-7-0"',
  'level: 1',
  'title: "iNNfo"',
  'parent_spec:',
  '  name: "defiNNe_V_0-1-0"',
  '  url: "specs/defiNNe_V_0-1-0_NN.md"',
  '---',
  '',
].join('\n')

const LEVEL0_CONTENT = ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "defiNNe"', '---', ''].join('\n')

/** A `Series` instance model: the container a `Video` instance hangs from. */
function seriesModel(slug: string, title: string): string {
  return [
    '---',
    'level: 3',
    `title: "${title}"`,
    'knowledge_version: "V_0-1-0"',
    'parent_spec:',
    `  name: "${VIDEO_BLUEPRINT_NAME}"`,
    `  url: "${VIDEO_BLUEPRINT_REL}"`,
    '---',
    '',
    '# NN Series',
    '',
    `## NN Series: ${title}`,
    `slug:: ${slug}`,
    '',
  ].join('\n')
}

/** A `Video` instance model holding one `Scene`. */
function videoModel(slug: string, title: string, scene: { name: string; slug: string; voice: string }): string {
  return [
    '---',
    'level: 3',
    `title: "${title}"`,
    'knowledge_version: "V_0-1-0"',
    'parent_spec:',
    `  name: "${VIDEO_BLUEPRINT_NAME}"`,
    `  url: "${VIDEO_BLUEPRINT_REL}"`,
    '---',
    '',
    '# NN Video',
    '',
    `## NN Video: ${title}`,
    `slug:: ${slug}`,
    '',
    '# NN Scene',
    '',
    `## NN Scene: ${scene.name}`,
    `slug:: ${scene.slug}`,
    `voice:: ${scene.voice}`,
    'mood:: calm',
    '',
  ].join('\n')
}

async function writeInstanceFile(rel: string, content: string): Promise<string> {
  const abs = join(iRoot, rel)
  await mkdir(join(abs, '..'), { recursive: true })
  await writeFile(abs, content, 'utf-8')
  return abs
}

async function writeInstanceCs(changes: ChangeItem[], name = 'instance_changes_NN.md'): Promise<string> {
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
  await writeFile(join(iChangesDir, name), serializeChangeset(doc), 'utf-8')
  return 'changes/' + name
}

const ADD_EPISODE: ChangeItem = {
  id: 'c-01',
  op: 'add_model',
  target: 'villabotijos-today/new-episode',
  concept: 'Video',
  blueprint_name: VIDEO_BLUEPRINT_NAME,
  blueprint_url: VIDEO_BLUEPRINT_REL,
  name: 'New Episode',
}

async function applyInstance(changes: ChangeItem[], name?: string) {
  const cs = await writeInstanceCs(changes, name)
  return applyChange(iRoot, cs)
}

describe('add_model of a distributed instance (distributed-storage S6a)', () => {
  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(iRoot, '.cache')
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await rmWithRetry(iRoot)
    for (const dir of [iChangesDir, iBlueprintsDir, iKnowledgeDir, iSeriesDir]) {
      await mkdir(dir, { recursive: true })
    }
    await writeFile(join(iSpecsDir, 'defiNNe_V_0-1-0_NN.md'), LEVEL0_CONTENT, 'utf-8')
    await writeFile(join(iSpecsDir, 'iNNfo_V_0-7-0_NN.md'), LEVEL1_CONTENT, 'utf-8')
    await writeFile(join(iBlueprintsDir, 'video-script_V_0-1-0_NN.md'), VIDEO_BLUEPRINT, 'utf-8')
    await writeFile(
      join(iSeriesDir, 'villabotijos-today_video-script_NN.md'),
      seriesModel('villabotijos-today', 'Villabotijos Today'),
      'utf-8',
    )
  })

  afterEach(async () => {
    delete process.env.INNFO_CACHE_DIR
    vi.restoreAllMocks()
    await rmWithRetry(iRoot)
  })

  it('creates the model at its placement path with the root element and no kNNowledge file', async () => {
    const res = await applyInstance([ADD_EPISODE])

    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    expect(existsSync(join(iRoot, EPISODE_REL))).toBe(true)
    // Not written under kNNowledge/, and the folder there is never required.
    expect(await readdir(iKnowledgeDir)).toEqual([])
    expect(res.errors).toBeUndefined()

    const created = parseKnowledge(await readFile(join(iRoot, EPISODE_REL), 'utf-8'))
    const videos = created.elements.get('Video') ?? []
    expect(videos).toHaveLength(1)
    expect(videos[0]!.slug).toBe('new-episode')
    expect(videos[0]!.slugExplicit).toBe(true)
    expect(videos[0]!.name).toBe('New Episode')
    expect(created.frontmatter.title).toBe('New Episode')

    const validated = await validateKnowledge(iRoot, 'villabotijos-today/new-episode', undefined, undefined, false, {
      checkFreshness: false,
    })
    expect(validated.errors).toEqual([])
    expect(validated.valid).toBe(true)

    // A created model records its result version only.
    expect(res.models!['villabotijos-today/new-episode']).toEqual({
      result_version: String(created.frontmatter.knowledge_version),
    })
    const applied = parseChangeset(await readFile(join(iRoot, 'changes', 'instance_changes_NN.md'), 'utf-8'))
    expect(applied.frontmatter.models!['villabotijos-today/new-episode']).not.toHaveProperty('base_version')
    expect(applied.changes[0]!.status).toBe('applied')
    expect(applied.changes[0]!.target).toBe('villabotijos-today/new-episode')
  })

  it('does not scaffold a second element of a distributed concept', async () => {
    const res = await applyInstance([ADD_EPISODE])
    expect(res.success).toBe(true)
    const text = await readFile(join(iRoot, EPISODE_REL), 'utf-8')
    // A second `Video` or a `Series` element would make the file a registry
    // (two roots, mixed storage): the skeleton holds the root and the compact
    // concepts only.
    expect(text).not.toContain('Example Video')
    expect(text).not.toContain('Example Series')
    expect(text).toContain('Example Scene')
  })

  it('rejects a missing container naming it and writes nothing', async () => {
    const res = await applyInstance([{ ...ADD_EPISODE, target: 'no-such-series/intro' }])

    expect(res.success).toBe(false)
    expect(res.errors![0]!.code).toBe('CONTAINER_MISSING')
    expect(res.errors![0]!.message).toContain('no-such-series')
    expect(existsSync(join(iRoot, 'series', 'no-such-series'))).toBe(false)
    expect(existsSync(join(iRoot, 'kNNowledge'))).toBe(true)
    expect(await readdir(iKnowledgeDir)).toEqual([])
  })

  it('accepts a container created earlier in the same changeset', async () => {
    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'add_model',
        target: 'new-series',
        concept: 'Series',
        blueprint_name: VIDEO_BLUEPRINT_NAME,
        blueprint_url: VIDEO_BLUEPRINT_REL,
        name: 'New Series',
      },
      { ...ADD_EPISODE, id: 'c-02', target: 'new-series/intro', name: 'Intro' },
    ])

    expect(res.success).toBe(true)
    expect(existsSync(join(iRoot, 'series/new-series/new-series_video-script_NN.md'))).toBe(true)
    expect(existsSync(join(iRoot, 'series/new-series/assets/intro/intro_video-script_NN.md'))).toBe(true)
    expect(Object.keys(res.models!).sort()).toEqual(['new-series', 'new-series/intro'])
  })

  it('rejects an instance created before the container that holds it', async () => {
    const res = await applyInstance([
      { ...ADD_EPISODE, id: 'c-01', target: 'later-series/intro' },
      {
        id: 'c-02',
        op: 'add_model',
        target: 'later-series',
        concept: 'Series',
        blueprint_name: VIDEO_BLUEPRINT_NAME,
        blueprint_url: VIDEO_BLUEPRINT_REL,
        name: 'Later Series',
      },
    ])

    expect(res.success).toBe(false)
    expect(res.errors![0]!.code).toBe('ADD_MODEL_ORDER')
    expect(existsSync(join(iRoot, 'series', 'later-series'))).toBe(false)
  })

  it('an existing id is a conflict and the file stays byte-identical', async () => {
    const path = await writeInstanceFile(
      'series/villabotijos-today/assets/pepper-mapache/pepper-mapache_video-script_NN.md',
      videoModel('pepper-mapache', 'Pepper Mapache', { name: '00 Gancho', slug: '00-gancho', voice: 'warm' }),
    )
    const before = await readFile(path, 'utf-8')

    const res = await applyInstance([
      { ...ADD_EPISODE, target: 'villabotijos-today/pepper-mapache' },
      {
        id: 'c-02',
        op: 'update_field',
        target: 'villabotijos-today/pepper-mapache@00-gancho&voice',
        from: 'warm',
        to: 'cold',
      },
    ])

    expect(res.success).toBe(false)
    expect(res.status).toBe('conflict')
    const codes = res.errors!.map((e) => e.code)
    expect(codes).toContain('MODEL_EXISTS')
    expect(codes).toContain('DEPENDS_ON_CONFLICTED_CHANGE')
    expect(await readFile(path, 'utf-8')).toBe(before)
  })

  it('an occupied placement path is a conflict even when it is not a model', async () => {
    // A stale non-model file where the instance would land: the id is free but
    // the path is taken, and add_model never overwrites a file.
    const path = await writeInstanceFile(
      'series/villabotijos-today/assets/taken/taken_video-script_NN.md',
      'not a model\n',
    )
    const before = await readFile(path, 'utf-8')

    const res = await applyInstance([{ ...ADD_EPISODE, target: 'villabotijos-today/taken' }])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.code)).toContain('MODEL_EXISTS')
    expect(await readFile(path, 'utf-8')).toBe(before)
  })

  it('an unresolvable bluepriNNt writes nothing', async () => {
    const res = await applyInstance([
      {
        ...ADD_EPISODE,
        blueprint_name: 'ghost_V_0-1-0',
        blueprint_url: 'specs/bluepriNNts/ghost_V_0-1-0_NN.md',
      },
    ])

    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors![0]!.code).toBe('BLUEPRINT_UNRESOLVED')
    expect(existsSync(join(iRoot, 'series/villabotijos-today/assets/new-episode'))).toBe(false)
  })

  it('a failed persist removes the folders it created', async () => {
    // A directory squatting on the second instance's staging path makes the
    // write throw after the first instance has been persisted.
    await mkdir(join(iSeriesDir, 'assets', 'zeta', 'zeta_video-script.tmp'), { recursive: true })

    const outcome = await applyInstance([
      { ...ADD_EPISODE, id: 'c-01', target: 'villabotijos-today/new-a', name: 'New A' },
      { ...ADD_EPISODE, id: 'c-02', target: 'villabotijos-today/zeta', name: 'Zeta' },
    ]).then(
      (res) => res,
      (err: unknown) => err as Error,
    )
    if (!(outcome instanceof Error)) expect(outcome.success).toBe(false)

    expect(existsSync(join(iSeriesDir, 'assets', 'new-a'))).toBe(false)
    expect(existsSync(join(iSeriesDir, 'new-a_video-script_NN.md'))).toBe(false)
    expect(existsSync(join(iSeriesDir, 'zeta_video-script_NN.md'))).toBe(false)
    // The pre-existing folder the test created is not ours to delete.
    expect(existsSync(join(iSeriesDir, 'assets', 'zeta'))).toBe(true)
    expect(existsSync(join(iRoot, 'changes', '.lock'))).toBe(false)
  })

  it('a compact add_model is unchanged', async () => {
    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'add_model',
        target: 'acme',
        blueprint_name: VIDEO_BLUEPRINT_NAME,
        blueprint_url: VIDEO_BLUEPRINT_REL,
        name: 'ACME',
      },
    ])

    expect(res.success).toBe(true)
    expect(await readdir(iKnowledgeDir)).toEqual(['acme_video-script_NN.md'])
    expect(existsSync(join(iRoot, 'series', 'acme'))).toBe(false)
  })
})


/* ── targeting and atomicity of instance changes (S6a.3) ─────────────────── */

/** Two Videos with the same slug in different series: equal stems, distinct ids. */
const PEPPER_REL = 'series/villabotijos-today/assets/pepper-mapache/pepper-mapache_video-script_NN.md'
const INTRO_A_REL = 'series/villabotijos-today/assets/intro/intro_video-script_NN.md'
const INTRO_B_REL = 'series/innteresante/assets/intro/intro_video-script_NN.md'

async function writeThreeVideos(): Promise<Record<string, string>> {
  await mkdir(join(iRoot, 'series', 'innteresante'), { recursive: true })
  await writeFile(
    join(iRoot, 'series', 'innteresante', 'innteresante_video-script_NN.md'),
    seriesModel('innteresante', 'Innteresante'),
    'utf-8',
  )
  return {
    pepper: await writeInstanceFile(
      PEPPER_REL,
      videoModel('pepper-mapache', 'Pepper Mapache', { name: '00 Gancho', slug: '00-gancho', voice: 'warm' }),
    ),
    introA: await writeInstanceFile(
      INTRO_A_REL,
      videoModel('intro', 'Intro', { name: '00 Gancho', slug: '00-gancho', voice: 'warm' }),
    ),
    introB: await writeInstanceFile(
      INTRO_B_REL,
      videoModel('intro', 'Intro', { name: '00 Gancho', slug: '00-gancho', voice: 'warm' }),
    ),
  }
}

describe('change targets of instance models (distributed-storage S6a)', () => {
  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(iRoot, '.cache')
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await rmWithRetry(iRoot)
    for (const dir of [iChangesDir, iBlueprintsDir, iKnowledgeDir, iSeriesDir]) {
      await mkdir(dir, { recursive: true })
    }
    await writeFile(join(iSpecsDir, 'defiNNe_V_0-1-0_NN.md'), LEVEL0_CONTENT, 'utf-8')
    await writeFile(join(iSpecsDir, 'iNNfo_V_0-7-0_NN.md'), LEVEL1_CONTENT, 'utf-8')
    await writeFile(join(iBlueprintsDir, 'video-script_V_0-1-0_NN.md'), VIDEO_BLUEPRINT, 'utf-8')
    await writeFile(
      join(iSeriesDir, 'villabotijos-today_video-script_NN.md'),
      seriesModel('villabotijos-today', 'Villabotijos Today'),
      'utf-8',
    )
  })

  afterEach(async () => {
    delete process.env.INNFO_CACHE_DIR
    vi.restoreAllMocks()
    await rmWithRetry(iRoot)
  })

  it('updates the placement file and stamps the hierarchical address', async () => {
    const paths = await writeThreeVideos()

    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'update_field',
        target: 'villabotijos-today/pepper-mapache@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
    ])

    expect(res.success).toBe(true)
    expect(await readFile(paths.pepper!, 'utf-8')).toContain('voice:: raspy')
    expect(await readFile(paths.introA!, 'utf-8')).toContain('voice:: warm')
    const doc = parseChangeset(await readFile(join(iChangesDir, 'instance_changes_NN.md'), 'utf-8'))
    expect(doc.changes[0]!.resolved_target).toBe('villabotijos-today/pepper-mapache@00-gancho&voice')
    expect(res.models!['villabotijos-today/pepper-mapache']).toEqual({
      base_version: 'V_0-1-0',
      result_version: 'V_0-1-1',
    })
  })

  it('an unknown model id is reported with the id and writes no file', async () => {
    const paths = await writeThreeVideos()
    const before = await readFile(paths.pepper!, 'utf-8')

    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'update_field',
        target: 'villabotijos-today/missing@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
    ])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.message).join(' ')).toContain('villabotijos-today/missing')
    expect(await readFile(paths.pepper!, 'utf-8')).toBe(before)
  })

  it('a bare slug is reported with both candidates and resolves neither', async () => {
    const paths = await writeThreeVideos()
    const before = await readFile(paths.introA!, 'utf-8')

    const res = await applyInstance([
      { id: 'c-01', op: 'update_field', target: 'intro@00-gancho&voice', from: 'warm', to: 'raspy' },
    ])

    expect(res.success).toBe(false)
    const message = res.errors!.map((e) => e.message).join(' ')
    expect(message).toContain('intro')
    expect(message).toContain('innteresante/intro')
    expect(message).toContain('villabotijos-today/intro')
    expect(await readFile(paths.introA!, 'utf-8')).toBe(before)
  })

  it('rejects a filename stem as a removed form', async () => {
    const paths = await writeThreeVideos()
    const before = await readFile(paths.pepper!, 'utf-8')

    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'update_field',
        target: 'pepper-mapache_video-script@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
    ])

    expect(res.success).toBe(false)
    const message = res.errors!.map((e) => e.message).join(' ')
    expect(message).toContain('filename stem')
    expect(message).toContain('villabotijos-today/pepper-mapache')
    expect(await readFile(paths.pepper!, 'utf-8')).toBe(before)
  })

  it('a recorded target keeps resolving when a same-slug Video is added elsewhere', async () => {
    const paths = await writeThreeVideos()
    expect(
      (
        await applyInstance([
          {
            id: 'c-01',
            op: 'update_field',
            target: 'innteresante/intro@00-gancho&voice',
            from: 'warm',
            to: 'raspy',
          },
        ])
      ).success,
    ).toBe(true)

    expect(
      (
        await applyInstance(
          [
            {
              ...ADD_EPISODE,
              id: 'c-01',
              target: 'villabotijos-today/pepper-mapache-two',
              name: 'Pepper Mapache Two',
            },
          ],
          'second_changes_NN.md',
        )
      ).success,
    ).toBe(true)

    expect(await readFile(paths.introB!, 'utf-8')).toContain('voice:: raspy')
    expect(await readFile(paths.introA!, 'utf-8')).toContain('voice:: warm')
    const doc = parseChangeset(await readFile(join(iChangesDir, 'instance_changes_NN.md'), 'utf-8'))
    expect(doc.changes[0]!.resolved_target).toBe('innteresante/intro@00-gancho&voice')
  })

  it('three instances with one invalid write none of them', async () => {
    const paths = await writeThreeVideos()
    // The third file is already outside its bluepriNNt (an undeclared concept), so
    // the whole-file validation of the result fails: nothing may be persisted.
    await writeFile(paths.introB!, `${await readFile(paths.introB!, 'utf-8')}\n# NN Unicorn\n\n## NN Unicorn: Sparkle\n\n`, 'utf-8')
    const before = {
      pepper: await readFile(paths.pepper!, 'utf-8'),
      introA: await readFile(paths.introA!, 'utf-8'),
      introB: await readFile(paths.introB!, 'utf-8'),
    }

    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'update_field',
        target: 'villabotijos-today/pepper-mapache@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
      {
        id: 'c-02',
        op: 'update_field',
        target: 'villabotijos-today/intro@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
      {
        id: 'c-03',
        op: 'update_field',
        target: 'innteresante/intro@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
    ])

    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors!.map((e) => e.code)).toContain('VALIDATION_FAILED')
    expect(await readFile(paths.pepper!, 'utf-8')).toBe(before.pepper)
    expect(await readFile(paths.introA!, 'utf-8')).toBe(before.introA)
    expect(await readFile(paths.introB!, 'utf-8')).toBe(before.introB)
  })

  it('three valid instances record one entry per id with its own versions', async () => {
    await writeThreeVideos()

    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'update_field',
        target: 'villabotijos-today/pepper-mapache@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
      {
        id: 'c-02',
        op: 'update_field',
        target: 'villabotijos-today/intro@00-gancho&voice',
        from: 'warm',
        to: 'breathy',
      },
      {
        id: 'c-03',
        op: 'update_field',
        target: 'innteresante/intro@00-gancho&voice',
        from: 'warm',
        to: 'flat',
      },
    ])

    expect(res.success).toBe(true)
    expect(Object.keys(res.models!).sort()).toEqual([
      'innteresante/intro',
      'villabotijos-today/intro',
      'villabotijos-today/pepper-mapache',
    ])
    for (const transition of Object.values(res.models!)) {
      expect(transition.base_version).toBe('V_0-1-0')
      expect(transition.result_version).toBe('V_0-1-1')
    }
  })

  it('a misplaced instance aborts before any write', async () => {
    const misplaced = await writeInstanceFile(
      'series/villabotijos-today/videos/intro/intro_video-script_NN.md',
      videoModel('intro', 'Intro', { name: '00 Gancho', slug: '00-gancho', voice: 'warm' }),
    )
    const before = await readFile(misplaced, 'utf-8')

    const res = await applyInstance([
      {
        id: 'c-01',
        op: 'update_field',
        target: 'villabotijos-today/intro@00-gancho&voice',
        from: 'warm',
        to: 'raspy',
      },
    ])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.message).join(' ')).toContain('PLACEMENT_MISMATCH')
    expect(await readFile(misplaced, 'utf-8')).toBe(before)
  })
})

/* ── move_model of an instance (distributed-storage S6b) ───────────────────
 *
 * One atomic recorded operation: the folder, the file stem and the id agree
 * after the move; recorded targets stay valid through the fold rekey (S6b.1).
 */
const OTHER_SERIES_DIR = join(iRoot, 'series', 'otra')

const PLAIN_BLUEPRINT = [
  '---',
  'spec_version: "V_0-1-0"',
  'level: 2',
  'title: "Plain"',
  'parent_spec:',
  '  name: "iNNfo_V_0-7-0"',
  '  url: "specs/iNNfo_V_0-7-0_NN.md"',
  '---',
  '',
  '# NN Concept Definition',
  '',
  '## NN Concept Definition: Note',
  'type:: list',
  '',
  '# NN Field Definition',
  '',
  '## NN Field Definition: body',
  'concept:: Note',
  'type:: string',
  '',
].join('\n')

const PLAIN_MODEL = [
  '---',
  'level: 3',
  'title: "Notes"',
  'knowledge_version: "V_0-1-0"',
  'parent_spec:',
  '  name: "plain_V_0-1-0"',
  '  url: "specs/bluepriNNts/plain_V_0-1-0_NN.md"',
  '---',
  '',
  '# NN Note',
  '',
  '## NN Note: One',
  'slug:: one',
  'body:: first',
  '',
].join('\n')

/** A Video instance that references another model through a typed field on its root. */
function referringVideoModel(slug: string, title: string, related: string): string {
  return videoModel(slug, title, { name: '00 Gancho', slug: '00-gancho', voice: 'warm' }).replace(
    `## NN Video: ${title}\nslug:: ${slug}\n`,
    `## NN Video: ${title}\nslug:: ${slug}\nrelated:: ${related}\n`,
  )
}

const MOVE_INTRO_TO_WELCOME: ChangeItem = {
  id: 'c-01',
  op: 'move_model',
  target: 'villabotijos-today/intro',
  to: 'villabotijos-today/welcome',
}

describe('move_model of an instance (distributed-storage S6b)', () => {
  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(iRoot, '.cache')
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await rmWithRetry(iRoot)
    for (const dir of [iChangesDir, iBlueprintsDir, iKnowledgeDir, iSeriesDir, OTHER_SERIES_DIR]) {
      await mkdir(dir, { recursive: true })
    }
    await writeFile(join(iSpecsDir, 'defiNNe_V_0-1-0_NN.md'), LEVEL0_CONTENT, 'utf-8')
    await writeFile(join(iSpecsDir, 'iNNfo_V_0-7-0_NN.md'), LEVEL1_CONTENT, 'utf-8')
    await writeFile(join(iBlueprintsDir, 'video-script_V_0-1-0_NN.md'), VIDEO_BLUEPRINT, 'utf-8')
    await writeFile(join(iBlueprintsDir, 'plain_V_0-1-0_NN.md'), PLAIN_BLUEPRINT, 'utf-8')
    await writeFile(join(iSeriesDir, 'villabotijos-today_video-script_NN.md'), seriesModel('villabotijos-today', 'Villabotijos Today'), 'utf-8')
    await writeFile(join(OTHER_SERIES_DIR, 'otra_video-script_NN.md'), seriesModel('otra', 'Otra'), 'utf-8')
    await writeFile(join(iKnowledgeDir, 'notes_NN.md'), PLAIN_MODEL, 'utf-8')
  })

  afterEach(async () => {
    delete process.env.INNFO_CACHE_DIR
    vi.restoreAllMocks()
    await rmWithRetry(iRoot)
  })

  it('rejects a compact target with MOVE_REQUIRES_INSTANCE', async () => {
    const before = await readFile(join(iKnowledgeDir, 'notes_NN.md'), 'utf-8')
    const res = await applyInstance([{ id: 'c-01', op: 'move_model', target: 'notes', to: 'notes-two' }])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.code)).toContain('MOVE_REQUIRES_INSTANCE')
    expect(await readFile(join(iKnowledgeDir, 'notes_NN.md'), 'utf-8')).toBe(before)
  })

  it('rejects an occupied id with MODEL_EXISTS and changes nothing', async () => {
    const paths = await writeThreeVideos()
    const before = await readFile(paths.introA!, 'utf-8')

    const res = await applyInstance([
      { id: 'c-01', op: 'move_model', target: 'villabotijos-today/intro', to: 'villabotijos-today/pepper-mapache' },
    ])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.code)).toContain('MODEL_EXISTS')
    expect(await readFile(paths.introA!, 'utf-8')).toBe(before)
    expect(existsSync(paths.pepper!)).toBe(true)
  })

  it('rejects a missing container with CONTAINER_MISSING', async () => {
    const paths = await writeThreeVideos()
    const res = await applyInstance([
      { id: 'c-01', op: 'move_model', target: 'villabotijos-today/intro', to: 'no-such-series/intro' },
    ])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.code)).toContain('CONTAINER_MISSING')
    expect(existsSync(paths.introA!)).toBe(true)
  })

  it('rejects an occupied destination folder, leaving the original in place', async () => {
    const paths = await writeThreeVideos()
    await mkdir(join(iSeriesDir, 'assets', 'welcome'), { recursive: true })
    await writeFile(join(iSeriesDir, 'assets', 'welcome', 'stray.txt'), 'occupied', 'utf-8')

    const res = await applyInstance([MOVE_INTRO_TO_WELCOME])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.code)).toContain('MOVE_DESTINATION_OCCUPIED')
    expect(existsSync(paths.introA!)).toBe(true)
    expect(existsSync(join(iSeriesDir, 'assets', 'welcome', 'stray.txt'))).toBe(true)
  })

  it('renames folder, stem and id together and the old id stops resolving', async () => {
    const paths = await writeThreeVideos()

    const res = await applyInstance([MOVE_INTRO_TO_WELCOME])

    expect(res.success).toBe(true)
    const newRel = 'series/villabotijos-today/assets/welcome/welcome_video-script_NN.md'
    expect(existsSync(join(iRoot, newRel))).toBe(true)
    expect(existsSync(paths.introA!)).toBe(false)
    expect(existsSync(join(iSeriesDir, 'assets', 'intro'))).toBe(false)

    const moved = parseKnowledge(await readFile(join(iRoot, newRel), 'utf-8'))
    expect(moved.elements.get('Video')![0]!.slug).toBe('welcome')
    // The body changed (the root slug), so the moved model is bumped.
    expect(res.models!['villabotijos-today/welcome']).toEqual({
      base_version: 'V_0-1-0',
      result_version: 'V_0-1-1',
    })
    const oldId = await validateKnowledge(iRoot, 'villabotijos-today/intro', undefined, undefined, false, { checkFreshness: false })
    expect(oldId.valid).toBe(false)
    expect(oldId.errors[0]!.message).toContain('Model not found')
    const newId = await validateKnowledge(iRoot, 'villabotijos-today/welcome', undefined, undefined, false, { checkFreshness: false })
    expect(newId.valid).toBe(true)
  })

  it('relocates between containers with no version transition when the body does not change', async () => {
    const paths = await writeThreeVideos()
    const before = await readFile(paths.introB!, 'utf-8')

    const res = await applyInstance([
      { id: 'c-01', op: 'move_model', target: 'innteresante/intro', to: 'otra/intro' },
    ])

    expect(res.success).toBe(true)
    const movedRel = 'series/otra/assets/intro/intro_video-script_NN.md'
    expect(existsSync(join(iRoot, movedRel))).toBe(true)
    expect(existsSync(paths.introB!)).toBe(false)
    expect(await readFile(join(iRoot, movedRel), 'utf-8')).toBe(before)
    // Same slug, same body: the model is relocated, not bumped.
    expect(res.models!['otra/intro']).toBeUndefined()
    expect(existsSync(join(iRoot, 'series', 'innteresante', 'assets', 'intro'))).toBe(false)
  })

  it('rejects an invalid result with VALIDATION_FAILED, changing no file or folder', async () => {
    const paths = await writeThreeVideos()
    // The moved model already carries an undeclared concept, so the result is invalid.
    await writeFile(paths.introA!, `${await readFile(paths.introA!, 'utf-8')}\n# NN Unicorn\n\n## NN Unicorn: Sparkle\n\n`, 'utf-8')
    const before = await readFile(paths.introA!, 'utf-8')

    const res = await applyInstance([MOVE_INTRO_TO_WELCOME])

    expect(res.success).toBe(false)
    expect(res.status).toBe('rejected')
    expect(res.errors!.map((e) => e.code)).toContain('VALIDATION_FAILED')
    expect(await readFile(paths.introA!, 'utf-8')).toBe(before)
    expect(existsSync(join(iSeriesDir, 'assets', 'welcome'))).toBe(false)
  })

  it('is not a title change: renaming the root element moves nothing', async () => {
    const paths = await writeThreeVideos()

    const res = await applyInstance([
      { id: 'c-01', op: 'rename_element', target: 'villabotijos-today/intro@intro', from: 'Intro', name: 'Welcome' },
    ])

    expect(res.success).toBe(true)
    expect(existsSync(paths.introA!)).toBe(true)
    expect(existsSync(join(iSeriesDir, 'assets', 'welcome'))).toBe(false)
    expect(await readFile(paths.introA!, 'utf-8')).toContain('## NN Video: Welcome')
  })

  it('rename_element leaves assets/<slug> untouched', async () => {
    const paths = await writeThreeVideos()
    // The legacy path renamed `<model dir>/assets/<slug>`; slugs are immutable now,
    // so the folder must survive the rename (design A10, F12).
    const assetDir = join(iSeriesDir, 'assets', 'intro', 'assets', '00-gancho')
    await mkdir(assetDir, { recursive: true })
    await writeFile(join(assetDir, 'still.txt'), 'asset', 'utf-8')

    const res = await applyInstance([
      { id: 'c-01', op: 'rename_element', target: 'villabotijos-today/intro@00-gancho', from: '00 Gancho', name: 'Hook' },
    ])

    expect(res.success).toBe(true)
    expect(existsSync(join(assetDir, 'still.txt'))).toBe(true)
    expect(await readFile(paths.introA!, 'utf-8')).toContain('## NN Scene: Hook')
  })

  it('reports MOVE_LEAVES_DANGLING_REFERENCES when the referrer is not retargeted', async () => {
    await writeThreeVideos()
    const referrerPath = await writeInstanceFile(
      PEPPER_REL,
      referringVideoModel('pepper-mapache', 'Pepper Mapache', 'villabotijos-today/intro'),
    )
    const before = await readFile(referrerPath, 'utf-8')

    const res = await applyInstance([MOVE_INTRO_TO_WELCOME])

    expect(res.success).toBe(false)
    expect(res.errors!.map((e) => e.code)).toContain('MOVE_LEAVES_DANGLING_REFERENCES')
    expect(await readFile(referrerPath, 'utf-8')).toBe(before)
    expect(existsSync(join(iSeriesDir, 'assets', 'intro'))).toBe(true)
  })

  it('applies when the same changeset retargets every referrer', async () => {
    const paths = await writeThreeVideos()
    const referrerPath = await writeInstanceFile(
      PEPPER_REL,
      referringVideoModel('pepper-mapache', 'Pepper Mapache', 'villabotijos-today/intro'),
    )

    const res = await applyInstance([
      MOVE_INTRO_TO_WELCOME,
      {
        id: 'c-02',
        op: 'update_field',
        target: 'villabotijos-today/pepper-mapache@pepper-mapache&related',
        from: 'villabotijos-today/intro',
        to: 'villabotijos-today/welcome',
      },
    ])

    expect(res.success).toBe(true)
    const referrer = await readFile(referrerPath, 'utf-8')
    expect(referrer).toContain('related:: villabotijos-today/welcome')
    expect(referrer).not.toContain('related:: villabotijos-today/intro')
    expect(existsSync(paths.introA!)).toBe(false)

    const workspace = await validateKnowledge(iRoot, 'villabotijos-today/welcome', undefined, undefined, true, { checkFreshness: false })
    expect(workspace.errors.filter((e) => /REF_MODEL_NOT_FOUND|Dangling/.test(e.message))).toEqual([])
  })

  it('propose_changeset returns the missing update_field changes as missing_referrer_updates', async () => {
    await writeThreeVideos()
    await writeInstanceFile(PEPPER_REL, referringVideoModel('pepper-mapache', 'Pepper Mapache', 'villabotijos-today/intro'))

    const proposed = await proposeChangeset(iRoot, { operations: [MOVE_INTRO_TO_WELCOME], open: false }, { writer })

    expect(proposed.success).toBe(false)
    const error = proposed.errors!.find((e) => e.code === 'MOVE_LEAVES_DANGLING_REFERENCES')
    expect(error).toBeDefined()
    const missing = (error as { missing_referrer_updates?: ChangeItem[] }).missing_referrer_updates ?? []
    expect(missing).toHaveLength(1)
    expect(missing[0]!.op).toBe('update_field')
    expect(missing[0]!.target).toBe('villabotijos-today/pepper-mapache@pepper-mapache&related')
    expect(missing[0]!.to).toBe('villabotijos-today/welcome')
  })
})

/* ── extract_instance: compact elements become instance models (S6d) ──────── */

const xRoot = join(import.meta.dirname!, '..', '..', 'temp-test-facts-extract')
const xChangesDir = join(xRoot, 'changes')
const xSpecsDir = join(xRoot, 'specs')
const xBlueprintsDir = join(xSpecsDir, 'bluepriNNts')
const xKnowledgeDir = join(xRoot, 'kNNowledge')
const xSeriesDir = join(xRoot, 'series', 'innteresante')
const xSeriesModelRel = 'series/innteresante/innteresante_video-script_NN.md'

const REGISTRY_REL = 'kNNowledge/InnteresanteVideos_NN.md'
const INTRO_X_REL = 'series/innteresante/assets/intro/intro_video-script_NN.md'
const NUEVO_X_REL = 'series/innteresante/assets/nuevo/nuevo_video-script_NN.md'

/** The S6a blueprint plus one `Video` field and the Video -> Scene -> Layer taxonomy. */
const EXTRACT_BLUEPRINT = VIDEO_BLUEPRINT.replace(
  '# NN Concept Definition',
  [
    '# NN index',
    '',
    '* [[Video]]',
    '  * [[Scene]]',
    '    * [[Layer]]',
    '* [[Series]]',
    '',
    '# NN Concept Definition',
  ].join('\n'),
)
  .replace(
    '# NN Field Definition',
    [
      '## NN Field Definition: status',
      'concept:: Video',
      'type:: select',
      'options:: [draft, published]',
      '',
      '# NN Field Definition',
    ].join('\n'),
  )
  .replace(
    '## NN Concept Definition: Scene\ntype:: list\n',
    '## NN Concept Definition: Scene\ntype:: list\n\n## NN Concept Definition: Layer\ntype:: list\n',
  )

/** A compact registry: two `Video` elements, one carrying a nested `Scene`. */
const REGISTRY_MODEL = [
  '---',
  'level: 3',
  'title: "Innteresante Videos"',
  'knowledge_version: "V_0-1-0"',
  'parent_spec:',
  `  name: "${VIDEO_BLUEPRINT_NAME}"`,
  `  url: "${VIDEO_BLUEPRINT_REL}"`,
  '---',
  '',
  '# NN Video',
  '',
  '## NN Video: Intro',
  'slug:: intro',
  'status:: published',
  '### NN Scene: 00 Gancho',
  'slug:: 00-gancho',
  'voice:: warm',
  'mood:: calm',
  '#### NN Layer: Presenter',
  'slug:: presenter',
  '',
  '## NN Video: Nuevo',
  'slug:: nuevo',
  'status:: draft',
  '',
].join('\n')

const EXTRACT_INTRO: ChangeItem = {
  id: 'c-01',
  op: 'extract_instance',
  target: 'InnteresanteVideos@intro',
  to: 'innteresante/intro',
  blueprint_name: VIDEO_BLUEPRINT_NAME,
  blueprint_url: VIDEO_BLUEPRINT_REL,
}

const EXTRACT_NUEVO: ChangeItem = {
  id: 'c-02',
  op: 'extract_instance',
  target: 'InnteresanteVideos@nuevo',
  to: 'innteresante/nuevo',
  blueprint_name: VIDEO_BLUEPRINT_NAME,
  blueprint_url: VIDEO_BLUEPRINT_REL,
}

async function applyExtract(changes: ChangeItem[], name = 'extract_changes_NN.md') {
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
  await writeFile(join(xChangesDir, name), serializeChangeset(doc), 'utf-8')
  return applyChange(xRoot, 'changes/' + name)
}

describe('extract_instance of a compact element (distributed-storage S6d)', () => {
  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(xRoot, '.cache')
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await rmWithRetry(xRoot)
    for (const dir of [xChangesDir, xBlueprintsDir, xKnowledgeDir, xSeriesDir]) {
      await mkdir(dir, { recursive: true })
    }
    await writeFile(join(xSpecsDir, 'defiNNe_V_0-1-0_NN.md'), LEVEL0_CONTENT, 'utf-8')
    await writeFile(join(xSpecsDir, 'iNNfo_V_0-7-0_NN.md'), LEVEL1_CONTENT, 'utf-8')
    await writeFile(join(xBlueprintsDir, 'video-script_V_0-1-0_NN.md'), EXTRACT_BLUEPRINT, 'utf-8')
    await writeFile(join(xRoot, xSeriesModelRel), seriesModel('innteresante', 'Innteresante'), 'utf-8')
    await writeFile(join(xRoot, REGISTRY_REL), REGISTRY_MODEL, 'utf-8')
  })

  afterEach(async () => {
    delete process.env.INNFO_CACHE_DIR
    vi.restoreAllMocks()
    await rmWithRetry(xRoot)
  })

  it('creates one instance model per extracted element and empties the source', async () => {
    const res = await applyExtract([EXTRACT_INTRO, EXTRACT_NUEVO])

    expect(res.errors).toBeUndefined()
    expect(res.success).toBe(true)
    expect(res.status).toBe('applied')
    expect(existsSync(join(xRoot, INTRO_X_REL))).toBe(true)
    expect(existsSync(join(xRoot, NUEVO_X_REL))).toBe(true)

    const intro = parseKnowledge(await readFile(join(xRoot, INTRO_X_REL), 'utf-8'))
    const videos = intro.elements.get('Video') ?? []
    expect(videos).toHaveLength(1)
    expect(videos[0]!.slug).toBe('intro')
    expect(videos[0]!.fields.status).toBe('published')
    // The descendant Scene came with it, slug and values unchanged.
    const scenes = intro.elements.get('Scene') ?? []
    expect(scenes.map((s) => s.slug)).toEqual(['00-gancho'])
    expect(scenes[0]!.fields.voice).toBe('warm')
    expect(scenes[0]!.fields.mood).toBe('calm')
    expect(scenes[0]!.parentSlug).toBe('intro')
    // The grandchild Layer travelled too, still under its Scene.
    const layers = intro.elements.get('Layer') ?? []
    expect(layers.map((l) => l.slug)).toEqual(['presenter'])
    expect(layers[0]!.parentSlug).toBe('00-gancho')

    // The source no longer holds either Video: no double storage remains.
    const source = parseKnowledge(await readFile(join(xRoot, REGISTRY_REL), 'utf-8'))
    expect(source.elements.get('Video') ?? []).toEqual([])

    const ws = await validateKnowledge(xRoot, 'innteresante/intro', undefined, undefined, true, { checkFreshness: false })
    expect(ws.errors.filter((e) => /DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL|PLACEMENT_MISMATCH/.test(e.message))).toEqual([])
  })

  it('records only a result version for each instance and one bump for the source', async () => {
    const before = parseKnowledge(await readFile(join(xRoot, REGISTRY_REL), 'utf-8'))
    const res = await applyExtract([EXTRACT_INTRO, EXTRACT_NUEVO])

    expect(res.success).toBe(true)
    const introModels = res.models!['innteresante/intro']!
    expect(introModels).not.toHaveProperty('base_version')
    expect(introModels.result_version).toBeTruthy()
    const sourceTransition = res.models!['InnteresanteVideos']!
    expect(sourceTransition.base_version).toBe(String(before.frontmatter.knowledge_version))
    expect(sourceTransition.result_version).not.toBe(sourceTransition.base_version)

    const applied = parseChangeset(await readFile(join(xRoot, 'changes', 'extract_changes_NN.md'), 'utf-8'))
    // The extracted slug set is an execution fact: the fold re-keys units through it.
    expect(applied.changes[0]!.extracted_slugs).toEqual(['intro', '00-gancho', 'presenter'])
    expect(applied.changes[1]!.extracted_slugs).toEqual(['nuevo'])
    // A recorded target keeps pointing at where the change was applied.
    expect(applied.changes[0]!.resolved_target).toBe('InnteresanteVideos@intro')
  })

  it('never alters the field values of the extracted element', async () => {
    const res = await applyExtract([EXTRACT_INTRO])
    expect(res.success).toBe(true)
    const nuevo = parseKnowledge(await readFile(join(xRoot, INTRO_X_REL), 'utf-8'))
    const el = nuevo.elements.get('Video')![0]!
    expect(el.fields).toMatchObject({ status: 'published' })
    expect(el.name).toBe('Intro')
  })

  it('rejects an element of a concept the blueprint does not distribute', async () => {
    // `Scene` is compact in the pinned blueprint: only a distributed concept may
    // become its own model.
    const res = await applyExtract([
      { ...EXTRACT_INTRO, target: 'InnteresanteVideos@00-gancho', to: 'innteresante/gancho' },
    ])

    expect(res.success).toBe(false)
    expect(res.errors![0]!.code).toBe('EXTRACT_NOT_DISTRIBUTED')
    expect(res.errors![0]!.message).toContain('Scene')
    expect(existsSync(join(xRoot, INTRO_X_REL))).toBe(false)
  })

  it('rejects a destination whose slug is not the element slug', async () => {
    const res = await applyExtract([{ ...EXTRACT_INTRO, to: 'innteresante/welcome' }])

    expect(res.success).toBe(false)
    expect(res.errors![0]!.code).toBe('EXTRACT_SLUG_MISMATCH')
    expect(res.errors![0]!.message).toContain('intro')
  })

  it('an existing instance is MODEL_EXISTS and points at remove_element', async () => {
    await mkdir(join(xRoot, INTRO_X_REL, '..'), { recursive: true })
    await writeFile(
      join(xRoot, INTRO_X_REL),
      videoModel('intro', 'Intro', { name: '00 Gancho', slug: '00-gancho', voice: 'warm' }),
      'utf-8',
    )

    const res = await applyExtract([EXTRACT_INTRO])

    expect(res.success).toBe(false)
    const error = res.errors!.find((e) => e.code === 'MODEL_EXISTS')!
    expect(error).toBeDefined()
    expect(error.message).toContain('remove_element')
    // The source keeps its element: nothing was cut.
    const source = parseKnowledge(await readFile(join(xRoot, REGISTRY_REL), 'utf-8'))
    expect((source.elements.get('Video') ?? []).map((v) => v.slug)).toEqual(['intro', 'nuevo'])
  })

  it('rejects an instance model as the source', async () => {
    const res = await applyExtract([
      { ...EXTRACT_INTRO, target: 'innteresante@innteresante', to: 'innteresante/otra' },
    ])

    expect(res.success).toBe(false)
    expect(res.errors![0]!.code).toBe('EXTRACT_REQUIRES_COMPACT')
  })

  it('one occupied destination rejects the whole extraction group (A-14)', async () => {
    // Something already claims the folder `nuevo` would land in. Nothing may be
    // written for either element: the migration is all or nothing.
    await mkdir(join(xSeriesDir, 'assets', 'nuevo'), { recursive: true })

    const res = await applyExtract([EXTRACT_INTRO, EXTRACT_NUEVO])

    expect(res.success).toBe(false)
    expect(res.status).toBe('conflict')
    const occupied = res.errors!.find((e) => e.code === 'EXTRACT_DESTINATION_OCCUPIED')!
    expect(occupied).toBeDefined()
    expect(occupied.message).toContain('innteresante/nuevo')
    // The sibling extraction of the same source is reported as depending on it.
    const dependent = res.errors!.find((e) => e.code === 'DEPENDS_ON_CONFLICTED_CHANGE')!
    expect(dependent).toBeDefined()
    expect(dependent.message).toContain('c-01')

    expect(existsSync(join(xRoot, INTRO_X_REL))).toBe(false)
    expect(existsSync(join(xRoot, NUEVO_X_REL))).toBe(false)
    // Both elements are still in the registry: the cut never ran.
    const source = parseKnowledge(await readFile(join(xRoot, REGISTRY_REL), 'utf-8'))
    expect((source.elements.get('Video') ?? []).map((v) => v.slug)).toEqual(['intro', 'nuevo'])
    expect((source.elements.get('Scene') ?? []).map((s) => s.slug)).toEqual(['00-gancho'])
  })
})
