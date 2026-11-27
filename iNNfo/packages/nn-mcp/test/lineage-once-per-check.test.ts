import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * changes-ledger-scaling T2 (S3): one `check_domain` call reads the domain's lineage
 * snapshot once and builds its change log once, and parses each changeset file at most
 * once, in fold and in strict mode.
 *
 * nn-core resolves to its sources here, so its own modules are wrapped: every importer
 * (nn-mcp and nn-core alike, `projectLineage`'s default log included) goes through them.
 */
const snapshots: string[] = []
const logs: number[] = []
const changesetParses: string[] = []
const knowledgeParses: string[] = []

vi.mock('../../nn-core/src/lineage/fs-snapshot.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../nn-core/src/lineage/fs-snapshot.ts')>()
  return {
    ...actual,
    readLineageSnapshot: ((root: string, ...rest: unknown[]) => {
      snapshots.push(root)
      return (actual.readLineageSnapshot as (...a: unknown[]) => unknown)(root, ...rest)
    }) as typeof actual.readLineageSnapshot,
  }
})

vi.mock('../../nn-core/src/changelog/load.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../nn-core/src/changelog/load.ts')>()
  return {
    ...actual,
    buildChangeLog: ((...args: unknown[]) => {
      logs.push(1)
      return (actual.buildChangeLog as (...a: unknown[]) => unknown)(...args)
    }) as typeof actual.buildChangeLog,
  }
})

vi.mock('../../nn-core/src/changeset/parser.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../nn-core/src/changeset/parser.ts')>()
  return {
    ...actual,
    parseChangeset: ((content: string) => {
      changesetParses.push(content)
      return actual.parseChangeset(content)
    }) as typeof actual.parseChangeset,
  }
})

vi.mock('../../nn-core/src/parser/core.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../nn-core/src/parser/core.ts')>()
  return {
    ...actual,
    parseKnowledge: ((content: string, ...rest: unknown[]) => {
      knowledgeParses.push(content)
      return (actual.parseKnowledge as (...a: unknown[]) => unknown)(content, ...rest)
    }) as typeof actual.parseKnowledge,
  }
})

const { procedureRecord, procedureStart } = await import('../src/tools/procedure-record.js')
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

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-lineage-once-')))
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
  snapshots.length = 0
  logs.length = 0
  changesetParses.length = 0
  knowledgeParses.length = 0
}

type Result = { ok: boolean; code?: string }
function ok<T extends Result>(r: T): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.code}: ${JSON.stringify(r)}`)
  return r
}

/** A completed `review` run: the runner writes several changesets into `changes/`. */
async function completeRun(): Promise<void> {
  ok(
    await procedureStart(root, {
      procedure: 'review',
      params: { doc: 'spec' },
      run: 'r1',
      actor: 'ana',
    }),
  )
  ok(await procedureRecord(root, { run: 'r1', action: 'start', actor: 'bot' }))
  ok(
    await procedureRecord(root, {
      run: 'r1',
      action: 'artifact',
      fact: 'validated',
      field: 'draft-doc',
      value: 'spec.md',
      rev: 'd1',
    }),
  )
  ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
  ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
  ok(await procedureRecord(root, { run: 'r1', action: 'complete', outcome: 'approve' }))
  ok(await procedureRecord(root, { run: 'r1', action: 'start' }))
  ok(await procedureRecord(root, { run: 'r1', action: 'complete' }))
  ok(await procedureRecord(root, { run: 'r1', action: 'finish' }))
}

function changesetContents(): string[] {
  const dir = join(root, 'changes')
  return readdirSync(dir)
    .filter((name) => name.endsWith('_changes_NN.md'))
    .map((name) => readFileSync(join(dir, name), 'utf-8'))
}

const maxPerFile = (calls: string[], contents: string[]) =>
  Math.max(...contents.map((content) => calls.filter((c) => c === content).length))

describe('S3: check_domain reads the change log once', SLOW, () => {
  for (const strict of [false, true]) {
    it(`reads one snapshot, builds one log and parses each changeset once (strict: ${strict})`, async () => {
      await completeRun()
      const contents = changesetContents()
      expect(contents.length).toBeGreaterThan(2)
      reset()
      await checkWorkspace(root, { offline: true, strict })
      expect(snapshots.filter((s) => s === root)).toHaveLength(1)
      expect(logs).toHaveLength(1)
      expect(maxPerFile(changesetParses, contents)).toBeLessThanOrEqual(1)
      expect(maxPerFile(knowledgeParses, contents)).toBeLessThanOrEqual(1)
    })
  }
})
