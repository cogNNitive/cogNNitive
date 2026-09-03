<script setup lang="ts">
/**
 * Renders a star rating (1–5) with filled/empty star icons
 * in both modes. In edit mode, stars are clickable and highlight
 * on hover. Shows n/5 text alongside the stars.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'rating' in the unified widget registry.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    fieldDefinition?: {
      name: string
      type: string
      options?: string[]
      target_concepts?: string[]
      default?: unknown
    }
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const filled = computed(() => {
  const val = Math.max(1, Math.min(5, Math.round(props.modelValue ?? 0)))
  return Array.from({ length: 5 }, (_, i) => i < val)
})

function setRating(n: number): void {
  if (!props.readonly) {
    emit('update:modelValue', n)
  }
}
</script>

<template>
  <div class="widget-rating" :class="{ 'widget-rating--read': readonly }">
    <span
      v-for="n in 5"
      :key="n"
      class="widget-rating-star"
      :class="{
        'widget-rating-star--filled': filled[n - 1],
        'widget-rating-star--empty': !filled[n - 1],
      }"
      :style="{ cursor: readonly ? 'default' : 'pointer' }"
      @click="setRating(n)"
      @keydown.enter="setRating(n)"
      @keydown.space.prevent="setRating(n)"
      :tabindex="readonly ? -1 : 0"
      :role="readonly ? 'img' : 'button'"
      :aria-label="n + ' star' + (n !== 1 ? 's' : '')"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        />
      </svg>
    </span>
    <span class="widget-rating-text">{{ modelValue }}/5</span>
  </div>
</template>

<style scoped>
.widget-rating {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}
.widget-rating-star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  transition: transform 0.1s ease;
}
.widget-rating-star[role='button']:hover {
  transform: scale(1.15);
}
.widget-rating-star--filled {
  color: #f59e0b;
}
.widget-rating-star--empty {
  color: #e2e8f0;
}
.widget-rating-text {
  margin-left: 0.25rem;
  font-size: 12px;
  font-family: system-ui, sans-serif;
  color: #64748b;
}
</style>
