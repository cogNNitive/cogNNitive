import { loadChain, loadScopeProcedures, resolveProcedures } from '@cognnitive/nn-core'
import type { ForkRecord, ProcedureDef, ProcedureDiagnostic, SlotDecl } from '@cognnitive/nn-core'
import { locateFloorProcedures } from './floor-procedures.js'
import type { PackageOptions } from './floor-doc.js'
import { locateChain, scrub } from './resolve-effective.js'
import type { ToolFailure } from './resolve-effective.js'

/**
 * `list_blueprint_procedures` with a `path`: the procedures visible from a document or scope,
 * selected and shadowed. There is no precedence logic here: scopes come from nn-core's adapters
 * (`findScopeChain`, `loadChain`, `loadScopeProcedures`), the floor from `locateFloorProcedures`,
 * and the selection from nn-core `resolveProcedures`. This module only maps its result to entries.
 */

export interface ScopedProcedure {
  id: string
  /** `blueprint` for the floor; `scope` for every folder scope, the root included. */
  source_kind: 'scope' | 'blueprint' | 'model'
  /** The scope path ('' is the root, as in `explain`) or `bluepriNNt:<package>`. */
  source: string
  doc: string
  status: 'selected' | 'shadowed'
  /** `shadowed` entries: the `source` of the entry that wins. */
  shadowed_by?: string
  slots: readonly SlotDecl[]
  fork_of?: ForkRecord
  /** Findings about this procedure (fork warnings, slot violations). Selected entries only. */
  warnings: ProcedureDiagnostic[]
}

export type ScopedProceduresResult =
  | { ok: true; procedures: ScopedProcedure[]; diagnostics: ProcedureDiagnostic[] }
  | ToolFailure

const FLOOR_PREFIX = 'bluepriNNt:'
const kindOf = (scope: string): ScopedProcedure['source_kind'] => (scope.startsWith(FLOOR_PREFIX) ? 'blueprint' : 'scope')

export async function listScopedProcedures(
  rootDir: string,
  path: string,
  opts: PackageOptions = {},
): Promise<ScopedProceduresResult> {
  const located = locateChain(rootDir, path)
  if (!located.ok) return located
  const { chain } = located

  const floor = await locateFloorProcedures(chain, opts)
  if (!floor.ok) return floor

  const load = loadChain(chain)
  if (!load.ok) {
    const { ok, code, detail, path: docPath } = load
    return { ok, code, detail: scrub(detail, rootDir), ...(docPath ? { path: docPath } : {}) }
  }
  const scoped = loadScopeProcedures(chain, load.loaded)
  const resolution = resolveProcedures({ ...scoped.loaded, floor: floor.floor })
  const diagnostics = [...floor.diagnostics, ...scoped.diagnostics, ...resolution.diagnostics]

  const defs = new Map<string, ProcedureDef>()
  for (const node of [...scoped.loaded.nodes, ...(floor.floor ? [floor.floor] : [])]) {
    for (const def of node.procedures ?? []) defs.set(`${def.scope}\0${def.doc}`, def)
  }

  const procedures: ScopedProcedure[] = []
  for (const effective of resolution.procedures) {
    const { def } = effective
    procedures.push({
      id: def.id,
      source_kind: kindOf(def.scope),
      source: def.scope,
      doc: def.doc,
      status: 'selected',
      slots: def.slots,
      ...(def.forkOf ? { fork_of: def.forkOf } : {}),
      warnings: resolution.diagnostics.filter((d) => d.procedure === def.id && d.scope === def.scope),
    })
    for (const lost of effective.shadowed) {
      const original = defs.get(`${lost.scope}\0${lost.doc}`)
      procedures.push({
        id: def.id,
        source_kind: kindOf(lost.scope),
        source: lost.scope,
        doc: lost.doc ?? '',
        status: 'shadowed',
        shadowed_by: lost.by,
        slots: original?.slots ?? [],
        ...(original?.forkOf ? { fork_of: original.forkOf } : {}),
        warnings: [],
      })
    }
  }
  return { ok: true, procedures, diagnostics }
}
