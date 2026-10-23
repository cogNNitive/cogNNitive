import { describe, it, expect } from 'vitest'
import {
  deriveValueHistory,
  deriveFieldOrigin,
  detectUnrecordedEdits,
} from '../../src/console/provenance.js'
import type { ChangesetRecord } from '../../src/console/element-history.js'

function rec(
  changes: Array<Partial<ChangesetRecord['changes'][number]>>,
  appliedAt?: string,
): ChangesetRecord {
  return {
    path: 'changes/ws_agent_1_changes_NN.md',
    appliedAt,
    changes: changes.map((c, i) => ({
      id: c.id ?? `c-${i + 1}`,
      op: c.op ?? 'update_field',
      target: c.target!,
      ...c,
    })) as ChangesetRecord['changes'],
  }
}

describe('deriveValueHistory', () => {
  it('returns the hops ordered by applied_at', () => {
    const changes = [
      rec([{ id: 'c2', target: 'pricing@sku-42&precio', from: '8', to: '9', applied_at: '2026-02-01T00:00:00.000Z' }]),
      rec([{ id: 'c1', target: 'pricing@sku-42&precio', from: '7', to: '8', applied_at: '2026-01-01T00:00:00.000Z' }]),
      rec([{ id: 'c4', target: 'pricing@sku-42&precio', from: '9', to: '10', applied_at: '2026-03-01T00:00:00.000Z' }]),
    ]
    const hops = deriveValueHistory(changes, 'pricing@sku-42&precio')
    expect(hops.map((h) => h.to)).toEqual(['8', '9', '10'])
    expect(hops.map((h) => h.changeId)).toEqual(['c1', 'c2', 'c4'])
  })

  it('ignores matrix cells and bare targets', () => {
    const changes = [rec([{ target: 'pricing@matrix:&row&col' }, { target: 'pricing' }])]
    expect(deriveValueHistory(changes, 'pricing@sku-42&precio')).toEqual([])
  })
})

describe('deriveFieldOrigin', () => {
  it('returns the last change with its author and evidence', () => {
    const changes = [
      rec([{ id: 'c1', target: 'pricing@sku-42&precio', to: '8', author: 'ana', evidence: 'sources/a.md@## X', applied_at: '2026-01-01T00:00:00.000Z' }]),
      rec([{ id: 'c2', target: 'pricing@sku-42&precio', to: '9', author: 'juan', evidence: 'decision', applied_at: '2026-02-01T00:00:00.000Z' }]),
    ]
    const origin = deriveFieldOrigin(changes, 'sku-42', 'precio')
    expect(origin?.changeId).toBe('c2')
    expect(origin?.author).toBe('juan')
    expect(origin?.evidence).toBe('decision')
    expect(origin?.to).toBe('9')
  })

  it('is null when no change targets the field', () => {
    expect(deriveFieldOrigin([], 'sku-42', 'precio')).toBeNull()
  })
})

describe('detectUnrecordedEdits', () => {
  const changes = [rec([{ id: 'c1', target: 'pricing@sku-42&precio', to: '10', status: 'applied' }])]

  it('flags a field whose value diverges from the last change', () => {
    const diags = detectUnrecordedEdits([{ id: 'sku-42', fields: { precio: '12' } }], changes)
    expect(diags.map((d) => d.code)).toEqual(['EDITED_WITHOUT_RECORD'])
  })

  it('is silent when the value equals the last change', () => {
    expect(detectUnrecordedEdits([{ id: 'sku-42', fields: { precio: '10' } }], changes)).toEqual([])
  })

  it('is silent for a field with no targeting change', () => {
    expect(detectUnrecordedEdits([{ id: 'sku-42', fields: { name: 'X' } }], changes)).toEqual([])
  })
})
