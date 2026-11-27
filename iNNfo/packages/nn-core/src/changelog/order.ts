/**
 * The one deterministic order over changes (change-provenance: One shared
 * deterministic comparator).
 *
 * Every provenance consumer — value history, field origin, matrix cell origin,
 * drift, the console payload and the console review — sorts with
 * `compareChanges`. Keep this the ONLY ordering of changes in the codebase.
 */

import { changesetStampOf } from '../naming/contract.js'

/** The fields the comparator reads. A `LoggedChange` satisfies it structurally. */
export interface ChangeOrderKey {
  /** `applied_at` of the change, else of its changeset (ISO-8601 UTC). */
  appliedAt?: string
  /** Workspace-relative changeset path, POSIX separators. */
  changeset: string
  /** Zero-based index of the change inside the changeset. */
  index: number
  /**
   * Zero-based position of a unit inside one change that the log expands into
   * several entries (an applied `set_fields`, one entry per field). Absent otherwise.
   */
  subIndex?: number
}

/** The UTC stamp a changeset filename carries, `''` when it carries none. */
export function changeStamp(changeset: string): string {
  return changesetStampOf(String(changeset ?? ''))?.stamp ?? ''
}

/** The `-<seq>` a changeset filename carries within its second, `1` when none. */
function changeSeq(changeset: string): number {
  return changesetStampOf(String(changeset ?? ''))?.seq ?? 1
}

/** Lexicographic comparison, never `localeCompare` (locale-dependent order). */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Total order: `applied_at`, then the filename UTC stamp and its `-<seq>`, then the changeset
 * filename, then the document index, then the unit position inside an expanded
 * change. Two distinct log entries never compare equal.
 */
export function compareChanges(a: ChangeOrderKey, b: ChangeOrderKey): number {
  const byAppliedAt = compareStrings(a.appliedAt ?? '', b.appliedAt ?? '')
  if (byAppliedAt !== 0) return byAppliedAt

  const byStamp = compareStrings(changeStamp(a.changeset), changeStamp(b.changeset))
  if (byStamp !== 0) return byStamp

  // Same second: the `-<seq>` suffix orders numerically (`-10` after `-2`, bare after none).
  const bySeq = changeSeq(a.changeset) - changeSeq(b.changeset)
  if (bySeq !== 0) return bySeq

  const byFile = compareStrings(a.changeset, b.changeset)
  if (byFile !== 0) return byFile

  const byIndex = a.index - b.index
  if (byIndex !== 0) return byIndex

  return (a.subIndex ?? -1) - (b.subIndex ?? -1)
}
