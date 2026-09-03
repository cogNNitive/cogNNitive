<script setup lang="ts">
/** Ported widget for the fixture-exercised concept type "weight" (R15). */
defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  emit('update:modelValue', raw === '' ? 0 : Number(raw))
}
</script>

<template>
  <input type="number" class="weight-widget" :value="modelValue" @input="onInput" />
</template>
