import { resolve } from './resolve.js'
import type { Supplier } from './resolve.js'
import type { JsonValue, ScopeNode } from './types.js'

/**
 * Drift report: for each scope that offers values to descendants and each compared key,
 * the baseline the scope offers and how many units deviate from it. Pure and read-only:
 * every value, baseline and unit alike, comes from `resolve` (there is no second fold),
 * and the input is never mutated.
 */

/** One leaf chain, outermost node first, labelled with the unit it belongs to (opaque). */
export interface DriftChain {
  unit: string
  nodes: readonly ScopeNode[]
}

export interface DriftInput {
  floor: ScopeNode | null
  chains: readonly DriftChain[]
  /** Keys to compare; default: every key declared by the floor or a node. Undeclared keys are ignored. */
  keys?: readonly string[]
  /** Keys left out of the comparison. */
  ignore?: readonly string[]
  /**
   * Strategy per key; a key not listed is compared with `override`. `none` keys are compared
   * with `none` against an absent baseline. Others are `skipped`.
   */
  strategies?: Readonly<Record<string, string>>
}

export interface DriftBaseline {
  present: boolean
  value: JsonValue
  from: Supplier | null
}

export interface DriftVariant {
  value: JsonValue
  /** Units holding this value. */
  units: number
  /** Supplier of the first chain (in report order) that holds it. */
  from: Supplier
}

export interface DriftRow {
  /** Node id of the scope offering the baseline. */
  scope: string
  key: string
  baseline: DriftBaseline
  units: { total: number; deviating: number; uniform: boolean }
  /** Deviating values, most units first. */
  variants: DriftVariant[]
}

export interface DriftReport {
  v: 1
  rows: DriftRow[]
  skipped: Array<{ key: string; reason: string }>
}

interface Observed {
  /** Canonical identity: equal exactly when the two values are deeply equal. */
  id: string
  present: boolean
  value: JsonValue
  from: Supplier | null
}

function sortedKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortedKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortedKeys(value[k])]),
    )
  }
  return value
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const ABSENT: Observed = { id: 'absent', present: false, value: null, from: null }

function observe(floor: ScopeNode | null, nodes: readonly ScopeNode[], key: string, strategy: 'override' | 'none'): Observed {
  const r = resolve({ floor, nodes }, key, strategy)
  if (!r.ok) throw new Error(`unreachable: ${strategy} is supported (${r.code})`)
  if (!r.present) return ABSENT
  return { id: `value:${JSON.stringify(sortedKeys(r.value))}`, present: true, value: r.value, from: r.explain.winner }
}

const leafId = (c: DriftChain): string => c.nodes[c.nodes.length - 1].id
const pathOf = (c: DriftChain): string => c.nodes.map((n) => n.id).join('\u0000')

/** Skip reason for a key that is not compared with `override` or `none`, or null when it is. */
function skipReason(strategy: string): string | null {
  if (strategy === 'override' || strategy === 'none') return null
  return strategy === 'union' ? 'strategy union is not compared' : `unsupported strategy ${strategy}`
}

export function driftReport(input: DriftInput): DriftReport {
  const chains = input.chains
    .filter((c) => c.nodes.length > 0)
    .sort((a, b) => cmp(a.unit, b.unit) || cmp(leafId(a), leafId(b)) || cmp(pathOf(a), pathOf(b)))

  const declared = new Set<string>()
  for (const n of [...(input.floor ? [input.floor] : []), ...chains.flatMap((c) => c.nodes)]) {
    for (const k of Object.keys(n.values)) declared.add(k)
  }
  const ignored = new Set(input.ignore ?? [])
  const keys = [...new Set(input.keys ?? declared)].filter((k) => declared.has(k) && !ignored.has(k)).sort(cmp)

  const skipped: DriftReport['skipped'] = []
  const compared: string[] = []
  const strategyOf = (key: string): 'override' | 'none' => (input.strategies?.[key] === 'none' ? 'none' : 'override')
  for (const key of keys) {
    const reason = skipReason(input.strategies?.[key] ?? 'override')
    if (reason === null) compared.push(key)
    else skipped.push({ key, reason })
  }

  const scopes = [...new Set(chains.flatMap((c) => c.nodes.slice(0, -1).map((n) => n.id)))].sort(cmp)
  const rows: DriftRow[] = []
  for (const scope of scopes) {
    const members = chains
      .map((chain) => ({ chain, at: chain.nodes.findIndex((n) => n.id === scope) }))
      .filter(({ chain, at }) => at >= 0 && at < chain.nodes.length - 1 && !chain.nodes.slice(at + 1).some((n) => n.isolate))
    if (members.length === 0) continue
    const prefix = members[0].chain.nodes.slice(0, members[0].at + 1)
    for (const key of compared) {
      const strategy = strategyOf(key)
      // `none` values are never inherited, so there is no baseline to deviate from.
      const base = strategy === 'none' ? ABSENT : observe(input.floor, prefix, key, strategy)
      const seen = members.map(({ chain }) => ({ unit: chain.unit, obs: observe(input.floor, chain.nodes, key, strategy) }))
      if (!base.present && seen.every(({ obs }) => !obs.present)) continue

      const deviating = new Set<string>()
      const variants = new Map<string, { value: JsonValue; from: Supplier; units: Set<string> }>()
      for (const { unit, obs } of seen) {
        if (obs.id === base.id) continue
        deviating.add(unit)
        if (!obs.present || obs.from === null) continue
        const held = variants.get(obs.id) ?? { value: obs.value, from: obs.from, units: new Set<string>() }
        held.units.add(unit)
        variants.set(obs.id, held)
      }
      rows.push({
        scope,
        key,
        baseline: { present: base.present, value: base.value, from: base.from },
        units: {
          total: new Set(seen.map((s) => s.unit)).size,
          deviating: deviating.size,
          uniform: new Set(seen.map((s) => s.obs.id)).size === 1,
        },
        variants: [...variants.entries()]
          .sort(([ia, a], [ib, b]) => b.units.size - a.units.size || cmp(ia, ib))
          .map(([, v]) => ({ value: v.value, units: v.units.size, from: v.from })),
      })
    }
  }
  return { v: 1, rows, skipped }
}
