import { isIgnoredPath } from '../recursiveParser/workspace'
import { normalizePathKey, basename } from '../recursiveParser/paths'

/**
 * A file candidate for manifest reconciliation, described by its
 * workspace-relative path and parsed frontmatter (no body content needed).
 */
export interface CandidateFile {
  path: string
  frontmatter: Record<string, unknown>
}

/** `<name>_NN.md` (case-insensitive), the iNNfo model filename convention. */
export const NN_FILENAME_RE = /_NN\.md$/i

/** Reads `frontmatter.parent_spec.name`, tolerating a bare-string `parent_spec`. */
function parentSpecName(frontmatter: Record<string, unknown>): string | undefined {
  const parentSpec = frontmatter['parent_spec']
  if (!parentSpec) return undefined
  if (typeof parentSpec === 'string') return parentSpec
  if (typeof parentSpec === 'object') {
    const name = (parentSpec as { name?: unknown }).name
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}

/**
 * Matches lineage-record templates: `cogNNitive`, `cogNNitive_V_0-1-0`,
 * `workspace`, `workspace_V_0-2-0`, `workspace_V_0-3-0_spec_NN`, etc.
 * (any version, any suffix). These are non-navigation records — they must
 * never surface as manifest reconciliation candidates.
 */
function isCogNNitiveTemplate(name: string | undefined): boolean {
  return typeof name === 'string' && /^(cognnitive|workspace)(_|$)/i.test(name.trim())
}

/**
 * Structural predicate for "is this file an iNNfo model at all": a
 * level-3 document with a resolvable `parent_spec`, named `*_NN.md`, and not
 * sitting inside an ignored directory (`backups/`, `archive/`, `specs/`).
 *
 * This is the ONE shared discoverability rule for `collectModels()`
 * (`list_models`) and `isReconcilableModel()` (manifest reconciliation).
 * Manifest-specific exclusions (self-reference, cogNNitive lineage-record
 * templates) do NOT belong here — they are meaningless without a manifest
 * and would incorrectly hide legitimate workspace documents from
 * `list_models` (see H6 design notes).
 */
export function isDiscoverableModel(file: CandidateFile): boolean {
  const { path, frontmatter } = file

  if (frontmatter['level'] !== 3) return false
  if (!frontmatter['parent_spec']) return false
  if (!NN_FILENAME_RE.test(basename(path))) return false
  if (isIgnoredPath(path)) return false

  return true
}

/**
 * Discovery predicate for candidate Level-3 model files eligible to become
 * (or remain) `## NN Models` entries in the workspace manifest.
 *
 * Host-agnostic: callers supply their own file enumeration (editor:
 * `DirectoryHandleLike` walk; MCP: Node `fs`) and frontmatter parse, then
 * filter candidates through this single shared predicate — one tested
 * implementation, not one per host.
 */
export function isReconcilableModel(file: CandidateFile, manifestPath: string): boolean {
  const { path, frontmatter } = file

  if (!isDiscoverableModel(file)) return false
  if (normalizePathKey(path) === normalizePathKey(manifestPath)) return false
  if (isCogNNitiveTemplate(parentSpecName(frontmatter))) return false

  return true
}
