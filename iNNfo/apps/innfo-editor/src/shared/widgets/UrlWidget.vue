<script setup lang="ts">
/**
 * Renders a URL field as a clickable hyperlink in read mode,
 * and a URL input with validation in edit mode.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'url' in the unified widget registry.
 */
import { ref } from 'vue'

withDefaults(
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

const validationError = ref('')

function isValidUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^mailto:/i.test(url)
}

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  const val = target.value
  if (val && !isValidUrl(val)) {
    validationError.value = 'URL must start with http://, https://, or mailto:'
  } else {
    validationError.value = ''
  }
  emit('update:modelValue', val)
}
</script>

<template>
  <template v-if="!readonly">
    <input
      type="url"
      class="widget-url"
      :value="modelValue"
      :class="{ 'widget-url--error': validationError }"
      placeholder="https://..."
      @input="onInput"
    />
    <span v-if="validationError" class="widget-url-error">{{ validationError }}</span>
  </template>
  <a
    v-else-if="modelValue"
    :href="modelValue"
    class="widget-url-link"
    target="_blank"
    rel="noopener noreferrer"
    >{{ modelValue }}</a
  >
  <span v-else class="widget-url-empty">—</span>
</template>

<style scoped>
.widget-url {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
}
.widget-url:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
.widget-url--error {
  border-color: #dc2626;
}
.widget-url--error:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
}
.widget-url-error {
  display: block;
  margin-top: 0.25rem;
  font-size: 11px;
  color: #dc2626;
  font-family: system-ui, sans-serif;
}
.widget-url-link {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: #2563eb;
  text-decoration: underline;
  word-break: break-all;
}
.widget-url-link:hover {
  color: #1d4ed8;
}
.widget-url-empty {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: #94a3b8;
}
</style>
