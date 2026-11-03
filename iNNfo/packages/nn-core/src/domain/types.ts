/**
 * Shared types of the domain index (design section 8). Pure and browser-safe.
 */

import type { AddressErrorCode, ModelId, Unit } from '../address/index.js'
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

export type ResolutionCode =
  | 'REF_MODEL_NOT_FOUND'
  | 'REF_ELEMENT_NOT_FOUND'
  | 'REF_CONCEPT_MISMATCH'
  | 'REF_BLUEPRINT_MISMATCH'
  | 'ADDRESS_NOT_CANONICAL'
  | AddressErrorCode

export interface ResolutionProblem {
  code: ResolutionCode
  severity: 'error' | 'warning'
  message: string
}

/** What the referencing field accepts (`target_concepts`, `target_template`); a mismatch only warns. */
export interface ResolveExpectation {
  concepts?: readonly string[]
  blueprint?: string
}

export interface ElementRef {
  concept: string
  slug: string
}

export type AddressResolution =
  | {
      ok: true
      model: IndexedModel
      /** The addressed element; for an instance model id alone, its instance root. */
      element: ElementRef | null
      unit: Unit | null
      warnings: ResolutionProblem[]
    }
  | { ok: false; problem: ResolutionProblem }

/** One instance of a concept, wherever it is stored (design A8). */
export interface CollectionMember {
  concept: string
  /** The model id for an instance root; `<model-id>@<slug>` for an element. */
  address: string
  slug: string
  modelId: ModelId
  path: string
  storage: 'distributed' | 'compact'
  /** Codes of the layout diagnostics that name this member's model; absent when clean. */
  flags?: LayoutCode[]
}
