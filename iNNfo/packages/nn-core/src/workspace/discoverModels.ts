import { normalizePathKey } from '../recursiveParser/paths.js'
import { isModelCandidate } from '../naming/contract.js'

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
