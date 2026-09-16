/**
 * App re-export — validation check types now live in @cognnitive/innfo-core.
 * This file preserves import paths for existing app code.
 */
export type { ValidationCheck, ValidationSummary, ValidationReport } from '@cognnitive/innfo-core'

/** Recent folder entry stored in IndexedDB-backed history. */
export interface FolderHistoryEntry {
  name: string
  handleKey: string
  timestamp: number
  path?: string
  /**
   * False for workspaces opened through the `webkitdirectory` fallback
   * (no File System Access handle exists to reopen it with). Defaults to
   * true (reopenable) when absent, for entries created before this field
   * existed (F-13).
   */
  reopenable?: boolean
}

/** Onboarding sample model entry. */
export interface SampleFolder {
  id: string
  name: string
  description: string
  mode: string
  path: string
  items: number
}
