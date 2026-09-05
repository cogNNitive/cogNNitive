import { isIgnoredPath } from '../recursiveParser/workspace'
import { normalizePathKey } from '../recursiveParser/paths'

/**
 * A file candidate for manifest reconciliation, described by its
 * workspace-relative path and parsed frontmatter (no body content needed).
 */
export interface CandidateFile {
  path: string
  frontmatter: Record<string, unknown>
}

/** `<name>_NN.md` (case-insensitive), the iNNfo model filename convention. */
const NN_FILENAME_RE = /_NN\.md$/i

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

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

/** Matches `cogNNitive`, `cogNNitive_V_0-1-0`, `cogNNitive_V_0-2-0`, etc. (any version). */
function isCogNNitiveTemplate(name: string | undefined): boolean {
  return typeof name === 'string' && /^cognnitive(_|$)/i.test(name.trim())
}

/**
 * Discovery predicate for candidate Level-3 model files eligible to become
 * (or remain) `## NN ModelRef` entries in the workspace manifest.
 *
 * Host-agnostic: callers supply their own file enumeration (editor:
 * `DirectoryHandleLike` walk; MCP: Node `fs`) and frontmatter parse, then
 * filter candidates through this single shared predicate — one tested
 * implementation, not one per host.
 */
export function isReconcilableModel(file: CandidateFile, manifestPath: string): boolean {
  const { path, frontmatter } = file

  if (frontmatter['level'] !== 3) return false
  if (!frontmatter['parent_spec']) return false
  if (!NN_FILENAME_RE.test(basename(path))) return false
  if (isIgnoredPath(path)) return false
  if (normalizePathKey(path) === normalizePathKey(manifestPath)) return false
  if (isCogNNitiveTemplate(parentSpecName(frontmatter))) return false

  return true
}
