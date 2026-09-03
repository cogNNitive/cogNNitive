<script setup lang="ts">
/**
 * Renders a segmented button group for enum selection.
 * Options come from fieldDefinition.options[].
 * The active segment is highlighted.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'togglegroup' in the unified widget registry.
 */

const props = withDefaults(
  defineProps<{
    modelValue: string
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
  'update:modelValue': [value: string]
}>()

const options = computed<string[]>(() => props.fieldDefinition?.options ?? [])

import { computed } from 'vue'

function select(val: string): void {
  if (!props.readonly) {
    emit('update:modelValue', val)
  }
}
</script>

<template>
  <div class="widget-togglegroup" v-if="options.length > 0">
    <button
      v-for="opt in options"
      :key="opt"
      class="widget-togglegroup-btn"
      :class="{ 'widget-togglegroup-btn--active': modelValue === opt }"
      :disabled="readonly"
      @click="select(opt)"
      :aria-label="'Select ' + opt"
      :aria-pressed="modelValue === opt"
    >
      {{ opt }}
    </button>
  </div>
  <span v-else class="widget-togglegroup-empty">—</span>
</template>

<style scoped>
.widget-togglegroup {
  display: inline-flex;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}
.widget-togglegroup-btn {
  padding: 0.3rem 0.75rem;
  font-size: 12px;
  font-family: system-ui, sans-serif;
  border: none;
  border-right: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  transition: all 0.1s ease;
}
.widget-togglegroup-btn:last-child {
  border-right: none;
}
.widget-togglegroup-btn:hover:not(:disabled) {
  background: #f8fafc;
  color: #4d0e4e;
}
.widget-togglegroup-btn--active {
  background: #4d0e4e;
  color: #fff;
}
.widget-togglegroup-btn--active:hover:not(:disabled) {
  background: #3b0c3e;
}
.widget-togglegroup-btn:disabled {
  cursor: default;
  opacity: 0.6;
}
.widget-togglegroup-empty {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: #94a3b8;
}
</style>
