import { describe, it, expect } from 'vitest'
import { driftReport } from './drift.js'
import type { DriftChain, DriftInput, DriftReport, DriftRow } from './drift.js'
import type { JsonValue, ScopeNode } from './types.js'

/** Literal nodes only: the report is a pure function over chains, never paths. */
const node = (id: string, values: Record<string, JsonValue> = {}, isolate = false): ScopeNode => ({
  id,
  kind: id === '' ? 'root' : 'scope',
  doc: id === '' ? 'root_NN.md' : `${id}.md`,
  isolate,
  values,
})
const floorOf = (values: Record<string, JsonValue>): ScopeNode => ({
  id: 'bluepriNNt:demo',
  kind: 'floor',
  doc: 'defaults_NN.md',
  isolate: false,
  values,
})

const ROOT = node('')
const GROUP = (values: Record<string, JsonValue> = {}) => node('group', values)
const leaf = (id: string, values: Record<string, JsonValue> = {}) => node(`group/${id}`, values)

const rowOf = (report: DriftReport, scope: string, key: string): DriftRow => {
  const row = report.rows.find((r) => r.scope === scope && r.key === key)
  if (!row) throw new Error(`no row for ${scope} / ${key}: ${JSON.stringify(report.rows.map((r) => [r.scope, r.key]))}`)
  return row
}

/** Eight units under `group`: four at 0.06, one at 0.2, three inheriting 0.4. */
function eightUnits(): DriftChain[] {
  const group = GROUP({ volume: 0.4 })
  const values: Array<number | null> = [0.06, 0.06, 0.06, 0.06, 0.2, null, null, null]
  return values.map((v, i) => ({
    unit: `u${i}`,
    nodes: [ROOT, group, leaf(`u${i}`, v === null ? {} : { volume: v })],
  }))
}

describe('driftReport: deviating units', () => {
  it('counts 5 of 8 units deviating from the baseline of their scope, with the variants', () => {
    const report = driftReport({ floor: null, chains: eightUnits() })
    const row = rowOf(report, 'group', 'volume')
    expect(row.baseline).toEqual({ present: true, value: 0.4, from: { scope: 'group', doc: 'group.md' } })
    expect(row.units).toEqual({ total: 8, deviating: 5, uniform: false })
    expect(row.variants).toEqual([
      { value: 0.06, units: 4, from: { scope: 'group/u0', doc: 'group/u0.md' } },
      { value: 0.2, units: 1, from: { scope: 'group/u4', doc: 'group/u4.md' } },
    ])
  })

  it('reports the root row from the root view: nothing declared there, every value is a variant', () => {
    const row = rowOf(driftReport({ floor: null, chains: eightUnits() }), '', 'volume')
    expect(row.baseline).toEqual({ present: false, value: null, from: null })
    expect(row.units).toEqual({ total: 8, deviating: 8, uniform: false })
    expect(row.variants.map((v) => [v.value, v.units])).toEqual([
      [0.06, 4],
      [0.4, 3],
      [0.2, 1],
    ])
  })

  it('emits no row for a leaf scope: it offers values to nobody', () => {
    const report = driftReport({ floor: null, chains: eightUnits() })
    expect(report.rows.map((r) => r.scope).sort()).toEqual(['', 'group'])
  })

  it('reports repetition of one value as uniform and fully deviating (hoistable)', () => {
    const chains = Array.from({ length: 6 }, (_, i) => ({
      unit: `order${i}`,
      nodes: [ROOT, leaf(`order${i}`, { price: '84' })],
    }))
    const row = rowOf(driftReport({ floor: null, chains }), '', 'price')
    expect(row.baseline.present).toBe(false)
    expect(row.units).toEqual({ total: 6, deviating: 6, uniform: true })
    expect(row.variants.map((v) => [v.value, v.units])).toEqual([['84', 6]])
  })

  it('reports no deviation when every unit inherits', () => {
    const group = GROUP({ volume: 0.4 })
    const chains = ['a', 'b'].map((id) => ({ unit: id, nodes: [ROOT, group, leaf(id)] }))
    const row = rowOf(driftReport({ floor: null, chains }), 'group', 'volume')
    expect(row.units).toEqual({ total: 2, deviating: 0, uniform: true })
    expect(row.variants).toEqual([])
  })

  it('a unit with several chains deviates once, even when most of its chains agree', () => {
    const group = GROUP({ volume: 0.4 })
    const chains: DriftChain[] = [
      { unit: 'ep1', nodes: [ROOT, group, leaf('s1')] },
      { unit: 'ep1', nodes: [ROOT, group, leaf('s2', { volume: 0.06 })] },
      { unit: 'ep1', nodes: [ROOT, group, leaf('s3', { volume: 0.06 })] },
      { unit: 'ep2', nodes: [ROOT, group, leaf('s4')] },
    ]
    const row = rowOf(driftReport({ floor: null, chains }), 'group', 'volume')
    expect(row.units).toEqual({ total: 2, deviating: 1, uniform: false })
    expect(row.variants.map((v) => [v.value, v.units])).toEqual([[0.06, 1]])
  })
})

describe('driftReport: equality', () => {
  it('compares deeply: equal objects with different key order do not deviate', () => {
    const group = GROUP({ palette: { a: 1, b: [1, 2] } })
    const chains: DriftChain[] = [
      { unit: 'x', nodes: [ROOT, group, leaf('x', { palette: { b: [1, 2], a: 1 } })] },
      { unit: 'y', nodes: [ROOT, group, leaf('y', { palette: { a: 1, b: [1, 3] } })] },
    ]
    const row = rowOf(driftReport({ floor: null, chains }), 'group', 'palette')
    expect(row.units).toEqual({ total: 2, deviating: 1, uniform: false })
    expect(row.variants).toHaveLength(1)
    expect(row.variants[0].value).toEqual({ a: 1, b: [1, 3] })
  })
})

describe('driftReport: keys, floor and isolate', () => {
  it('does not emit a row for a requested key that nothing declares', () => {
    const report = driftReport({ floor: null, chains: eightUnits(), keys: ['volume', 'ghost'] })
    expect(report.rows.every((r) => r.key === 'volume')).toBe(true)
    expect(report.skipped).toEqual([])
  })

  it('compares only the requested keys, minus the ignored ones', () => {
    const group = GROUP({ volume: 0.4, title: 'T' })
    const chains = [{ unit: 'a', nodes: [ROOT, group, leaf('a', { volume: 1, title: 'A', extra: 1 })] }]
    expect(new Set(driftReport({ floor: null, chains }).rows.map((r) => r.key))).toEqual(
      new Set(['volume', 'title', 'extra']),
    )
    expect(new Set(driftReport({ floor: null, chains, keys: ['volume', 'title'] }).rows.map((r) => r.key))).toEqual(
      new Set(['volume', 'title']),
    )
    expect(
      new Set(driftReport({ floor: null, chains, ignore: ['title'] }).rows.map((r) => r.key)),
    ).toEqual(new Set(['volume', 'extra']))
  })

  it('uses the floor value as the baseline when no scope declares the key', () => {
    const chains: DriftChain[] = [
      { unit: 'a', nodes: [ROOT, leaf('a', { transition: 'fade' })] },
      { unit: 'b', nodes: [ROOT, leaf('b')] },
    ]
    const row = rowOf(driftReport({ floor: floorOf({ transition: 'none' }), chains }), '', 'transition')
    expect(row.baseline).toEqual({
      present: true,
      value: 'none',
      from: { scope: 'bluepriNNt:demo', doc: 'defaults_NN.md' },
    })
    expect(row.units).toEqual({ total: 2, deviating: 1, uniform: false })
  })

  it('does not count a unit that crosses an isolate after the scope', () => {
    const root = node('', { level: 1 })
    const chains: DriftChain[] = [
      { unit: 'cut', nodes: [root, node('legacy', {}, true), node('legacy/leaf', { level: 9 })] },
      { unit: 'open', nodes: [root, node('plain'), node('plain/leaf', { level: 2 })] },
    ]
    const row = rowOf(driftReport({ floor: null, chains }), '', 'level')
    expect(row.units).toEqual({ total: 1, deviating: 1, uniform: true })
    expect(row.variants.map((v) => v.value)).toEqual([2])
  })

  it('skips a union key visibly instead of omitting it', () => {
    const report = driftReport({ floor: null, chains: eightUnits(), strategies: { volume: 'union' } })
    expect(report.rows).toEqual([])
    expect(report.skipped).toEqual([{ key: 'volume', reason: 'strategy union is not compared' }])
  })

  it('skips a key with an unsupported strategy with its own reason', () => {
    const report = driftReport({ floor: null, chains: eightUnits(), strategies: { volume: 'sideways' } })
    expect(report.skipped).toEqual([{ key: 'volume', reason: 'unsupported strategy sideways' }])
  })
})

describe('driftReport: purity', () => {
  const input = (): DriftInput => ({
    floor: floorOf({ volume: 1 }),
    chains: eightUnits(),
    keys: ['volume'],
  })

  it('is versioned plain JSON, deterministic, and independent of the chain order', () => {
    const a = driftReport(input())
    const reversed = input()
    reversed.chains = [...reversed.chains].reverse()
    const b = driftReport(reversed)
    expect(a.v).toBe(1)
    expect(b).toEqual(a)
    expect(JSON.parse(JSON.stringify(a))).toEqual(a)
    expect(driftReport(input())).toEqual(a)
  })

  it('never mutates its input', () => {
    const frozen = structuredClone(input())
    const deepFreeze = (o: unknown): void => {
      if (o && typeof o === 'object') {
        Object.freeze(o)
        Object.values(o).forEach(deepFreeze)
      }
    }
    deepFreeze(frozen)
    expect(() => driftReport(frozen)).not.toThrow()
    expect(frozen).toEqual(input())
  })
})
