<script setup lang="ts">
/**
 * Renders a boolean field as a checkbox.
 * Part of the unified widget registry (rebuild-format-editor-ui Phase 4).
 * Uses v-model contract: modelValue / update:modelValue.
 * No label — rendered by parent (WidgetField or BlockSheet).
 */
withDefaults(
  defineProps<{
    modelValue: boolean
    readonly?: boolean
  }>(),
  { readonly: false },
)

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <input
    type="checkbox"
    class="field-boolean"
    :checked="!!modelValue"
    :disabled="readonly"
    @change="(e) => $emit('update:modelValue', (e.target as HTMLInputElement).checked)"
  />
</template>

<style scoped>
.field-boolean {
  width: 1rem;
  height: 1rem;
  color: #4d0e4e;
  border: 1px solid #cbd5e1;
  border-radius: 0.25rem;
  cursor: pointer;
}
.field-boolean:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
.field-boolean:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
