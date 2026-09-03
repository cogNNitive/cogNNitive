<script setup lang="ts">
import FileRefPill from '../../components/editor/FileRefPill.vue'
import { parseSourceRef } from '../../utils/sourceRef'

/**
 * Renders any field whose resolved widget type has not been ported yet
 * (R15): shows the raw value plus a type badge instead of crashing or
 * showing a blank field.
 */
defineProps<{
  modelValue: unknown
  widgetType: string
}>()

function isSourceRef(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return parseSourceRef(value).isValid
}

function toFileRef(val: string): { filePath: string; fileName: string; slug?: string } {
  const { filePath, fileName, slug } = parseSourceRef(val)
  return { filePath, fileName, slug }
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <div class="fallback-widget">
    <FileRefPill v-if="isSourceRef(modelValue)" kind="source" v-bind="toFileRef(String(modelValue))" />
    <span v-else class="fallback-widget__value">{{ displayValue(modelValue) }}</span>
    <span class="fallback-widget__badge">{{ widgetType }}</span>
  </div>
</template>
