import { describe, it, expect } from 'vitest'
import { resolve } from './resolve.js'
import type { LoadedChain, Resolution } from './resolve.js'
import type { JsonValue, ScopeNode } from './types.js'

function node(id: string, values: Record<string, JsonValue> = {}, extra: Partial<ScopeNode> = {}): ScopeNode {
  return {
    id,
    kind: id === '' ? 'root' : 'scope',
    doc: id === '' ? 'root_NN.md' : `${id}/marker_NN.md`,
    isolate: false,
    values,
    ...extra,
  }
}

const floor = (values: Record<string, JsonValue>): ScopeNode => ({
  id: 'floor:defaults',
  kind: 'floor',
  doc: 'defaults/defaults_NN.md',
  isolate: false,
  values,
})

const chain = (nodes: ScopeNode[], f: ScopeNode | null = null): LoadedChain => ({ floor: f, nodes })

/** Freezes a value deeply so any mutation by the fold throws in strict mode. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function ok(result: Resolution) {
  if (!result.ok) throw new Error(`expected a resolution, got ${result.code}`)
  return result
}

const roundTrips = (r: Resolution) => expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r)

describe('resolve with override', () => {
  const portfolio = node('', { priority: 'medium' })
  const alpha = node('programs/alpha')
  const p1 = node('programs/alpha/projects/p1', { priority: 'high' })

  it('lets the nearest declaration win at three depths', () => {
    const forP1 = ok(resolve(chain([portfolio, alpha, p1]), 'priority', 'override'))
    expect(forP1.present).toBe(true)
    expect(forP1.value).toBe('high')
    expect(forP1.explain.winner).toEqual({ scope: p1.id, doc: p1.doc })

    const forAlpha = ok(resolve(chain([portfolio, alpha]), 'priority', 'override'))
    expect(forAlpha.value).toBe('medium')
    expect(forAlpha.explain.winner).toEqual({ scope: '', doc: 'root_NN.md' })
  })

  it('lets a child without a value inherit', () => {
    const r = ok(resolve(chain([portfolio, alpha]), 'priority', 'override'))
    expect(r.value).toBe('medium')
    expect(r.explain.overridden).toEqual([])
  })

  it('lets an explicitly empty value in a nearer scope win', () => {
    const r = ok(resolve(chain([portfolio, node('a', { priority: '' })]), 'priority', 'override'))
    expect(r.present).toBe(true)
    expect(r.value).toBe('')
    expect(r.explain.winner?.scope).toBe('a')
  })

  it('uses the floor when no scope declares the key and names it as supplier', () => {
    const r = ok(resolve(chain([portfolio, alpha], floor({ health: 'green' })), 'health', 'override'))
    expect(r.present).toBe(true)
    expect(r.value).toBe('green')
    expect(r.explain.winner).toEqual({ scope: 'floor:defaults', doc: 'defaults/defaults_NN.md' })
  })

  it('prefers a scope over the floor', () => {
    const r = ok(resolve(chain([portfolio], floor({ priority: 'none' })), 'priority', 'override'))
    expect(r.value).toBe('medium')
    expect(r.explain.overridden).toEqual([
      { scope: 'floor:defaults', doc: 'defaults/defaults_NN.md', value: 'none', by: '' },
    ])
  })

  it('is explicitly absent when nothing supplies the key', () => {
    const r = ok(resolve(chain([portfolio, alpha], floor({ health: 'green' })), 'owner', 'override'))
    expect(r.present).toBe(false)
    expect(r.value).toBeNull()
    expect(r.explain.winner).toBeNull()
    expect(r.explain.consulted.map((s) => s.scope)).toEqual(['floor:defaults', '', 'programs/alpha'])
  })

  it('lists the overridden candidates with the scope that displaced them, nearest first', () => {
    const mid = node('mid', { priority: 'low' })
    const r = ok(resolve(chain([portfolio, mid, p1]), 'priority', 'override'))
    expect(r.explain.overridden).toEqual([
      { scope: 'mid', doc: 'mid/marker_NN.md', value: 'low', by: p1.id },
      { scope: '', doc: 'root_NN.md', value: 'medium', by: p1.id },
    ])
  })

  it('does not inherit a parent value across an isolate, and says where the chain ends', () => {
    const legacy = node('programs/legacy', {}, { isolate: true })
    const r = ok(
      resolve(chain([portfolio, legacy], floor({ priority: 'none' })), 'priority', 'override'),
    )
    expect(r.value).toBe('none')
    expect(r.explain.winner?.scope).toBe('floor:defaults')
    expect(r.explain.cutAt).toBe('programs/legacy')
    expect(r.explain.consulted.map((s) => s.scope)).toEqual(['floor:defaults', 'programs/legacy'])
  })

  it('honours the nearest isolate when several are present', () => {
    const far = node('far', { priority: 'x' }, { isolate: true })
    const near = node('near', {}, { isolate: true })
    const r = ok(resolve(chain([far, node('mid', { priority: 'y' }), near]), 'priority', 'override'))
    expect(r.present).toBe(false)
    expect(r.explain.cutAt).toBe('near')
  })

  it('keeps cutAt null when no node isolates', () => {
    expect(ok(resolve(chain([portfolio]), 'priority', 'override')).explain.cutAt).toBeNull()
  })
})

describe('resolve with union', () => {
  const portfolio = node('', { glossary: ['risk=any threat', 'issue=something broken'] })
  const alpha = node('programs/alpha', { glossary: ['milestone=a checkpoint', 'risk=schedule threat'] })

  it('accumulates entries across the chain', () => {
    const r = ok(resolve(chain([portfolio, alpha]), 'glossary', 'union'))
    expect(r.value).toEqual([
      { name: 'issue', value: 'something broken' },
      { name: 'milestone', value: 'a checkpoint' },
      { name: 'risk', value: 'schedule threat' },
    ])
  })

  it('keeps the nearer entry and lists the farther one as shadowed', () => {
    const r = ok(resolve(chain([portfolio, alpha]), 'glossary', 'union'))
    const risk = r.explain.entries?.find((e) => e.name === 'risk')
    expect(risk).toEqual({
      name: 'risk',
      from: { scope: 'programs/alpha', doc: 'programs/alpha/marker_NN.md' },
      shadowed: [{ scope: '', doc: 'root_NN.md', value: 'any threat', by: 'programs/alpha' }],
    })
    const issue = r.explain.entries?.find((e) => e.name === 'issue')
    expect(issue?.shadowed).toEqual([])
  })

  it('orders entries by supplying scope, outermost first, then declaration order', () => {
    const r = ok(resolve(chain([portfolio, alpha], floor({ glossary: ['floor=lowest'] })), 'glossary', 'union'))
    expect((r.value as Array<{ name: string }>).map((e) => e.name)).toEqual([
      'floor',
      'issue',
      'milestone',
      'risk',
    ])
  })

  it('reads the three keyed-list forms: bracketed string, array and object', () => {
    const r = ok(
      resolve(
        chain([
          node('a', { tags: '[x=1, y=2]' }),
          node('b', { tags: ['z=3'] }),
          node('c', { tags: { w: '4' } }),
        ]),
        'tags',
        'union',
      ),
    )
    expect(r.value).toEqual([
      { name: 'x', value: '1' },
      { name: 'y', value: '2' },
      { name: 'z', value: '3' },
      { name: 'w', value: '4' },
    ])
  })

  it('records a malformed item instead of dropping it silently', () => {
    const r = ok(resolve(chain([node('a', { tags: ['good=1', 'bad item'] })]), 'tags', 'union'))
    expect(r.value).toEqual([{ name: 'good', value: '1' }])
    expect(r.explain.skipped).toEqual([{ scope: 'a', doc: 'a/marker_NN.md', item: 'bad item' }])
  })

  it('is present and empty when a scope declares an empty list, absent when none declares it', () => {
    const declared = ok(resolve(chain([node('a', { tags: [] })]), 'tags', 'union'))
    expect(declared.present).toBe(true)
    expect(declared.value).toEqual([])
    const missing = ok(resolve(chain([node('a')]), 'tags', 'union'))
    expect(missing.present).toBe(false)
    expect(missing.value).toEqual([])
  })

  it('does not read past an isolate', () => {
    const legacy = node('legacy', { glossary: ['own=1'] }, { isolate: true })
    const r = ok(resolve(chain([portfolio, legacy]), 'glossary', 'union'))
    expect(r.value).toEqual([{ name: 'own', value: '1' }])
    expect(r.explain.cutAt).toBe('legacy')
  })
})

describe('resolve contract', () => {
  it('rejects an unknown strategy by name and does not fall back', () => {
    const r = resolve(chain([node('', { priority: 'medium' })]), 'priority', 'restrict')
    expect(r).toEqual({ ok: false, code: 'UNSUPPORTED_STRATEGY', strategy: 'restrict' })
  })

  it('is deterministic and never mutates its input', () => {
    const input = deepFreeze(
      chain(
        [node('', { priority: 'medium', glossary: ['a=1'] }), node('x', { priority: 'high' })],
        floor({ health: 'green' }),
      ),
    )
    expect(resolve(input, 'priority', 'override')).toStrictEqual(resolve(input, 'priority', 'override'))
    expect(resolve(input, 'glossary', 'union')).toStrictEqual(resolve(input, 'glossary', 'union'))
  })

  it('returns JSON-safe results for every outcome', () => {
    const input = chain(
      [node('', { priority: 'medium', glossary: ['a=1', 'bad'] }), node('x', { priority: 'high', glossary: ['a=2'] })],
      floor({ health: 'green' }),
    )
    roundTrips(resolve(input, 'priority', 'override'))
    roundTrips(resolve(input, 'health', 'override'))
    roundTrips(resolve(input, 'owner', 'override'))
    roundTrips(resolve(input, 'glossary', 'union'))
    roundTrips(resolve(input, 'priority', 'nope'))
  })

  it('carries the key, the strategy and the trace version', () => {
    const r = ok(resolve(chain([node('', { priority: 'medium' })]), 'priority', 'override'))
    expect(r.key).toBe('priority')
    expect(r.strategy).toBe('override')
    expect(r.explain.v).toBe(1)
    expect(r.explain.key).toBe('priority')
    expect(r.explain.strategy).toBe('override')
  })
})
