<script setup lang="ts">
/**
 * Renders a formatted timestamp in read mode and an
 * <input type="datetime-local"> in edit mode.
 * Accepts ISO 8601 strings or Unix timestamps (number).
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'timestamp' in the unified widget registry.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number
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

function parseDate(): Date | null {
  if (props.modelValue == null || props.modelValue === '') return null
  try {
    let d: Date
    if (typeof props.modelValue === 'number') {
      d = new Date(props.modelValue * 1000)
    } else {
      d = new Date(props.modelValue)
    }
    if (isNaN(d.getTime())) return null
    return d
  } catch {
    return null
  }
}

const formatted = computed(() => {
  const d = parseDate()
  if (!d) return String(props.modelValue || '—')
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
})

const localDatetime = computed(() => {
  const d = parseDate()
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  // Convert back to ISO string
  const val = target.value
  if (val) {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      emit('update:modelValue', d.toISOString())
      return
    }
  }
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="widget-timestamp">
    <input
      v-if="!readonly"
      type="datetime-local"
      class="widget-timestamp-input"
      :value="localDatetime"
      @input="onInput"
    />
    <span v-else class="widget-timestamp-read">{{ formatted }}</span>
  </div>
</template>

<style scoped>
.widget-timestamp-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  font-family: system-ui, sans-serif;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  box-sizing: border-box;
}
.widget-timestamp-input:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
.widget-timestamp-read {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: inherit;
}
</style>
