<script setup lang="ts">
/**
 * Renders a select/choice field as a dropdown.
 * Part of the unified widget registry (rebuild-format-editor-ui Phase 4).
 * Uses v-model contract: modelValue / update:modelValue.
 * Options come from the `options` prop (passed via fieldDefinition).
 * No label — rendered by parent (WidgetField or BlockSheet).
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options?: string[]
    fieldDefinition?: {
      options?: string[]
      values?: string[]
    }
    readonly?: boolean
  }>(),
  { readonly: false },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectOptions = computed(() => {
  return props.options ?? props.fieldDefinition?.options ?? props.fieldDefinition?.values ?? []
})
</script>

<template>
  <span v-if="readonly" class="field-select-readonly">{{ modelValue || '—' }}</span>
  <select
    v-else
    class="field-select"
    :value="modelValue"
    @change="(e) => $emit('update:modelValue', (e.target as HTMLSelectElement).value)"
  >
    <option value="">- Select -</option>
    <option v-for="opt in selectOptions" :key="opt" :value="opt">{{ opt }}</option>
  </select>
</template>

<style scoped>
.field-select {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
  cursor: pointer;
}
.field-select:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
.field-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
