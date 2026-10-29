import { readFileSync } from 'node:fs'
import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseFrontmatter, parseName, resolveBlueprintPackage } from '@cognnitive/nn-core'
import type { ScopeChain } from '@cognnitive/nn-core'

/**
 * Locates the floor of a scope chain: the bluepriNNt default that sits below every scope.
 * Only nn-mcp knows how to find a bluepriNNt package, so the core receives the result as
 * `floorDoc` and never resolves packages itself.
 *
 * The package is the one named by the `parent_spec` of the innermost values document of
 * the chain (resolved through the shared package resolver); its floor is the single
 * `_NN.md` under the package's `defaults/` folder. No package, no `defaults/` folder or no
 * document in it means there is no floor, which is not an error. More than one document
 * is: picking one would be a guess.
 */

export interface PackageOptions {
  globalDir?: string
  skillsDir?: string
}

export type FloorLocation =
  | { ok: true; floorDoc: { label: string; path: string } | null }
  | { ok: false; code: 'AMBIGUOUS_FLOOR' | 'INVALID_PARENT_SPEC' | 'FLOOR_UNREADABLE'; detail: string; path?: string }

/** Absence (no such file or folder) is "no floor"; any other I/O failure is an error. */
const isAbsence = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException | null)?.code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

const unreadable = (error: unknown) => ({
  ok: false as const,
  code: 'FLOOR_UNREADABLE' as const,
  detail: `the bluepriNNt package or its defaults/ folder could not be read (${(error as NodeJS.ErrnoException | null)?.code ?? 'unknown error'})`,
})

/** `parent_spec.name` of a document, or null when it cannot be read or names none. */
function parentSpecName(path: string): string | null {
  try {
    const fm = parseFrontmatter(readFileSync(path, 'utf-8'), () => {}) as unknown as Record<string, unknown> | null
    const parent = fm?.['parent_spec']
    const name = parent !== null && typeof parent === 'object' ? (parent as Record<string, unknown>)['name'] : undefined
    return typeof name === 'string' && name !== '' ? name : null
  } catch {
    return null
  }
}

export type FloorPackage = Awaited<ReturnType<typeof resolveBlueprintPackage>>

export type FloorPackageLocation =
  | { ok: true; pkg: NonNullable<FloorPackage> | null }
  | { ok: false; code: 'INVALID_PARENT_SPEC' | 'FLOOR_UNREADABLE'; detail: string; path?: string }

/**
 * The bluepriNNt package named by the `parent_spec` of the innermost values document of the
 * chain, or null when there is none (not an error). Shared by the floor document and the floor
 * procedures so both read the same package.
 */
export async function locateFloorPackage(chain: ScopeChain, opts: PackageOptions = {}): Promise<FloorPackageLocation> {
  const innermost = chain.links.filter((link) => link.valuesDoc !== null).at(-1)
  if (!innermost?.valuesDoc) return { ok: true, pkg: null }
  const name = parentSpecName(join(chain.root, innermost.valuesDoc))
  if (name === null) return { ok: true, pkg: null }

  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    return {
      ok: false,
      code: 'INVALID_PARENT_SPEC',
      detail: 'parent_spec.name must be a bluepriNNt name, not a path',
      path: innermost.valuesDoc,
    }
  }

  try {
    return { ok: true, pkg: (await resolveBlueprintPackage(chain.root, name, undefined, opts)) ?? null }
  } catch (error) {
    return isAbsence(error) ? { ok: true, pkg: null } : unreadable(error)
  }
}

export async function locateFloor(chain: ScopeChain, opts: PackageOptions = {}): Promise<FloorLocation> {
  const located = await locateFloorPackage(chain, opts)
  if (!located.ok) return located
  const pkg = located.pkg
  if (!pkg?.isPackageDir) return { ok: true, floorDoc: null }

  const defaults = join(pkg.packagePath, 'defaults')
  let entries: Dirent[]
  try {
    entries = await readdir(defaults, { withFileTypes: true })
  } catch (error) {
    return isAbsence(error) ? { ok: true, floorDoc: null } : unreadable(error)
  }
  const docs = entries
    .filter((e) => {
      const parsed = e.isFile() ? parseName(e.name) : null
      return parsed?.kind === 'nn' && parsed.sidecarOf === undefined
    })
    .map((e) => e.name)
    .sort()
  if (docs.length === 0) return { ok: true, floorDoc: null }
  if (docs.length > 1) {
    return {
      ok: false,
      code: 'AMBIGUOUS_FLOOR',
      detail: `package ${pkg.name} holds ${docs.length} documents under defaults/ (${docs.join(', ')}); expected one`,
    }
  }
  return { ok: true, floorDoc: { label: pkg.name, path: join(defaults, docs[0]) } }
}
