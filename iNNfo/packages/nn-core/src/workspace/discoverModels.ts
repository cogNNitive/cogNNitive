import { basename, normalizePathKey } from '../recursiveParser/paths.js'
import {
  coreBlueprintKey,
  isExcludedPath,
  isModelCandidate,
  isUnderRootSources,
  parentSpecNameOf,
  parseName,
  roleOf,
} from '../naming/contract.js'

/**
 * A file candidate for manifest reconciliation, described by its
 * workspace-relative path and parsed frontmatter (no body content needed).
 */
export interface CandidateFile {
  path: string
  frontmatter: Record<string, unknown>
}

/**
 * Discovery predicate for candidate Level-3 model files eligible to become
 * (or remain) `## NN Models` entries in the workspace manifest.
 *
 * Model identity belongs to the naming contract (`isModelCandidate`), which
 * `list_models` / `collectModels()` call as well, so both always agree. The
 * only manifest-specific rule left here is the self-reference check.
 *
 * Host-agnostic: callers supply their own file enumeration (editor:
 * `DirectoryHandleLike` walk; MCP: Node `fs`) and frontmatter parse.
 */
export function isReconcilableModel(file: CandidateFile, manifestPath: string): boolean {
  if (!isModelCandidate(file)) return false
  if (normalizePathKey(file.path) === normalizePathKey(manifestPath)) return false
  return true
}

/** The three catalog sections the `workspace` bluepriNNt declares, each a link to one document. */
export type CatalogKind = 'sources' | 'procedures' | 'artifacts'

/** Every catalog section, in manifest order. */
export const CATALOG_KINDS: readonly CatalogKind[] = ['sources', 'procedures', 'artifacts']

/** Subfolders of the root `sources/` that hold raw material, never this domain's own catalog. */
const RAW_SOURCES_SEGMENTS: ReadonlySet<string> = new Set(['import', 'sync', 'conversations'])

function asCatalogKind(key: string): CatalogKind | null {
  return key === 'sources' || key === 'procedures' || key === 'artifacts' ? key : null
}

/** An imported domain, a synchronized source or a conversation under the root `sources/`. */
function isRawSourceTree(path: string): boolean {
  if (!isUnderRootSources(path)) return false
  const second = path.replace(/\\/g, '/').split('/')[1]
  return second !== undefined && RAW_SOURCES_SEGMENTS.has(second.toLowerCase())
}

/**
 * Discovery predicate for the catalog document a `# NN Sources`, `# NN
 * Procedures` or `# NN Artifacts` section links: the `_NN.md` document named
 * after its bluepriNNt (`sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`)
 * whose `parent_spec` binds that bluepriNNt — the naming contract's `catalog`
 * role. The document may sit anywhere the author put it, except an excluded
 * tree and the raw `sources/` subtrees, whose catalogs belong to an imported
 * domain. The kind comes from the blueprint token, never from the folder:
 * `sources/Report_sources_NN.md` is a source document, not the catalog.
 */
export function catalogKindOf(file: CandidateFile): CatalogKind | null {
  if (isExcludedPath(file.path)) return null
  if (isRawSourceTree(file.path)) return null
  const parsed = parseName(basename(file.path))
  if (parsed.kind !== 'nn' || parsed.sidecarOf !== undefined) return null
  const parentSpecName = parentSpecNameOf(file.frontmatter)
  const kind = asCatalogKind(coreBlueprintKey(parentSpecName))
  if (kind === null) return null
  if (parsed.stem.toLowerCase() !== kind) return null
  if (roleOf({ path: file.path, parentSpecName }) !== 'catalog') return null
  return kind
}
