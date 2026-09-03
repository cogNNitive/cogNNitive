<template>
  <div
    class="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 hover:shadow-sm"
  >
    <!-- Header del concepto -->
    <div
      class="flex items-center gap-3 px-5 py-4 bg-gradient-to-r to-white dark:to-slate-900"
      :class="palette.gradient"
    >
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        :class="[palette.bg, palette.border, 'border']"
      >
        <IconRenderer :icon="resolvedIcon" custom-class="w-5 h-5" :class="palette.accent" />
      </div>
      <div>
        <div class="text-xs font-bold uppercase tracking-widest" :class="palette.accent">
          Concept
        </div>
        <div class="text-base font-bold text-slate-800 dark:text-slate-200">{{ conceptName }}</div>
      </div>
    </div>

    <!-- Body: slot con los BlockSheets -->
    <div class="bg-white dark:bg-slate-900 px-5 py-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconRenderer from './IconRenderer.vue'
import { getColorClasses } from '../../utils/colors'

const props = withDefaults(
  defineProps<{
    conceptName: string
    conceptColor?: string
    conceptIcon?: string
  }>(),
  {
    conceptColor: '',
    conceptIcon: '',
  },
)

const palette = computed(() => getColorClasses(props.conceptColor))

const resolvedIcon = computed(() => props.conceptIcon || 'layers')
</script>
