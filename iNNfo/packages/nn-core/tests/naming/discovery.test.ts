import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { isModelCandidate } from '../../src/naming/contract.js'
import { isReconcilableModel } from '../../src/workspace/discoverModels.js'
import { listKnowledge, parseFrontmatter } from '../../src/index.js'

const fm = (parent: string | undefined, level: number | null = 3): Record<string, unknown> => ({
  ...(level === null ? {} : { level }),
  ...(parent === undefined ? {} : { parent_spec: { name: parent, url: 'https://example.com/x_NN.md' } }),
})

describe('isModelCandidate', () => {
  it('accepts a level-3 _NN.md knowledge document with a parent_spec', () => {
    expect(isModelCandidate({ path: 'kNNowledge/Client_business_NN.md', frontmatter: fm('business') })).toBe(true)
  })

  it('accepts a versioned parent_spec name and a bare-string parent_spec', () => {
    expect(isModelCandidate({ path: 'a_NN.md', frontmatter: fm('business_V_0-2-0') })).toBe(true)
    expect(isModelCandidate({ path: 'a_NN.md', frontmatter: { level: 3, parent_spec: 'business' } })).toBe(true)
  })

  it('rejects files that do not match the _NN.md pattern', () => {
    expect(isModelCandidate({ path: 'README.md', frontmatter: fm('business') })).toBe(false)
    expect(isModelCandidate({ path: 'Fixture_business_F.md', frontmatter: fm('business') })).toBe(false)
  })

  it('rejects wrong level or a missing parent_spec', () => {
    expect(isModelCandidate({ path: 'a_NN.md', frontmatter: fm('business', 2) })).toBe(false)
    expect(isModelCandidate({ path: 'a_NN.md', frontmatter: fm('business', null) })).toBe(false)
    expect(isModelCandidate({ path: 'a_NN.md', frontmatter: fm(undefined) })).toBe(false)
  })

  it('rejects a sidecar even with level 3 and a resolvable parent_spec', () => {
    expect(
      isModelCandidate({ path: 'sources/import/report.pdf_sidecar_NN.md', frontmatter: fm('sidecar') }),
    ).toBe(false)
    expect(
      isModelCandidate({ path: 'kNNowledge/report.pdf_sidecar_NN.md', frontmatter: fm('business') }),
    ).toBe(false)
  })

  for (const bp of ['cogNNitive', 'workspace', 'procedures', 'sources', 'artifacts', 'sidecar']) {
    it(`rejects documents whose parent_spec is the non-knowledge bluepriNNt ${bp}`, () => {
      expect(isModelCandidate({ path: `x/Thing_${bp}_NN.md`, frontmatter: fm(bp) })).toBe(false)
      expect(isModelCandidate({ path: `x/Thing_${bp}_NN.md`, frontmatter: fm(`${bp}_V_0-1-0`) })).toBe(false)
    })
  }

  it('rejects the entrypoint and spec files', () => {
    expect(isModelCandidate({ path: 'domaiNN_NN.md', frontmatter: fm('domaiNN') })).toBe(false)
    expect(isModelCandidate({ path: 'bluepriNNts/b/spec_NN.md', frontmatter: fm('iNNfo') })).toBe(false)
  })

  it('rejects excluded paths: ignored roots, staging, dot segments', () => {
    for (const path of ['backups/a_NN.md', 'specs/a_NN.md', 'archive/a_NN.md', 'staging/a_NN.md', 'sources/staging/a_NN.md', '.cogNNitive/a_NN.md']) {
      expect(isModelCandidate({ path, frontmatter: fm('business') })).toBe(false)
    }
  })
})

describe('list_models and ## NN Models agree', () => {
  const dirs: string[] = []
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
  })

  async function walk(dir: string, out: string[] = []): Promise<string[]> {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) await walk(full, out)
      else if (e.name.endsWith('.md')) out.push(full)
    }
    return out
  }

  const doc = (parent: string, level = 3): string =>
    `---\nlevel: ${level}\nparent_spec:\n  name: ${parent}\n  url: https://example.com/${parent}_NN.md\n---\n# Doc\n`

  it('never lists a seeded sidecar and both discovery paths return the same set', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nn-discovery-'))
    dirs.push(root)
    const files: Record<string, string> = {
      'kNNowledge/Client_business_NN.md': doc('business'),
      'kNNowledge/Other_projects_NN.md': doc('projects'),
      'sources/import/report.pdf_sidecar_NN.md': doc('sidecar'),
      'sources/import/prices.csv_sidecar_NN.md': doc('business'),
      'Acme_cogNNitive_NN.md': doc('cogNNitive'),
      'sources/sources_NN.md': doc('sources'),
      'staging/Draft_business_NN.md': doc('business'),
      'domaiNN_NN.md': doc('domaiNN'),
    }
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(join(root, rel, '..'), { recursive: true })
      await writeFile(join(root, rel), content, 'utf-8')
    }

    const listed = (await listKnowledge(root)).map((m) => m.id).sort()

    const reconcilable: string[] = []
    for (const abs of await walk(root)) {
      const rel = relative(root, abs).split('\\').join('/')
      const frontmatter = parseFrontmatter(await readFile(abs, 'utf-8'))
      if (frontmatter && isReconcilableModel({ path: rel, frontmatter }, 'domaiNN_NN.md')) {
        reconcilable.push(rel.split('/').pop()!.replace(/\.md$/, ''))
      }
    }
    reconcilable.sort()

    expect(listed).toEqual(['Client_business_NN', 'Other_projects_NN'])
    expect(reconcilable).toEqual(listed)
  })
})
