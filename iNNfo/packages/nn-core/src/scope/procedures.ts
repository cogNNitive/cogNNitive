import { resolve, visibleNodes } from './resolve.js'
import type { Candidate, LoadedChain, Supplier } from './resolve.js'
import type { JsonValue, ProcedureDef, ScopeNode, SlotDecl } from './types.js'

export interface ProcedureDiagnostic {
  code:
    | 'DUPLICATE_SLOT'
    | 'REQUIRED_SLOT_UNFILLED'
    | 'UNKNOWN_SLOT'
    | 'FILLER_KIND_MISMATCH'
    | 'UNKNOWN_FILLER_PROCEDURE'
    | 'UNKNOWN_FILL_PROCEDURE'
    | 'UNDECLARED_SHADOW'
    | 'ORIGINAL_ADVANCED'
    | 'FORK_ORIGINAL_NOT_FOUND'
    | 'INVALID_SLOT_DECL'
    | 'INVALID_FORK_RECORD'
    | 'UNKNOWN_SLOT_STEP'
    | 'UNREADABLE_DOCUMENT'
  severity: 'error' | 'warning'
  procedure: string
  /** The scope the finding is about: the supplier of a bad filler, else the defining scope. */
  scope: string
  detail: string
}

/** A slot's effective value, who supplied it, and the fills it displaced (nearest first). */
export interface Binding {
  value: JsonValue
  from: Supplier
  shadowed: Candidate[]
}

/** A definition that lost to a nearer one of the same id. */
export interface ShadowedProcedure extends Supplier {
  version: string | null
  /** The scope whose definition displaced it. */
  by: string
}

export interface EffectiveProcedure {
  def: ProcedureDef
  /** One entry per bound slot, in declaration order. */
  bindings: Record<string, Binding>
  /** Same-id definitions found in farther sources, nearest first. */
  shadowed: ShadowedProcedure[]
}

export interface ProcedureResolution {
  /** One per procedure id, sorted by id. */
  procedures: EffectiveProcedure[]
  diagnostics: ProcedureDiagnostic[]
}

const isProcedureRef = (v: JsonValue): v is { procedure: string } =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  typeof v['procedure'] === 'string' &&
  Object.keys(v).length === 1

const supplierOf = (n: ScopeNode): Supplier => ({ scope: n.id, doc: n.doc })

function duplicateSlots(def: ProcedureDef): string[] {
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const slot of def.slots) {
    if (seen.has(slot.name)) dups.add(slot.name)
    seen.add(slot.name)
  }
  return [...dups]
}

/**
 * Pure composition of procedures over the chain. Precedence, in code: a model's own
 * procedure, then the nearest scope outward to the root, then the blueprint (the floor);
 * the first of an id is selected and every other definition of it is listed as shadowed,
 * so selected plus shadowed always equals the procedures found. Slots are filled per slot
 * by the nearest scope (the `override` fold of \`resolve\`); the contract of each slot is
 * checked and every violation is reported, never ignored or coerced.
 */
export function resolveProcedures(
  loaded: LoadedChain,
  opts: { model?: readonly ProcedureDef[] } = {},
): ProcedureResolution {
  const visible = visibleNodes(loaded.nodes).nodes
  const model = opts.model ?? []
  const nearToFar: ScopeNode[] = [...visible].reverse()
  if (loaded.floor) nearToFar.push(loaded.floor)

  const candidates: ProcedureDef[] = [...model, ...nearToFar.flatMap((n) => n.procedures ?? [])]
  const modelDefs = new Set<ProcedureDef>(model)
  const groups = new Map<string, ProcedureDef[]>()
  for (const def of candidates) groups.set(def.id, [...(groups.get(def.id) ?? []), def])

  const diagnostics: ProcedureDiagnostic[] = []
  for (const def of candidates) {
    for (const name of duplicateSlots(def)) {
      diagnostics.push({
        code: 'DUPLICATE_SLOT',
        severity: 'error',
        procedure: def.id,
        scope: def.scope,
        detail: `Procedure "${def.id}" declares the slot "${name}" more than once.`,
      })
    }
  }

  const selectedIds = new Set(groups.keys())
  const fillSources = [...nearToFar].reverse()
  for (const source of fillSources) {
    for (const id of Object.keys(source.fills ?? {})) {
      if (selectedIds.has(id)) continue
      diagnostics.push({
        code: 'UNKNOWN_FILL_PROCEDURE',
        severity: 'error',
        procedure: id,
        scope: source.id,
        detail: `Scope "${source.id}" fills procedure "${id}", which is not defined in its chain.`,
      })
    }
  }
  const procedures = [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, defs]): EffectiveProcedure => {
      const [def, ...losers] = defs
      const shadowed = losers.map((l) => ({ scope: l.scope, doc: l.doc, version: l.version, by: def.scope }))
      checkShadow(def, shadowed, modelDefs.has(def), diagnostics)
      const bindings = bindSlots(def, fillSources, visible, loaded.floor, selectedIds, diagnostics)
      return { def, bindings, shadowed }
    })
  return { procedures, diagnostics }
}

function checkShadow(
  def: ProcedureDef,
  shadowed: ShadowedProcedure[],
  fromModel: boolean,
  diagnostics: ProcedureDiagnostic[],
): void {
  if (fromModel) return
  const fork = def.forkOf
  if (!fork) {
    if (shadowed.length === 0) return
    diagnostics.push({
      code: 'UNDECLARED_SHADOW',
      severity: 'warning',
      procedure: def.id,
      scope: def.scope,
      detail: `Procedure "${def.id}" in "${def.scope}" replaces the one in ${shadowed.map((s) => `"${s.scope}"`).join(', ')} without a fork record.`,
    })
    return
  }
  // Shadowed entries share the id of `def`, so a fork naming another procedure matches none.
  const original = fork.procedure === def.id ? shadowed.find((s) => s.scope === fork.scope) : undefined
  if (!original) {
    // A fork whose original is simply not in the chain (nothing shadowed) is not an error.
    if (fork.procedure === def.id && shadowed.length === 0) return
    diagnostics.push({
      code: 'FORK_ORIGINAL_NOT_FOUND',
      severity: 'warning',
      procedure: def.id,
      scope: def.scope,
      detail: `Fork "${def.id}" in "${def.scope}" names the original "${fork.procedure}" in "${fork.scope}", which is not among the procedures it replaces.`,
    })
    return
  }
  if (original.version !== fork.version) {
    diagnostics.push({
      code: 'ORIGINAL_ADVANCED',
      severity: 'warning',
      procedure: def.id,
      scope: def.scope,
      detail: `Fork "${def.id}" in "${def.scope}" was made from version ${fork.version} but the original in "${fork.scope}" is at ${original.version ?? 'no version'}.`,
    })
  }
}

type Accepted = Map<string, Map<string, JsonValue>>

/** Splits the fills addressed to `def` into accepted ones and reported violations. */
function acceptFills(
  def: ProcedureDef,
  fillSources: readonly ScopeNode[],
  selectedIds: ReadonlySet<string>,
  diagnostics: ProcedureDiagnostic[],
): Accepted {
  const accepted: Accepted = new Map()
  const report = (code: ProcedureDiagnostic['code'], scope: string, detail: string) =>
    diagnostics.push({ code, severity: 'error', procedure: def.id, scope, detail })

  for (const source of fillSources) {
    for (const [slotName, filler] of Object.entries(source.fills?.[def.id] ?? {})) {
      const slot: SlotDecl | undefined = def.slots.find((s) => s.name === slotName)
      if (!slot) {
        report('UNKNOWN_SLOT', source.id, `Scope "${source.id}" fills the slot "${slotName}", which procedure "${def.id}" does not declare.`)
        continue
      }
      const isRef = isProcedureRef(filler)
      if ((slot.kind === 'procedure') !== isRef) {
        report(
          'FILLER_KIND_MISMATCH',
          source.id,
          `Slot "${slotName}" of "${def.id}" takes ${slot.kind === 'procedure' ? 'a { procedure } reference' : 'a plain value'}, but scope "${source.id}" supplies ${isRef ? 'a procedure reference' : 'a plain value'}.`,
        )
        continue
      }
      if (isRef && !selectedIds.has(filler.procedure)) {
        report(
          'UNKNOWN_FILLER_PROCEDURE',
          source.id,
          `Scope "${source.id}" fills slot "${slotName}" of "${def.id}" with procedure "${filler.procedure}", which is not defined in its chain.`,
        )
        continue
      }
      const bySlot = accepted.get(source.id) ?? new Map<string, JsonValue>()
      bySlot.set(slotName, filler)
      accepted.set(source.id, bySlot)
    }
  }
  return accepted
}

function bindSlots(
  def: ProcedureDef,
  fillSources: readonly ScopeNode[],
  visible: readonly ScopeNode[],
  floor: ScopeNode | null,
  selectedIds: ReadonlySet<string>,
  diagnostics: ProcedureDiagnostic[],
): Record<string, Binding> {
  const accepted = acceptFills(def, fillSources, selectedIds, diagnostics)
  const bindings: Record<string, Binding> = {}
  for (const slot of def.slots) {
    // The same `override` fold as values: one synthetic node per scope holding only its accepted filler.
    const asNode = (n: ScopeNode): ScopeNode => {
      const filler = accepted.get(n.id)?.get(slot.name)
      return { id: n.id, kind: n.kind, doc: n.doc, isolate: n.isolate, values: filler === undefined ? {} : { [slot.name]: filler } }
    }
    const result = resolve({ floor: floor ? asNode(floor) : null, nodes: visible.map(asNode) }, slot.name, 'override')
    if (!result.ok) continue
    if (result.present && result.explain.winner) {
      bindings[slot.name] = { value: result.value, from: result.explain.winner, shadowed: result.explain.overridden }
    } else if (slot.default !== undefined) {
      bindings[slot.name] = { value: slot.default, from: { scope: def.scope, doc: def.doc }, shadowed: [] }
    } else if (slot.required) {
      diagnostics.push({
        code: 'REQUIRED_SLOT_UNFILLED',
        severity: 'error',
        procedure: def.id,
        scope: def.scope,
        detail: `Slot "${slot.name}" of procedure "${def.id}" is required and no scope in the chain fills it.`,
      })
    }
  }
  return bindings
}
