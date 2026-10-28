import type { ScopeChainResult, ScopeLink } from './types.js'

/** What one directory holds, as far as scope discovery cares. */
export interface DirProbe {
  /** The directory holds `domaiNN_NN.md`. */
  hasEntrypoint: boolean
  /** Documents whose frontmatter declares `scope: true`; `isolate` is true only for `isolate: true`. */
  scopeMarkers: ReadonlyArray<{ path: string; isolate: boolean }>
}

/**
 * Builds the folder chain of `startDir` without touching a filesystem. Directory names
 * are opaque keys: `probe` reports what a directory holds, `parentOf` its parent (null
 * at the top). The walk goes from `startDir` up to the nearest directory with an
 * entrypoint (the root); it never looks further, so a nested domaiNN is its own root.
 *
 * An `isolate` scope ends the chain: links above it are dropped and `cutAt` records
 * it, but the walk goes on to find the root, so an isolated scope outside any domaiNN
 * is still a miss.
 */
export function buildScopeChain(
  startDir: string,
  probe: (dir: string) => DirProbe,
  parentOf: (dir: string) => string | null,
): ScopeChainResult {
  const searched: string[] = []
  const found: ScopeLink[] = []
  let cutAt: string | null = null

  for (let dir: string | null = startDir; dir !== null; dir = parentOf(dir)) {
    searched.push(dir)
    const { hasEntrypoint, scopeMarkers } = probe(dir)
    if (scopeMarkers.length > 1 && cutAt === null) {
      return {
        ok: false,
        code: 'DUPLICATE_SCOPE_MARKER',
        dir,
        markers: scopeMarkers.map((m) => m.path),
      }
    }
    const marker = scopeMarkers[0]
    if (hasEntrypoint) {
      if (cutAt === null) {
        found.push({ dir, valuesDoc: marker?.path ?? null, kind: 'root', isolate: false })
      }
      return { ok: true, chain: { root: dir, links: found.reverse(), cutAt } }
    }
    if (marker && cutAt === null) {
      found.push({ dir, valuesDoc: marker.path, kind: 'scope', isolate: marker.isolate })
      if (marker.isolate) cutAt = dir
    }
  }
  return { ok: false, code: 'NO_DOMAIN_ROOT', searched }
}
