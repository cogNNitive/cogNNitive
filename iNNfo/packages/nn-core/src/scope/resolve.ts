import type { JsonValue, ScopeNode } from './types.js'

/** The closed set of merge strategies. `restrict` and `append` are deferred. */
export type MergeStrategy = 'override' | 'union'

/** Who supplied a value: a node id (or the floor's id) and the document that declared it. */
export interface Supplier {
  scope: string
  doc: string | null
}

/**
 * What the fold reads: the nodes outermost first, and the floor (the blueprint default),
 * which sits below every node. A node with `isolate: true` hides every node before it;
 * the floor is never hidden.
 */
export interface LoadedChain {
  floor: ScopeNode | null
  nodes: readonly ScopeNode[]
}

export interface Candidate extends Supplier {
  value: JsonValue
  /** The scope whose value displaced this one. */
  by: string
}

export interface UnionEntry {
  name: string
  value: JsonValue
}

export interface ExplainTrace {
  v: 1
  key: string
  strategy: MergeStrategy
  /** Every supplier the fold read, floor first, then the nodes outermost first. */
  consulted: Supplier[]
  /** The isolated node that ended the chain, or null. */
  cutAt: string | null
  /** The supplier of an `override` value; null when absent and for `union`. */
  winner: Supplier | null
  /** `override`: declarations that lost, nearest first. */
  overridden: Candidate[]
  /** `union`: one record per kept entry. */
  entries?: Array<{ name: string; from: Supplier; shadowed: Candidate[] }>
  /** `union`: items that were not `name=value`, kept visible instead of dropped. */
  skipped?: Array<Supplier & { item: JsonValue }>
}

export type Resolution =
  | {
      ok: true
      key: string
      strategy: MergeStrategy
      present: boolean
      value: JsonValue
      explain: ExplainTrace
    }
  | { ok: false; code: 'UNSUPPORTED_STRATEGY'; strategy: string }

const supplierOf = (n: ScopeNode): Supplier => ({ scope: n.id, doc: n.doc })
const declares = (n: ScopeNode, key: string): boolean => Object.hasOwn(n.values, key)

/** Nodes the fold may read: from the nearest isolate inward. */
export function visibleNodes(nodes: readonly ScopeNode[]): { nodes: readonly ScopeNode[]; cutAt: string | null } {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].isolate) return { nodes: nodes.slice(i), cutAt: nodes[i].id }
  }
  return { nodes, cutAt: null }
}

type Parsed = { entries: UnionEntry[]; skipped: JsonValue[] }

function parseKeyedItem(item: JsonValue): UnionEntry | null {
  if (typeof item !== 'string') return null
  const i = item.indexOf('=')
  if (i === -1) return null
  const name = item.slice(0, i).trim()
  if (name === '') return null
  return { name, value: item.slice(i + 1).trim() }
}

/**
 * Reads the keyed-list forms a values document can hold: `[name=value, ...]` (or the bare
 * comma list), an array of `name=value` strings, or an object. Anything else is returned
 * in `skipped`, never dropped silently.
 */
function keyedEntries(raw: JsonValue): Parsed {
  const entries: UnionEntry[] = []
  const skipped: JsonValue[] = []
  if (raw === null) return { entries, skipped }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const entry = parseKeyedItem(item)
      if (entry) entries.push(entry)
      else skipped.push(item)
    }
    return { entries, skipped }
  }
  if (typeof raw === 'object') {
    for (const [name, value] of Object.entries(raw)) entries.push({ name, value })
    return { entries, skipped }
  }
  if (typeof raw !== 'string') return { entries, skipped: [raw] }
  let text = raw.trim()
  if (text.startsWith('[') && text.endsWith(']')) text = text.slice(1, -1)
  for (const part of text.split(',')) {
    if (part.trim() === '') continue
    const entry = parseKeyedItem(part)
    if (entry) entries.push(entry)
    else skipped.push(part.trim())
  }
  return { entries, skipped }
}

/** The floor, then the visible nodes: farthest first. */
const farToNear = (floor: ScopeNode | null, nodes: readonly ScopeNode[]): ScopeNode[] =>
  floor ? [floor, ...nodes] : [...nodes]

function resolveOverride(
  key: string,
  order: readonly ScopeNode[],
  cutAt: string | null,
  consulted: Supplier[],
): Resolution {
  const declaring = order.filter((n) => declares(n, key))
  const winnerNode = declaring.at(-1)
  if (!winnerNode) {
    return {
      ok: true,
      key,
      strategy: 'override',
      present: false,
      value: null,
      explain: { v: 1, key, strategy: 'override', consulted, cutAt, winner: null, overridden: [] },
    }
  }
  const overridden: Candidate[] = declaring
    .slice(0, -1)
    .reverse()
    .map((n) => ({ ...supplierOf(n), value: n.values[key], by: winnerNode.id }))
  return {
    ok: true,
    key,
    strategy: 'override',
    present: true,
    value: winnerNode.values[key],
    explain: { v: 1, key, strategy: 'override', consulted, cutAt, winner: supplierOf(winnerNode), overridden },
  }
}

function resolveUnion(
  key: string,
  order: readonly ScopeNode[],
  cutAt: string | null,
  consulted: Supplier[],
): Resolution {
  type Contribution = { name: string; value: JsonValue; node: ScopeNode }
  const sequence: Contribution[] = []
  const skipped: Array<Supplier & { item: JsonValue }> = []
  let present = false
  for (const n of order) {
    if (!declares(n, key)) continue
    present = true
    const parsed = keyedEntries(n.values[key])
    for (const e of parsed.entries) sequence.push({ ...e, node: n })
    for (const item of parsed.skipped) skipped.push({ ...supplierOf(n), item })
  }
  const lastIndex = new Map<string, number>()
  sequence.forEach((c, i) => lastIndex.set(c.name, i))
  const kept = sequence.filter((c, i) => lastIndex.get(c.name) === i)
  const entries = kept.map((c) => ({
    name: c.name,
    from: supplierOf(c.node),
    shadowed: sequence
      .slice(0, lastIndex.get(c.name))
      .filter((s) => s.name === c.name)
      .reverse()
      .map((s) => ({ ...supplierOf(s.node), value: s.value, by: c.node.id })),
  }))
  return {
    ok: true,
    key,
    strategy: 'union',
    present,
    value: kept.map((c) => ({ name: c.name, value: c.value })),
    explain: { v: 1, key, strategy: 'union', consulted, cutAt, winner: null, overridden: [], entries, skipped },
  }
}

/**
 * Pure fold of `key` over the chain with a merge strategy. Same input, same output; the
 * input is never mutated and the result is plain JSON (no functions, cycles, classes or
 * absolute paths). An unknown strategy is an error, never a fallback.
 *
 * - `override`: the nearest node that declares the key wins (an empty value declared
 *   nearer wins over a farther non-empty one); the floor is the last resort.
 * - `union`: the named entries of every node, a nearer entry shadowing a farther one of
 *   the same name; entries are ordered by supplying scope, outermost first, then by
 *   declaration order.
 */
export function resolve(loaded: LoadedChain, key: string, strategy: string): Resolution {
  if (strategy !== 'override' && strategy !== 'union') {
    return { ok: false, code: 'UNSUPPORTED_STRATEGY', strategy }
  }
  const { nodes, cutAt } = visibleNodes(loaded.nodes)
  const consulted = [...(loaded.floor ? [loaded.floor] : []), ...nodes].map(supplierOf)
  const order = farToNear(loaded.floor, nodes)
  return strategy === 'override'
    ? resolveOverride(key, order, cutAt, consulted)
    : resolveUnion(key, order, cutAt, consulted)
}
