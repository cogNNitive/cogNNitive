import { ref, type Ref } from 'vue'

export interface UseTreeExpansion {
  /** Bumped by expandAll/collapseAll; positive = expand, negative = collapse (generation counter). */
  expandedGeneration: Ref<number>
  /** Per-model expand/collapse state; a missing entry means "expanded" (default). */
  expandedModels: Ref<Record<string, boolean>>
  expandAll(): void
  collapseAll(): void
  toggleModel(id: string): void
}

/** Expand/collapse-all generation counter + per-model expand/collapse toggle state (moved verbatim from LeftSidebar.vue). */
export function useTreeExpansion(): UseTreeExpansion {
  const expandedGeneration = ref(-1)
  const expandedModels = ref<Record<string, boolean>>({})

  function expandAll(): void {
    expandedGeneration.value = Math.max(0, expandedGeneration.value) + 1
  }

  function collapseAll(): void {
    expandedGeneration.value = Math.min(-1, expandedGeneration.value) - 1
  }

  function toggleModel(id: string): void {
    expandedModels.value[id] = expandedModels.value[id] === false
  }

  return { expandedGeneration, expandedModels, expandAll, collapseAll, toggleModel }
}
