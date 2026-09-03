<template>
  <div data-testid="block-relationships" class="block-relationships">
    <template v-if="relationships.length > 0">
      <div
        v-for="rel in relationships"
        :key="rel.targetId"
        class="flex items-center gap-2 py-1.5 px-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
      >
        <span
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
        >
          {{ rel.label }}
        </span>
        <button
          class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer text-left truncate transition-colors"
          @click="onNavigate(rel.targetId)"
        >
          {{ rel.targetId }}
        </button>
        <span
          v-if="rel.value !== undefined && rel.value !== null"
          class="text-xs text-slate-400 dark:text-slate-500 ml-auto shrink-0"
        >
          {{ rel.value }}
        </span>
      </div>
    </template>
    <p v-else class="text-xs text-slate-400 dark:text-slate-500 italic px-3 py-2">
      No relationships defined.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ModelRelationship } from '../../model/types'

defineProps<{
  relationships: ModelRelationship[]
  onNavigate: (targetId: string) => void
}>()
</script>
