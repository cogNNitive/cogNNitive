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
  /**
   * Findings about this definition: those of its own scope, and, for the selected entry, the
   * fill violations addressed to it whichever scope supplied the fill. A shadowed entry carries
   * only the findings of its own definition (duplicate slots, malformed declarations).
   */
  warnings: ProcedureDiagnostic[]
}

export type ScopedProceduresResult =
  | { ok: true; procedures: ScopedProcedure[]; diagnostics: ProcedureDiagnostic[] }
  | ToolFailure

const FLOOR_PREFIX = 'bluepriNNt:'
const kindOf = (scope: string): ScopedProcedure['source_kind'] => (scope.startsWith(FLOOR_PREFIX) ? 'blueprint' : 'scope')

/** Stable stand-in for a bluepriNNt package folder that lies outside the domain root. */
const PACKAGE_LABEL = '<bluepriNNt>/'

/** Findings about one definition, wherever it sits: its own, not the winner's. */
const DEFINITION_CODES: ReadonlySet<ProcedureDiagnostic['code']> = new Set([
  'DUPLICATE_SLOT',
  'INVALID_SLOT_DECL',
  'INVALID_FORK_RECORD',
  'UNREADABLE_DOCUMENT',
])

/** Fill violations name the supplier scope, but they concern the procedure that receives the fill. */
const FILL_CODES: ReadonlySet<ProcedureDiagnostic['code']> = new Set([
  'UNKNOWN_SLOT',
  'FILLER_KIND_MISMATCH',
  'UNKNOWN_FILLER_PROCEDURE',
])

/** No absolute machine path leaves the tool: the root becomes domain-relative, a package folder a label. */
function scrubDiagnostic(d: ProcedureDiagnostic, rootDir: string, packageDir: string | undefined): ProcedureDiagnostic {
  let detail = scrub(d.detail, rootDir)
  if (packageDir) detail = scrub(detail, packageDir, PACKAGE_LABEL)
  if (d.code === 'UNREADABLE_DOCUMENT') {
    // The OS message embeds paths; the error code is what the caller can act on.
    const head = detail.split(' cannot be read')[0]
    const errno = /\b(E[A-Z0-9]{3,})\b/.exec(d.detail)?.[1]
    detail = `${head} cannot be read${errno ? ` (${errno})` : ''}`
  }
  return { ...d, detail }
}

export async function listScopedProcedures(
  rootDir: string,
  path: unknown,
  opts: PackageOptions = {},
): Promise<ScopedProceduresResult> {
  if (typeof path !== 'string' || path === '') {
    return { ok: false, code: 'INVALID_ARGUMENT', detail: 'path must be a non-empty string' }
  }
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
  const diagnostics = [...floor.diagnostics, ...scoped.diagnostics, ...resolution.diagnostics].map((d) =>
    scrubDiagnostic(d, rootDir, floor.packageDir),
  )

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
      warnings: diagnostics.filter((d) => d.procedure === def.id && (d.scope === def.scope || FILL_CODES.has(d.code))),
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
        warnings: diagnostics.filter((d) => d.procedure === def.id && d.scope === lost.scope && DEFINITION_CODES.has(d.code)),
      })
    }
  }
  return { ok: true, procedures, diagnostics }
}
