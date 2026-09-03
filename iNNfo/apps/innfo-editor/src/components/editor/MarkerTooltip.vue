<template>
  <div
    ref="triggerEl"
    class="relative inline-flex items-center justify-center"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
  >
    <slot></slot>

    <Teleport to="body">
      <Transition name="fade-fast">
        <div
          v-if="visible"
          :style="tooltipStyle"
          class="fixed z-[999] w-80 bg-slate-900 dark:bg-slate-950 text-slate-100 border border-slate-800 dark:border-slate-850 rounded-xl shadow-2xl p-4 text-xs pointer-events-none transition-all duration-200 select-none"
        >
          <!-- Header: Emoji, Name, Score indicator -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5 font-semibold text-sm">
              <IconRenderer
                :icon="marker.icon"
                fallback="help-circle"
                custom-class="w-4 h-4 text-indigo-400 shrink-0"
              />
              <span class="capitalize text-slate-200">{{ marker.name }}</span>
            </div>

            <!-- Score Visualizer (0-3 dots) -->
            <div class="flex items-center gap-1">
              <span class="text-xs text-slate-400 mr-1">Value: {{ score }}/3</span>
              <div
                v-for="i in 3"
                :key="i"
                class="w-2 h-2 rounded-full transition-colors duration-150"
                :class="[i <= score ? getActiveDotClass(marker.name) : 'bg-slate-700']"
              ></div>
            </div>
          </div>

          <!-- Score Meaning (Text) -->
          <div class="text-xs text-slate-400 font-medium mb-2">
            Rating: <span class="text-slate-300 font-semibold">{{ getScoreLabel(score) }}</span>
          </div>

          <!-- Possible values scale -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 shrink-0"
              >Values</span
            >
            <div class="flex items-center gap-1 flex-wrap justify-end">
              <span
                v-for="level in valueScale"
                :key="level.value"
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors"
                :class="
                  level.value === score
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600'
                    : 'text-slate-500 border-slate-800'
                "
              >
                {{ level.value }} {{ level.label }}
              </span>
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-slate-800 my-2"></div>

          <!-- Description -->
          <p class="text-slate-300 leading-relaxed mb-3 text-xs">
            {{ marker.description }}
          </p>

          <!-- Guidelines -->
          <div v-if="formattedGuidelines && formattedGuidelines.length" class="mb-3">
            <div class="text-xs uppercase font-bold tracking-wider text-slate-500 mb-1.5">
              Evaluation Criteria
            </div>
            <ul class="space-y-1 text-slate-300 pl-3.5 list-disc text-xs">
              <li v-for="(g, idx) in formattedGuidelines" :key="idx" class="leading-normal">
                {{ g }}
              </li>
            </ul>
          </div>

          <!-- Examples High/Low -->
          <div v-if="examples && examples.length" class="mt-2 border-t border-slate-800/60 pt-2.5">
            <div class="text-xs uppercase font-bold tracking-wider text-slate-500 mb-1.5">
              Reference Examples
            </div>
            <div class="space-y-2">
              <div v-for="(exampleGroup, idx) in examples" :key="idx" class="text-xs">
                <div
                  class="text-xs font-semibold mb-0.5"
                  :class="exampleGroup.type === 'high' ? 'text-emerald-400' : 'text-rose-400'"
                >
                  {{ exampleGroup.type === 'high' ? 'High score (3/3):' : 'Low score (1/3):' }}
                </div>
                <ul class="space-y-0.5 text-slate-400 pl-3 list-disc text-xs">
                  <li v-for="(ex, exIdx) in exampleGroup.items" :key="exIdx" class="leading-normal">
                    {{ ex }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import IconRenderer from './IconRenderer.vue'

export interface MarkerInfo {
  name: string
  symbol: string
  icon: string
  description: string
  color?: string
  guidelines?: string
  examples_high_score?: string
  examples_low_score?: string
}

const props = defineProps<{
  marker: MarkerInfo
  score: number
}>()

const triggerEl = ref<HTMLElement | null>(null)
const visible = ref(false)
const coords = ref({ top: 0, left: 0 })
const isAbove = ref(true)

const showTooltip = () => {
  if (!triggerEl.value) return
  const rect = triggerEl.value.getBoundingClientRect()

  // Decide placing above or below
  const placeAbove = rect.top > 320

  coords.value = {
    left: rect.left + rect.width / 2,
    top: placeAbove ? rect.top - 8 : rect.bottom + 8,
  }

  isAbove.value = placeAbove
  visible.value = true
}

const hideTooltip = () => {
  visible.value = false
}

const tooltipStyle = computed(() => ({
  top: `${coords.value.top}px`,
  left: `${coords.value.left}px`,
  transform: isAbove.value ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
}))

const getScoreLabel = (score: number) => {
  switch (score) {
    case 0:
      return 'Not set / N/A'
    case 1:
      return 'Low'
    case 2:
      return 'Medium'
    case 3:
      return 'High'
    default:
      return 'Not specified'
  }
}

const valueScale = [
  { value: 0, label: 'Not set' },
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
]

const getActiveDotClass = (markerName: string) => {
  switch (markerName) {
    case 'completion':
      return 'bg-emerald-500'
    case 'certainty':
      return 'bg-blue-500'
    case 'priority':
      return 'bg-rose-500'
    case 'rating':
      return 'bg-amber-500'
    case 'weight':
      return 'bg-indigo-500'
    default:
      return 'bg-indigo-500'
  }
}

// Format guidelines string into an array of strings (lines without the leading '*')
const formattedGuidelines = computed(() => {
  if (!props.marker.guidelines) return []
  return props.marker.guidelines
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s*/, '').trim())
    .filter((line) => line.length > 0)
})

// Format examples into structures
const examples = computed(() => {
  const result: { type: string; items: string[] }[] = []

  if (props.marker.examples_high_score) {
    const items = props.marker.examples_high_score
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s*/, '').trim())
      .filter((line) => line.length > 0)
    if (items.length) {
      result.push({ type: 'high', items })
    }
  }

  if (props.marker.examples_low_score) {
    const items = props.marker.examples_low_score
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s*/, '').trim())
      .filter((line) => line.length > 0)
    if (items.length) {
      result.push({ type: 'low', items })
    }
  }

  return result
})
</script>

<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition:
    opacity 0.12s ease-out,
    transform 0.12s ease-out;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}
</style>
