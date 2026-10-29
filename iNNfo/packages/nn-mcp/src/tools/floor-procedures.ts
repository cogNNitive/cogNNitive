import { dirname, join } from 'node:path'
import { loadDirProcedures } from '@cognnitive/nn-core'
import type { ProcedureDef, ProcedureDiagnostic, ScopeChain, ScopeNode } from '@cognnitive/nn-core'
import { locateFloorPackage } from './floor-doc.js'
import type { PackageOptions } from './floor-doc.js'

/**
 * The floor of the procedure precedence: the procedures a bluepriNNt package ships under its
 * `procedures/` folder. Only nn-mcp knows how to find a package, so the floor is built here as
 * a `ScopeNode` and handed to the core's `resolveProcedures`; the core never loads it. The
 * package is the one `locateFloor` uses (the `parent_spec` of the innermost values document).
 * No package, or a package without procedures, is no floor, which is not an error.
 */

export type FloorProcedures =
  | { ok: true; floor: ScopeNode | null; diagnostics: ProcedureDiagnostic[] }
  | { ok: false; code: 'INVALID_PARENT_SPEC' | 'FLOOR_UNREADABLE'; detail: string; path?: string }

export async function locateFloorProcedures(chain: ScopeChain, opts: PackageOptions = {}): Promise<FloorProcedures> {
  const located = await locateFloorPackage(chain, opts)
  if (!located.ok) return located
  const pkg = located.pkg
  if (!pkg) return { ok: true, floor: null, diagnostics: [] }

  // Same directory rule as the transitive asset discovery.
  const packageDir = pkg.isPackageDir ? pkg.packagePath : dirname(pkg.specFilePath)
  const id = `bluepriNNt:${pkg.name}`
  const { procedures, diagnostics } = loadDirProcedures(join(packageDir, 'procedures'), id, 'procedures')
  if (procedures.length === 0) return { ok: true, floor: null, diagnostics }
  const defs: readonly ProcedureDef[] = procedures
  return { ok: true, floor: { id, kind: 'floor', doc: null, isolate: false, values: {}, procedures: defs }, diagnostics }
}
