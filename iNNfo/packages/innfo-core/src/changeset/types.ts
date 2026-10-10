/**
 * Changeset data models, types, and interfaces.
 * Normative document model for changesets conforming to blueprint 'changes'.
 */

export type ChangeOp =
  | 'update_field'
  | 'add_element'
  | 'remove_element'
  | 'rename_element'
  | 'rename_concept'
  | 'update_matrix_cell'
  | 'comment'

export type ChangeStatus =
  | 'proposed'
  | 'applied'
  | 'partially_applied'
  | 'rejected'
  | 'conflict'

export interface ChangeItem {
  id: string
  op: ChangeOp
  /** Canonical D5 target address: model@element&field or model@matrix&row&col or model@concept */
  target: string
  from?: string
  to?: string
  concept?: string
  name?: string
  slug?: string
  fields?: Record<string, string>
  author?: string
  notes?: string
  /** Execution / Resolution annotations (excluded from proposal_sha) */
  status?: ChangeStatus
  resolution?: string
  resolved_slug?: string
}

export interface ModelVersionTransition {
  base_version: string
  result_version: string
}

export interface ChangesetFrontmatter {
  spec_version: string
  parent_spec: 'changes' | string
  blueprint_version: string
  status: ChangeStatus
  /** Deterministic SHA-256 seal computed over canonical proposed changes */
  proposal_sha: string
  applied_at?: string
  /** Map of affected model slugs to base and result versions */
  models?: Record<string, ModelVersionTransition>
  title?: string
  author?: string
  workspace_id?: string
  [key: string]: unknown
}

export interface ChangesetDocument {
  frontmatter: ChangesetFrontmatter
  changes: ChangeItem[]
  rawContent?: string
}

export interface ChangesetApplyResult {
  success: boolean
  changesetPath: string
  changeset?: string
  status: ChangeStatus
  models: Record<string, ModelVersionTransition>
  appliedCount: number
  conflictedCount?: number
  errors?: Array<{ path: string; message: string; code?: string }>
  warnings?: Array<{ path: string; message: string }>
}

export function isChangeStatus(val: unknown): val is ChangeStatus {
  return (
    typeof val === 'string' &&
    ['proposed', 'applied', 'partially_applied', 'rejected', 'conflict'].includes(val)
  )
}

export function isChangeOp(val: unknown): val is ChangeOp {
  return (
    typeof val === 'string' &&
    [
      'update_field',
      'add_element',
      'remove_element',
      'rename_element',
      'rename_concept',
      'update_matrix_cell',
      'comment',
    ].includes(val)
  )
}

export function isPartiallyApplied(statusOrResult: ChangeStatus | { status?: ChangeStatus | string }): boolean {
  if (typeof statusOrResult === 'string') {
    return statusOrResult === 'partially_applied'
  }
  return statusOrResult?.status === 'partially_applied'
}

export function isApplied(statusOrResult: ChangeStatus | { status?: ChangeStatus | string }): boolean {
  if (typeof statusOrResult === 'string') {
    return statusOrResult === 'applied'
  }
  return statusOrResult?.status === 'applied'
}

export function hasConflicts(result: { status?: ChangeStatus | string; conflictedCount?: number }): boolean {
  return result?.status === 'conflict' || (result?.conflictedCount !== undefined && result.conflictedCount > 0)
}

export interface SnapshotRecord {
  modelStem: string
  baseVersion: string
  timestamp: string
  changesetStem: string
  archivePath: string
}

export interface LockPayload {
  pid: number
  timestamp: number
  changeset: string
}

export interface LockHandle {
  lockPath: string
  payload: LockPayload
  release: () => Promise<void>
}
