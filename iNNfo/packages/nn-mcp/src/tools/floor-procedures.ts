import { dirname, join } from 'node:path'
import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { loadDirProcedures, resolveBlueprintPackage } from '@cognnitive/nn-core'
import type { ProcedureDef, ProcedureDiagnostic, ScopeChain, ScopeNode } from '@cognnitive/nn-core'
import { locateFloorPackage } from './floor-doc.js'
import type { FloorPackage, PackageOptions } from './floor-doc.js'

/**
 * The floor of the procedure precedence: the procedures a bluepriNNt package ships under its
 * `procedures/` folder. Only nn-mcp knows how to find a package, so the floor is built here as
 * a `ScopeNode` and handed to the core's `resolveProcedures`; the core never loads it. The
 * package is the one `locateFloor` uses (the `parent_spec` of the innermost values document),
 * or the one the caller names: `procedure_start` names the single installed package that
 * declares the id it was asked for. No package, or a package without procedures, is no floor,
 * which is not an error.
 */

export type FloorProcedures =
  | { ok: true; floor: ScopeNode | null; diagnostics: ProcedureDiagnostic[]; packageDir?: string }
  | { ok: false; code: 'INVALID_PARENT_SPEC' | 'FLOOR_UNREADABLE'; detail: string; path?: string }

/** The folder a resolved package lives in, versioned sub-folder included. */
const packageDirOf = (pkg: NonNullable<FloorPackage>): string =>
  pkg.isPackageDir ? pkg.packagePath : dirname(pkg.specFilePath)

/** The floor a package ships: its `procedures/` folder as one `ScopeNode`, or none. */
function floorOf(pkg: NonNullable<FloorPackage>): FloorProcedures {
  const packageDir = packageDirOf(pkg)
  const id = `bluepriNNt:${pkg.name}`
  const { procedures, diagnostics } = loadDirProcedures(
    join(packageDir, 'procedures'),
    id,
    'procedures',
  )
  if (procedures.length === 0) return { ok: true, floor: null, diagnostics, packageDir }
  const defs: readonly ProcedureDef[] = procedures
  return {
    ok: true,
    floor: { id, kind: 'floor', doc: null, isolate: false, values: {}, procedures: defs },
    diagnostics,
    packageDir,
  }
}

export async function locateFloorProcedures(
  chain: ScopeChain,
  opts: PackageOptions = {},
  packageName?: string,
): Promise<FloorProcedures> {
  let pkg: NonNullable<FloorPackage> | null
  if (packageName === undefined) {
    const located = await locateFloorPackage(chain, opts)
    if (!located.ok) return located
    pkg = located.pkg
  } else {
    try {
      pkg = await resolveBlueprintPackage(chain.root, packageName, undefined, opts)
    } catch {
      return {
        ok: false,
        code: 'FLOOR_UNREADABLE',
        detail: `the bluepriNNt package "${packageName}" could not be read`,
      }
    }
  }
  if (!pkg) return { ok: true, floor: null, diagnostics: [] }
  return floorOf(pkg)
}

export interface InstalledProcedures {
  /** The package name, which is also the `bluepriNNt:<name>` address prefix. */
  name: string
  procedures: readonly ProcedureDef[]
}

/**
 * The procedures every bluepriNNt package installed in the domaiNN (`specs/bluepriNNts/<name>/`)
 * ships. The last step of the `procedure_start` precedence asks which installed package
 * declares an id that no scope and no `parent_spec` floor supplies; the packages are read with
 * the floor's own rule, so a procedure the floor cannot see is not a candidate here either.
 */
export async function listInstalledProcedures(
  rootDir: string,
  opts: PackageOptions = {},
): Promise<InstalledProcedures[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(join(rootDir, 'specs', 'bluepriNNts'), { withFileTypes: true })
  } catch {
    return []
  }
  const installed: InstalledProcedures[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    let pkg: NonNullable<FloorPackage> | null
    try {
      pkg = await resolveBlueprintPackage(rootDir, entry.name, undefined, opts)
    } catch {
      continue
    }
    if (!pkg) continue
    const packageDir = packageDirOf(pkg)
    // Two folder names that resolve to one package are one candidate, never two.
    if (seen.has(packageDir)) continue
    seen.add(packageDir)
    const { procedures } = loadDirProcedures(
      join(packageDir, 'procedures'),
      `bluepriNNt:${pkg.name}`,
      'procedures',
    )
    if (procedures.length > 0) installed.push({ name: pkg.name, procedures })
  }
  return installed
}
