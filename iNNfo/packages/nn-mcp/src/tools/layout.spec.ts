import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { checkWorkspace } from './check-workspace'
import { validateKnowledge } from './validate'
import { rmWithRetry } from '../../test/helpers/fs-retry'

/**
 * `check_domain.layout` (distributed-storage S4a, design A12/A14).
 *
 * The fixture is deliberately self-contained: a LOCAL bluepriNNt under `specs/`
 * that declares `Series` as a distributed container and `Video` as a distributed
 * concept stored at `{container}/assets/{slug}/`. `loadDeclarations` reads it
 * through the model's workspace-relative `parent_spec.url`, so no network is
 * needed and the storage declarations are real rather than mocked.
 */
const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-layout-s4a')
const specsDir = join(rootDir, 'specs')
const blueprintsDir = join(specsDir, 'bluepriNNts')
const modelsDir = join(rootDir, 'models')
const seriesDir = join(modelsDir, 'series')

const BLUEPRINT_REL = 'specs/bluepriNNts/video-script_V_0-1-0_NN.md'

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
  '## NN Concept Definition: Preset',
  'type:: list',
  '',
].join('\n')

const SERIES_BLUEPRINT_REL = BLUEPRINT_REL

/** Level 0/1 the bluepriNNt pins, so `validate_knowledge` resolves the chain locally. */
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

async function writeChain(): Promise<void> {
  await writeFile(join(specsDir, 'defiNNe_V_0-1-0_NN.md'), LEVEL0_CONTENT, 'utf-8')
  await writeFile(join(specsDir, 'iNNfo_V_0-7-0_NN.md'), LEVEL1_CONTENT, 'utf-8')
}

/** A `Series` instance model — the container a `Video` instance hangs from. */
function seriesModel(slug: string): string {
  return [
    '---',
    'level: 3',
    `title: "Series ${slug}"`,
    'knowledge_version: "V_0-1-0"',
    'parent_spec:',
    '  name: "video-script_V_0-1-0"',
    `  url: "${SERIES_BLUEPRINT_REL}"`,
    '---',
    '',
    '# NN Series',
    '',
    `## NN Series: ${slug}`,
    '',
  ].join('\n')
}

function videoModel(options: {
  title: string
  version?: string
  series?: string
  body?: string
}): string {
  const slug = options.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return [
    '---',
    'level: 3',
    `title: "${options.title}"`,
    'knowledge_version: "V_0-1-0"',
    'parent_spec:',
    `  name: "video-script_V_0-1-0"`,
    `  url: "${BLUEPRINT_REL}"`,
    '---',
    '',
    '# NN Series',
    '',
    options.series ? `## NN Series: ${options.series}\n` : '',
    '# NN Video',
    '',
    options.body ?? `## NN Video: ${slug}\n`,
    '',
  ].join('\n')
}

/** A model pinning a DIFFERENT version of the same bluepriNNt name (skew fixture). */
function videoModelPinning(version: string, title: string): string {
  return videoModel({ title }).replace(
    'name: "video-script_V_0-1-0"',
    `name: "video-script_${version}"`,
  )
}

async function write(relPath: string, content: string): Promise<string> {
  const abs = join(rootDir, relPath)
  await mkdir(join(abs, '..'), { recursive: true })
  await writeFile(abs, content, 'utf-8')
  return abs
}

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex')

describe('check_domain layout (distributed-storage S4a)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as unknown as Response)
    await rmWithRetry(rootDir)
    await mkdir(blueprintsDir, { recursive: true })
    await mkdir(modelsDir, { recursive: true })
    await writeChain()
    await writeFile(join(blueprintsDir, 'video-script_V_0-1-0_NN.md'), VIDEO_BLUEPRINT, 'utf-8')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rmWithRetry(rootDir)
  })

  it('is present, carries no collisions field, and reports a skew as an error with meta', async () => {
    await write('series/villabotijos-today/assets/intro/intro_video-script_NN.md', videoModel({ title: 'Intro' }))
    await write('series/x/assets/one/one_video-script_NN.md', videoModelPinning('V_0-2-0', 'One'))

    const report = await checkWorkspace(rootDir, { offline: true })

    expect('collisions' in report).toBe(false)
    expect(report.layout.ok).toBe(false)
    const skew = report.layout.diagnostics.filter((d) => d.code === 'BLUEPRINT_VERSION_SKEW')
    expect(skew).toHaveLength(1)
    expect(skew[0].severity).toBe('error')
    expect(skew[0].meta?.blueprint).toBe('video-script')
    const versions = skew[0].meta?.versions as Array<{ version: string; count: number }>
    expect(versions.map((v) => v.version).sort()).toEqual(['V_0-1-0', 'V_0-2-0'])
    expect(skew[0].paths).toHaveLength(2)
  })

  it('is ok when every model of a bluepriNNt shares one pin', async () => {
    await write('series/villabotijos-today/villabotijos-today_video-script_NN.md', seriesModel('villabotijos-today'))
    await write('series/x/x_video-script_NN.md', seriesModel('x'))
    await write('series/villabotijos-today/assets/intro/intro_video-script_NN.md', videoModel({ title: 'Intro' }))
    await write('series/x/assets/one/one_video-script_NN.md', videoModel({ title: 'One' }))

    const report = await checkWorkspace(rootDir, { offline: true })
    expect(report.layout.ok).toBe(true)
    expect(report.layout.diagnostics).toEqual([])
  })

  it('reports PLACEMENT_MISMATCH with the expected folder and the fix', async () => {
    await write('series/x/x_video-script_NN.md', seriesModel('x'))
    await write('series/x/videos/intro/intro_video-script_NN.md', videoModel({ title: 'Intro' }))

    const report = await checkWorkspace(rootDir, { offline: true })
    const placement = report.layout.diagnostics.filter((d) => d.code === 'PLACEMENT_MISMATCH')
    expect(placement).toHaveLength(1)
    expect(placement[0].severity).toBe('error')
    expect(placement[0].message).toContain('series/x/assets/intro/')
    expect(placement[0].paths).toEqual(['series/x/videos/intro/intro_video-script_NN.md'])
  })

  it('names every path of a duplicated model id', async () => {
    await write('a/dup_video-script_NN.md', videoModel({ title: 'A' }))
    await write('b/dup_video-script_NN.md', videoModel({ title: 'B' }))

    const report = await checkWorkspace(rootDir, { offline: true })
    const dup = report.layout.diagnostics.filter((d) => d.code === 'DUPLICATE_MODEL_ID')
    expect(dup).toHaveLength(1)
    expect(dup[0].paths).toHaveLength(2)
    expect(dup[0].message).toContain('a/dup_video-script_NN.md')
    expect(dup[0].message).toContain('b/dup_video-script_NN.md')
  })

  it('a domaiNN pinning a non-declaring bluepriNNt has no placement findings', async () => {
    await mkdir(join(blueprintsDir, 'plain'), { recursive: true })
    await writeFile(
      join(blueprintsDir, 'plain', 'spec_NN.md'),
      VIDEO_BLUEPRINT.replace('storage:: distributed\nplacement:: series/{slug}/', '')
        .replace('storage:: distributed\nplacement:: {container}/assets/{slug}/', '')
        .replace('container:: Series\n', ''),
      'utf-8',
    )
    await write(
      'loose/intro_video-script_NN.md',
      videoModel({ title: 'Intro' })
        .replace('name: "video-script_V_0-1-0"', 'name: "plain_V_0-1-0"')
        .replace(`url: "${BLUEPRINT_REL}"`, 'url: "specs/bluepriNNts/plain/spec_NN.md"'),
    )

    const report = await checkWorkspace(rootDir, { offline: true })
    const placementCodes = report.layout.diagnostics
      .filter((d) => d.paths.some((p) => p.includes('loose/')))
      .map((d) => d.code)
    expect(placementCodes).toEqual([])
  })

  it('caps layout.diagnostics at 25 under summaryOnly and never touches the fixtures', async () => {
    const paths: string[] = []
    for (let i = 0; i < 30; i++) {
      const rel = `series/x/assets/v${String(i).padStart(2, '0')}/v${String(i).padStart(2, '0')}_video-script_NN.md`
      paths.push(await write(rel, videoModel({ title: `Video ${i}` })))
      await write(`series/x/assets/v${String(i).padStart(2, '0')}/wrong_name_NN.md`, videoModel({ title: `Wrong ${i}` }))
    }
    const before = sha256(await readFile(paths[0], 'utf-8'))

    const full = await checkWorkspace(rootDir, { offline: true })
    expect(full.layout.diagnostics.length).toBeGreaterThan(25)
    expect(full.layoutTruncated).toBeUndefined()

    const summary = await checkWorkspace(rootDir, { offline: true, summaryOnly: true })
    expect(summary.layout.diagnostics).toHaveLength(25)
    expect(summary.layoutTruncated).toBe(true)
    expect(summary.truncated).toBe(true)
    expect(summary.layout.ok).toBe(false)

    expect(sha256(await readFile(paths[0], 'utf-8'))).toBe(before)
  }, 60000)
})

describe('validate_knowledge and layout (distributed-storage S4a)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as unknown as Response)
    await rmWithRetry(rootDir)
    await mkdir(blueprintsDir, { recursive: true })
    await mkdir(modelsDir, { recursive: true })
    await writeChain()
    await writeFile(join(blueprintsDir, 'video-script_V_0-1-0_NN.md'), VIDEO_BLUEPRINT, 'utf-8')
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rmWithRetry(rootDir)
  })

  it('a single-file pass reports its own placement error and stays silent about skew', async () => {
    await write('series/x/videos/intro/intro_video-script_NN.md', videoModel({ title: 'Intro' }))
    await write('series/x/assets/one/one_video-script_NN.md', videoModelPinning('V_0-2-0', 'One'))

    // The misplaced model's own id: the file name is an instance name, so the
    // index addresses it by slug rather than by path.
    const result = await validateKnowledge(rootDir, 'x/intro', undefined, undefined, false, {
      checkFreshness: false,
    })
    const codes = [...result.errors, ...result.warnings].map((d) => d.code)
    expect(codes).toContain('PLACEMENT_MISMATCH')
    expect(codes).not.toContain('BLUEPRINT_VERSION_SKEW')
  })

  it('workspace mode files the skew against the model it names', async () => {
    await write('series/x/assets/intro/intro_video-script_NN.md', videoModel({ title: 'Intro' }))
    await write('series/x/assets/one/one_video-script_NN.md', videoModelPinning('V_0-2-0', 'One'))

    const result = await validateKnowledge(rootDir, 'x/intro', undefined, undefined, true, {
      checkFreshness: false,
    })
    const skew = [...result.errors, ...result.warnings].filter((d) => d.code === 'BLUEPRINT_VERSION_SKEW')
    expect(skew).toHaveLength(1)
    expect(skew[0].filePath).toContain('intro_video-script_NN.md')
  })

  it('a duplicated identity is reported by check_domain only', async () => {
    await write('a/dup_video-script_NN.md', videoModel({ title: 'A' }))
    await write('b/dup_video-script_NN.md', videoModel({ title: 'B' }))

    const single = await validateKnowledge(rootDir, 'a/dup_video-script_NN.md', undefined, undefined, false, {
      checkFreshness: false,
    })
    expect([...single.errors, ...single.warnings].map((d) => d.code)).not.toContain('DUPLICATE_MODEL_ID')

    const report = await checkWorkspace(rootDir, { offline: true })
    expect(report.layout.diagnostics.map((d) => d.code)).toContain('DUPLICATE_MODEL_ID')
  })
})
