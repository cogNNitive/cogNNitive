import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { queryUnits } from './query-units'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-query-units')

async function writeWorkspace(): Promise<void> {
  await mkdir(join(rootDir, 'sources', 'nn'), { recursive: true })
  const rows = ['cliente_id,segmento,mrr_usd']
  for (let i = 1; i <= 250; i++) rows.push(`${i},Enterprise,${i * 100}`)
  await writeFile(join(rootDir, 'sources', 'nn', 'big.csv'), rows.join('\n') + '\n', 'utf-8')
  await writeFile(
    join(rootDir, 'sources', 'nn', 'small.csv'),
    'cliente_id,segmento,mrr_usd\n101,Enterprise,45000\n102,SMB,5500\n',
    'utf-8',
  )
}

describe('query_units', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await writeWorkspace()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('round-trips a filter+projection query', async () => {
    const result = await queryUnits(rootDir, 'sources/nn/small.csv?segmento=Enterprise&mrr_usd')
    expect(result.uris).toEqual(['sources/nn/small.csv@101'])
    expect(result.values).toEqual(['45000'])
    expect(result.truncated).toBe(false)
    expect(result.diagnostics).toEqual([])
  })

  it('caps large result sets at 100 with truncated=true', async () => {
    const result = await queryUnits(rootDir, 'sources/nn/big.csv?segmento=Enterprise')
    expect(result.uris).toHaveLength(100)
    expect(result.truncated).toBe(true)
    expect(result.uris[0]).toBe('sources/nn/big.csv@1')
    expect(result.values).toBeUndefined()
  })

  it('rejects malformed queries without touching the workspace', async () => {
    const target = join(rootDir, 'sources', 'nn', 'small.csv')
    const before = readFileSync(target, 'utf-8')
    const result = await queryUnits(rootDir, 'sources/nn/small.csv@101?segmento=Enterprise')
    expect(result.uris).toEqual([])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].severity).toBe('error')
    expect(readFileSync(target, 'utf-8')).toBe(before)
  })
})
