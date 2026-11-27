import { describe, it, expect, afterEach, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * The domain's `changes/` folder holds only changesets (changes spec: "A changeset document
 * lives in the changes/ directory at the domain root"), so model discovery never reads it.
 * `readFile` is wrapped to count what discovery opens: thousands of changesets must cost
 * nothing when a model is resolved.
 */
const reads: string[] = []
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readFile: ((path: Parameters<typeof actual.readFile>[0], ...rest: unknown[]) => {
      reads.push(String(path).replace(/\\/g, '/'))
      return (actual.readFile as (...a: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readFile,
  }
})

const { discoverDomainModels, listKnowledge } = await import('../src/index.js')

const knowledge =
  '---\nlevel: 3\nparent_spec:\n  name: business\n  url: https://example.com/business_NN.md\n---\n# Doc\n'
const changeset = (i: number) =>
  `---\nlevel: 3\nparent_spec:\n  name: changes\n  url: https://example.com/changes/spec_NN.md\n---\n# Changeset ${i}\n`

describe('model discovery prunes the domain changes/ folder', () => {
  const dirs: string[] = []
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
    reads.length = 0
  })

  async function domainWithChangesets(n: number): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'nn-prune-changes-'))
    dirs.push(root)
    await writeFile(join(root, 'domaiNN_NN.md'), '---\nlevel: 3\n---\n# D\n', 'utf-8')
    await mkdir(join(root, 'kNNowledge'), { recursive: true })
    await writeFile(join(root, 'kNNowledge', 'Acme_business_NN.md'), knowledge, 'utf-8')
    await mkdir(join(root, 'changes'), { recursive: true })
    for (let i = 0; i < n; i++) {
      await writeFile(
        join(root, 'changes', `ws_ana_2026010${i}T000000Z_changes_NN.md`),
        changeset(i),
        'utf-8',
      )
    }
    return root
  }

  it('reads no file under changes/ while discovering the models', async () => {
    const root = await domainWithChangesets(5)
    reads.length = 0
    const found = await discoverDomainModels(root)
    expect(found.map((f) => f.input.path)).toEqual(['kNNowledge/Acme_business_NN.md'])
    expect(reads.filter((p) => p.includes('/changes/'))).toEqual([])
  })

  it('does not list a document stored in the domain changes/ folder, but keeps a deeper changes/ folder', async () => {
    const root = await domainWithChangesets(1)
    await writeFile(join(root, 'changes', 'Stray_business_NN.md'), knowledge, 'utf-8')
    await mkdir(join(root, 'kNNowledge', 'changes'), { recursive: true })
    await writeFile(join(root, 'kNNowledge', 'changes', 'Deep_business_NN.md'), knowledge, 'utf-8')
    const ids = (await listKnowledge(root)).map((m) => m.id)
    expect(ids).toEqual(['Acme_business', 'Deep_business'])
  })
})
