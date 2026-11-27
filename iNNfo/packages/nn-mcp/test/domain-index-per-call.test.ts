import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * changes-ledger-scaling T1 (S1, S2): the domain model index never reads the domain's
 * `changes/` folder, and one tool call builds it once, however many runs or models it visits.
 *
 * `readFile`/`readdir` are wrapped to record what the call opens (nn-core resolves to its
 * sources here, so its reads are recorded too), and `discoverDomainModels` - the walk every
 * index build starts with - to count the builds per domain root.
 */
const reads: string[] = []
const listed: string[] = []
const builds: string[] = []
const norm = (p: unknown) => String(p).replace(/\\/g, '/')

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readFile: ((path: unknown, ...rest: unknown[]) => {
      reads.push(norm(path))
      return (actual.readFile as (...a: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readFile,
    readdir: ((path: unknown, ...rest: unknown[]) => {
      listed.push(norm(path))
      return (actual.readdir as (...a: unknown[]) => unknown)(path, ...rest)
    }) as typeof actual.readdir,
  }
})

vi.mock('@cognnitive/nn-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cognnitive/nn-core')>()
  return {
    ...actual,
    discoverDomainModels: (rootDir: string) => {
      builds.push(norm(rootDir))
      return actual.discoverDomainModels(rootDir)
    },
  }
})

const { findKnowledgeFile } = await import('../src/tools/spec.js')
const { syncWorkspaceManifest } = await import('../src/tools/workspace-sync.js')
const { procedureStart } = await import('../src/tools/procedure-record.js')
const { procedurePending } = await import('../src/tools/procedure-pending.js')
const { checkWorkspace } = await import('../src/tools/check-workspace.js')

const SLOW = { timeout: 180_000 }
const FIXTURE = join(import.meta.dirname!, 'fixtures', 'procedure-runner')
const EXECUTIONS_SPEC = join(
  import.meta.dirname!,
  '..',
  '..',
  '..',
  'specs',
  'bluepriNNts',
  'executions',
  'spec_NN.md',
)

let root: string

const changeset = (i: number) =>
  [
    '---',
    'level: 3',
    'parent_spec:',
    '  name: changes',
    '  url: https://example.com/changes/spec_NN.md',
    '---',
    `# Changeset ${i}`,
    '',
  ].join('\n')

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-index-per-call-')))
  cpSync(FIXTURE, root, { recursive: true })
  mkdirSync(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  process.env.INNFO_GLOBAL_DIR = join(root, '.global')
  process.env.INNFO_SKILLS_DIR = join(root, '.skills')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
})

afterEach(() => {
  delete process.env.INNFO_CACHE_DIR
  delete process.env.INNFO_GLOBAL_DIR
  delete process.env.INNFO_SKILLS_DIR
  vi.restoreAllMocks()
  rmSync(root, { recursive: true, force: true })
})

function reset(): void {
  reads.length = 0
  listed.length = 0
  builds.length = 0
}

const under = (paths: string[], dir: string) =>
  paths.filter((p) => p === dir || p.startsWith(`${dir}/`))

function addChangesets(n: number): void {
  mkdirSync(join(root, 'changes'), { recursive: true })
  for (let i = 0; i < n; i++) {
    writeFileSync(
      join(root, 'changes', `ws_ana_2026010${i}T000000Z_changes_NN.md`),
      changeset(i),
      'utf-8',
    )
  }
}

async function startRuns(n: number, from = 1): Promise<void> {
  for (let i = from; i < from + n; i++) {
    const started = (await procedureStart(root, {
      procedure: 'review',
      params: { doc: `spec${i}` },
      run: `r${i}`,
      actor: 'ana',
    })) as { ok: boolean }
    expect(started.ok).toBe(true)
  }
}

describe('S1: the domain model index never reads changes/', SLOW, () => {
  it('resolves a model, and misses one, without opening or listing changes/', async () => {
    await startRuns(1)
    addChangesets(5)
    const changesDir = `${norm(root)}/changes`
    reset()
    expect(await findKnowledgeFile(root, 'r1')).toMatch(/r1_executions_NN\.md$/)
    expect(await findKnowledgeFile(root, 'no-such-model')).toBeNull()
    expect(under(reads, changesDir)).toEqual([])
    expect(under(listed, changesDir)).toEqual([])
  })

  it('still resolves a changeset by its stem', async () => {
    addChangesets(1)
    expect(await findKnowledgeFile(root, 'ws_ana_20260100T000000Z_changes')).toBe(
      join(root, 'changes', 'ws_ana_20260100T000000Z_changes_NN.md'),
    )
  })

  it('sync_domain_manifest reads no file under changes/', async () => {
    addChangesets(5)
    reset()
    await syncWorkspaceManifest(root, { dry_run: true })
    expect(under(reads, `${norm(root)}/changes`)).toEqual([])
  })
})

describe('S2: one domain index per tool call', SLOW, () => {
  it('procedure_pending over every run builds the index once', async () => {
    await startRuns(3)
    reset()
    const pending = (await procedurePending(root, {})) as { ok: boolean }
    expect(pending.ok).toBe(true)
    expect(builds.filter((b) => b === norm(root))).toHaveLength(1)
  })

  it('check_domain builds the index a constant number of times, whatever the model count', async () => {
    await startRuns(1)
    reset()
    await checkWorkspace(root, { offline: true })
    const few = builds.filter((b) => b === norm(root)).length

    await startRuns(4, 2)
    reset()
    await checkWorkspace(root, { offline: true })
    const many = builds.filter((b) => b === norm(root)).length

    expect(many).toBe(few)
    expect(many).toBeLessThanOrEqual(2)
  })
})
