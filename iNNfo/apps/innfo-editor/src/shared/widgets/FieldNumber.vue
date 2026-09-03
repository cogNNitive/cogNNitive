<script setup lang="ts">
/**
 * Renders a number field as a numeric input.
 * Part of the unified widget registry (rebuild-format-editor-ui Phase 4).
 * Uses v-model contract: modelValue / update:modelValue.
 * Emits the number value, not the raw string.
 */
withDefaults(
  defineProps<{
    modelValue: number
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function onInput(e: Event): void {
  const raw = (e.target as HTMLInputElement).value
  const num = raw === '' ? 0 : Number(raw)
  emit('update:modelValue', num)
}
</script>

<template>
  <span v-if="readonly" class="field-number-readonly">{{ modelValue ?? '—' }}</span>
  <input v-else type="number" class="field-number" :value="modelValue" @input="onInput" />
</template>

<style scoped>
.field-number {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
}

.field-number:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
</style>
