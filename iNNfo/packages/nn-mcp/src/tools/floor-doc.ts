import { readFileSync } from 'node:fs'
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
  | { ok: false; code: 'AMBIGUOUS_FLOOR'; detail: string }

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

export async function locateFloor(chain: ScopeChain, opts: PackageOptions = {}): Promise<FloorLocation> {
  const innermost = chain.links.filter((link) => link.valuesDoc !== null).at(-1)
  if (!innermost?.valuesDoc) return { ok: true, floorDoc: null }
  const name = parentSpecName(join(chain.root, innermost.valuesDoc))
  if (name === null) return { ok: true, floorDoc: null }

  const pkg = await resolveBlueprintPackage(chain.root, name, undefined, opts).catch(() => null)
  if (!pkg?.isPackageDir) return { ok: true, floorDoc: null }

  const defaults = join(pkg.packagePath, 'defaults')
  const entries = await readdir(defaults, { withFileTypes: true }).catch(() => [])
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
