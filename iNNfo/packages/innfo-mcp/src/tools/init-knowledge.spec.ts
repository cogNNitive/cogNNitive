import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { parseChangeset, parseKnowledge, checkNameInvariant } from '@cognnitive/innfo-core'
import { initKnowledge } from './init-knowledge'
import type { ConsoleWriter } from './console-regeneration'
import {
  SPEC_L0,
  SPEC_L1,
  BUSINESS_STUB,
  REFERENCE_STUB,
  BLANK_SPEC,
  BUSINESS_URL,
  REFERENCE_URL,
  BLANK_URL,
  golden,
} from '../../test/helpers/scaffold-fixtures'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-init-model')
const specsDir = join(rootDir, 'specs')
const knowledgeDir = join(rootDir, 'kNNowledge')
const changesDir = join(rootDir, 'changes')

const BUSINESS = { blueprint_name: 'business_V_0-2-0', blueprint_url: BUSINESS_URL }

/**
 * The shared golden, as it reads when created through `add_model`: the id is canonical
 * (`<name>_<blueprint>`), so the slug (and a default title) follow it.
 */
const goldenAs = (name: Parameters<typeof golden>[0], slug: string, title?: string): string => {
  const out = golden(name).replace(/^knowledge_slug: ".*"$/m, `knowledge_slug: "${slug}"`)
  return title === undefined ? out : out.replace(/^title: ".*"$/m, `title: "${title}"`)
}

const writer: ConsoleWriter = async () => ({
  path: join(rootDir, 'domaiNN_console.html'),
  status: 'written',
  opened: false,
})
const run = (id: string, args: Parameters<typeof initKnowledge>[2]) =>
  initKnowledge(rootDir, id, args, { open: false, regenerate: { writer, syncManifest: async () => ({}) } })

async function stubSpec(name: string, content: string) {
  await writeFile(join(specsDir, `${name}_NN.md`), content, 'utf-8')
}

describe('initKnowledge (add_model wrapper)', () => {
  const origCache = process.env.INNFO_CACHE_DIR

  beforeEach(async () => {
    // Hermetic temp cache: the OS temp dir is shared across test files/runs.
    process.env.INNFO_CACHE_DIR = join(rootDir, 'isolated-cache')
    await rm(rootDir, { recursive: true, force: true })
    for (const dir of [specsDir, knowledgeDir, changesDir]) await mkdir(dir, { recursive: true })
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
    await stubSpec('iNNfo_V_0-3-0', SPEC_L1)
    await stubSpec('defiNNition_V_0-1-0', SPEC_L0)
    await stubSpec('business_V_0-2-0', BUSINESS_STUB)
  })

  afterEach(async () => {
    if (origCache !== undefined) process.env.INNFO_CACHE_DIR = origCache
    else delete process.env.INNFO_CACHE_DIR
    await rm(rootDir, { recursive: true, force: true })
  })

  it('leaves one applied add_model changeset and the same document as before the change', async () => {
    const result = await run('NewModel', { ...BUSINESS, title: 'New Model' })

    expect(result.success).toBe(true)
    expect(result.id).toBe('NewModel_business')
    expect(result.filePath).toBe(join(knowledgeDir, 'NewModel_business_NN.md'))
    expect(result.content).toBe(goldenAs('business', 'newmodel-business'))
    expect(await readFile(result.filePath!, 'utf-8')).toBe(result.content)

    const files = await readdir(changesDir)
    expect(files).toHaveLength(1)
    expect(result.changeset).toBe(`changes/${files[0]}`)
    const cs = parseChangeset(await readFile(join(changesDir, files[0]), 'utf-8'))
    expect(cs.frontmatter.status).toBe('applied')
    expect(cs.changes).toHaveLength(1)
    expect(cs.changes[0]).toMatchObject({ op: 'add_model', target: 'NewModel_business', status: 'applied' })
    expect(result.validation.valid).toBe(true)
  })

  it('regenerates the console and returns next_steps without a proposal approval', async () => {
    const result = await run('NewModel', BUSINESS)
    expect(result.console?.status).toBe('written')
    expect(result.next_steps?.notice).toContain('The changeset was applied')
    expect(result.next_steps?.approve).toBeUndefined()
  })

  it('an existing id fails with MODEL_EXISTS and the broken document is left untouched', async () => {
    const broken = '# NN Person\n\n## NN Person: Alice\ncompensation:: Standard\n'
    await writeFile(join(knowledgeDir, 'Existing_business_NN.md'), broken, 'utf-8')

    const result = await run('Existing', BUSINESS)

    expect(result.success).toBe(false)
    expect(result.errors?.some((e) => e.code === 'MODEL_EXISTS')).toBe(true)
    expect(result).not.toHaveProperty('filePath')
    expect(result).not.toHaveProperty('content')
    expect(await readFile(join(knowledgeDir, 'Existing_business_NN.md'), 'utf-8')).toBe(broken)
  })

  it('an unresolvable bluepriNNt fails, writes no document and leaves no proposal behind', async () => {
    const result = await run('Orphan', {
      blueprint_name: 'ghost_V_0-1-0',
      blueprint_url: 'https://example.com/ghost_V_0-1-0_NN.md',
    })

    expect(result.success).toBe(false)
    expect(result.errors?.[0].code).toBe('BLUEPRINT_UNRESOLVED')
    expect(result).not.toHaveProperty('filePath')
    expect(result).not.toHaveProperty('content')
    expect(existsSync(join(knowledgeDir, 'Orphan_NN.md'))).toBe(false)
    expect(await readdir(changesDir)).toEqual([])
  })

  it('a bluepriNNt that does not compose is refused without writing the document', async () => {
    await stubSpec(
      'broken_V_0-2-0',
      [
        '---',
        'blueprint_version: "V_0-2-0"',
        'level: 2',
        'title: "Broken Template"',
        'parent_spec:',
        '  name: "iNNfo_V_0-3-0"',
        '  url: "https://example.com/iNNfo_V_0-3-0_NN.md"',
        'includes:',
        '  - name: "missing_tpl_V_0-1-0"',
        '    url: "https://example.com/missing_tpl_V_0-1-0_NN.md"',
        '---',
        '',
        '# NN Concept Definition',
        '## NN Concept Definition: Broken',
        'type:: list',
        '',
      ].join('\n'),
    )
    const result = await run('ShouldNotExist', {
      blueprint_name: 'broken_V_0-2-0',
      blueprint_url: 'https://example.com/broken_V_0-2-0_NN.md',
    })

    expect(result.success).toBe(false)
    expect(result.validation.valid).toBe(false)
    expect(existsSync(join(knowledgeDir, 'ShouldNotExist_NN.md'))).toBe(false)
    expect(result).not.toHaveProperty('filePath')
    expect(result).not.toHaveProperty('content')
  })

  it('a domain without kNNowledge/ fails and writes no document', async () => {
    await rm(knowledgeDir, { recursive: true, force: true })
    const result = await run('NoDir', BUSINESS)
    expect(result.success).toBe(false)
    expect(result.errors?.[0].code).toBe('DOMAIN_LAYOUT_INVALID')
    expect(existsSync(join(rootDir, 'NoDir_NN.md'))).toBe(false)
  })

  it('rejects an id that escapes the domain', async () => {
    const result = await run('../escape', BUSINESS)
    expect(result.success).toBe(false)
    expect(result).not.toHaveProperty('filePath')
  })

  it('escapes quotes and newlines in the title and round-trips', async () => {
    const quotes = await run('QuotesModel', { ...BUSINESS, title: 'The "Real" Deal' })
    expect(quotes.success).toBe(true)
    expect(parseKnowledge(await readFile(quotes.filePath!, 'utf-8')).frontmatter.title).toBe('The "Real" Deal')

    const newlines = await run('NewlineModel', { ...BUSINESS, title: 'Line1\nLine2' })
    expect(newlines.success).toBe(true)
    expect(parseKnowledge(await readFile(newlines.filePath!, 'utf-8')).frontmatter.title).toBe('Line1\nLine2')
  })

  describe('canonical model id', () => {
    it.each([
      ['cognnitive', 'cognnitive_business'],
      ['Starter', 'Starter_business'],
      ['cognnitive_business', 'cognnitive_business'],
      ['cognnitive_V_0-1-0_business', 'cognnitive_business'],
    ])('id %s is created as %s: version-free name, slug and no NN_NAME_INVARIANT', async (id, canonical) => {
      const result = await run(id, BUSINESS)

      expect(result.success).toBe(true)
      expect(result.id).toBe(canonical)
      expect(result.filePath).toBe(join(knowledgeDir, `${canonical}_NN.md`))
      expect(checkNameInvariant(`${canonical}_NN.md`, 'business')).toBeNull()
      const fm = parseKnowledge(await readFile(result.filePath!, 'utf-8')).frontmatter as unknown as Record<string, unknown>
      expect(fm.knowledge_slug).toBe(canonical.toLowerCase().replace(/_/g, '-'))
      expect(String(fm.knowledge_slug)).not.toMatch(/v-\d+-\d+-\d+/)
      expect(existsSync(join(knowledgeDir, `${id}_NN.md`))).toBe(id === canonical)
    })

    it('an existing canonical model blocks creating it again under the short id', async () => {
      await writeFile(join(knowledgeDir, 'cognnitive_business_NN.md'), '# NN Work', 'utf-8')

      const result = await run('cognnitive', BUSINESS)

      expect(result.success).toBe(false)
      expect(result.errors?.some((e) => e.code === 'MODEL_EXISTS')).toBe(true)
    })

    it('records the canonical id in the applied changeset models map', async () => {
      const result = await run('cognnitive_V_0-1-0_business', BUSINESS)
      const files = await readdir(changesDir)
      const cs = parseChangeset(await readFile(join(changesDir, files[0]), 'utf-8'))
      expect(Object.keys(cs.frontmatter.models ?? {})).toEqual([result.id])
    })
  })

  describe('version-aware frontmatter', () => {
    it('inferred from the resolved parent bluepriNNt', async () => {
      const result = await run('Inferred', BUSINESS)
      expect(result.content).toContain('knowledge_version: "V_0-2-0"')
    })

    it('inferred (triangulation): a different parent version yields that version', async () => {
      await stubSpec('business_V_0-1-0', BUSINESS_STUB.replace('V_0-2-0', 'V_0-1-0'))
      const result = await run('InferredOld', {
        blueprint_name: 'business_V_0-1-0',
        blueprint_url: 'https://example.com/business_V_0-1-0_NN.md',
      })
      expect(result.success).toBe(true)
      expect(result.content).toContain('knowledge_version: "V_0-1-0"')
    })

    it('an explicit differing version is accepted (no VERSION_MISMATCH)', async () => {
      const result = await run('Acme', { ...BUSINESS, knowledge_version: 'V_9-9-9' })
      expect(result.success).toBe(true)
      expect(result.content).toBe(goldenAs('businessV999', 'acme-business', 'Acme_business'))
    })
  })

  describe('scaffold of the shipped and edge-case bluepriNNts', () => {
    it('omits the placeholder of a reference field with no concrete target', async () => {
      await stubSpec('reftpl_V_0-1-0', REFERENCE_STUB)
      const result = await run('RefModel', { blueprint_name: 'reftpl_V_0-1-0', blueprint_url: REFERENCE_URL })
      expect(result.success).toBe(true)
      expect(result.content).toBe(goldenAs('ref', 'refmodel-reftpl', 'RefModel_reftpl'))
      expect(result.content).not.toContain('linkedItem::')
    })

    it('scaffolds the real blank bluepriNNt clean (a lone text concept gets a prose stub, no element heading)', async () => {
      await stubSpec('blank_V_0-2-0', BLANK_SPEC)
      const result = await run('BlankModel', { blueprint_name: 'blank_V_0-2-0', blueprint_url: BLANK_URL })
      expect(result.success).toBe(true)
      expect(result.content).toBe(goldenAs('blank', 'blankmodel-blank', 'BlankModel_blank'))
      expect(result.content).not.toMatch(/##\s+NN\s+Content:/)
    })
  })
})
