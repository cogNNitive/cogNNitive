import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { cognitivizePreservedBodies } from '../../../src/legacy/index.js'

let root: string

async function put(rel: string, content: string | Uint8Array): Promise<void> {
  const full = join(root, ...rel.split('/'))
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, content)
}

const exists = (rel: string): Promise<boolean> =>
  stat(join(root, ...rel.split('/'))).then(
    () => true,
    () => false,
  )

const NOW = () => new Date('2026-10-03T12:00:00Z')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'nn-finalize-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('cognitivizePreservedBodies', () => {
  it('writes a sidecar carrying the preserved body for a binary subject, then removes staging/migration', async () => {
    await put('sources/import/scan.pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0xff]))
    await put('staging/migration/sources/import/scan.pdf.md', '# Preserved\n\n## Extracted\n\nOld mirror body.\n')

    const result = await cognitivizePreservedBodies(root, { now: NOW })

    expect(result.cognitivized).toEqual(['sources/import/scan.pdf'])
    expect(result.skipped).toEqual([])
    const sidecar = await readFile(join(root, 'sources/import/scan.pdf_sidecar_NN.md'), 'utf8')
    expect(sidecar).toContain('## Extracted')
    expect(sidecar).toContain('Old mirror body.')
    expect(sidecar).toContain('source_format: pdf')
    expect(await exists('staging/migration')).toBe(false)
    expect(await exists('staging')).toBe(false)
  })

  it('writes a bodyless sidecar for a text-native subject and ignores the staged body', async () => {
    await put('sources/import/data.csv', 'a,b\r\n1,2\r\n')
    await put('staging/migration/sources/import/data.csv.md', '# Staged\n\nShould not be carried.\n')

    const result = await cognitivizePreservedBodies(root, { now: NOW })

    expect(result.cognitivized).toEqual(['sources/import/data.csv'])
    const sidecar = await readFile(join(root, 'sources/import/data.csv_sidecar_NN.md'), 'utf8')
    expect(sidecar).not.toContain('Should not be carried.')
  })

  it('reports a staged body whose subject is missing and still removes staging', async () => {
    await put('staging/migration/sources/import/gone.pdf.md', '# Orphan\n')

    const result = await cognitivizePreservedBodies(root, { now: NOW })

    expect(result.cognitivized).toEqual([])
    expect(result.skipped).toEqual([{ subject: 'sources/import/gone.pdf', reason: 'not-found' }])
    expect(await exists('staging/migration')).toBe(false)
  })

  it('keeps unrelated staging content', async () => {
    await put('staging/scratch.txt', 'keep me')
    await put('sources/import/a.pdf', new Uint8Array([1, 2, 3, 0]))
    await put('staging/migration/sources/import/a.pdf.md', 'body\n')

    await cognitivizePreservedBodies(root, { now: NOW })

    expect(await exists('staging/scratch.txt')).toBe(true)
    expect(await exists('staging/migration')).toBe(false)
  })

  it('is a noop when there is no staging/migration', async () => {
    await put('sources/import/a.pdf', new Uint8Array([1, 2, 3, 0]))

    const result = await cognitivizePreservedBodies(root, { now: NOW })

    expect(result).toEqual({ cognitivized: [], skipped: [] })
    expect(await exists('sources/import/a.pdf_sidecar_NN.md')).toBe(false)
  })
})
