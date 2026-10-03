import { describe, expect, it } from 'vitest'
import { detectLegacy, type DomainReader } from '../../../src/legacy/index.js'
import { detectLegacyLayout } from '../../../src/legacy/layout/detect.js'

function memoryReader(files: Record<string, string>): DomainReader {
  return {
    async list(dir: string): Promise<string[]> {
      const prefix = dir ? `${dir.replace(/\/$/, '')}/` : ''
      const entries = new Set<string>()
      for (const filePath of Object.keys(files)) {
        if (filePath.startsWith(prefix)) {
          const first = filePath.slice(prefix.length).split('/')[0]
          if (first) entries.add(first)
        }
      }
      return Array.from(entries)
    },
    async read(filePath: string): Promise<string | null> {
      return filePath in files ? files[filePath] : null
    },
  }
}

const CURRENT = {
  'domaiNN_NN.md': '---\nknowledge_version: "V_0-1-0"\n---\n# domaiNN\n',
  'kNNowledge/plan_NN.md': '---\nknowledge_version: "V_0-1-0"\n---\n# Plan\n',
}

describe('detectLegacyLayout', () => {
  it.each([
    ['export/report.md', 'export'],
    ['sources/original/raw.pdf', 'sources/original'],
    ['sources/nn/import/raw.md', 'sources/nn'],
    ['sources/export/brief.md', 'sources/export'],
    ['sources/archive/metrics/V1/metrics.md', 'sources/archive'],
  ])('reports %s as a legacy-layout signal on %s', async (file, folder) => {
    const signals = await detectLegacyLayout(memoryReader({ ...CURRENT, [file]: 'x' }))
    expect(signals).toEqual([
      expect.objectContaining({ type: 'legacy-layout', path: folder }),
    ])
  })

  it('reports nothing for the new layout', async () => {
    const signals = await detectLegacyLayout(
      memoryReader({
        ...CURRENT,
        'artifacts/report_20261002T101500Z.md': 'x',
        'sources/import/report.pdf': 'x',
        'sources/import/report.pdf_sidecar_NN.md': 'x',
      }),
    )
    expect(signals).toEqual([])
  })

  it('reports one signal per retired folder, in a stable order', async () => {
    const signals = await detectLegacyLayout(
      memoryReader({
        ...CURRENT,
        'sources/original/a.md': 'x',
        'sources/original/b.md': 'x',
        'export/r.md': 'x',
      }),
    )
    expect(signals.map((s) => s.path)).toEqual(['export', 'sources/original'])
  })

  it('reports the ingest-cutover folders in a stable order', async () => {
    const signals = await detectLegacyLayout(
      memoryReader({
        ...CURRENT,
        'sources/archive/metrics/V1/metrics.md': 'x',
        'sources/export/b.md': 'x',
        'sources/nn/a.md': 'x',
        'export/r.md': 'x',
      }),
    )
    expect(signals.map((s) => s.path)).toEqual([
      'export',
      'sources/nn',
      'sources/export',
      'sources/archive',
    ])
  })

  it('explains that sources/archive is inert and never deleted', async () => {
    const signals = await detectLegacyLayout(
      memoryReader({ ...CURRENT, 'sources/archive/metrics/V1/metrics.md': 'x' }),
    )
    expect(signals[0].detail).toMatch(/never (moved|deleted)/i)
  })

  it('does not report an empty retired folder', async () => {
    const reader: DomainReader = {
      async list(dir: string) {
        return dir === '' ? ['domaiNN_NN.md', 'export'] : []
      },
      async read() {
        return null
      },
    }
    expect(await detectLegacyLayout(reader)).toEqual([])
  })

  it('flows through detectLegacy as a mixed domain', async () => {
    const result = await detectLegacy(memoryReader({ ...CURRENT, 'export/report.md': 'x' }))
    expect(result.kind).toBe('mixed')
    if (result.kind === 'current') throw new Error('expected a legacy result')
    expect(result.signals.some((s) => s.type === 'legacy-layout' && s.path === 'export')).toBe(true)
  })

  it('keeps a canonical domain current', async () => {
    const result = await detectLegacy(memoryReader(CURRENT))
    expect(result.kind).toBe('current')
  })
})
