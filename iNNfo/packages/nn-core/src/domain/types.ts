/**
 * Shared types of the domain index (design section 8). Pure and browser-safe.
 */

import type { ModelId } from '../address/index.js'
import type { ConceptStorage } from '../schema/storage.js'

/** One discovered model, as plain data. `path` is domain-relative POSIX. */
export interface DomainModelInput {
  path: string
  frontmatter: Record<string, unknown>
  elements: ReadonlyArray<{ concept: string; slug: string }>
}

/** Declared concept storage of the bluepriNNt a model pins, or null when it cannot be resolved. */
export type StorageDeclarationsResolver = (parentSpec: {
  name: string
  url?: string
}) => ReadonlyMap<string, ConceptStorage> | null

export type LayoutCode =
  | 'PLACEMENT_MISMATCH'
  | 'INSTANCE_NAME_MISMATCH'
  | 'INSTANCE_SLUG_MISMATCH'
  | 'CONTAINER_MISSING'
  | 'DUPLICATE_MODEL_ID'
  | 'DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL'
  | 'MIXED_INSTANCE_MODEL'
  | 'MODEL_UNADDRESSABLE'
  | 'RESERVED_MODEL_ID'
  | 'MODEL_ID_INVALID'
  | 'INSTANCE_SHADOWS_ELEMENT_ASSETS'
  | 'BLUEPRINT_VERSION_SKEW'

/** Message shape: `<CODE>: <subject> - <what is wrong>; <fix>`. */
export interface LayoutDiagnostic {
  code: LayoutCode
  severity: 'error' | 'warning'
  message: string
  /** Every path involved (never empty for a model-bound finding). */
  paths: string[]
  id?: string
  meta?: Record<string, unknown>
}

export type ModelStorage =
  | { kind: 'compact' }
  | { kind: 'instance'; concept: string; container: ModelId | null; slug: string }

export interface IndexedModel {
  id: ModelId
  path: string
  blueprint: { name: string; version: string | null }
  storage: ModelStorage
}
