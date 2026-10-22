import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { validateKnowledge } from './mutate'

// Slice 1 proof: the domaiNN-local `site` bluepriNNt (site_NN/specs/bluepriNNts/site/spec_NN.md)
// resolves from a local `parent_spec.url`, with no network, and its Site/Page documents validate.

const repoRoot = join(import.meta.dirname!, '..', '..', '..', '..', '..')
const domainDir = join(repoRoot, 'site_NN')
const SITE_DOC = 'kNNowledge/site_NN.md'
const PAGE_DOC = 'kNNowledge/pitch_site_NN.md'

let cacheDir: string
const fetchSpy = vi.fn(async (..._args: unknown[]) => {
  throw new Error('network access is not allowed in the site-domain proof')
})

beforeAll(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'site-domain-cache-'))
  vi.stubGlobal('fetch', fetchSpy)
})

beforeEach(() => {
  fetchSpy.mockClear()
})

afterAll(async () => {
  vi.unstubAllGlobals()
  await rm(cacheDir, { recursive: true, force: true })
})

const read = (rel: string): Promise<string> => readFile(join(domainDir, rel), 'utf-8')

// The platform parents (iNNfo, defiNNition) try the network first and fall back to the embedded
// canonical registry, so fetches for them are tolerated (and fail here). The local site
// bluepriNNt must never be requested over the network.
function expectNoSiteSpecFetch(): void {
  const urls = fetchSpy.mock.calls.map((c) => String(c[0]))
  // Positive control: the platform parents were requested, so the spy is wired and the filter below is not vacuous.
  expect(urls.some((u) => /iNNfo_V_0-5-0/.test(u))).toBe(true)
  expect(urls.filter((u) => /site/i.test(u))).toEqual([])
}

async function validateDoc(content: string) {
  return validateKnowledge(domainDir, undefined, content, undefined, undefined, {
    checkFreshness: false,
    cacheDir,
  })
}

describe('site domaiNN: local bluepriNNt resolution', () => {
  it('validates the Site singleton against the local bluepriNNt without network', async () => {
    const result = await validateDoc(await read(SITE_DOC))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
    expectNoSiteSpecFetch()
  })

  it('validates a Page against the local bluepriNNt without network', async () => {
    const result = await validateDoc(await read(PAGE_DOC))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
    expectNoSiteSpecFetch()
  })

  it('reports PARENT_RESOLUTION_FAILED when the local url points nowhere', async () => {
    const broken = (await read(PAGE_DOC)).replace(
      'specs/bluepriNNts/site/spec_NN.md',
      'specs/bluepriNNts/nope/spec_NN.md',
    )
    const result = await validateDoc(broken)
    expect(result.valid).toBe(false)
    expect(result.errors.map((e) => e.code)).toContain('PARENT_RESOLUTION_FAILED')
  })

  it('declares the local layout on the domaiNN root', async () => {
    const root = await read('domaiNN_NN.md')
    expect(root).toContain('knowledge_dir:: kNNowledge/')
    expect(root).toContain('blueprints_dir:: specs/bluepriNNts/')
    expect(root).not.toMatch(/template_version|models_dir|type:: model/)
  })

  it('declares the Page fields without a slug Field', async () => {
    const spec = await read('specs/bluepriNNts/site/spec_NN.md')
    expect(spec).toContain('## NN Field Definition: kind')
    expect(spec).toContain('## NN Field Definition: summary')
    expect(spec).not.toContain('## NN Field Definition: slug')
    expect(spec).not.toMatch(/## NN Concept Definition: (Section|Navigation)/)
  })
})

describe('site domaiNN: bluepriNNt rules', () => {
  it('rejects an unknown kind', async () => {
    const page = (await read(PAGE_DOC)).replace(/^kind:: .*$/m, 'kind:: blog')
    const result = await validateDoc(page)
    expect(result.valid).toBe(false)
    expect(JSON.stringify(result.errors)).toContain('blog')
  })

  // FINDING (Slice 1): the blueprint format has no required-field or singleton mechanism, and
  // inline validation does not check the grammar of `sources::`. These three spec scenarios are
  // therefore NOT enforced by validateKnowledge; loadSite enforces them (Slice 3a). These
  // characterization tests turn red if nn-core starts enforcing them, which is the signal to
  // move the rule into the blueprint.
  it('does not enforce a missing summary at the nn-core layer (loadSite does)', async () => {
    const page = (await read(PAGE_DOC)).replace(/^summary:: .*\n/m, '')
    expect(page).not.toContain('summary::')
    const result = await validateDoc(page)
    expect(result.errors).toEqual([])
  })

  it('does not enforce the Site singleton at the nn-core layer (loadSite does)', async () => {
    const extra = ['## NN Site: Second', 'tagline:: x', 'base_url:: https://example.com/', ''].join('\n')
    const second = (await read(SITE_DOC)).replace('## NN Site:', `${extra}\n## NN Site:`)
    expect(second.match(/^## NN Site:/gm)).toHaveLength(2)
    const result = await validateDoc(second)
    expect(result.errors).toEqual([])
  })

  it('does not enforce the citation grammar of sources at the nn-core layer (loadSite does)', async () => {
    const page = (await read(PAGE_DOC)).replace(
      /^summary:: .*$/m,
      (line) => `${line}\nsources:: see the README`,
    )
    expect(page).toContain('sources:: see the README')
    const result = await validateDoc(page)
    expect(result.errors).toEqual([])
  })
})
