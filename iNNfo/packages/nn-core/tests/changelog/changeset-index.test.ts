/**
 * The persistent changeset index (changes-ledger-scaling S7): "Un índice persistente que
 * se pueda borrar y regenerar, guardado fuera de git."
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'

const counts = vi.hoisted(() => ({ changeset: 0 }))

vi.mock('../../src/changeset/parser.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/changeset/parser.js')>()
  return {
    ...mod,
    parseChangeset: (raw: string) => {
      counts.changeset++
      return mod.parseChangeset(raw)
    },
  }
})

import { loadChangeLog } from '../../src/changelog/node.js'
import { buildChangeLog } from '../../src/changelog/load.js'
import { changesetIndexFile } from '../../src/changeset/changeset-index.js'
import { readLineageSnapshot } from '../../src/lineage/fs-snapshot.js'
import { createSnapshotParses } from '../../src/lineage/snapshot-parses.js'
import { loadStalenessHistory } from '../../src/changeset/history.js'
import { loadChangesetRecords } from '../../src/console/element-history.js'

const TESTLAB = resolve(__dirname, '../../../../../test/fixtures/testlab')

let scratch: string
let root: string
let cacheDir: string
const originalCache = process.env.INNFO_CACHE_DIR

/** Every file under `dir`, relative, POSIX. */
function treeOf(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name)
      if (e.isDirectory()) walk(full)
      else out.push(relative(dir, full).split('\\').join('/'))
    }
  }
  walk(dir)
  return out.sort()
}

/** The log as plain data, comparable across loads. */
function logOf(r: string): unknown {
  return JSON.parse(JSON.stringify(loadChangeLog(r).all))
}

/** A cold scan with no index at all: the pre-index definition of the log. */
function coldLogOf(r: string): unknown {
  return JSON.parse(JSON.stringify(buildChangeLog(readLineageSnapshot(r)).all))
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'nn-changeset-index-'))
  root = join(scratch, 'domain')
  cacheDir = join(scratch, 'cache')
  cpSync(TESTLAB, root, { recursive: true })
  process.env.INNFO_CACHE_DIR = cacheDir
  counts.changeset = 0
})

afterEach(() => {
  if (originalCache === undefined) delete process.env.INNFO_CACHE_DIR
  else process.env.INNFO_CACHE_DIR = originalCache
  rmSync(scratch, { recursive: true, force: true })
})

const CHANGESETS = 6

describe('persistent changeset index', () => {
  it('(a) a warm load parses no unchanged changeset and equals a cold scan', () => {
    const cold = coldLogOf(root)
    counts.changeset = 0

    expect(logOf(root)).toEqual(cold)
    expect(counts.changeset).toBe(CHANGESETS)
    expect(existsSync(changesetIndexFile(root))).toBe(true)

    counts.changeset = 0
    expect(logOf(root)).toEqual(cold)
    expect(counts.changeset).toBe(0)
  })

  it('(a) every changes/ reader shares the warm index', async () => {
    const coldHistory = await loadStalenessHistory(join(root, 'changes'))
    const coldRecords = await loadChangesetRecords(root)
    logOf(root)
    counts.changeset = 0

    const warmHistory = await loadStalenessHistory(join(root, 'changes'))
    const warmRecords = await loadChangesetRecords(root)
    const parses = createSnapshotParses()
    const files = readLineageSnapshot(root, parses)
    const snapshotLog = buildChangeLog(files, parses)
    expect(counts.changeset).toBe(0)

    expect(JSON.parse(JSON.stringify(warmHistory.log.all))).toEqual(
      JSON.parse(JSON.stringify(coldHistory.log.all)),
    )
    expect([...warmHistory.transitions.entries()].map(([k, v]) => [k, [...v.entries()]])).toEqual(
      [...coldHistory.transitions.entries()].map(([k, v]) => [k, [...v.entries()]]),
    )
    expect(warmRecords).toEqual(coldRecords)
    expect(JSON.parse(JSON.stringify(snapshotLog.all))).toEqual(coldLogOf(root))
    // The snapshot's parses are the documents `parseChangeset(content)` returns.
    for (const file of files.filter((f) => f.path.startsWith('changes/'))) {
      expect(parses.changesets.get(file.path)?.rawContent).toBe(file.content)
    }
  })

  it('(b) a rewritten file and a new file are re-parsed; a deleted file disappears', () => {
    logOf(root)
    const changes = join(root, 'changes')
    const names = readdirSync(changes).sort()
    const rewritten = join(changes, names[0])
    const deleted = join(changes, names[1])
    const added = join(changes, 'testlab_lucas_20991231T000000Z_changes_NN.md')

    // An apply rewrites a changeset once (proposed -> applied): new size, new mtime.
    const before = readFileSync(rewritten, 'utf8')
    writeFileSync(rewritten, before.replace(/^title: (.*)$/m, 'title: $1 (rewritten)'))
    const later = new Date(statSync(rewritten).mtimeMs + 5000)
    utimesSync(rewritten, later, later)
    writeFileSync(added, readFileSync(join(changes, names[2]), 'utf8'))
    rmSync(deleted)

    counts.changeset = 0
    const warm = logOf(root)
    expect(counts.changeset).toBe(2)
    expect(warm).toEqual(coldLogOf(root))
    const entries = Object.keys(JSON.parse(readFileSync(changesetIndexFile(root), 'utf8')).entries)
    expect(entries).toContain(`changes/${names[0]}`)
    expect(entries).toContain('changes/testlab_lucas_20991231T000000Z_changes_NN.md')
    expect(entries).not.toContain(`changes/${names[1]}`)
  })

  it('(c) deleting or corrupting the index gives the same result and recreates it', () => {
    const first = logOf(root)
    const index = changesetIndexFile(root)

    rmSync(dirname(index), { recursive: true, force: true })
    counts.changeset = 0
    expect(logOf(root)).toEqual(first)
    expect(counts.changeset).toBe(CHANGESETS)
    expect(existsSync(index)).toBe(true)

    writeFileSync(index, '{"version": "1:tor')
    counts.changeset = 0
    expect(logOf(root)).toEqual(first)
    expect(counts.changeset).toBe(CHANGESETS)
    expect(() => JSON.parse(readFileSync(index, 'utf8'))).not.toThrow()

    // A well-formed index of another format or another root is ignored, never trusted.
    const valid = JSON.parse(readFileSync(index, 'utf8'))
    writeFileSync(index, JSON.stringify({ ...valid, version: 'older' }))
    counts.changeset = 0
    expect(logOf(root)).toEqual(first)
    expect(counts.changeset).toBe(CHANGESETS)
    writeFileSync(index, JSON.stringify({ ...valid, root: 'elsewhere' }))
    counts.changeset = 0
    expect(logOf(root)).toEqual(first)
    expect(counts.changeset).toBe(CHANGESETS)
  })

  it('(d) the index lives outside the domaiNN tree and writes nothing under it', () => {
    const before = treeOf(root)
    logOf(root)
    readLineageSnapshot(root, createSnapshotParses())
    expect(treeOf(root)).toEqual(before)
    const index = changesetIndexFile(root)
    expect(relative(root, index).startsWith('..')).toBe(true)
    expect(relative(cacheDir, index).startsWith('..')).toBe(false)
  })

  it('(e) concurrent loads never leave a torn index or a temp file behind', async () => {
    const expected = coldLogOf(root)
    const index = changesetIndexFile(root)
    const results = await Promise.all(
      Array.from({ length: 8 }, async (_, i) => {
        if (i % 2 === 0) rmSync(index, { force: true })
        await loadStalenessHistory(join(root, 'changes'))
        await loadChangesetRecords(root)
        return logOf(root)
      }),
    )
    for (const result of results) expect(result).toEqual(expected)
    expect(() => JSON.parse(readFileSync(index, 'utf8'))).not.toThrow()
    expect(readdirSync(dirname(index)).filter((n) => n.endsWith('.tmp'))).toEqual([])
  })

  it('a domaiNN with no changes folder loads an empty log', async () => {
    rmSync(join(root, 'changes'), { recursive: true, force: true })
    expect(logOf(root)).toEqual([])
    expect((await loadStalenessHistory(join(root, 'changes'))).log.all).toEqual([])
    expect(await loadChangesetRecords(root)).toEqual([])
  })
})
