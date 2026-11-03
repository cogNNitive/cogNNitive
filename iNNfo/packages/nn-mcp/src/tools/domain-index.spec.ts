import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { buildNodeDomainIndex } from './domain-index.js'
import { findKnowledgeFile } from './spec.js'
import { readKnowledge } from './list-read.js'

const BLUEPRINT = [
  '---',
  'level: 2',
  'title: "Video Script"',
  'blueprint_name: "video-script"',
  'blueprint_version: "V_0-1-0"',
  '---',
  '',
  '# NN Concept Definition',
  '',
  '## NN Concept Definition: Series',
  'slug:: series',
  'type:: list',
  'storage:: distributed',
  'placement:: "series/{slug}/"',
  '',
  '## NN Concept Definition: Video',
  'slug:: video',
  'type:: list',
  'storage:: distributed',
  'container:: Series',
  'placement:: "{container}/assets/{slug}/"',
  '',
].join('\n')

function model(blueprintUrl: string, concept: string, name: string, bp = 'video-script_V_0-1-0'): string {
  return [
    '---',
    'level: 3',
    'parent_spec:',
    `  name: ${bp}`,
    `  url: ${blueprintUrl}`,
    '---',
    '',
    `# NN ${concept}`,
    '',
    `## NN ${concept}: ${name}`,
    `slug:: ${name}`,
    '',
  ].join('\n')
}

describe('buildNodeDomainIndex', () => {
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-domain-index-'))
    await mkdir(join(root, 'bp'), { recursive: true })
    await writeFile(join(root, 'bp', 'video-script_NN.md'), BLUEPRINT, 'utf-8')
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  async function put(rel: string, content: string) {
    await mkdir(join(root, rel, '..'), { recursive: true })
    await writeFile(join(root, rel), content, 'utf-8')
  }

  it('builds hierarchical ids for two series that each hold a Video named intro', async () => {
    const url = 'bp/video-script_NN.md'
    await put('series/villa/villa_video-script_NN.md', model(url, 'Series', 'villa'))
    await put('series/innteresante/innteresante_video-script_NN.md', model(url, 'Series', 'innteresante'))
    await put('series/villa/assets/intro/intro_video-script_NN.md', model(url, 'Video', 'intro'))
    await put('series/innteresante/assets/intro/intro_video-script_NN.md', model(url, 'Video', 'intro'))

    const { index, pathOf } = await buildNodeDomainIndex(root)
    expect(index.models.map((m) => m.id)).toEqual([
      'innteresante',
      'innteresante/intro',
      'villa',
      'villa/intro',
    ])
    expect(pathOf('villa/intro')).toBe(join(root, 'series', 'villa', 'assets', 'intro', 'intro_video-script_NN.md'))
    expect(pathOf('intro')).toBeNull()
  })

  it('an unresolvable bluepriNNt yields MODEL_UNADDRESSABLE in strict mode and the model gets no id', async () => {
    await put('x/orphan_ghost_NN.md', model('https://example.invalid/ghost_NN.md', 'Thing', 'orphan', 'ghost_V_0-1-0'))
    const { index } = await buildNodeDomainIndex(root, { strict: true })
    expect(index.models).toEqual([])
    const d = index.diagnostics.find((x) => x.code === 'MODEL_UNADDRESSABLE')
    expect(d?.message).toContain('ghost_V_0-1-0')
  })

  it('by default an unresolvable bluepriNNt declares no storage, so the model is compact and still listed', async () => {
    await put('x/orphan_ghost_NN.md', model('https://example.invalid/ghost_NN.md', 'Thing', 'orphan', 'ghost_V_0-1-0'))
    const { index } = await buildNodeDomainIndex(root)
    expect(index.models.map((m) => m.id)).toEqual(['orphan_ghost'])
  })

  it('resolves by hierarchical id only: a bare slug or stem does not resolve, a path throws, candidates are listed', async () => {
    const url = 'bp/video-script_NN.md'
    await put('series/villa/villa_video-script_NN.md', model(url, 'Series', 'villa'))
    await put('series/innteresante/innteresante_video-script_NN.md', model(url, 'Series', 'innteresante'))
    await put('series/villa/assets/intro/intro_video-script_NN.md', model(url, 'Video', 'intro'))
    await put('series/innteresante/assets/intro/intro_video-script_NN.md', model(url, 'Video', 'intro'))

    expect(await findKnowledgeFile(root, 'villa/intro')).toBe(
      join(root, 'series', 'villa', 'assets', 'intro', 'intro_video-script_NN.md'),
    )
    expect(await findKnowledgeFile(root, 'intro')).toBeNull()
    expect(await findKnowledgeFile(root, 'intro_video-script')).toBeNull()
    await expect(readKnowledge(root, 'series/villa/assets/intro/intro_video-script_NN.md')).rejects.toMatchObject({
      code: 'MODEL_ADDRESSED_BY_PATH',
    })

    const { index } = await buildNodeDomainIndex(root)
    const res = index.resolve('intro')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.problem.message).toContain('innteresante/intro, villa/intro')
  })
})
