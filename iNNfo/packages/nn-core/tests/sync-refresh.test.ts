import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createHash } from 'node:crypto'
import { refreshSynchronization, removeOrphanMirrors } from '../src/sync/index.js'
import type { Synchronization } from '../src/sync/declarations.js'
import type { Normalizer } from '../src/cognitivize/index.js'
import { parseFrontmatter } from '../src/parser/yaml.js'
import { sidecarPathOf } from '../src/naming/contract.js'

const sha = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex')
const at = (iso: string) => () => new Date(iso)
const T1 = at('2026-10-02T10:00:00Z')
const T2 = at('2026-10-03T10:00:00Z')
const T3 = at('2026-10-04T10:00:00Z')

const model = (extra = ''): string =>
  `---\nlevel: 3\nparent_spec:\n  name: organization_V_0-1-0\n---\n\n# Organization\n${extra}\n`
const normalizer: Normalizer = async () => ({ body: '# n', normalizedBy: 'test' })

let root: string
let origin: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-sync-root-'))
  origin = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-sync-origin-'))
})
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(origin, { recursive: true, force: true })
})

const put = (base: string, rel: string, content: string | Uint8Array): void => {
  fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true })
  fs.writeFileSync(path.join(base, rel), content)
}
const exists = (rel: string): boolean => fs.existsSync(path.join(root, rel))
const list = (rel: string): string[] => (exists(rel) ? fs.readdirSync(path.join(root, rel)).sort() : [])
const decl = (over: Partial<Synchronization> = {}): Synchronization => ({
  alias: 'org',
  origin,
  kind: 'folder',
  state: 'active',
  ...over,
})
const sidecarFm = (rel: string): Record<string, unknown> =>
  parseFrontmatter(fs.readFileSync(path.join(root, sidecarPathOf(rel)), 'utf8')) as unknown as Record<string, unknown>

describe('a) origin filter and landing split', () => {
  it('a domain origin mirrors only models and skips raw files and non-model _NN.md', async () => {
    put(origin, 'domaiNN_NN.md', '# entry\n')
    put(origin, 'organization_NN.md', model())
    put(origin, 'kNNowledge/people_NN.md', model())
    put(origin, 'changes/x_changes_NN.md', '---\nlevel: 3\nparent_spec:\n  name: changes_V_0-1-0\n---\n')
    put(origin, 'sources/import/raw.md', '# raw')
    put(origin, 'data/raw.csv', 'a,b')
    const r = await refreshSynchronization(root, decl(), { now: T1 })
    expect(r.status).toBe('refreshed')
    expect(list('sources/sync/org')).toEqual(['kNNowledge', 'organization_NN.md'])
    expect(list('sources/sync/org/kNNowledge')).toEqual(['people_NN.md'])
    expect(exists('sources/import/org')).toBe(false)
    expect(r.files.map((f) => f.path)).toEqual(['kNNowledge/people_NN.md', 'organization_NN.md'])
  })

  it('a plain folder splits models to sources/sync and other files to sources/import/<alias>/<dir>', async () => {
    put(origin, 'organization_NN.md', model())
    put(origin, 'docs/notes.md', '# notes')
    put(origin, 'docs/other_NN.md', '# not a model')
    await refreshSynchronization(root, decl(), { now: T1 })
    expect(list('sources/sync/org')).toEqual(['organization_NN.md'])
    const landed = list('sources/import/org/docs').filter((n) => n.startsWith('notes_') && !n.includes('_NN'))
    expect(landed).toHaveLength(1)
    expect(list('sources/import/org/docs').some((n) => n.startsWith('other'))).toBe(false)
    expect(sidecarFm(`sources/import/org/docs/${landed[0]}`)).toMatchObject({
      synchronization: 'org',
      origin_uri: origin,
      origin_path: 'docs/notes.md',
    })
  })
})

describe('b) path preservation, replacement and deletion', () => {
  it('keeps a/b_NN.md and c/b_NN.md distinct and replaces in place without suffixed copies', async () => {
    put(origin, 'a/b_NN.md', model('A1'))
    put(origin, 'c/b_NN.md', model('C1'))
    await refreshSynchronization(root, decl(), { now: T1 })
    expect(fs.readFileSync(path.join(root, 'sources/sync/org/a/b_NN.md'), 'utf8')).toContain('A1')
    expect(fs.readFileSync(path.join(root, 'sources/sync/org/c/b_NN.md'), 'utf8')).toContain('C1')
    put(origin, 'a/b_NN.md', model('A2'))
    await refreshSynchronization(root, decl(), { now: T2 })
    expect(fs.readFileSync(path.join(root, 'sources/sync/org/a/b_NN.md'), 'utf8')).toContain('A2')
    expect(list('sources/sync/org/a')).toEqual(['b_NN.md'])
  })

  it('deletes a mirrored file that vanished at the origin', async () => {
    put(origin, 'a/b_NN.md', model())
    put(origin, 'c_NN.md', model())
    await refreshSynchronization(root, decl(), { now: T1 })
    fs.rmSync(path.join(origin, 'a/b_NN.md'))
    const r = await refreshSynchronization(root, decl(), { now: T2 })
    expect(exists('sources/sync/org/a/b_NN.md')).toBe(false)
    expect(exists('sources/sync/org/c_NN.md')).toBe(true)
    expect(r.files).toEqual([{ path: 'a/b_NN.md', before: sha(model()), after: null }])
  })
})

describe('c) unchanged, paused, unreachable', () => {
  it('returns unchanged with no files when nothing differs', async () => {
    put(origin, 'organization_NN.md', model())
    await refreshSynchronization(root, decl(), { now: T1 })
    const r = await refreshSynchronization(root, decl(), { now: T2 })
    expect(r.status).toBe('unchanged')
    expect(r.files).toEqual([])
    expect(r.digestAfter).toBe(r.digestBefore)
  })

  it('skips a paused synchronization without touching anything', async () => {
    put(origin, 'organization_NN.md', model())
    const r = await refreshSynchronization(root, decl({ state: 'paused' }), { now: T1 })
    expect(r.status).toBe('skipped')
    expect(exists('sources/sync')).toBe(false)
  })

  it('keeps the mirror when the origin is unreachable', async () => {
    put(origin, 'organization_NN.md', model())
    await refreshSynchronization(root, decl(), { now: T1 })
    fs.rmSync(origin, { recursive: true, force: true })
    const r = await refreshSynchronization(root, decl(), { now: T2 })
    expect(r.status).toBe('unreachable')
    expect(r.files).toEqual([])
    expect(exists('sources/sync/org/organization_NN.md')).toBe(true)
  })
})

describe('d) self-loop and symlinks', () => {
  it('refuses an origin inside the consumer and a consumer inside the origin', async () => {
    put(root, 'shared/organization_NN.md', model())
    await expect(refreshSynchronization(root, decl({ origin: path.join(root, 'shared') }))).rejects.toThrow(/inside/)
    const inner = path.join(origin, 'consumer')
    fs.mkdirSync(inner)
    await expect(refreshSynchronization(inner, decl())).rejects.toThrow(/inside/)
    expect(exists('sources')).toBe(false)
  })

  it('does not follow symlinks and never modifies the origin', async () => {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-sync-else-'))
    try {
      put(elsewhere, 'secret_NN.md', model())
      put(origin, 'organization_NN.md', model())
      fs.symlinkSync(elsewhere, path.join(origin, 'link'), 'junction')
      const before = fs.readdirSync(origin).sort()
      await refreshSynchronization(root, decl(), { now: T1 })
      expect(list('sources/sync/org')).toEqual(['organization_NN.md'])
      expect(fs.readdirSync(origin).sort()).toEqual(before)
    } finally {
      fs.rmSync(elsewhere, { recursive: true, force: true })
    }
  })
})

describe('e) raw files', () => {
  it('keeps two README.pdf distinct, records origin_path, dedups identical bytes and adds a member for changed bytes', async () => {
    put(origin, 'a/README.pdf', 'one')
    put(origin, 'b/README.pdf', 'two')
    await refreshSynchronization(root, decl(), { now: T1, normalizer })
    const landed = (dir: string): string[] => list(`sources/import/org/${dir}`).filter((n) => n.endsWith('.pdf'))
    expect(landed('a')).toHaveLength(1)
    expect(landed('b')).toHaveLength(1)
    expect(sidecarFm(`sources/import/org/a/${landed('a')[0]}`)).toMatchObject({ origin_path: 'a/README.pdf' })
    expect(sidecarFm(`sources/import/org/b/${landed('b')[0]}`)).toMatchObject({ origin_path: 'b/README.pdf' })

    const same = await refreshSynchronization(root, decl(), { now: T2, normalizer })
    expect(same.status).toBe('unchanged')
    expect(landed('a')).toHaveLength(1)

    put(origin, 'a/README.pdf', 'one-changed')
    const changed = await refreshSynchronization(root, decl(), { now: T3, normalizer })
    expect(changed.status).toBe('refreshed')
    expect(landed('a')).toHaveLength(2)
    expect(changed.files).toEqual([{ path: 'a/README.pdf', before: sha('one'), after: sha('one-changed') }])
  })
})

describe('f) result and orphans', () => {
  it('reports before/after sha256 and differing digests', async () => {
    put(origin, 'organization_NN.md', model('v1'))
    const first = await refreshSynchronization(root, decl(), { now: T1 })
    expect(first.files).toEqual([{ path: 'organization_NN.md', before: null, after: sha(model('v1')) }])
    put(origin, 'organization_NN.md', model('v2'))
    const second = await refreshSynchronization(root, decl(), { now: T2 })
    expect(second.files).toEqual([{ path: 'organization_NN.md', before: sha(model('v1')), after: sha(model('v2')) }])
    expect(second.digestBefore).toBe(first.digestAfter)
    expect(second.digestAfter).not.toBe(second.digestBefore)
  })

  it('removeOrphanMirrors removes an alias with no Synchronization and keeps sources/import', async () => {
    put(root, 'sources/sync/org/o_NN.md', model())
    put(root, 'sources/sync/gone/y_NN.md', model('g'))
    put(root, 'sources/import/gone/file.md', '# kept')
    const r = await removeOrphanMirrors(root, ['org'])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({
      alias: 'gone',
      status: 'removed',
      files: [{ path: 'y_NN.md', before: sha(model('g')), after: null }],
    })
    expect(exists('sources/sync/gone')).toBe(false)
    expect(exists('sources/sync/org/o_NN.md')).toBe(true)
    expect(exists('sources/import/gone/file.md')).toBe(true)
  })
})

describe('plan before write', () => {
  it('writes nothing when a planned path exceeds the path budget', async () => {
    put(origin, `${'d'.repeat(120)}/${'e'.repeat(120)}/organization_NN.md`, model())
    put(origin, 'ok_NN.md', model())
    await expect(refreshSynchronization(root, decl(), { now: T1, platform: 'win32' })).rejects.toThrow(/exceeds/)
    expect(exists('sources/sync')).toBe(false)
  })
})
