import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createHash } from 'node:crypto'
import { writeOnce, applyGc, collectFamilies, WriteOnceError } from '../../src/writeOnce/index.js'
import { sidecarPathOf } from '../../src/naming/contract.js'

const sha = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex')
const at = (iso: string) => () => new Date(iso)
const TARGET = { dir: 'artifacts', key: 'report', ext: 'md' }

let root: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-writeonce-'))
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(root, { recursive: true, force: true })
})

const abs = (rel: string): string => path.join(root, rel)
const put = (rel: string, content: Uint8Array | string): void => {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true })
  fs.writeFileSync(abs(rel), content)
}
const list = (dir: string): string[] => (fs.existsSync(abs(dir)) ? fs.readdirSync(abs(dir)).sort() : [])
const sidecarFor = (raw: string, hash: string): string =>
  `---\nlevel: 3\nparent_spec:\n  name: "sidecar"\nsource_file: "${raw}"\nsha256: "${hash}"\n---\n`

describe('writeOnce', () => {
  it('writes a new suffixed member and reports its root-relative path', async () => {
    const r = await writeOnce(root, TARGET, 'A', { now: at('2026-10-02T10:15:00Z') })
    expect(r).toEqual({ status: 'written', path: 'artifacts/report_20261002T101500Z.md' })
    expect(fs.readFileSync(abs(r.path), 'utf8')).toBe('A')
  })

  it('leaves the bytes of earlier members untouched', async () => {
    const first = await writeOnce(root, TARGET, 'A', { now: at('2026-10-02T10:15:00Z') })
    const before = sha(fs.readFileSync(abs(first.path)))
    const second = await writeOnce(root, TARGET, 'B', { now: at('2026-10-03T08:00:00Z') })
    expect(second.path).toBe('artifacts/report_20261003T080000Z.md')
    expect(sha(fs.readFileSync(abs(first.path)))).toBe(before)
  })

  it('deduplicates identical bytes against the latest member', async () => {
    const first = await writeOnce(root, TARGET, 'A', { now: at('2026-10-02T10:15:00Z') })
    const again = await writeOnce(root, TARGET, 'A', { now: at('2026-10-02T10:16:00Z') })
    expect(again).toEqual({ status: 'deduplicated', path: first.path })
    expect(list('artifacts')).toHaveLength(1)
  })

  it('A, B, A writes a third member (dedup compares the latest only)', async () => {
    await writeOnce(root, TARGET, 'A', { now: at('2026-10-02T10:15:00Z') })
    await writeOnce(root, TARGET, 'B', { now: at('2026-10-02T10:16:00Z') })
    const third = await writeOnce(root, TARGET, 'A', { now: at('2026-10-02T10:17:00Z') })
    expect(third.status).toBe('written')
    expect(list('artifacts')).toHaveLength(3)
  })

  it('dedups against the latest sidecar sha256 when the member has one', async () => {
    put('artifacts/report_20261002T101500Z.md', 'stored-differently')
    put(sidecarPathOf('artifacts/report_20261002T101500Z.md'), sidecarFor('artifacts/report_20261002T101500Z.md', sha('Y')))
    const r = await writeOnce(root, TARGET, 'Y', { now: at('2026-10-03T00:00:00Z') })
    expect(r).toEqual({ status: 'deduplicated', path: 'artifacts/report_20261002T101500Z.md' })
  })

  it('same-second collision names the second member with the -2 tie-break', async () => {
    const now = at('2026-10-02T10:15:00Z')
    await writeOnce(root, TARGET, 'A', { now })
    const second = await writeOnce(root, TARGET, 'B', { now })
    expect(second.path).toBe('artifacts/report_20261002T101500Z-2.md')
    expect(list('artifacts')).toEqual(['report_20261002T101500Z-2.md', 'report_20261002T101500Z.md'])
  })

  it('a slow clock still writes a member that sorts after the latest', async () => {
    put('artifacts/report_20261003T080000Z.md', 'A')
    const r = await writeOnce(root, TARGET, 'B', { now: at('2026-10-02T10:15:00Z') })
    expect(r.path).toBe('artifacts/report_20261003T080000Z-2.md')
  })

  it('retries with seq+1 when exclusive-create loses a race', async () => {
    put('artifacts/report_20261002T101500Z.md', 'rival')
    // The listing is stale: the rival file is not visible, so the first attempt collides.
    const real = fs.promises.readdir
    let calls = 0
    vi.spyOn(fs.promises, 'readdir').mockImplementation(((...args: Parameters<typeof real>) => {
      calls += 1
      return calls === 1 ? Promise.resolve([]) : real(...args)
    }) as typeof real)
    const r = await writeOnce(root, TARGET, 'mine', { now: at('2026-10-02T10:15:00Z') })
    expect(r).toEqual({ status: 'written', path: 'artifacts/report_20261002T101500Z-2.md' })
    expect(fs.readFileSync(abs('artifacts/report_20261002T101500Z.md'), 'utf8')).toBe('rival')
  })

  it('hashes raw bytes: a CRLF input whose sidecar hashes the raw bytes passes the guard', async () => {
    const crlf = Buffer.from(['a,b', '1,2', ''].join(String.fromCharCode(13, 10)))
    put('sources/import/prices.csv', crlf)
    put(sidecarPathOf('sources/import/prices.csv'), sidecarFor('sources/import/prices.csv', sha(crlf)))
    const r = await writeOnce(root, TARGET, 'out', { inputs: ['sources/import/prices.csv'] })
    expect(r.status).toBe('written')
  })

  it('does not normalize line endings: a sidecar hash of the LF form is a mismatch', async () => {
    const crlf = Buffer.from(['a,b', '1,2', ''].join(String.fromCharCode(13, 10)))
    const lf = Buffer.from(['a,b', '1,2', ''].join('\n'))
    put('sources/import/prices.csv', crlf)
    put(sidecarPathOf('sources/import/prices.csv'), sidecarFor('sources/import/prices.csv', sha(lf)))
    await expect(writeOnce(root, TARGET, 'out', { inputs: ['sources/import/prices.csv'] })).rejects.toMatchObject({
      code: 'HASH_MISMATCH',
    })
  })

  it('fails with HASH_MISMATCH naming the stale input and writes nothing', async () => {
    put('sources/import/prices.csv', 'edited after cognitivize')
    put(sidecarPathOf('sources/import/prices.csv'), sidecarFor('sources/import/prices.csv', sha('original')))
    const attempt = writeOnce(root, TARGET, 'out', { inputs: ['sources/import/prices.csv'] })
    await expect(attempt).rejects.toBeInstanceOf(WriteOnceError)
    await expect(attempt).rejects.toMatchObject({ code: 'HASH_MISMATCH', path: 'sources/import/prices.csv' })
    await expect(attempt).rejects.toThrow(/sources\/import\/prices\.csv/)
    expect(fs.existsSync(abs('artifacts'))).toBe(false)
  })

  it('does not apply the guard to an input without a sidecar', async () => {
    put('sources/import/loose.txt', 'anything')
    const r = await writeOnce(root, TARGET, 'out', { inputs: ['sources/import/loose.txt'] })
    expect(r.status).toBe('written')
  })

  it('fails with PATH_TOO_LONG before writing anything on win32', async () => {
    const dir = ['artifacts', ...Array.from({ length: 6 }, () => 'x'.repeat(50))].join('/')
    const attempt = writeOnce(root, { ...TARGET, dir }, 'A', { platform: 'win32' })
    await expect(attempt).rejects.toMatchObject({ code: 'PATH_TOO_LONG' })
    expect(fs.existsSync(abs('artifacts'))).toBe(false)
  })

  it('rejects a target directory that escapes the root', async () => {
    await expect(writeOnce(root, { ...TARGET, dir: '../outside' }, 'A')).rejects.toMatchObject({
      code: 'OUTSIDE_ROOT',
    })
  })
})

describe('applyGc', () => {
  const OLD = 'artifacts/report_20261001T000000Z.md'
  const MID = 'artifacts/report_20261002T000000Z.md'
  const NEW = 'artifacts/report_20261003T000000Z.md'
  const none = (): ReadonlySet<string> => new Set()

  beforeEach(() => {
    for (const p of [OLD, MID, NEW]) put(p, p)
    put(sidecarPathOf(OLD), sidecarFor(OLD, sha(OLD)))
  })

  it('collects families keyed by (dir, key, ext) and skips _NN documents', async () => {
    put('kNNowledge/Acme_cogNNitive_NN.md', '# record')
    put('artifacts/report_20261001T000000Z.csv', 'other ext')
    const families = await collectFamilies(root)
    const sets = families.map((f) => f.map((m) => m.path).sort())
    expect(sets).toContainEqual([OLD, MID, NEW])
    expect(sets).toContainEqual(['artifacts/report_20261001T000000Z.csv'])
    expect(sets.flat()).not.toContain('kNNowledge/Acme_cogNNitive_NN.md')
  })

  it('deletes nothing without a confirmed list', async () => {
    expect(await applyGc(root, [], { citedPaths: none })).toEqual({ deleted: [] })
    expect(list('artifacts')).toHaveLength(4)
  })

  it('deletes a confirmed member together with its sidecar', async () => {
    const r = await applyGc(root, [OLD], { citedPaths: none })
    expect(r.deleted).toEqual([OLD])
    expect(fs.existsSync(abs(OLD))).toBe(false)
    expect(fs.existsSync(abs(sidecarPathOf(OLD)))).toBe(false)
    expect(fs.existsSync(abs(MID))).toBe(true)
  })

  it('never deletes the latest member even when confirmed', async () => {
    const r = await applyGc(root, [NEW], { citedPaths: none })
    expect(r.deleted).toEqual([])
    expect(fs.existsSync(abs(NEW))).toBe(true)
  })

  it('ignores a stale confirmation: a member cited after the proposal survives', async () => {
    const r = await applyGc(root, [OLD, MID], { citedPaths: () => new Set([MID]) })
    expect(r.deleted).toEqual([OLD])
    expect(fs.existsSync(abs(MID))).toBe(true)
  })

  it('ignores confirmed paths that are not family members', async () => {
    put('kNNowledge/Acme_cogNNitive_NN.md', '# record')
    const r = await applyGc(root, ['kNNowledge/Acme_cogNNitive_NN.md', '../escape.md'], { citedPaths: none })
    expect(r.deleted).toEqual([])
    expect(fs.existsSync(abs('kNNowledge/Acme_cogNNitive_NN.md'))).toBe(true)
  })
})
