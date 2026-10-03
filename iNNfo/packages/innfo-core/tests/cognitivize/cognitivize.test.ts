import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createHash } from 'node:crypto'
import { cognitivize, importRaw, type Normalizer } from '../../src/cognitivize/index.js'
import { parseFrontmatter } from '../../src/parser/yaml.js'
import { sidecarPathOf } from '../../src/naming/contract.js'

const sha = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex')
const at = (iso: string) => () => new Date(iso)
const NOW = at('2026-10-02T10:15:00Z')

let root: string
let outside: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'innfo-cognitivize-'))
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'innfo-cognitivize-ext-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(outside, { recursive: true, force: true })
})

const abs = (rel: string): string => path.join(root, rel)
const put = (rel: string, content: Uint8Array | string): void => {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true })
  fs.writeFileSync(abs(rel), content)
}
const readSidecar = (rawRel: string): { fm: Record<string, unknown>; body: string; text: string } => {
  const text = fs.readFileSync(abs(sidecarPathOf(rawRel)), 'utf8')
  const fm = parseFrontmatter(text) as unknown as Record<string, unknown>
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  return { fm, body, text }
}
const pdfNormalizer: Normalizer = async ({ path: p }) => ({
  body: `# Summary\n\nNormalized ${p}\n`,
  normalizedBy: 'test-normalizer',
  metadata: { source_type: 'pdf' },
})

describe('cognitivize: text-native subjects', () => {
  it.each([
    ['sources/import/notes.md', '# Notes\n', 'md'],
    ['sources/import/prices.csv', 'a,b\n1,2\n', 'csv'],
    ['sources/import/data.json', '{"a":1}', 'json'],
  ])('writes a bodyless co-located sidecar for %s', async (rel, content, format) => {
    put(rel, content)
    const r = await cognitivize(root, rel, { now: NOW })
    expect(r).toEqual({ status: 'written', sidecar: sidecarPathOf(rel), sha256: sha(content) })
    const { fm, body } = readSidecar(rel)
    expect(fm).toMatchObject({
      level: 3,
      parent_spec: { name: 'sidecar' },
      source_file: rel,
      sha256: sha(content),
      size_bytes: Buffer.byteLength(content),
      source_format: format,
      normalized_at: '2026-10-02T10:15:00Z',
    })
    expect(fm).not.toHaveProperty('normalized_by')
    expect(body.trim()).toBe('')
  })

  it('never moves or changes the raw file', async () => {
    put('sources/import/notes.md', '# Notes\n')
    await cognitivize(root, 'sources/import/notes.md', { now: NOW })
    expect(fs.readFileSync(abs('sources/import/notes.md'), 'utf8')).toBe('# Notes\n')
  })

  it('hashes the raw bytes: CRLF generated at test time stays CRLF', async () => {
    const crlf = Buffer.from(['a,b', '1,2', ''].join(String.fromCharCode(13, 10)))
    put('sources/import/prices.csv', crlf)
    const r = await cognitivize(root, 'sources/import/prices.csv', { now: NOW })
    expect(r).toMatchObject({ status: 'written', sha256: sha(crlf) })
    expect(readSidecar('sources/import/prices.csv').fm['sha256']).toBe(sha(crlf))
  })

  it('stores source_file workspace-relative with forward slashes', async () => {
    put('sources/import/notes.md', 'x')
    await cognitivize(root, 'sources\\import\\notes.md', { now: NOW })
    expect(readSidecar('sources/import/notes.md').fm['source_file']).toBe('sources/import/notes.md')
  })

  it('needs no normalizer', async () => {
    put('notes.md', 'x')
    expect((await cognitivize(root, 'notes.md', { now: NOW })).status).toBe('written')
  })

  it('records the metadata an injected normalizer returns, but never a body', async () => {
    put('sources/conversations/chat.md', '# Chat\n')
    const tagging: Normalizer = async () => ({
      body: '# Should never be written\n',
      normalizedBy: 'test-normalizer',
      metadata: { source_type: 'conversation_transcript' },
    })
    await cognitivize(root, 'sources/conversations/chat.md', { now: NOW, normalizer: tagging })
    const { fm, body } = readSidecar('sources/conversations/chat.md')
    expect(fm).toMatchObject({ source_type: 'conversation_transcript', normalized_by: 'test-normalizer' })
    expect(body.trim()).toBe('')
  })

  it('does not call the normalizer when a text-native sidecar is already current', async () => {
    put('notes.md', 'x')
    await cognitivize(root, 'notes.md', { now: NOW })
    let calls = 0
    const counting: Normalizer = async () => {
      calls++
      return { body: '', normalizedBy: 'test-normalizer' }
    }
    const r = await cognitivize(root, 'notes.md', { now: NOW, normalizer: counting })
    expect(r.status).toBe('unchanged')
    expect(calls).toBe(0)
  })
})

describe('cognitivize: idempotence and refresh', () => {
  it('reports unchanged and writes nothing when the hash matches, keeping normalized_at', async () => {
    put('notes.md', 'x')
    await cognitivize(root, 'notes.md', { now: NOW })
    const before = fs.readFileSync(abs(sidecarPathOf('notes.md')), 'utf8')
    const r = await cognitivize(root, 'notes.md', { now: at('2026-11-01T00:00:00Z') })
    expect(r).toMatchObject({ status: 'unchanged', sha256: sha('x') })
    expect(fs.readFileSync(abs(sidecarPathOf('notes.md')), 'utf8')).toBe(before)
  })

  it('refreshes in place when the bytes changed', async () => {
    put('notes.md', 'x')
    await cognitivize(root, 'notes.md', { now: NOW })
    put('notes.md', 'edited')
    const r = await cognitivize(root, 'notes.md', { now: at('2026-11-01T00:00:00Z') })
    expect(r).toMatchObject({ status: 'refreshed', sha256: sha('edited') })
    const { fm } = readSidecar('notes.md')
    expect(fm['sha256']).toBe(sha('edited'))
    expect(fm['normalized_at']).toBe('2026-11-01T00:00:00Z')
  })

  it('preserves declared sources and unknown keys on refresh', async () => {
    put('report.pdf', 'v1')
    await cognitivize(root, 'report.pdf', { now: NOW, normalizer: pdfNormalizer })
    const side = abs(sidecarPathOf('report.pdf'))
    fs.writeFileSync(
      side,
      fs.readFileSync(side, 'utf8').replace('\n---\n', '\nsources:\n  - "kNNowledge/A_NN.md"\ncustom: keep\n---\n'),
    )
    put('report.pdf', 'v2')
    await cognitivize(root, 'report.pdf', { now: NOW, normalizer: pdfNormalizer })
    const { fm } = readSidecar('report.pdf')
    expect(fm['sources']).toEqual(['kNNowledge/A_NN.md'])
    expect(fm['custom']).toBe('keep')
    expect(fm['sha256']).toBe(sha('v2'))
  })

  it('never carries derived_from, even when an older sidecar had it', async () => {
    put('notes.md', 'x')
    await cognitivize(root, 'notes.md', { now: NOW })
    const side = abs(sidecarPathOf('notes.md'))
    fs.writeFileSync(side, fs.readFileSync(side, 'utf8').replace('\n---\n', '\nderived_from: old\n---\n'))
    put('notes.md', 'y')
    await cognitivize(root, 'notes.md', { now: NOW })
    expect(readSidecar('notes.md').text).not.toContain('derived_from')
  })
})

describe('cognitivize: binary subjects', () => {
  it('writes the normalized body and normalizer metadata', async () => {
    put('sources/import/report.pdf', 'pdf-bytes')
    const r = await cognitivize(root, 'sources/import/report.pdf', { now: NOW, normalizer: pdfNormalizer })
    expect(r.status).toBe('written')
    const { fm, body } = readSidecar('sources/import/report.pdf')
    expect(body).toContain('# Summary')
    expect(fm).toMatchObject({ normalized_by: 'test-normalizer', source_type: 'pdf', source_format: 'pdf' })
  })

  it('lets core fields win over normalizer metadata', async () => {
    put('report.pdf', 'pdf-bytes')
    const sneaky: Normalizer = async () => ({ body: '# S\n', normalizedBy: 'n', metadata: { sha256: 'forged' } })
    await cognitivize(root, 'report.pdf', { now: NOW, normalizer: sneaky })
    expect(readSidecar('report.pdf').fm['sha256']).toBe(sha('pdf-bytes'))
  })

  it('returns requires-normalizer and writes nothing without a normalizer', async () => {
    put('report.pdf', 'pdf-bytes')
    expect(await cognitivize(root, 'report.pdf', { now: NOW })).toEqual({ status: 'requires-normalizer', path: 'report.pdf' })
    expect(fs.existsSync(abs(sidecarPathOf('report.pdf')))).toBe(false)
  })

  it('reports unchanged for a fresh binary sidecar even without a normalizer', async () => {
    put('report.pdf', 'pdf-bytes')
    await cognitivize(root, 'report.pdf', { now: NOW, normalizer: pdfNormalizer })
    expect((await cognitivize(root, 'report.pdf', { now: NOW })).status).toBe('unchanged')
  })
})

describe('cognitivize: rejections', () => {
  it('rejects a sidecar', async () => {
    put('prices.csv', 'a')
    await cognitivize(root, 'prices.csv', { now: NOW })
    const side = sidecarPathOf('prices.csv')
    expect(await cognitivize(root, side, { now: NOW })).toEqual({ status: 'rejected', path: side, reason: 'sidecar' })
    expect(fs.existsSync(abs(sidecarPathOf(side)))).toBe(false)
  })

  it('rejects any other _NN document', async () => {
    put('kNNowledge/Client_business_NN.md', '# c')
    const r = await cognitivize(root, 'kNNowledge/Client_business_NN.md', { now: NOW })
    expect(r).toEqual({ status: 'rejected', path: 'kNNowledge/Client_business_NN.md', reason: 'nn-document' })
  })

  it('rejects excluded paths such as staging', async () => {
    put('staging/draft.md', 'x')
    const r = await cognitivize(root, 'staging/draft.md', { now: NOW })
    expect(r).toEqual({ status: 'rejected', path: 'staging/draft.md', reason: 'excluded' })
    expect(fs.existsSync(abs(sidecarPathOf('staging/draft.md')))).toBe(false)
  })

  it('rejects an over-budget path before touching the disk', async () => {
    const rel = [...Array.from({ length: 6 }, () => 'x'.repeat(50)), 'a.md'].join('/')
    const r = await cognitivize(root, rel, { now: NOW, platform: 'win32' })
    expect(r).toEqual({ status: 'rejected', path: rel, reason: 'path-too-long' })
  })

  it('rejects an extensionless file, whose sidecar name would be unrecognizable', async () => {
    put('LICENSE', 'text')
    expect(await cognitivize(root, 'LICENSE', { now: NOW })).toEqual({ status: 'rejected', path: 'LICENSE', reason: 'no-extension' })
  })

  it('rejects a missing file', async () => {
    expect(await cognitivize(root, 'nope.md', { now: NOW })).toEqual({ status: 'rejected', path: 'nope.md', reason: 'not-found' })
  })

  it('rejects a directory as not-found', async () => {
    fs.mkdirSync(abs('sources'))
    expect((await cognitivize(root, 'sources', { now: NOW })).status).toBe('rejected')
  })

  it('throws when the path escapes the root', async () => {
    fs.writeFileSync(path.join(outside, 'x.md'), 'x')
    const rel = path.relative(root, path.join(outside, 'x.md'))
    await expect(cognitivize(root, rel, { now: NOW })).rejects.toThrow(/escapes the workspace root/)
  })
})

describe('importRaw', () => {
  const external = (name: string, content: Uint8Array | string): string => {
    const p = path.join(outside, name)
    fs.writeFileSync(p, content)
    return p
  }
  const importDir = (): string[] => (fs.existsSync(abs('sources/import')) ? fs.readdirSync(abs('sources/import')).sort() : [])

  it('copies the bytes verbatim into sources/import with a UTC suffix, then cognitivizes the copy', async () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251])
    const r = await importRaw(root, external('budget.xlsx', bytes), { now: NOW, normalizer: pdfNormalizer })
    expect(r).toMatchObject({ status: 'imported', path: 'sources/import/budget_20261002T101500Z.xlsx' })
    expect(sha(fs.readFileSync(abs('sources/import/budget_20261002T101500Z.xlsx')))).toBe(sha(bytes))
    expect(fs.existsSync(abs(sidecarPathOf('sources/import/budget_20261002T101500Z.xlsx')))).toBe(true)
  })

  it('writes nothing new when the identical bytes are imported again', async () => {
    const file = external('notes.md', '# n')
    await importRaw(root, file, { now: NOW })
    const before = importDir()
    const r = await importRaw(root, file, { now: at('2026-10-03T00:00:00Z') })
    expect(r).toMatchObject({ status: 'deduplicated', path: 'sources/import/notes_20261002T101500Z.md' })
    expect(importDir()).toEqual(before)
  })

  it('adds a new family member and sidecar when the source changed, leaving the old bytes alone', async () => {
    const file = external('notes.md', '# n')
    await importRaw(root, file, { now: NOW })
    fs.writeFileSync(file, '# changed')
    const r = await importRaw(root, file, { now: at('2026-10-03T00:00:00Z') })
    expect(r).toMatchObject({ status: 'imported', path: 'sources/import/notes_20261003T000000Z.md' })
    expect(fs.readFileSync(abs('sources/import/notes_20261002T101500Z.md'), 'utf8')).toBe('# n')
    expect(fs.existsSync(abs(sidecarPathOf('sources/import/notes_20261003T000000Z.md')))).toBe(true)
  })

  it('never writes to the external location', async () => {
    const file = external('notes.md', '# n')
    await importRaw(root, file, { now: NOW })
    expect(fs.readdirSync(outside)).toEqual(['notes.md'])
  })

  it('rejects an _NN document and a missing file without copying', async () => {
    const nn = external('Client_business_NN.md', '# c')
    expect(await importRaw(root, nn, { now: NOW })).toMatchObject({ status: 'rejected', reason: 'nn-document' })
    expect(await importRaw(root, path.join(outside, 'missing.md'), { now: NOW })).toMatchObject({
      status: 'rejected',
      reason: 'not-found',
    })
    expect(importDir()).toEqual([])
  })
})
