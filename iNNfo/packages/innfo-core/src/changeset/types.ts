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
  /**
   * Content hash of the target element when the change was written (the console's
   * element `hash`). A different current hash is a precondition failure. Optional:
   * absent means the change is not guarded by element content.
   */
  base_hash?: string
  concept?: string
  name?: string
  slug?: string
  fields?: Record<string, string>
  author?: string
  notes?: string
  /**
   * Evidence citation written by the proposer at proposal time, in the shared
   * citation grammar (`<path>@## <Heading>`, `<csv>@<row>`, `<json>@/<pointer>`,
   * or a bare path). Sealed into `proposal_sha`; apply never writes it.
   */
  sources?: string
  /** Execution / Resolution annotations (excluded from proposal_sha) */
  status?: ChangeStatus
  resolution?: string
  resolved_slug?: string
  /** Citations this change replaced, recorded at apply time (excluded from proposal_sha) */
  replaced_sources?: string
}

export interface ModelVersionTransition {
  base_version: string
  result_version: string
}

export interface ChangesetParentSpec {
  name: 'changes'
  url: string
}

export interface ChangesetFrontmatter {
  spec_version: string
  /** A changeset is a valid iNNfo Level-3 document. */
  level: 3
  parent_spec: ChangesetParentSpec
  blueprint_version: string
  status: ChangeStatus
  /**
   * Deterministic SHA-256 seal computed over canonical proposed changes.
   * Absent only on an unsealed proposal; the apply engine seals it at intake.
   */
  proposal_sha?: string
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
