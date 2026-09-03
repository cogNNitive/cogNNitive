<script setup lang="ts">
/**
 * Renders a numeric scale (1–10 by default) as clickable step
 * indicators in both modes. Shows the current value as a badge.
 * Range configurable via fieldDefinition.options.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'scale' in the unified widget registry.
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

const steps = computed<number[]>(() => {
  const opts = props.fieldDefinition?.options
  if (opts && opts.length > 0) {
    const nums = opts.map(Number).filter((n) => !isNaN(n))
    if (nums.length > 0) return nums
  }
  return Array.from({ length: 10 }, (_, i) => i + 1)
})

function select(val: number): void {
  if (!props.readonly) {
    emit('update:modelValue', val)
  }
}
</script>

<template>
  <div class="widget-scale">
    <div class="widget-scale-steps">
      <button
        v-for="step in steps"
        :key="step"
        class="widget-scale-step"
        :class="{
          'widget-scale-step--active': modelValue === step,
        }"
        :disabled="readonly"
        @click="select(step)"
        :aria-label="'Select ' + step"
      >
        {{ step }}
      </button>
    </div>
    <span class="widget-scale-badge">{{ modelValue }}</span>
  </div>
</template>

<style scoped>
.widget-scale {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.widget-scale-steps {
  display: inline-flex;
  gap: 2px;
}
.widget-scale-step {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  color: #475569;
  padding: 0;
  cursor: pointer;
  transition: all 0.1s ease;
}
.widget-scale-step:hover:not(:disabled) {
  border-color: #4d0e4e;
  color: #4d0e4e;
}
.widget-scale-step--active {
  background: #4d0e4e;
  border-color: #4d0e4e;
  color: #fff;
}
.widget-scale-step--active:hover:not(:disabled) {
  background: #3b0c3e;
  border-color: #3b0c3e;
}
.widget-scale-step:disabled {
  cursor: default;
  opacity: 0.6;
}
.widget-scale-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 0.4rem;
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font-family: system-ui, sans-serif;
  color: #1e293b;
}
</style>
