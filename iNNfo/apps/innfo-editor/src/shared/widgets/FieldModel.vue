<script setup lang="ts">
/**
 * Renders a `model`-type field as a sidebar-styled pillbadge (read mode) or
 * an autocomplete input listing the models available in the workspace
 * (edit mode). Part of the unified widget registry.
 * Uses v-model contract: modelValue / update:modelValue.
 *
 * Read mode reuses the same visual language as the active-model row in
 * LeftSidebar.vue (`bg-primary/10 text-primary`, FileText icon) and the
 * same node-matching logic as FieldViewer.vue's `handleModelPillClick` to
 * resolve the raw value to a `modelStore.nodes` entry before calling
 * `uiStore.focusModel(...)`.
 */
import { ref, computed, watch } from 'vue'
import { FileText } from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import { useUiStore } from '../../stores/uiStore'

const props = withDefaults(
  defineProps<{
    modelValue: string
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const modelStore = useModelStore()
const uiStore = useUiStore()
const showDropdown = ref(false)
const query = ref(props.modelValue || '')

watch(
  () => props.modelValue,
  (newVal) => {
    query.value = newVal || ''
  },
)

function basename(path: string): string {
  if (!path) return ''
  return path.split('/').pop()?.split('\\').pop() || path
}

function cleanValue(val: string): string {
  return val
    .replace(/^\[\[\s*/, '')
    .replace(/\s*\]\]$/, '')
    .trim()
}

const displayName = computed(() => basename(cleanValue(props.modelValue || '')))

interface ModelSuggestion {
  id: string
  name: string
  path: string
  basename: string
}

const availableModels = computed<ModelSuggestion[]>(() => {
  const suggestions: ModelSuggestion[] = []
  for (const rootId of modelStore.rootIds) {
    const node = modelStore.nodes[rootId]
    if (!node) continue
    const path = node.source?.path || ''
    suggestions.push({
      id: node.id,
      name: node.name,
      path,
      basename: basename(path),
    })
  }
  return suggestions
})

const filteredSuggestions = computed<ModelSuggestion[]>(() => {
  const lowerQuery = query.value.trim().toLowerCase()
  if (!lowerQuery) return availableModels.value
  return availableModels.value.filter(
    (m) =>
      m.basename.toLowerCase().includes(lowerQuery) ||
      m.path.toLowerCase().includes(lowerQuery) ||
      m.name.toLowerCase().includes(lowerQuery),
  )
})

/** Mirrors FieldViewer.vue's handleModelPillClick node-matching logic. */
function handlePillClick(): void {
  const clean = cleanValue(props.modelValue || '')
  if (!clean) return

  const matchingNode = Object.values(modelStore.nodes).find((n) => {
    const path = n.source?.path || ''
    const nodeBasename = path.split('/').pop()?.split('\\').pop()?.replace(/\.md$/i, '') || ''
    return (
      n.id.toLowerCase() === clean.toLowerCase() ||
      n.name.toLowerCase() === clean.toLowerCase() ||
      path.toLowerCase() === clean.toLowerCase() ||
      nodeBasename.toLowerCase() === clean.toLowerCase()
    )
  })

  if (matchingNode) {
    uiStore.focusModel(matchingNode.id)
  } else {
    uiStore.focusModel(clean)
  }
}

function onInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value
  showDropdown.value = true
  if (!query.value) {
    emit('update:modelValue', '')
  }
}

function selectSuggestion(suggestion: ModelSuggestion): void {
  const value = suggestion.path || suggestion.name
  query.value = value
  showDropdown.value = false
  emit('update:modelValue', value)
}

function onBlur(): void {
  setTimeout(() => {
    showDropdown.value = false
    emit('update:modelValue', query.value.trim())
  }, 150)
}
</script>

<template>
  <div class="field-model-container">
    <template v-if="readonly">
      <button
        v-if="modelValue"
        type="button"
        data-testid="model-field-pill"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-100 border border-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 cursor-pointer transition-colors"
        :title="modelValue"
        @click="handlePillClick"
      >
        <FileText class="w-3.5 h-3.5 shrink-0" />
        <span>{{ displayName }}</span>
      </button>
      <span v-else class="text-slate-300 dark:text-slate-600 italic">—</span>
    </template>
    <input
      v-else
      type="text"
      class="field-model-input"
      :value="query"
      placeholder="Search models..."
      @input="onInput"
      @focus="showDropdown = true"
      @blur="onBlur"
    />
    <ul v-if="!readonly && showDropdown && filteredSuggestions.length > 0" class="field-model-dropdown">
      <li
        v-for="suggestion in filteredSuggestions"
        :key="suggestion.id"
        class="field-model-option flex items-center justify-between"
        @mousedown.prevent="selectSuggestion(suggestion)"
      >
        <span>{{ suggestion.basename }}</span>
        <span v-if="suggestion.path" class="text-3xs opacity-60 font-mono ml-2 shrink-0">
          {{ suggestion.path }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.field-model-container {
  position: relative;
}
.field-model-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
}
.field-model-input:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
.field-model-dropdown {
  position: absolute;
  z-index: 50;
  margin-top: 0.25rem;
  width: 100%;
  max-height: 10rem;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  font-size: 0.75rem;
  list-style: none;
  padding: 0;
}
.field-model-option {
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  color: #334155;
}
.field-model-option:hover {
  background-color: rgba(77, 14, 78, 0.05);
}
</style>
