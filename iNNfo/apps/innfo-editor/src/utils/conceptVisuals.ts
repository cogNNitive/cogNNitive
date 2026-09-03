import { FileText, Folder, Scale, ListChecks, GitCommit, HelpCircle } from 'lucide-vue-next'
import type { Component } from 'vue'

export type ConceptType =
  'text' | 'category' | 'weight' | 'steps' | 'sequence' | null | undefined | string

/**
 * Maps a concept TYPE to its representative Lucide icon.
 * This is the visual language of the "mold" — what kind of thing a concept is,
 * independent of any specific instance.
 */
export const getConceptTypeIcon = (type: ConceptType): Component => {
  switch (type) {
    case 'text':
      return FileText
    case 'category':
      return Folder
    case 'weight':
      return Scale
    case 'steps':
      return ListChecks
    case 'sequence':
      return GitCommit
    default:
      return HelpCircle
  }
}

/**
 * Semantic kind of a pill/block. Each kind maps to one of three fill tiers
 * (see useBlockVisuals.ts `containerClasses`):
 * - `concept`  → root identity (the mold). Solid fill, own color.
 * - `model`    → root identity (a file). Solid fill, own color.
 * - `source`   → file reference, fixed neutral color. White fill, firm outline.
 * - `artifact` → file reference, fixed neutral color. White fill, firm outline.
 * - `instance` → an instance of a concept (e.g. an Element). No fill, soft
 *   50%-opacity outline in the parent concept's color.
 */
export type BlockKind = 'concept' | 'instance' | 'model' | 'artifact' | 'source'
