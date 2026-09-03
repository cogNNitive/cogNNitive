<script setup lang="ts">
/** Ported widget for the fixture-exercised concept type "text" (R15). */
withDefaults(
  defineProps<{
    modelValue: string
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <span v-if="readonly" class="text-widget-readonly">{{ modelValue || '—' }}</span>
  <input v-else type="text" class="text-widget" :value="modelValue" @input="onInput" />
</template>
