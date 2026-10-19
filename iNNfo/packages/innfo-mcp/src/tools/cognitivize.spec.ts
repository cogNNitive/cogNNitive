import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { rm, mkdir, writeFile, readdir } from 'node:fs/promises'
import { cognitivizeTool } from './cognitivize.js'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-cognitivize')
const importDir = join(rootDir, 'sources', 'import')

describe('cognitivize tool', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(importDir, { recursive: true })
    await writeFile(join(importDir, 'notes.md'), '# Notes\n\nHello.\n', 'utf-8')
    await writeFile(join(importDir, 'report.pdf'), Buffer.from('%PDF-1.4 fake'))
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('writes a sidecar for a markdown file', async () => {
    const result = await cognitivizeTool(rootDir, 'sources/import/notes.md')
    expect(result).toMatchObject({
      status: 'written',
      sidecar: 'sources/import/notes.md_sidecar_NN.md',
    })
    expect(existsSync(join(importDir, 'notes.md_sidecar_NN.md'))).toBe(true)
  })

  it('writes a sidecar for csv and json files', async () => {
    await writeFile(join(importDir, 'p.csv'), 'id,v\n1,a\n', 'utf-8')
    await writeFile(join(importDir, 'd.json'), '{"a":1}\n', 'utf-8')
    expect((await cognitivizeTool(rootDir, 'sources/import/p.csv')).status).toBe('written')
    expect((await cognitivizeTool(rootDir, 'sources/import/d.json')).status).toBe('written')
  })

  it('converts a binary source when normalizer is available', async () => {
    const result = await cognitivizeTool(rootDir, 'sources/import/report.pdf')
    expect(result.status).toBe('written')
    expect(existsSync(join(importDir, 'report.pdf_sidecar_NN.md'))).toBe(true)
  })

  it('defers a binary to the CLI when no normalizer is available', async () => {
    const before = await readdir(importDir)
    const result = await cognitivizeTool(rootDir, 'sources/import/report.pdf', { normalizer: null as any })
    expect(result.status).toBe('requires-cli')
    expect((result as { message: string }).message).toContain('use the nn-sources CLI')
  })

  it('rejects traversal and absolute paths and writes nothing', async () => {
    await writeFile(join(rootDir, '..', 'outside-cognitivize.md'), '# x\n', 'utf-8')
    try {
      for (const p of ['../outside-cognitivize.md', join(rootDir, '..', 'outside-cognitivize.md'), '']) {
        expect(await cognitivizeTool(rootDir, p)).toMatchObject({
          status: 'rejected',
          reason: 'outside-root',
        })
      }
      expect(existsSync(join(rootDir, '..', 'outside-cognitivize.md_sidecar_NN.md'))).toBe(false)
    } finally {
      await rm(join(rootDir, '..', 'outside-cognitivize.md'), { force: true })
    }
  })

  it('rejects sidecar and _NN.md targets', async () => {
    await cognitivizeTool(rootDir, 'sources/import/notes.md')
    expect(
      await cognitivizeTool(rootDir, 'sources/import/notes.md_sidecar_NN.md'),
    ).toMatchObject({ status: 'rejected', reason: 'sidecar' })
    await writeFile(join(rootDir, 'Client_NN.md'), '# c\n', 'utf-8')
    expect(await cognitivizeTool(rootDir, 'Client_NN.md')).toMatchObject({
      status: 'rejected',
      reason: 'nn-document',
    })
  })
})
