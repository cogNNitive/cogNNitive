import { describe, it, expect } from 'vitest'
import { resolveProcedures } from './procedures.js'
import type { ProcedureResolution } from './procedures.js'
import type { LoadedChain } from './resolve.js'
import type { JsonValue, ProcedureDef, ScopeNode, SlotDecl } from './types.js'

const docOf = (scope: string, id: string) =>
  `${scope === '' ? '' : `${scope}/`}procedures/${id}_procedures_NN.md`

function def(scope: string, id: string, slots: SlotDecl[] = [], extra: Partial<ProcedureDef> = {}): ProcedureDef {
  return { id, scope, doc: docOf(scope, id), version: 'V_0-1-0', slots, ...extra }
}

function node(
  id: string,
  extra: { procedures?: ProcedureDef[]; fills?: Record<string, Record<string, JsonValue>>; isolate?: boolean } = {},
): ScopeNode {
  return {
    id,
    kind: id === '' ? 'root' : 'scope',
    doc: id === '' ? 'root_NN.md' : `${id}/marker_NN.md`,
    isolate: false,
    values: {},
    ...extra,
  }
}

const floorNode = (procedures: ProcedureDef[]): ScopeNode => ({
  id: 'bluepriNNt:kit',
  kind: 'floor',
  doc: 'kit_NN.md',
  isolate: false,
  values: {},
  procedures,
})

const chain = (nodes: ScopeNode[], floor: ScopeNode | null = null): LoadedChain => ({ floor, nodes })

const STYLE: SlotDecl = { name: 'style', kind: 'value', required: true }
const POST: SlotDecl = { name: 'post_step', kind: 'procedure', required: false }

function byId(r: ProcedureResolution, id: string) {
  const found = r.procedures.find((p) => p.def.id === id)
  if (!found) throw new Error(`procedure ${id} not selected`)
  return found
}
const codes = (r: ProcedureResolution) => r.diagnostics.map((d) => d.code)

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

describe('slots', () => {
  it('lists a slotted root procedure with its slot contracts', () => {
    const r = resolveProcedures(chain([node('', { procedures: [def('', 'draft-visuals', [STYLE, POST])] })]))
    expect(byId(r, 'draft-visuals').def.slots).toEqual([STYLE, POST])
    expect(r.diagnostics.filter((d) => d.code === 'DUPLICATE_SLOT')).toEqual([])
  })

  it('reports DUPLICATE_SLOT naming the procedure and the slot', () => {
    const r = resolveProcedures(
      chain([node('', { procedures: [def('', 'draft-visuals', [STYLE, { ...STYLE, required: false }])] })]),
    )
    const dup = r.diagnostics.find((d) => d.code === 'DUPLICATE_SLOT')
    expect(dup).toMatchObject({ severity: 'error', procedure: 'draft-visuals', scope: '' })
    expect(dup?.detail).toContain('style')
  })

  it('reports DUPLICATE_SLOT for a shadowed definition too', () => {
    const r = resolveProcedures(
      chain([
        node('', { procedures: [def('', 'p', [STYLE, STYLE])] }),
        node('s', { procedures: [def('s', 'p', [STYLE])] }),
      ]),
    )
    expect(r.diagnostics.filter((d) => d.code === 'DUPLICATE_SLOT').map((d) => d.scope)).toEqual([''])
  })
})

describe('child scopes fill slots', () => {
  const root = node('', { procedures: [def('', 'draft-visuals', [STYLE])] })

  it('lets two scopes share one definition with different fills', () => {
    const s1 = node('s1', { fills: { 'draft-visuals': { style: 'noir' } } })
    const s2 = node('s2', { fills: { 'draft-visuals': { style: 'pastel' } } })
    const a = byId(resolveProcedures(chain([root, s1])), 'draft-visuals')
    const b = byId(resolveProcedures(chain([root, s2])), 'draft-visuals')
    expect(a.bindings['style']).toMatchObject({ value: 'noir', from: { scope: 's1' } })
    expect(b.bindings['style']).toMatchObject({ value: 'pastel', from: { scope: 's2' } })
    expect(a.def).toEqual(b.def)
    expect(a.def.scope).toBe('')
  })

  it('lets the nearest filler win and keeps the farther fillers visible', () => {
    const base = node('', {
      procedures: [def('', 'draft-visuals', [STYLE])],
      fills: { 'draft-visuals': { style: 'plain' } },
    })
    const program = node('prog', { fills: { 'draft-visuals': { style: 'formal' } } })
    const project = node('prog/proj', { fills: { 'draft-visuals': { style: 'casual' } } })

    const forProject = byId(resolveProcedures(chain([base, program, project])), 'draft-visuals')
    expect(forProject.bindings['style']).toMatchObject({ value: 'casual', from: { scope: 'prog/proj' } })
    expect(forProject.bindings['style'].shadowed.map((c) => [c.scope, c.value, c.by])).toEqual([
      ['prog', 'formal', 'prog/proj'],
      ['', 'plain', 'prog/proj'],
    ])

    const forProgram = byId(resolveProcedures(chain([base, program])), 'draft-visuals')
    expect(forProgram.bindings['style']).toMatchObject({ value: 'formal', from: { scope: 'prog' } })
  })

  it('uses the slot default, supplied by the defining scope, when nobody fills it', () => {
    const withDefault: SlotDecl = { name: 'format', kind: 'value', required: false, default: 'markdown' }
    const r = resolveProcedures(chain([node('', { procedures: [def('', 'report', [withDefault])] }), node('s')]))
    expect(byId(r, 'report').bindings['format']).toMatchObject({
      value: 'markdown',
      from: { scope: '', doc: docOf('', 'report') },
      shadowed: [],
    })
    expect(r.diagnostics).toEqual([])
  })

  it('does not bind an optional slot nobody fills', () => {
    const r = resolveProcedures(chain([node('', { procedures: [def('', 'p', [POST])] })]))
    expect(byId(r, 'p').bindings).toEqual({})
    expect(r.diagnostics).toEqual([])
  })

  it('accepts a sub-procedure filler that resolves in the same chain', () => {
    const r = resolveProcedures(
      chain([
        node('', { procedures: [def('', 'p', [POST]), def('', 'alpha-review')] }),
        node('s', { fills: { p: { post_step: { procedure: 'alpha-review' } } } }),
      ]),
    )
    expect(byId(r, 'p').bindings['post_step']).toMatchObject({ value: { procedure: 'alpha-review' }, from: { scope: 's' } })
    expect(r.diagnostics).toEqual([])
  })

  it('does not see fills of a scope above an isolate', () => {
    const r = resolveProcedures(
      chain([
        node('', { fills: { p: { style: 'outer' } } }),
        node('iso', { isolate: true, procedures: [def('iso', 'p', [STYLE])] }),
      ]),
    )
    expect(codes(r)).toEqual(['REQUIRED_SLOT_UNFILLED'])
  })
})

describe('slot contract', () => {
  const root = node('', { procedures: [def('', 'p', [STYLE, POST])] })

  it('reports REQUIRED_SLOT_UNFILLED naming procedure and slot', () => {
    const r = resolveProcedures(chain([root, node('s')]))
    expect(r.diagnostics).toEqual([
      expect.objectContaining({ code: 'REQUIRED_SLOT_UNFILLED', severity: 'error', procedure: 'p' }),
    ])
    expect(r.diagnostics[0].detail).toContain('style')
    expect(byId(r, 'p').bindings['style']).toBeUndefined()
  })

  it('reports UNKNOWN_SLOT naming the slot, the procedure and the supplying scope', () => {
    const r = resolveProcedures(chain([root, node('s', { fills: { p: { style: 'x', colour: 'red' } } })]))
    const unknown = r.diagnostics.find((d) => d.code === 'UNKNOWN_SLOT')
    expect(unknown).toMatchObject({ severity: 'error', procedure: 'p', scope: 's' })
    expect(unknown?.detail).toContain('colour')
  })

  it('reports FILLER_KIND_MISMATCH for a plain value in a sub-procedure slot', () => {
    const r = resolveProcedures(chain([root, node('s', { fills: { p: { style: 'x', post_step: 'just text' } } })]))
    const mismatch = r.diagnostics.find((d) => d.code === 'FILLER_KIND_MISMATCH')
    expect(mismatch).toMatchObject({ severity: 'error', procedure: 'p', scope: 's' })
    expect(mismatch?.detail).toContain('post_step')
    expect(byId(r, 'p').bindings['post_step']).toBeUndefined()
  })

  it('reports FILLER_KIND_MISMATCH for a sub-procedure reference in a value slot', () => {
    const r = resolveProcedures(chain([root, node('s', { fills: { p: { style: { procedure: 'x' } } } })]))
    expect(codes(r)).toContain('FILLER_KIND_MISMATCH')
  })

  it('reports UNKNOWN_FILLER_PROCEDURE when the referenced procedure is not in the chain', () => {
    const r = resolveProcedures(chain([root, node('s', { fills: { p: { style: 'x', post_step: { procedure: 'ghost' } } } })]))
    const unknown = r.diagnostics.find((d) => d.code === 'UNKNOWN_FILLER_PROCEDURE')
    expect(unknown).toMatchObject({ severity: 'error', procedure: 'p', scope: 's' })
    expect(unknown?.detail).toContain('ghost')
  })

})

describe('forks and shadows', () => {
  const original = def('', 'draft-visuals', [STYLE], { version: 'V_0-2-0' })
  const root = node('', { procedures: [original] })
  const fork = (version: string) =>
    def('series', 'draft-visuals', [STYLE], {
      version: 'V_0-1-0',
      forkOf: { procedure: 'draft-visuals', scope: '', version },
    })
  const filled = (extra: Partial<Parameters<typeof node>[1]> = {}) =>
    node('series', { fills: { 'draft-visuals': { style: 's' } }, ...extra })

  it('records a declared fork and lists the original as shadowed', () => {
    const r = resolveProcedures(chain([root, { ...filled(), procedures: [fork('V_0-2-0')] }]))
    const effective = byId(r, 'draft-visuals')
    expect(effective.def.scope).toBe('series')
    expect(effective.def.forkOf).toEqual({ procedure: 'draft-visuals', scope: '', version: 'V_0-2-0' })
    expect(effective.shadowed).toEqual([
      { scope: '', doc: original.doc, version: 'V_0-2-0', by: 'series' },
    ])
    expect(codes(r)).toEqual([])
  })

  it('warns ORIGINAL_ADVANCED when the original moved past the recorded version, without blocking', () => {
    const r = resolveProcedures(chain([root, { ...filled(), procedures: [fork('V_0-1-0')] }]))
    const advanced = r.diagnostics.find((d) => d.code === 'ORIGINAL_ADVANCED')
    expect(advanced).toMatchObject({ severity: 'warning', procedure: 'draft-visuals', scope: 'series' })
    expect(advanced?.detail).toContain('V_0-1-0')
    expect(advanced?.detail).toContain('V_0-2-0')
    expect(byId(r, 'draft-visuals').def.scope).toBe('series')
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
  })

  it('warns UNDECLARED_SHADOW for a same-id procedure without a fork record', () => {
    const undeclared = def('series', 'draft-visuals', [STYLE])
    const r = resolveProcedures(chain([root, { ...filled(), procedures: [undeclared] }]))
    const warning = r.diagnostics.find((d) => d.code === 'UNDECLARED_SHADOW')
    expect(warning).toMatchObject({ severity: 'warning', procedure: 'draft-visuals', scope: 'series' })
    expect(byId(r, 'draft-visuals').shadowed.map((s) => s.scope)).toEqual([''])
  })

  it('does not warn when a model procedure shadows a scope procedure', () => {
    const r = resolveProcedures(chain([root]), { model: [def('model:doc', 'draft-visuals', [STYLE])] })
    expect(byId(r, 'draft-visuals').def.scope).toBe('model:doc')
    expect(byId(r, 'draft-visuals').shadowed.map((s) => s.scope)).toEqual([''])
    expect(codes(r)).not.toContain('UNDECLARED_SHADOW')
  })

  it('does not warn about the original of a fork whose original is not in the chain', () => {
    const r = resolveProcedures(chain([{ ...filled(), procedures: [fork('V_0-1-0')] }]))
    expect(codes(r)).toEqual([])
  })

  it('warns FORK_ORIGINAL_NOT_FOUND when the fork names a scope that holds no such original', () => {
    const wrongScope = def('series', 'draft-visuals', [STYLE], {
      forkOf: { procedure: 'draft-visuals', scope: 'elsewhere', version: 'V_0-2-0' },
    })
    const r = resolveProcedures(chain([root, { ...filled(), procedures: [wrongScope] }]))
    const warning = r.diagnostics.find((d) => d.code === 'FORK_ORIGINAL_NOT_FOUND')
    expect(warning).toMatchObject({ severity: 'warning', procedure: 'draft-visuals', scope: 'series' })
    expect(warning?.detail).toContain('elsewhere')
    expect(codes(r)).not.toContain('ORIGINAL_ADVANCED')
  })

  it('warns FORK_ORIGINAL_NOT_FOUND when the fork names another procedure than its own', () => {
    const wrongProcedure = def('series', 'draft-visuals', [STYLE], {
      forkOf: { procedure: 'other', scope: '', version: 'V_0-2-0' },
    })
    const r = resolveProcedures(chain([root, { ...filled(), procedures: [wrongProcedure] }]))
    expect(codes(r)).toContain('FORK_ORIGINAL_NOT_FOUND')
  })
})

describe('fills that name no procedure', () => {
  it('reports UNKNOWN_FILL_PROCEDURE for a fill table whose procedure id is defined nowhere in the chain', () => {
    const r = resolveProcedures(
      chain([
        node('', { procedures: [def('', 'known', [STYLE])] }),
        node('s', { fills: { known: { style: 'x' }, typo: { style: 'y' } } }),
      ]),
    )
    const unknown = r.diagnostics.filter((d) => d.code === 'UNKNOWN_FILL_PROCEDURE')
    expect(unknown).toHaveLength(1)
    expect(unknown[0]).toMatchObject({ severity: 'error', procedure: 'typo', scope: 's' })
  })

  it('does not report a fill for a procedure the blueprint floor defines', () => {
    const r = resolveProcedures(chain([node('s', { fills: { kit: { style: 'y' } } })], floorNode([def('bluepriNNt:kit', 'kit', [STYLE])])))
    expect(codes(r)).not.toContain('UNKNOWN_FILL_PROCEDURE')
  })
})

describe('precedence', () => {
  const sources = () => ({
    floor: floorNode([def('bluepriNNt:kit', 'status-report'), def('bluepriNNt:kit', 'only-floor')]),
    root: node('', { procedures: [def('', 'status-report'), def('', 'only-root')] }),
    alpha: node('alpha', { procedures: [def('alpha', 'status-report')] }),
  })

  it('picks the nearest scope over farther scopes and the blueprint, reporting each loser', () => {
    const { floor, root, alpha } = sources()
    const r = resolveProcedures(chain([root, alpha], floor))
    const selected = byId(r, 'status-report')
    expect(selected.def.scope).toBe('alpha')
    expect(selected.shadowed.map((s) => [s.scope, s.by])).toEqual([
      ['', 'alpha'],
      ['bluepriNNt:kit', 'alpha'],
    ])
  })

  it('lets a scope procedure outrank the blueprint', () => {
    const { floor, root } = sources()
    const r = resolveProcedures(chain([root], floor))
    expect(byId(r, 'status-report').def.scope).toBe('')
    expect(byId(r, 'status-report').shadowed.map((s) => s.scope)).toEqual(['bluepriNNt:kit'])
  })

  it('lets a model procedure outrank every scope', () => {
    const { floor, root, alpha } = sources()
    const r = resolveProcedures(chain([root, alpha], floor), { model: [def('model:m', 'status-report')] })
    expect(byId(r, 'status-report').def.scope).toBe('model:m')
    expect(byId(r, 'status-report').shadowed.map((s) => s.scope)).toEqual(['alpha', '', 'bluepriNNt:kit'])
  })

  it('accounts for every procedure found, selected or shadowed, never dropped', () => {
    const { floor, root, alpha } = sources()
    const r = resolveProcedures(chain([root, alpha], floor), { model: [def('model:m', 'status-report')] })
    // model 1 + root 2 + alpha 1 + blueprint 2
    const found = 6
    const accounted = r.procedures.length + r.procedures.reduce((n, p) => n + p.shadowed.length, 0)
    expect(accounted).toBe(found)
  })

  it('does not offer procedures above an isolate', () => {
    const { root } = sources()
    const iso = node('iso', { isolate: true, procedures: [def('iso', 'own')] })
    const r = resolveProcedures(chain([root, iso]))
    expect(r.procedures.map((p) => p.def.id)).toEqual(['own'])
  })

  it('orders the selected procedures by id', () => {
    const { floor, root, alpha } = sources()
    const r = resolveProcedures(chain([root, alpha], floor))
    expect(r.procedures.map((p) => p.def.id)).toEqual(['only-floor', 'only-root', 'status-report'])
  })
})

describe('serialization and purity', () => {
  it('round-trips through JSON with a fork, a warning and bindings', () => {
    const original = def('', 'p', [STYLE, POST], { version: 'V_0-2-0' })
    const forked = def('s', 'p', [STYLE], { forkOf: { procedure: 'p', scope: '', version: 'V_0-1-0' } })
    const r = resolveProcedures(
      chain([
        node('', { procedures: [original, def('', 'sub')] }),
        node('s', { procedures: [forked], fills: { p: { style: 'x', post_step: { procedure: 'sub' } } } }),
      ]),
    )
    expect(codes(r)).toContain('ORIGINAL_ADVANCED')
    expect(JSON.parse(JSON.stringify(r))).toStrictEqual(r)
  })

  it('is deterministic and never mutates its input', () => {
    const input = deepFreeze(
      chain(
        [node('', { procedures: [def('', 'p', [STYLE])] }), node('s', { fills: { p: { style: 'x' } } })],
        floorNode([def('bluepriNNt:kit', 'p')]),
      ),
    )
    expect(resolveProcedures(input)).toStrictEqual(resolveProcedures(input))
  })
})
