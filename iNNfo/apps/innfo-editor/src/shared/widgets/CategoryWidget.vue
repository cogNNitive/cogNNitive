<script setup lang="ts">
/** Ported widget for the fixture-exercised concept type "category" (R15). */
defineProps<{
  modelValue: string
  options: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <select class="category-widget" :value="modelValue" @change="onChange">
    <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
  </select>
</template>
