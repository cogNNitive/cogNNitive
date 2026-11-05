import type { VersionGap, VersionStatus } from '../../workspace/integrity/versionStatus.js'

/**
 * The mutation operations a lineage reconciliation introduces. `rename_concept`
 * already exists in `CHANGE_OPS` and is reused as is; these three are new and
 * are promoted into the shared contract in the lineage-mutation batch.
 */
export type LineageMutationOp = 'repin_blueprint' | 'rename_field' | 'set_field_default'

/**
 * The minimum a caller must supply per Level-3 model: its workspace-relative
 * path and the URL it is pinned to. Pure input — the audit never reads the disk.
 */
export interface LineageModelInput {
  /** Workspace-relative path, posix separators. */
  path: string
  /** `parent_spec.url`, or null when the model declares no pin. */
  parentUrl: string | null
}

/**
 * The canonical lineage classification. It mirrors `VersionStatus` but uses the
 * canonical vocabulary (`update-available`, never `upgrade-available`), so the
 * new surface never ships a retired term. The legacy value stays in
 * `versionStatus.ts` untouched until the preflight rename lands.
 */
export type LineageStatus =
  | 'current'
  | 'update-available'
  | 'ahead'
  | 'unlisted'
  | 'unpinned'
  | 'unknown'

/** One model's classification against the catalog, in audit order. */
export interface LineageAuditEntry {
  path: string
  /** The pin the classification was computed from. */
  parentUrl: string | null
  blueprint: string | null
  pinned: string | null
  adopted: string | null
  status: LineageStatus
  gap: VersionGap
}

/** Two or more models in the domain pinning different versions of one blueprint. */
export interface BlueprintSkew {
  blueprint: string
  /** Distinct pinned versions, ascending. */
  pinnedVersions: string[]
  /** Every model pinned to one of those versions, sorted. */
  members: string[]
}

/**
 * A read-only scan result. `offline` is true when no catalog was available, in
 * which case every entry degrades to `unknown` and no unit can be planned.
 */
export interface LineageAuditResult {
  entries: LineageAuditEntry[]
  offline: boolean
  skews: BlueprintSkew[]
}

/**
 * The atomic unit of reconciliation: every model in the domain that pins one
 * blueprint. Never an individual model.
 */
export interface ReconciliationUnit {
  blueprint: string
  /** The catalog `adopted` version this unit moves to. */
  targetVersion: string | null
  /** Distinct versions currently pinned across members, ascending. */
  pinnedVersions: string[]
  /** Workspace-relative model paths, sorted. */
  members: string[]
  hasSkew: boolean
}

/**
 * The approved plan shape. `planHash` is a deterministic fingerprint of the
 * units as planned; `isPlanFresh` recomputes it against the current workspace.
 */
export interface ReconciliationPlan {
  units: ReconciliationUnit[]
  planHash: string
  offline: boolean
}
