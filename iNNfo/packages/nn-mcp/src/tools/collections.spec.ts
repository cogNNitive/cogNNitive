import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { queryUnits } from './query-units'
import { listKnowledge } from './list-read'
import { rmWithRetry } from '../../test/helpers/fs-retry'

/**
 * Distributed collections (distributed-storage S5a):
 * `query_units` answers `collection:<Concept>?...` across every instance, and
 * `list_knowledge` exposes the same collection with storage.
 *
 * Fixture: one Series container, one Video instance per series, a Scene element
 * inside each Video. Videos are `published`/`draft` so a filter can select.
 */
const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-collections')
const specsDir = join(rootDir, 'specs')
const blueprintsDir = join(specsDir, 'bluepriNNts')
const BP = 'specs/bluepriNNts/video-script_V_0-1-0_NN.md'

const BLUEPRINT = [
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
].join('\n')

const LEVEL0 = ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "defiNNe"', '---', ''].join('\n')
const LEVEL1 = [
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

function frontmatter(title: string): string[] {
  return [
    '---',
    'level: 3',
    `title: "${title}"`,
    'knowledge_version: "V_0-1-0"',
    'parent_spec:',
    '  name: "video-script_V_0-1-0"',
    `  url: "${BP}"`,
    '---',
    '',
  ]
}

function seriesModel(slug: string): string {
  return [...frontmatter(`Series ${slug}`), '# NN Series', '', `## NN Series: ${slug}`, ''].join('\n')
}

function videoModel(slug: string, status: string, sceneSlug = '00-gancho'): string {
  return [
    ...frontmatter(`Video ${slug}`),
    '# NN Video',
    '',
    `## NN Video: ${slug}`,
    `status:: ${status}`,
    '',
    '# NN Scene',
    '',
    `## NN Scene: ${sceneSlug}`,
    `slug:: ${sceneSlug}`,
    `status:: ${status}`,
    '',
  ].join('\n')
}

async function write(relPath: string, content: string): Promise<void> {
  const abs = join(rootDir, relPath)
  await mkdir(join(abs, '..'), { recursive: true })
  await writeFile(abs, content, 'utf-8')
}

async function buildDomain(): Promise<void> {
  await write(BP, BLUEPRINT)
  await write('specs/iNNfo_V_0-7-0_NN.md', LEVEL1)
  await write('specs/defiNNe_V_0-1-0_NN.md', LEVEL0)
  await write('series/villabotijos-today/villabotijos-today_video-script_NN.md', seriesModel('villabotijos-today'))
  await write('series/innteresante/innteresante_video-script_NN.md', seriesModel('innteresante'))
  await write(
    'series/villabotijos-today/assets/pepper-mapache/pepper-mapache_video-script_NN.md',
    videoModel('pepper-mapache', 'published'),
  )
  await write(
    'series/villabotijos-today/assets/intro/intro_video-script_NN.md',
    videoModel('intro', 'draft'),
  )
  await write(
    'series/innteresante/assets/intro/intro_video-script_NN.md',
    videoModel('intro', 'published'),
  )
}

describe('query_units over a collection (distributed-storage S5a)', () => {
  beforeEach(async () => {
    await rmWithRetry(rootDir)
    await buildDomain()
  })

  afterEach(async () => {
    await rmWithRetry(rootDir)
  })

  it('filters across a concept\'s instances and returns the matching owners', async () => {
    const result = await queryUnits(rootDir, 'collection:Video?status=published')
    expect(result.diagnostics).toEqual([])
    const owners = result.uris.map((uri) => uri.split('@')[0])
    expect(owners).toEqual(['innteresante/intro', 'villabotijos-today/pepper-mapache'])
    expect(result.uris).not.toContain('villabotijos-today/intro@pepper-mapache')
  })

  it('returns full addresses with the owning instance for a compact concept inside instances', async () => {
    const result = await queryUnits(rootDir, 'collection:Scene?status=published')
    expect(result.diagnostics).toEqual([])
    // Headings keep their human-readable form on the read side (`@## <text>`),
    // and the head is the OWNING instance's id, not a file path.
    expect(result.uris).toEqual([
      'innteresante/intro@## NN Scene: 00-gancho',
      'villabotijos-today/pepper-mapache@## NN Scene: 00-gancho',
    ])
  })

  it('projects a field across the collection', async () => {
    const result = await queryUnits(rootDir, 'collection:Video?status=published&status')
    expect(result.values).toEqual(['published', 'published'])
  })

  it('reports an unknown concept instead of returning an empty set', async () => {
    const result = await queryUnits(rootDir, 'collection:NoSuchConcept?status=published')
    expect(result.uris).toEqual([])
    expect(result.diagnostics[0].message).toContain('NoSuchConcept')
  })

  it('still rejects a bare element target mixed with a query', async () => {
    const result = await queryUnits(rootDir, 'villabotijos-today/intro@00-gancho?status=published')
    expect(result.uris).toEqual([])
    expect(result.diagnostics[0].severity).toBe('error')
  })

  it('gives the same logical result for a compact copy', async () => {
    await write(
      'flat/flat_video-script_NN.md',
      [...frontmatter('Flat'), '# NN Video', '', '## NN Video: solo', 'status:: published', ''].join('\n'),
    )
    const result = await queryUnits(rootDir, 'collection:Video?status=published')
    const owners = result.uris.map((uri) => uri.split('@')[0])
    expect(owners).toContain('flat_video-script')
    expect(owners).toContain('innteresante/intro')
    expect(owners).toContain('villabotijos-today/pepper-mapache')
  })
})

describe('list_knowledge exposes collections (distributed-storage S5a)', () => {
  beforeEach(async () => {
    await rmWithRetry(rootDir)
    await buildDomain()
  })

  afterEach(async () => {
    await rmWithRetry(rootDir)
  })

  it('lists models sorted by id with their blueprint and storage', async () => {
    const models = await listKnowledge(rootDir)
    const ids = models.map((m) => m.id)
    expect(ids).toEqual([...ids].sort())
    const video = models.find((m) => m.id === 'villabotijos-today/pepper-mapache')
    expect(video).toBeDefined()
    expect(video!.blueprint).toBe('video-script')
    expect(video!.storage).toEqual({ kind: 'instance', concept: 'Video' })
  })

  it('returns both intro instances with distinct addresses for a collection', async () => {
    const videos = await listKnowledge(rootDir, { collection: 'Video' })
    const intros = videos.filter((m) => m.id.endsWith('/intro'))
    expect(intros).toHaveLength(2)
    expect(intros.map((m) => m.id)).toEqual(['innteresante/intro', 'villabotijos-today/intro'])
    expect(new Set(intros.map((m) => m.path)).size).toBe(2)
    expect(videos.every((m) => m.storage?.kind === 'instance' && m.storage.concept === 'Video')).toBe(true)
  })

  it('lists a misplaced instance with its placement finding', async () => {
    await write(
      'series/villabotijos-today/videos/stray/stray_video-script_NN.md',
      videoModel('stray', 'published'),
    )
    const videos = await listKnowledge(rootDir, { collection: 'Video' })
    const stray = videos.find((m) => m.path.endsWith('stray_video-script_NN.md'))
    expect(stray).toBeDefined()
    expect(stray!.placement).toBe('PLACEMENT_MISMATCH')
  })
})
