<script setup lang="ts">
/**
 * Renders a single pill that cycles through values on click.
 * Options come from fieldDefinition.options[].
 * Each click advances to the next option, wrapping around.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'cycle' in the unified widget registry.
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

const options = computed<string[]>(() => props.fieldDefinition?.options ?? [])

const displayValue = computed(() => {
  return props.modelValue || (options.value.length > 0 ? options.value[0] : '—')
})

const color = computed(() => {
  if (!options.value.length) return '#64748b'
  const idx = options.value.indexOf(props.modelValue)
  const colors = [
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#d946ef',
    '#ec4899',
    '#f43f5e',
    '#14b8a6',
    '#0ea5e9',
    '#f59e0b',
    '#84cc16',
  ]
  return idx >= 0 ? colors[idx % colors.length] : '#64748b'
})

function advance(): void {
  if (props.readonly || !options.value.length) return
  const currentIdx = options.value.indexOf(props.modelValue)
  const nextIdx = (currentIdx + 1) % options.value.length
  emit('update:modelValue', options.value[nextIdx])
}
</script>

<template>
  <div class="widget-cycle">
    <template v-if="options.length > 0">
      <button
        class="widget-cycle-pill"
        :class="{ 'widget-cycle-pill--readonly': readonly }"
        :style="{ borderColor: color, color: color }"
        :disabled="readonly"
        @click="advance"
        :title="readonly ? displayValue : 'Click to cycle: ' + displayValue"
        :aria-label="'Current value: ' + displayValue + '. Click to cycle.'"
      >
        {{ displayValue }}
      </button>
    </template>
    <span v-else class="widget-cycle-empty">—</span>
  </div>
</template>

<style scoped>
.widget-cycle {
  display: inline-flex;
  align-items: center;
}
.widget-cycle-pill {
  padding: 0.2rem 0.75rem;
  font-size: 12px;
  font-family: system-ui, sans-serif;
  border: 1.5px solid;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  transition: all 0.1s ease;
  font-weight: 500;
}
.widget-cycle-pill:hover:not(:disabled) {
  background: #f8fafc;
  transform: scale(1.03);
}
.widget-cycle-pill--readonly {
  cursor: default;
  opacity: 0.7;
}
.widget-cycle-pill:disabled {
  cursor: default;
  opacity: 0.6;
}
.widget-cycle-empty {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: #94a3b8;
}
</style>
