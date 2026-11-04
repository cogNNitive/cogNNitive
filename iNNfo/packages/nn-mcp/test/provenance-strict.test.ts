import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { computeProposalSha, parseChangeset, serializeChangeset, parseKnowledge } from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'
import { applyChange } from '../src/tools/apply-change.js'
import { checkDomain } from '../src/tools/check-workspace.js'
import { bodyOf, checkDomainProvenance } from '../src/tools/provenance-strict.js'

const root = join(import.meta.dirname!, '..', 'temp-test-provenance-strict')
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

async function writeCs(changes: ChangeItem[], name = 'acme_changes_NN.md'): Promise<string> {
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
  await writeFile(join(changesDir, name), serializeChangeset(doc), 'utf-8')
  return 'changes/' + name
}

/** The model file the domain under test created (never the fixture model). */
async function createdModelPath(): Promise<string> {
  const names = (await readdir(knowledgeDir)).filter((n) => n.endsWith('_NN.md') && n !== 'fixture_NN.md')
  return join(knowledgeDir, names.sort()[0])
}

const CHANGES: ChangeItem[] = [
  {
    id: 'c-01',
    op: 'add_model',
    target: 'acme_strategy',
    blueprint_name: BLUEPRINT_NAME,
    blueprint_url: BLUEPRINT_URL,
    name: 'ACME Strategy',
  },
  { id: 'c-02', op: 'add_element', target: 'acme_strategy@Work', concept: 'Work', name: 'Pillar One' },
  { id: 'c-03', op: 'update_field', target: 'acme_strategy@pillar-one&statement', to: 'Own the market' },
  { id: 'c-04', op: 'update_element_text', target: 'acme_strategy@pillar-one', to: 'Why this pillar exists.' },
]

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

describe('strict provenance: check_domain {strict: true}', () => {
  it('reports no drift for a model created and modified only through applied changes', async () => {
    expect((await applyChange(root, await writeCs(CHANGES))).success).toBe(true)

    const report = await checkDomain(root, { offline: true, strict: true })
    expect(report.provenance.mode).toBe('strict')
    expect(report.provenance.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toEqual([])
    expect(report.provenance.ok).toBe(true)
  })

  it('flags a one-byte hand edit as an error', async () => {
    expect((await applyChange(root, await writeCs(CHANGES))).success).toBe(true)
    const path = await createdModelPath()
    const content = await readFile(path, 'utf-8')
    expect(content).toContain('Own the market')
    await writeFile(path, content.replace('Own the market', 'Own the markeT'), 'utf-8')

    const report = await checkDomain(root, { offline: true, strict: true })
    const drift = report.provenance.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')
    expect(drift).toHaveLength(1)
    expect(drift[0].severity).toBe('error')
    expect(drift[0].unit).toBeTruthy()
    expect(report.provenance.ok).toBe(false)
  })

  it('flags a whitespace-only edit in strict mode and not in fold mode', async () => {
    expect((await applyChange(root, await writeCs(CHANGES))).success).toBe(true)
    const path = await createdModelPath()
    const content = await readFile(path, 'utf-8')
    // Trailing blanks are formatting: the fold compares parsed values, strict
    // compares the serialized body.
    await writeFile(path, content.replace('statement:: Own the market', 'statement:: Own the market   '), 'utf-8')

    const fold = await checkDomainProvenance(root)
    expect(fold.mode).toBe('fold')
    expect(fold.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toEqual([])

    const strict = await checkDomainProvenance(root, { strict: true })
    expect(strict.mode).toBe('strict')
    expect(strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toHaveLength(1)
    expect(strict.ok).toBe(false)
  })

  it('compares bodies only: a knowledge_version bump is not strict drift', async () => {
    expect((await applyChange(root, await writeCs(CHANGES))).success).toBe(true)
    const path = await createdModelPath()
    const content = await readFile(path, 'utf-8')
    const before = parseKnowledge(content).frontmatter.knowledge_version
    await writeFile(path, content.replace(`knowledge_version: "${before}"`, 'knowledge_version: "V_9-9-9"'), 'utf-8')

    const strict = await checkDomainProvenance(root, { strict: true })
    expect(strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')).toEqual([])
    expect(bodyOf(await readFile(path, 'utf-8'))).not.toContain('knowledge_version')
  })
})

/* ── strict replay of instance models (distributed-storage S6a) ───────────── */

const iRoot = join(import.meta.dirname!, '..', 'temp-test-provenance-instance')
const iChangesDir = join(iRoot, 'changes')
const iSpecsDir = join(iRoot, 'specs')
const iBlueprintsDir = join(iSpecsDir, 'bluepriNNts')
const iSeriesDir = join(iRoot, 'series', 'villabotijos-today')
const EPISODE_REL = 'series/villabotijos-today/assets/new-episode/new-episode_coNNtent_NN.md'

const VIDEO_BLUEPRINT_NAME = 'coNNtent_V_0-1-0'
const VIDEO_BLUEPRINT_REL = 'specs/bluepriNNts/coNNtent_V_0-1-0_NN.md'

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
].join('\n')

const LEVEL0_CONTENT = ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "defiNNe"', '---', ''].join('\n')
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

/** A Video instance written by hand, with no recorded creation. */
const UNRECORDED_VIDEO = [
  '---',
  'level: 3',
  'title: "Hand Made"',
  'knowledge_version: "V_0-1-0"',
  'parent_spec:',
  `  name: "${VIDEO_BLUEPRINT_NAME}"`,
  `  url: "${VIDEO_BLUEPRINT_REL}"`,
  '---',
  '',
  '# NN Video',
  '',
  '## NN Video: Hand Made',
  'slug:: hand-made',
  '',
].join('\n')

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

const CREATE_EPISODE: ChangeItem = {
  id: 'c-01',
  op: 'add_model',
  target: 'villabotijos-today/new-episode',
  concept: 'Video',
  blueprint_name: VIDEO_BLUEPRINT_NAME,
  blueprint_url: VIDEO_BLUEPRINT_REL,
  name: 'New Episode',
}

describe('strict provenance of instance models (distributed-storage S6a)', () => {
  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(iRoot, '.cache')
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await rm(iRoot, { recursive: true, force: true })
    for (const dir of [iChangesDir, iBlueprintsDir, iSeriesDir]) await mkdir(dir, { recursive: true })
    await writeFile(join(iSpecsDir, 'defiNNe_V_0-1-0_NN.md'), LEVEL0_CONTENT, 'utf-8')
    await writeFile(join(iSpecsDir, 'iNNfo_V_0-7-0_NN.md'), LEVEL1_CONTENT, 'utf-8')
    await writeFile(join(iBlueprintsDir, 'coNNtent_V_0-1-0_NN.md'), VIDEO_BLUEPRINT, 'utf-8')
    await writeFile(
      join(iSeriesDir, 'villabotijos-today_coNNtent_NN.md'),
      seriesModel('villabotijos-today', 'Villabotijos Today'),
      'utf-8',
    )
  })

  afterEach(async () => {
    delete process.env.INNFO_CACHE_DIR
    vi.restoreAllMocks()
    await rm(iRoot, { recursive: true, force: true })
  })

  it('replays a created instance edited by two changes and reports no drift', async () => {
    const applied = await applyChange(
      iRoot,
      await writeInstanceCs([
        CREATE_EPISODE,
        {
          id: 'c-02',
          op: 'add_element',
          target: 'villabotijos-today/new-episode@Scene',
          concept: 'Scene',
          name: '00 Gancho',
        },
        {
          id: 'c-03',
          op: 'update_field',
          target: 'villabotijos-today/new-episode@00-gancho&voice',
          to: 'raspy',
        },
      ]),
    )
    expect(applied.success).toBe(true)

    const strict = await checkDomainProvenance(iRoot, { strict: true })
    expect(strict.mode).toBe('strict')
    expect(strict.diagnostics.map((d) => `${d.code}: ${d.unit ?? ''}`)).toEqual([])
    expect(strict.ok).toBe(true)
  })

  it('flags a one-byte hand edit of a created instance as drift', async () => {
    expect(
      (
        await applyChange(
          iRoot,
          await writeInstanceCs([
            CREATE_EPISODE,
            {
              id: 'c-02',
              op: 'add_element',
              target: 'villabotijos-today/new-episode@Scene',
              concept: 'Scene',
              name: '00 Gancho',
            },
            {
              id: 'c-03',
              op: 'update_field',
              target: 'villabotijos-today/new-episode@00-gancho&voice',
              to: 'raspy',
            },
          ]),
        )
      ).success,
    ).toBe(true)

    const path = join(iRoot, EPISODE_REL)
    const content = await readFile(path, 'utf-8')
    expect(content).toContain('voice:: raspy')
    await writeFile(path, content.replace('voice:: raspy', 'voice:: raspY'), 'utf-8')

    const strict = await checkDomainProvenance(iRoot, { strict: true })
    const drift = strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')
    expect(drift).toHaveLength(1)
    expect(drift[0]!.severity).toBe('error')
    expect(strict.ok).toBe(false)
  })

  it('replays a created, edited and renamed instance with no drift (distributed-storage S6b/S6c)', async () => {
    expect(
      (
        await applyChange(
          iRoot,
          await writeInstanceCs(
            [
              CREATE_EPISODE,
              {
                id: 'c-02',
                op: 'add_element',
                target: 'villabotijos-today/new-episode@Scene',
                concept: 'Scene',
                name: '00 Gancho',
              },
              {
                id: 'c-03',
                op: 'update_field',
                target: 'villabotijos-today/new-episode@00-gancho&voice',
                to: 'raspy',
              },
            ],
            'create_changes_NN.md',
          ),
        )
      ).success,
    ).toBe(true)
    const createBytes = await readFile(join(iChangesDir, 'create_changes_NN.md'), 'utf-8')

    expect(
      (
        await applyChange(
          iRoot,
          await writeInstanceCs(
            [{ id: 'c-01', op: 'move_model', target: 'villabotijos-today/new-episode', to: 'villabotijos-today/welcome' }],
            'rename_changes_NN.md',
          ),
        )
      ).success,
    ).toBe(true)

    // The earlier changeset bytes and its seal are untouched by the later move.
    const sealed = parseChangeset(createBytes)
    expect(sealed.frontmatter.proposal_sha).toBe(computeProposalSha(sealed.changes))
    expect(await readFile(join(iChangesDir, 'create_changes_NN.md'), 'utf-8')).toBe(createBytes)

    const strict = await checkDomainProvenance(iRoot, { strict: true })
    expect(strict.diagnostics.map((d) => `${d.code}: ${d.unit ?? ''}`)).toEqual([])
    expect(strict.ok).toBe(true)

    const fold = await checkDomain(iRoot, { offline: true })
    expect(fold.provenance.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD' || d.code === 'MODEL_WITHOUT_FILE')).toEqual([])
  })

  it('reports an instance with no recorded creation as not strictly checkable', async () => {
    const dir = join(iRoot, 'series', 'villabotijos-today', 'assets', 'hand-made')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'hand-made_coNNtent_NN.md'), UNRECORDED_VIDEO, 'utf-8')

    const strict = await checkDomainProvenance(iRoot, { strict: true })
    const unrecorded = strict.diagnostics.filter((d) => d.code === 'MODEL_WITHOUT_RECORD')
    expect(unrecorded).toHaveLength(1)
    expect(unrecorded[0]!.message).toContain('villabotijos-today/hand-made')
    expect(unrecorded[0]!.message).toContain('strict')
    expect(strict.ok).toBe(false)
  })
})

/* ── strict replay of an extracted instance (distributed-storage S6d) ─────── */

const xRoot = join(import.meta.dirname!, '..', 'temp-test-provenance-extract')
const xChangesDir = join(xRoot, 'changes')
const xSpecsDir = join(xRoot, 'specs')
const xBlueprintsDir = join(xSpecsDir, 'bluepriNNts')
const xSeriesDir = join(xRoot, 'series', 'innteresante')
const xRegistryRel = 'kNNowledge/InnteresanteVideos_coNNtent_NN.md'
const xIntroRel = 'series/innteresante/assets/intro/intro_coNNtent_NN.md'

/** The S6a blueprint plus a `status` select on Video, so a value can be checked. */
const EXTRACT_BLUEPRINT = VIDEO_BLUEPRINT.replace(
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

const CREATE_REGISTRY: ChangeItem[] = [
  {
    id: 'c-01',
    op: 'add_model',
    target: 'InnteresanteVideos',
    blueprint_name: VIDEO_BLUEPRINT_NAME,
    blueprint_url: VIDEO_BLUEPRINT_REL,
    name: 'Innteresante Videos',
  },
  // The scaffold also seeds one placeholder per distributed concept; drop the
  // Video one so the registry only holds the episodes it really lists.
  { id: 'c-02', op: 'remove_element', target: 'InnteresanteVideos@example-video', concept: 'Video' },
  { id: 'c-03', op: 'add_element', target: 'InnteresanteVideos@Video', concept: 'Video', name: 'Intro' },
  { id: 'c-04', op: 'add_element', target: 'InnteresanteVideos@Video', concept: 'Video', name: 'Nuevo' },
  { id: 'c-05', op: 'update_field', target: 'InnteresanteVideos@intro&status', to: 'published' },
  { id: 'c-06', op: 'update_field', target: 'InnteresanteVideos@nuevo&status', to: 'draft' },
]

const EXTRACT_INTRO: ChangeItem = {
  id: 'c-01',
  op: 'extract_instance',
  target: 'InnteresanteVideos_coNNtent@intro',
  to: 'innteresante/intro',
  blueprint_name: VIDEO_BLUEPRINT_NAME,
  blueprint_url: VIDEO_BLUEPRINT_REL,
}

async function writeExtractCs(changes: ChangeItem[], name: string): Promise<string> {
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
  return 'changes/' + name
}

describe('strict replay of an extracted instance (distributed-storage S6d)', () => {
  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(xRoot, '.cache')
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await rm(xRoot, { recursive: true, force: true })
    for (const dir of [xChangesDir, xBlueprintsDir, xSeriesDir, join(xRoot, 'kNNowledge')]) await mkdir(dir, { recursive: true })
    await writeFile(join(xSpecsDir, 'defiNNe_V_0-1-0_NN.md'), LEVEL0_CONTENT, 'utf-8')
    await writeFile(join(xSpecsDir, 'iNNfo_V_0-7-0_NN.md'), LEVEL1_CONTENT, 'utf-8')
    await writeFile(join(xBlueprintsDir, 'coNNtent_V_0-1-0_NN.md'), EXTRACT_BLUEPRINT, 'utf-8')
    await writeFile(join(xSeriesDir, 'innteresante_coNNtent_NN.md'), seriesModel('innteresante', 'Innteresante'), 'utf-8')
  })

  afterEach(async () => {
    delete process.env.INNFO_CACHE_DIR
    vi.restoreAllMocks()
    await rm(xRoot, { recursive: true, force: true })
  })

  it('seeds the new instance from the source and reports no drift', async () => {
    const created = await applyChange(xRoot, await writeExtractCs(CREATE_REGISTRY, 'create_changes_NN.md'))
    if (!created.success) console.log('DEBUG create:', JSON.stringify(created.errors))
    expect(created.success).toBe(true)
    const extracted = await applyChange(xRoot, await writeExtractCs([EXTRACT_INTRO], 'extract_changes_NN.md'))
    if (!extracted.success) console.log('DEBUG extract:', JSON.stringify(extracted.errors))
    expect(extracted.success).toBe(true)

    const intro = await readFile(join(xRoot, xIntroRel), 'utf-8')
    expect(intro).toContain('## NN Video: Intro')
    expect(intro).toContain('status:: published')

    const strict = await checkDomainProvenance(xRoot, { strict: true })
    expect(strict.diagnostics.map((d) => `${d.code}: ${d.unit ?? ''}`)).toEqual([])
    expect(strict.ok).toBe(true)

    // The reduced registry replays too: its placeholder and `nuevo` remain.
    const registry = await readFile(join(xRoot, xRegistryRel), 'utf-8')
    expect(registry).toContain('## NN Video: Nuevo')
    expect(registry).not.toContain('## NN Video: Intro')
  })

  it('flags a hand edit of the extracted instance as drift', async () => {
    expect((await applyChange(xRoot, await writeExtractCs(CREATE_REGISTRY, 'create_changes_NN.md'))).success).toBe(true)
    expect((await applyChange(xRoot, await writeExtractCs([EXTRACT_INTRO], 'extract_changes_NN.md'))).success).toBe(true)

    const path = join(xRoot, xIntroRel)
    const content = await readFile(path, 'utf-8')
    await writeFile(path, content.replace('status:: published', 'status:: draft'), 'utf-8')

    const strict = await checkDomainProvenance(xRoot, { strict: true })
    const drift = strict.diagnostics.filter((d) => d.code === 'EDITED_WITHOUT_RECORD')
    expect(drift).toHaveLength(1)
    expect(strict.ok).toBe(false)
  })
})
