<script setup lang="ts">
defineProps<{
  tags: string[]
  label: string
}>()
</script>

<template>
  <div v-if="tags && tags.length > 0" class="border-t border-slate-200 dark:border-slate-700 pt-5">
    <div
      class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
    >
      <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
      {{ label }}
    </div>
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
      >
        #{{ tag }}
      </span>
    </div>
  </div>
</template>
