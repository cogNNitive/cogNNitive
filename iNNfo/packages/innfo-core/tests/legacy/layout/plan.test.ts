// legacy:cognitivize-in-place/layout-migrate
import { describe, expect, it } from 'vitest'
import {
  planLayoutMigration,
  type DomainReader,
  type LayoutPlanDeps,
  type Op,
} from '../../../src/legacy/index.js'

function memoryReader(files: Record<string, string>, opaque: string[] = []): DomainReader {
  const all = [...Object.keys(files), ...opaque]
  return {
    async list(dir: string): Promise<string[]> {
      const prefix = dir ? `${dir.replace(/\/$/, '')}/` : ''
      const entries = new Set<string>()
      for (const filePath of all) {
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
    async isOpaque(filePath: string): Promise<boolean> {
      return opaque.includes(filePath)
    },
  }
}

// Fixed offset stand-in for the injected local-time conversion (UTC-3).
const deps: LayoutPlanDeps = {
  localToUtc(stamp: string): string | null {
    const m = stamp.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/)
    if (!m || +m[2] < 1 || +m[2] > 12) return null
    const at = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 3, +m[5], +m[6]))
    return at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  },
}

/** Minimal applier: enough to prove idempotence against the memory tree. */
function apply(files: Record<string, string>, ops: Op[]): Record<string, string> {
  const next = { ...files }
  for (const op of ops) {
    if (op.op === 'move') {
      next[op.to] = next[op.from]
      delete next[op.from]
    } else if (op.op === 'write') {
      next[op.path] = op.content
    } else {
      delete next[op.path]
    }
  }
  return next
}

const BASE = {
  'domaiNN_NN.md': '---\nknowledge_version: "V_0-1-0"\n---\n# domaiNN\n',
  '.gitattributes': '* -text\n',
}

describe('planLayoutMigration', () => {
  it('is a noop on the new layout', async () => {
    const plan = await planLayoutMigration(
      memoryReader({
        ...BASE,
        'artifacts/report_20261002T101500Z.md': 'x',
        'sources/import/data.csv': 'a,b\n',
      }),
      deps,
    )
    expect(plan.status).toBe('noop')
    expect(plan.ops).toEqual([])
  })

  it('moves export/ to artifacts/ and sources/original/ to sources/import/', async () => {
    const plan = await planLayoutMigration(
      memoryReader({
        ...BASE,
        'export/report.md': '# Report',
        'export/deep/data.json': '{}',
        'sources/original/notes.md': '# Notes',
      }),
      deps,
    )
    expect(plan.status).toBe('ready')
    expect(plan.ops).toEqual(
      expect.arrayContaining([
        { op: 'move', from: 'export/report.md', to: 'artifacts/report.md' },
        { op: 'move', from: 'export/deep/data.json', to: 'artifacts/deep/data.json' },
        { op: 'move', from: 'sources/original/notes.md', to: 'sources/import/notes.md' },
      ]),
    )
    expect(plan.ops.every((o) => o.op === 'move')).toBe(true)
  })

  it('moves opaque files without reading them', async () => {
    const plan = await planLayoutMigration(
      memoryReader({ ...BASE }, ['sources/original/scan.pdf']),
      deps,
    )
    expect(plan.ops).toEqual([
      { op: 'move', from: 'sources/original/scan.pdf', to: 'sources/import/scan.pdf' },
    ])
  })

  it('produces a stable planHash that changes with the plan', async () => {
    const files = { ...BASE, 'export/a.md': 'a', 'export/b.md': 'b' }
    const first = await planLayoutMigration(memoryReader(files), deps)
    const second = await planLayoutMigration(
      memoryReader({ ...BASE, 'export/b.md': 'b', 'export/a.md': 'a' }),
      deps,
    )
    const other = await planLayoutMigration(memoryReader({ ...BASE, 'export/a.md': 'a' }), deps)
    expect(first.planHash).toBe(second.planHash)
    expect(first.planHash).toMatch(/^[0-9a-f]{16}$/)
    expect(first.planHash).not.toBe(other.planHash)
    expect(first.ops).toEqual(second.ops)
  })

  describe('delete operations', () => {
    it('deletes a source that is a byte-identical duplicate of its destination', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'export/report.md': '# Same',
          'artifacts/report.md': '# Same',
        }),
        deps,
      )
      expect(plan.status).toBe('ready')
      expect(plan.ops).toEqual([{ op: 'delete', path: 'export/report.md' }])
      expect(plan.report.deleted).toEqual(['export/report.md'])
    })

    it('blocks instead of deleting when the destination differs', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'export/report.md': '# Old',
          'artifacts/report.md': '# New',
        }),
        deps,
      )
      expect(plan.status).toBe('blocked')
      expect(plan.ops.some((o) => o.op === 'delete')).toBe(false)
      expect(plan.problems).toEqual([
        expect.objectContaining({ severity: 'error', path: 'export/report.md' }),
      ])
    })

    it('never deletes more than byte-identical duplicates', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'export/a.md': 'a',
          'export/dup.md': 'same',
          'artifacts/dup.md': 'same',
          'sources/archive/old/V1/doc.md': 'inert',
        }),
        deps,
      )
      expect(plan.ops.filter((o) => o.op === 'delete')).toEqual([
        { op: 'delete', path: 'export/dup.md' },
      ])
    })
  })

  describe('old local-time stamps', () => {
    it('converts _YYYYMMDD-HHmmss to the contract UTC stamp via deps.localToUtc', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'export/Summary_20261002-101500.md': '# Summary',
          'kNNowledge/plan_NN.md': 'see export/Summary_20261002-101500.md@## Totals\n',
        }),
        deps,
      )
      expect(plan.ops).toEqual(
        expect.arrayContaining([
          {
            op: 'move',
            from: 'export/Summary_20261002-101500.md',
            to: 'artifacts/Summary_20261002T131500Z.md',
          },
          {
            op: 'write',
            path: 'kNNowledge/plan_NN.md',
            content: 'see artifacts/Summary_20261002T131500Z.md@## Totals\n',
          },
        ]),
      )
    })

    it('keeps the name and warns when the stamp cannot be converted', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ ...BASE, 'export/Summary_20261302-101500.md': 'x' }),
        deps,
      )
      expect(plan.ops).toEqual([
        {
          op: 'move',
          from: 'export/Summary_20261302-101500.md',
          to: 'artifacts/Summary_20261302-101500.md',
        },
      ])
      expect(plan.problems).toEqual([
        expect.objectContaining({ severity: 'warning', path: 'export/Summary_20261302-101500.md' }),
      ])
    })
  })

  describe('citation path rewriting', () => {
    it('rewrites export/, sources/original/ and sources/export/ paths', async () => {
      const content = [
        '---',
        'sources: ["export/report.md@## A", "sources/original/data.csv@104", "sources/export/brief.md"]',
        '---',
        'See `export/report.md` and sources/export/brief.md.',
        '',
      ].join('\n')
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'kNNowledge/plan_NN.md': content,
          'export/report.md': 'r',
          'sources/original/data.csv': 'a,b',
        }),
        deps,
      )
      const write = plan.ops.find((o) => o.op === 'write' && o.path === 'kNNowledge/plan_NN.md')
      expect(write).toBeDefined()
      if (write?.op !== 'write') throw new Error('expected a write op')
      expect(write.content).toContain('"artifacts/report.md@## A"')
      expect(write.content).toContain('"sources/import/data.csv@104"')
      expect(write.content).toContain('"artifacts/brief.md"')
      expect(write.content).toContain('`artifacts/report.md`')
      expect(write.content).toContain(' artifacts/brief.md.')
    })

    it('writes a moved markdown file to its destination with rewritten content', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'export/report.md': 'cites export/other.md@## H\n',
          'export/other.md': 'o',
        }),
        deps,
      )
      expect(plan.ops).toEqual(
        expect.arrayContaining([
          { op: 'move', from: 'export/report.md', to: 'artifacts/report.md' },
          { op: 'write', path: 'artifacts/report.md', content: 'cites artifacts/other.md@## H\n' },
        ]),
      )
    })

    it('never rewrites sources/archive content', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/archive/metrics/V1/metrics.md': 'cites export/report.md\n',
          'export/report.md': 'r',
        }),
        deps,
      )
      expect(plan.ops.filter((o) => o.op === 'write')).toEqual([])
    })
  })

  describe('text policy', () => {
    it('writes .gitattributes with `* -text` when absent, only when there is work to do', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ 'domaiNN_NN.md': BASE['domaiNN_NN.md'], 'export/r.md': 'r' }),
        deps,
      )
      expect(plan.ops).toContainEqual({ op: 'write', path: '.gitattributes', content: '* -text\n' })
    })

    it('preserves existing .gitattributes lines', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ ...BASE, '.gitattributes': '*.png binary', 'export/r.md': 'r' }),
        deps,
      )
      expect(plan.ops).toContainEqual({
        op: 'write',
        path: '.gitattributes',
        content: '*.png binary\n* -text\n',
      })
    })

    it('proposes nothing for an already-migrated domain without the policy', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ 'domaiNN_NN.md': BASE['domaiNN_NN.md'], 'artifacts/r.md': 'r' }),
        deps,
      )
      expect(plan.status).toBe('noop')
    })
  })

  describe('sources/archive', () => {
    it('is never moved or deleted and is listed as unmigrated', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/archive/metrics/V1/metrics.md': '# V1',
          'export/r.md': 'r',
        }),
        deps,
      )
      expect(plan.ops.some((o) => JSON.stringify(o).includes('sources/archive'))).toBe(false)
      expect(plan.report.unmigrated).toContain('sources/archive/metrics/V1/metrics.md')
    })

    it('warns for each citation into sources/archive with citing file, citation and target', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/archive/metrics/V1/metrics.md': '# V1',
          'kNNowledge/Plan_business_NN.md':
            '---\nsources: ["sources/archive/metrics/V1/metrics.md@## Totals"]\n---\n# Plan\n',
        }),
        deps,
      )
      expect(plan.report.archiveCitations).toEqual([
        {
          file: 'kNNowledge/Plan_business_NN.md',
          citation: 'sources/archive/metrics/V1/metrics.md@## Totals',
          target: 'sources/archive/metrics/V1/metrics.md',
        },
      ])
      expect(plan.problems).toEqual([
        expect.objectContaining({
          severity: 'warning',
          path: 'kNNowledge/Plan_business_NN.md',
          message: expect.stringContaining('sources/archive/metrics/V1/metrics.md@## Totals'),
        }),
      ])
      // The citation is not rewritten and the plan does not block.
      expect(plan.ops.filter((o) => o.op === 'write')).toEqual([])
      expect(plan.status).not.toBe('blocked')
    })

    it('emits no citation warning for an uncited snapshot', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ ...BASE, 'sources/archive/metrics/V1/metrics.md': '# V1' }),
        deps,
      )
      expect(plan.report.archiveCitations).toEqual([])
      expect(plan.problems).toEqual([])
      expect(plan.report.unmigrated).toEqual(['sources/archive/metrics/V1/metrics.md'])
    })
  })

  describe('sources/nn mirrors', () => {
    const mirror = (rawPath: string, body: string): string =>
      `---\nsource_file: "${rawPath}"\nsha256: "abc"\nnormalized_by: "traNNsform"\n---\n\n${body}`
    const writes = (ops: Op[]): Record<string, string> =>
      Object.fromEntries(ops.flatMap((o) => (o.op === 'write' ? [[o.path, o.content]] : [])))

    it('retires the mirror of a binary raw: body staged for the sidecar, citation points at the sidecar', async () => {
      const plan = await planLayoutMigration(
        memoryReader(
          {
            ...BASE,
            'sources/nn/scan.md': mirror('sources/original/scan.pdf', '# Scan\n\n## Extracted\n\nOld body.\n'),
            'kNNowledge/plan_NN.md': 'sources:: [sources/nn/scan.md@## Extracted]\n',
          },
          ['sources/original/scan.pdf'],
        ),
        deps,
      )
      expect(plan.status).toBe('ready')
      expect(plan.ops).toEqual(
        expect.arrayContaining([
          { op: 'move', from: 'sources/original/scan.pdf', to: 'sources/import/scan.pdf' },
          { op: 'delete', path: 'sources/nn/scan.md' },
        ]),
      )
      const out = writes(plan.ops)
      expect(out['staging/migration/sources/import/scan.pdf.md']).toBe('# Scan\n\n## Extracted\n\nOld body.\n')
      expect(out['kNNowledge/plan_NN.md']).toBe(
        'sources:: [sources/import/scan.pdf_sidecar_NN.md@## Extracted]\n',
      )
      expect(plan.report.deleted).toContain('sources/nn/scan.md')
    })

    it('retires the mirror of a text-native raw and cites the raw itself', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/import/notes.md': '# Notes\n\n## H\n',
          'sources/nn/import/notes.md': mirror('sources/import/notes.md', '# Notes\n\n## H\n'),
          'kNNowledge/plan_NN.md': 'sources:: [sources/nn/import/notes.md@## H]\n',
        }),
        deps,
      )
      expect(plan.ops).toContainEqual({ op: 'delete', path: 'sources/nn/import/notes.md' })
      const out = writes(plan.ops)
      expect(out['kNNowledge/plan_NN.md']).toBe('sources:: [sources/import/notes.md@## H]\n')
      // A staged entry makes core cognitivize write the (bodyless) sidecar of the raw.
      expect(Object.keys(out)).toContain('staging/migration/sources/import/notes.md.md')
    })

    it('finds the raw by name when the mirror has no source_file', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/import/market.txt': 'raw text',
          'sources/nn/market.md': '# Market\n\n## Outlook\n',
          'kNNowledge/plan_NN.md': 'sources:: [sources/nn/market.md@## Outlook]\n',
        }),
        deps,
      )
      expect(plan.ops).toContainEqual({ op: 'delete', path: 'sources/nn/market.md' })
      const out = writes(plan.ops)
      expect(out['staging/migration/sources/import/market.txt.md']).toBe('# Market\n\n## Outlook\n')
      expect(out['kNNowledge/plan_NN.md']).toBe(
        'sources:: [sources/import/market.txt_sidecar_NN.md@## Outlook]\n',
      )
    })

    it('relocates a mirror with no raw into sources/import and rewrites its citations', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/nn/costs.csv': 'sku,cost\nA,1\n',
          'kNNowledge/plan_NN.md': 'sources:: [sources/nn/costs.csv@A&cost]\n',
        }),
        deps,
      )
      expect(plan.ops).toContainEqual({ op: 'move', from: 'sources/nn/costs.csv', to: 'sources/import/costs.csv' })
      expect(writes(plan.ops)['kNNowledge/plan_NN.md']).toBe('sources:: [sources/import/costs.csv@A&cost]\n')
      expect(Object.keys(writes(plan.ops))).toContain('staging/migration/sources/import/costs.csv.md')
    })

    it('maps the old import/ and conversations/ mirror subfolders onto the new raw folders', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/nn/import/a.md': '# A\n',
          'sources/nn/conversations/2026-10-01_talk_source.md': '# Talk\n',
        }),
        deps,
      )
      expect(plan.ops).toEqual(
        expect.arrayContaining([
          { op: 'move', from: 'sources/nn/import/a.md', to: 'sources/import/a.md' },
          {
            op: 'move',
            from: 'sources/nn/conversations/2026-10-01_talk_source.md',
            to: 'sources/conversations/2026-10-01_talk_source.md',
          },
        ]),
      )
    })

    it('deletes the generated ingestion manifest sources/nn/index.md', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ ...BASE, 'sources/nn/index.md': '# Ingestion manifest\n' }),
        deps,
      )
      expect(plan.ops).toEqual([{ op: 'delete', path: 'sources/nn/index.md' }])
    })

    it('blocks a relocation whose destination already holds different content, deletes an identical one', async () => {
      const blocked = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/nn/data.csv': 'a\n',
          'sources/import/data.csv': 'b\n',
        }),
        deps,
      )
      expect(blocked.status).toBe('blocked')
      const dup = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/nn/data.csv': 'a\n',
          'sources/import/data.csv': 'a\n',
        }),
        deps,
      )
      expect(dup.status).toBe('ready')
      expect(dup.ops).toContainEqual({ op: 'delete', path: 'sources/nn/data.csv' })
    })

    it('rewrites unqualified citations (the old implicit sources/nn prefix) in sources fields only', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/import/market.txt': 'raw text',
          'sources/nn/market.md': '# Market\n\n## Outlook\n',
          'sources/nn/costs.csv': 'sku,cost\nA,1\n',
          'kNNowledge/plan_NN.md': [
            'sources:: [market.md@## Outlook, costs.csv@A&cost]',
            'See market.md for the narrative and the xmarket.md file.',
            '',
          ].join('\n'),
        }),
        deps,
      )
      expect(writes(plan.ops)['kNNowledge/plan_NN.md']).toBe(
        [
          'sources:: [sources/import/market.txt_sidecar_NN.md@## Outlook, sources/import/costs.csv@A&cost]',
          'See market.md for the narrative and the xmarket.md file.',
          '',
        ].join('\n'),
      )
    })

    it('points the sources_dir field at sources/ and leaves prose directory mentions alone', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'domaiNN_NN.md': 'sources_dir:: sources/nn/\nNormalize into sources/nn/ with care.\n',
          'sources/nn/a.md': '# A\n',
        }),
        deps,
      )
      expect(writes(plan.ops)['domaiNN_NN.md']).toBe(
        'sources_dir:: sources/\nNormalize into sources/nn/ with care.\n',
      )
    })

    it('moves sources/export to artifacts without duplicating a byte-identical file', async () => {
      const plan = await planLayoutMigration(
        memoryReader({
          ...BASE,
          'sources/export/brief.md': '# Brief',
          'sources/export/dup.md': 'same',
          'artifacts/dup.md': 'same',
        }),
        deps,
      )
      expect(plan.ops).toEqual(
        expect.arrayContaining([
          { op: 'move', from: 'sources/export/brief.md', to: 'artifacts/brief.md' },
          { op: 'delete', path: 'sources/export/dup.md' },
        ]),
      )
    })

    it('does not flag a bare sources/archive/ mention as a citation', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ ...BASE, 'procedures/p_NN.md': 'Skip hashes already registered in sources/archive/ or assets/.' }),
        deps,
      )
      expect(plan.report.archiveCitations).toEqual([])
      expect(plan.problems).toEqual([])
    })

    it('leaves sources/archive alone as inert content (reported, never moved)', async () => {
      const plan = await planLayoutMigration(
        memoryReader({ ...BASE, 'sources/archive/x/V1/x.md': '# V1', 'sources/nn/a.md': '# A\n' }),
        deps,
      )
      expect(plan.ops.some((o) => JSON.stringify(o).includes('sources/archive'))).toBe(false)
      expect(plan.report.unmigrated).toEqual(['sources/archive/x/V1/x.md'])
    })
  })

  it('is idempotent over mirrors: applying the plan leaves nothing to do', async () => {
    const files = {
      ...BASE,
      'sources/import/market.txt': 'raw',
      'sources/nn/market.md': '# Market\n\n## Outlook\n',
      'sources/nn/costs.csv': 'a,b\n',
      'sources/nn/index.md': '# idx\n',
      'sources/export/brief.md': '# Brief',
      'kNNowledge/plan_NN.md': 'sources:: [sources/nn/market.md@## Outlook, sources/nn/costs.csv@1]\n',
    }
    const first = await planLayoutMigration(memoryReader(files), deps)
    expect(first.status).toBe('ready')
    const second = await planLayoutMigration(memoryReader(apply(files, first.ops)), deps)
    expect(second.status).toBe('noop')
  })

  it('is idempotent: applying the plan leaves nothing to do', async () => {
    const files = {
      ...BASE,
      'kNNowledge/plan_NN.md': 'cites export/r_20261002-101500.md and sources/original/n.md\n',
      'export/r_20261002-101500.md': 'r',
      'sources/original/n.md': 'n',
      'sources/archive/x/V1/x.md': 'inert',
    }
    const first = await planLayoutMigration(memoryReader(files), deps)
    expect(first.status).toBe('ready')
    const migrated = apply(files, first.ops)
    const second = await planLayoutMigration(memoryReader(migrated), deps)
    expect(second.status).toBe('noop')
    expect(second.ops).toEqual([])
  })
})
