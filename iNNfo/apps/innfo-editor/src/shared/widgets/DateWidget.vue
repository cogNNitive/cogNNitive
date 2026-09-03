<script setup lang="ts">
/**
 * Renders a date field as a date picker input in edit mode,
 * and a formatted locale date string in read mode.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'date' in the unified widget registry.
 */
import { computed } from 'vue'

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

const formattedDate = computed(() => {
  if (!props.modelValue) return ''
  try {
    const d = new Date(props.modelValue + 'T00:00:00')
    if (isNaN(d.getTime())) return props.modelValue
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return props.modelValue
  }
})

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <input v-if="!readonly" type="date" class="widget-date" :value="modelValue" @input="onInput" />
  <span v-else class="widget-date-read">{{ formattedDate }}</span>
</template>

<style scoped>
.widget-date {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
}
.widget-date:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
.widget-date-read {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: inherit;
}
</style>
