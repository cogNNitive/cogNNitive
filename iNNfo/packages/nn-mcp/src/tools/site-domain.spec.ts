import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
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

// Slice 2: seed Pages. One kNNowledge document per kind (<kind>_site_NN.md).
// The kinds are read from the bluepriNNt `kind` select, not hardcoded.
async function blueprintKinds(): Promise<string[]> {
  const spec = await read('specs/bluepriNNts/site/spec_NN.md')
  const block = spec.split('## NN Field Definition: kind')[1]?.split(/\n#{1,2} /)[0] ?? ''
  const m = block.match(/^options:: \[(.+)\]$/m)
  expect(m).not.toBeNull()
  return m![1].split(',').map((k) => k.trim())
}
const KINDS = ['tutorial', 'guide', 'concept', 'reference', 'pitch', 'legal'] // sanity pin, asserted equal below
const PAGE_RE = /^## NN Page: (.+)$/gm

describe('site domaiNN: seed Pages', () => {
  it('reads the six kinds from the bluepriNNt and has one Page file per kind', async () => {
    const kinds = await blueprintKinds()
    expect([...kinds].sort()).toEqual([...KINDS].sort())
    const files = (await readdir(join(domainDir, 'kNNowledge')))
      .filter((f) => /_site_NN\.md$/.test(f) && f !== 'site_NN.md')
      .map((f) => f.replace(/_site_NN\.md$/, ''))
    expect(files.sort()).toEqual([...kinds].sort())
  })

  it('tutorial names a bluepriNNt, does not overclaim citations, and links the guide', async () => {
    const t = await read('kNNowledge/tutorial_site_NN.md')
    expect(t).toContain('for example business')
    expect(t).not.toContain('every statement')
    expect(t).toContain('[[Validate your domaiNN]]')
  })

  it('reference summary does not claim to list every folder', async () => {
    const r = await read('kNNowledge/reference_site_NN.md')
    expect(r).toMatch(/^summary:: .*main folders/m)
  })

  const docs = KINDS.map((kind) => ({ kind, rel: `kNNowledge/${kind}_site_NN.md` }))

  it.each(docs)('validates the $kind seed document without errors', async ({ rel }) => {
    const result = await validateDoc(await read(rel))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it.each(docs)('declares exactly one Page of kind $kind with slug, order and summary', async ({ kind, rel }) => {
    const text = await read(rel)
    expect([...text.matchAll(PAGE_RE)]).toHaveLength(1)
    expect(text).toMatch(new RegExp(`^kind:: ${kind}$`, 'm'))
    expect(text).toMatch(/^slug:: [a-z0-9]+(-[a-z0-9]+)*$/m)
    expect(text).toMatch(/^order:: \d+$/m)
    expect(text).toMatch(/^summary:: \S.*$/m)
  })

  it('uses unique slugs site-wide with exactly one index', async () => {
    const slugs: string[] = []
    for (const { rel } of docs) {
      const m = (await read(rel)).match(/^slug:: (.+)$/m)
      expect(m).not.toBeNull()
      slugs.push(m![1])
    }
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.filter((s) => s === 'index')).toHaveLength(1)
  })

  it.each(docs)('keeps key:: lines out of the $kind body and uses no #/## headings in it', async ({ rel }) => {
    const text = await read(rel)
    const lines = text.split('\n')
    const start = lines.findIndex((l) => /^## NN Page: /.test(l))
    expect(start).toBeGreaterThan(-1)
    let i = start + 1
    while (i < lines.length && /^[\w-]+:: /.test(lines[i])) i++
    const body = lines.slice(i)
    expect(body.filter((l) => /^\s*[\w-]+::\s/.test(l))).toEqual([])
    expect(body.filter((l) => /^#{1,2} /.test(l))).toEqual([])
    expect(body.join('\n').trim().length).toBeGreaterThan(0)
  })

  it('ships a compile-site procedure naming the compiler script', async () => {
    const proc = await read('specs/bluepriNNts/site/procedures/compile_site_procedures_NN.md')
    expect(proc).toContain('tool:: scripts/site/compile-site.mjs')
    const result = await validateDoc(proc)
    expect(result.errors).toEqual([])
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
