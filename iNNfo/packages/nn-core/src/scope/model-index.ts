/**
 * Pure model index over a domain's filename namespace.
 *
 * Implements Option A of contextual-resolution L2.4:
 * - A bare stem is valid while unique in the domaiNN.
 * - An argument containing `/` is a domain-relative path.
 * - A stem shared by two or more documents produces an AMBIGUOUS_MODEL_ID error listing candidate paths.
 */

export interface ModelIndexEntry {
  /** Posix-normalized domain-relative path, e.g. "subsystems/auth/spec_NN.md" */
  readonly path: string
  /** Stem without trailing .md, e.g. "spec_NN" */
  readonly stem: string
  /** Stem without redundant _NN suffix, e.g. "spec" */
  readonly cleanStem: string
}

export interface ModelIndex {
  readonly entries: readonly ModelIndexEntry[]
  readonly byStem: ReadonlyMap<string, readonly ModelIndexEntry[]>
  readonly byCleanStem: ReadonlyMap<string, readonly ModelIndexEntry[]>
  readonly byPath: ReadonlyMap<string, ModelIndexEntry>
}

export type ModelResolution =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly code: 'AMBIGUOUS_MODEL_ID'; readonly candidates: readonly string[] }
  | { readonly ok: false; readonly code: 'MODEL_NOT_FOUND' }

export function stemOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  return base.replace(/\.md$/i, '')
}

function cleanStemOf(stem: string): string {
  let s = stem
  while (/_NN$/i.test(s)) {
    s = s.replace(/_NN$/i, '')
  }
  return s
}

function packageStemOf(path: string): string | undefined {
  const parts = path.split('/')
  if (parts.length >= 2) {
    const fileName = parts[parts.length - 1]
    if (/^spec(_NN)?(\.md)?$/i.test(fileName)) {
      const parent = parts[parts.length - 2]
      if (parent && parent !== 'specs' && parent !== 'bluepriNNts') {
        return cleanStemOf(parent)
      }
    }
  }
  return undefined
}

/**
 * Build a pure model index from a collection of domain-relative file paths.
 */
export function buildModelIndex(relativePaths: readonly string[]): ModelIndex {
  const entries: ModelIndexEntry[] = []
  const byStem = new Map<string, ModelIndexEntry[]>()
  const byCleanStem = new Map<string, ModelIndexEntry[]>()
  const byPath = new Map<string, ModelIndexEntry>()

  for (const raw of relativePaths) {
    const path = raw.replace(/\\/g, '/')
    const stem = stemOf(path)
    const cleanStem = cleanStemOf(stem)
    const entry: ModelIndexEntry = { path, stem, cleanStem }
    entries.push(entry)

    byPath.set(path.toLowerCase(), entry)

    const stemKey = stem.toLowerCase()
    const stemList = byStem.get(stemKey) ?? []
    stemList.push(entry)
    byStem.set(stemKey, stemList)

    const cleanKey = cleanStem.toLowerCase()
    const cleanList = byCleanStem.get(cleanKey) ?? []
    cleanList.push(entry)
    byCleanStem.set(cleanKey, cleanList)

    const pkg = packageStemOf(path)
    if (pkg) {
      const pkgKey = pkg.toLowerCase()
      const pkgStemList = byStem.get(pkgKey) ?? []
      if (!pkgStemList.some((e) => e.path === entry.path)) {
        pkgStemList.push(entry)
        byStem.set(pkgKey, pkgStemList)
      }
      const pkgCleanList = byCleanStem.get(pkgKey) ?? []
      if (!pkgCleanList.some((e) => e.path === entry.path)) {
        pkgCleanList.push(entry)
        byCleanStem.set(pkgKey, pkgCleanList)
      }
    }
  }

  return { entries, byStem, byCleanStem, byPath }
}

/**
 * Resolve a model identifier against the index.
 *
 * If `arg` contains `/` (or `\`), it is resolved as a domain-relative path.
 * Otherwise, it is treated as a bare stem and looked up across all entries.
 */
export function resolveModelId(index: ModelIndex, arg: string): ModelResolution {
  const normalized = arg.trim().replace(/\\/g, '/')
  if (!normalized) return { ok: false, code: 'MODEL_NOT_FOUND' }

  if (normalized.includes('/')) {
    const lower = normalized.toLowerCase()
    // 1. Direct path lookup
    const direct = index.byPath.get(lower)
    if (direct) return { ok: true, path: direct.path }

    // 2. Path with .md
    const withMd = index.byPath.get(`${lower}.md`)
    if (withMd) return { ok: true, path: withMd.path }

    // 3. Path with _NN.md
    const withNN = index.byPath.get(`${lower}_nn.md`)
    if (withNN) return { ok: true, path: withNN.path }

    // 4. Prefix / suffix variants among all entries
    const matched = index.entries.filter((e) => {
      const eLower = e.path.toLowerCase()
      if (eLower === lower) return true
      if (eLower.replace(/\.md$/i, '') === lower) return true
      if (eLower.replace(/_nn\.md$/i, '') === lower) return true
      return false
    })

    if (matched.length === 1) return { ok: true, path: matched[0].path }
    if (matched.length > 1) {
      const candidates = [...new Set(matched.map((m) => m.path))].sort()
      return { ok: false, code: 'AMBIGUOUS_MODEL_ID', candidates }
    }

    return { ok: false, code: 'MODEL_NOT_FOUND' }
  }

  // Bare stem lookup
  const bare = normalized.replace(/\.md$/i, '')
  const key = bare.toLowerCase()
  const cleanKey = cleanStemOf(bare).toLowerCase()

  const stemMatches = index.byStem.get(key) ?? []
  let matches = stemMatches
  if (matches.length === 0) {
    matches = index.byCleanStem.get(cleanKey) ?? []
  }

  // Deduplicate matched entries by path
  const unique = new Map<string, ModelIndexEntry>()
  for (const m of matches) unique.set(m.path, m)
  const candidateList = [...unique.values()]

  if (candidateList.length === 1) {
    return { ok: true, path: candidateList[0].path }
  }
  if (candidateList.length > 1) {
    const candidates = candidateList.map((m) => m.path).sort()
    return { ok: false, code: 'AMBIGUOUS_MODEL_ID', candidates }
  }

  return { ok: false, code: 'MODEL_NOT_FOUND' }
}
