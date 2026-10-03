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
    it('rewrites export/ and sources/original/ paths but not sources/export/', async () => {
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
      expect(write.content).toContain('"sources/export/brief.md"')
      expect(write.content).toContain('`artifacts/report.md`')
      expect(write.content).toContain(' sources/export/brief.md.')
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

  it('leaves the live scanner mirror folders alone until the ingest cutover', async () => {
    const plan = await planLayoutMigration(
      memoryReader({ ...BASE, 'sources/nn/a.md': 'a', 'sources/export/b.md': 'b' }),
      deps,
    )
    expect(plan.status).toBe('noop')
    expect(plan.ops).toEqual([])
    expect(plan.report.unmigrated).toEqual([])
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
