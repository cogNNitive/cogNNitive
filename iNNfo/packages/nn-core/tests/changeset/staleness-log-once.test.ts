import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const reads = vi.hoisted(() => ({ paths: [] as string[] }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readFile: (async (path: unknown, ...rest: unknown[]) => {
      reads.paths.push(String(path))
      return (actual.readFile as (...a: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readFile,
  }
})

const { partitionChangeset } = await import('../../src/changeset/conflicts.js')
const { serializeChangeset } = await import('../../src/changeset/serializer.js')
const { computeProposalSha } = await import('../../src/changeset/hasher.js')
const { ElementsMap } = await import('../../src/types/parser.js')
import type { ChangeItem, ChangesetDocument } from '../../src/changeset/types.js'
import type { ParsedKnowledge } from '../../src/types/parser.js'

describe('Staleness reads the whole applied log once per apply (changeset-apply-engine)', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nn-staleness-'))
    reads.paths.length = 0
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function writeApplied(filename: string, changes: ChangeItem[]): Promise<void> {
    const doc: ChangesetDocument = {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: '0.1.0',
        status: 'applied',
        proposal_sha: computeProposalSha(changes),
        applied_at: '2026-11-10T12:00:00.000Z',
        models: { core: { base_version: 'V_0-1-0', result_version: 'V_0-1-1' } },
      },
      changes,
    }
    await writeFile(join(dir, filename), serializeChangeset(doc), 'utf-8')
  }

  it('parses each changeset file at most once for a batch of many changes', async () => {
    for (let i = 0; i < 20; i++) {
      const pad = String(i).padStart(2, '0')
      await writeApplied(`core_agent_202611${pad}T000000Z_changes_NN.md`, [
        { id: `c-${i}`, op: 'update_field', target: 'core@other&field', to: 'v', status: 'applied' },
      ])
    }

    const elements = new ElementsMap()
    elements.set('Item', [{ type: 'Item', name: 'Alpha', description: '', fields: { topics: 'a' }, markers: {}, slug: 'alpha' }])
    const model: ParsedKnowledge = {
      frontmatter: {
        spec_version: 'V_0-5-0',
        level: 3,
        parent_spec: { name: 'items', url: 'https://example.com' },
        title: 'Core',
        knowledge_version: 'V_0-1-0',
      },
      taxonomy: [],
      elements,
      matrices: [],
      nodeMarkers: {},
      rawContent: '',
    }

    const batch: ChangeItem[] = Array.from({ length: 500 }, (_, i) => ({
      id: `p-${i}`,
      op: 'update_field',
      target: 'core@alpha&topics',
      to: `t${i}`,
      author: 'agent',
    }))

    await partitionChangeset(batch, new Map([['core', model]]), dir)

    const perFile = new Map<string, number>()
    for (const p of reads.paths) perFile.set(p, (perFile.get(p) ?? 0) + 1)
    expect(perFile.size).toBe(20)
    expect(Math.max(...perFile.values())).toBe(1)
  })
})
