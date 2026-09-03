<script setup lang="ts">
/**
 * Renders a free-form tags field as chips in both modes.
 * In edit mode, Enter or comma adds a new tag, × removes a tag.
 * Tags are trimmed, deduplicated, and empty tags are ignored.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'tags' in the unified widget registry.
 */
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
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
  'update:modelValue': [value: string[]]
}>()

const inputValue = ref('')

function currentTags(): string[] {
  return props.modelValue ?? []
}

function addTag(raw: string): void {
  const trimmed = raw.trim()
  if (!trimmed) return
  const current = currentTags()
  if (!current.includes(trimmed)) {
    emit('update:modelValue', [...current, trimmed])
  }
  inputValue.value = ''
}

function removeTag(tag: string): void {
  emit(
    'update:modelValue',
    currentTags().filter((t) => t !== tag),
  )
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag(inputValue.value)
  }
}

function onBlur(): void {
  if (inputValue.value) {
    addTag(inputValue.value)
  }
}
</script>

<template>
  <div class="widget-tags">
    <span v-for="tag in currentTags()" :key="tag" class="widget-tags-chip">
      {{ tag }}
      <button
        v-if="!readonly"
        class="widget-tags-chip-remove"
        @click="removeTag(tag)"
        :aria-label="'Remove ' + tag"
      >
        ×
      </button>
    </span>
    <input
      v-if="!readonly"
      v-model="inputValue"
      class="widget-tags-input"
      placeholder="Type and press Enter..."
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <span v-if="currentTags().length === 0 && readonly" class="widget-tags-empty">—</span>
  </div>
</template>

<style scoped>
.widget-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}
.widget-tags-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.5rem;
  font-size: 12px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 4px;
  color: #4338ca;
  font-family: system-ui, sans-serif;
}
.widget-tags-chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  color: #6366f1;
}
.widget-tags-chip-remove:hover {
  color: #dc2626;
}
.widget-tags-input {
  flex: 1;
  min-width: 120px;
  padding: 0.25rem 0.4rem;
  font-size: 12px;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  background: transparent;
  font-family: system-ui, sans-serif;
  outline: none;
}
.widget-tags-input:focus {
  border-bottom-color: #4d0e4e;
}
.widget-tags-input::placeholder {
  color: #94a3b8;
}
.widget-tags-empty {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: #94a3b8;
}
</style>
