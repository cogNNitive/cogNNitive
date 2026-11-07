import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { importRaw, type Normalizer } from '../src/cognitivize/index.js'
import { parseFrontmatter } from '../src/parser/yaml.js'
import { sidecarPathOf } from '../src/naming/contract.js'

const NOW = () => new Date('2026-10-02T10:15:00Z')

let root: string
let outside: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-origin-'))
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-origin-ext-'))
})
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(outside, { recursive: true, force: true })
})

const external = (name: string, content: string): string => {
  const p = path.join(outside, name)
  fs.writeFileSync(p, content)
  return p
}
const sidecarOf = (rel: string): Record<string, unknown> =>
  parseFrontmatter(fs.readFileSync(path.join(root, sidecarPathOf(rel)), 'utf8')) as unknown as Record<string, unknown>

const origin = {
  synchronization: 'org',
  origin_uri: '/shares/org',
  origin_path: 'docs/README.md',
}

describe('importRaw with dir and origin', () => {
  it('writes under dir and the sidecar carries the four origin keys', async () => {
    const r = await importRaw(root, external('README.md', '# r'), {
      now: NOW,
      dir: 'sources/import/org/docs',
      origin,
    })
    expect(r).toMatchObject({ status: 'imported', path: 'sources/import/org/docs/README_20261002T101500Z.md' })
    expect(sidecarOf(r.path)).toMatchObject({
      synchronization: 'org',
      origin_uri: '/shares/org',
      origin_path: 'docs/README.md',
      retrieved_at: '2026-10-02T10:15:00Z',
    })
  })

  it('keeps the same name in two directories distinct', async () => {
    const a = await importRaw(root, external('README.md', 'a'), { now: NOW, dir: 'sources/import/org/a', origin })
    const b = await importRaw(root, external('README.md', 'b'), { now: NOW, dir: 'sources/import/org/c', origin })
    expect(a.path).not.toBe(b.path)
    expect(fs.existsSync(path.join(root, a.path))).toBe(true)
    expect(fs.existsSync(path.join(root, b.path))).toBe(true)
  })

  it('a manual import has no origin keys and lands in sources/import', async () => {
    const r = await importRaw(root, external('notes.md', '# n'), { now: NOW })
    expect(r.path).toBe('sources/import/notes_20261002T101500Z.md')
    const fm = sidecarOf(r.path)
    for (const k of ['synchronization', 'origin_uri', 'origin_path', 'retrieved_at']) expect(fm).not.toHaveProperty(k)
  })

  it('never lets a normalizer put source_url or downloaded_at into the sidecar', async () => {
    const normalizer: Normalizer = async () => ({
      body: '# b',
      normalizedBy: 't',
      metadata: { source_url: 'https://x.test/a.pdf', downloaded_at: '2026-01-01T00:00:00Z' },
    })
    const r = await importRaw(root, external('a.pdf', 'pdf'), { now: NOW, normalizer, origin })
    const fm = sidecarOf(r.path)
    expect(fm).not.toHaveProperty('source_url')
    expect(fm).not.toHaveProperty('downloaded_at')
    expect(fm).toMatchObject({ origin_uri: '/shares/org' })
  })

  it('still rejects an _NN document', async () => {
    const r = await importRaw(root, external('x_business_NN.md', '# x'), { now: NOW, dir: 'sources/import/org', origin })
    expect(r).toMatchObject({ status: 'rejected', reason: 'nn-document' })
  })
})
