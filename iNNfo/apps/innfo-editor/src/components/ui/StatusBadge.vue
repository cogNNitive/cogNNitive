<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      statusClasses,
    ]"
  >
    <span :class="['h-1.5 w-1.5 rounded-full', dotClass]"></span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'unsaved' | 'synced'
}>()

const statusClasses = computed(() =>
  props.status === 'unsaved'
    ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
    : 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
)

const dotClass = computed(() => (props.status === 'unsaved' ? 'bg-amber-600' : 'bg-emerald-600'))
</script>
