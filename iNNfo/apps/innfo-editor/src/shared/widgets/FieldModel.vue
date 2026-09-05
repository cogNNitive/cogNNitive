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
import { FileText, Plus } from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import { useUiStore } from '../../stores/uiStore'

interface FieldDefinitionLike {
  name: string
  type: string
  options?: string[]
  target_concepts?: string[]
  target_template?: string
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    readonly?: boolean
    nodeId?: string
    fieldKey?: string
    fieldDefinition?: FieldDefinitionLike
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

function deriveSuggestedPath(parentPath: string, template: string): string {
  const dir = parentPath.includes('/')
    ? parentPath.substring(0, parentPath.lastIndexOf('/') + 1)
    : ''
  const filename = parentPath.split('/').pop() || 'model_NN.md'
  const stem = filename.replace(/_NN\.md$/i, '').replace(/\.md$/i, '')
  const versionedMatch = stem.match(/^(.*_V[_-][0-9.-]+)_[a-zA-Z0-9-]+$/i)
  if (versionedMatch) {
    return `${dir}${versionedMatch[1]}_${template}_NN.md`
  }
  return `${dir}${stem}_${template}_NN.md`
}

async function handleCreateSubmodel(): Promise<void> {
  const targetTemplate = props.fieldDefinition?.target_template || 'base'
  const parentNode = props.nodeId ? modelStore.getNode(props.nodeId) : undefined
  const parentRootId = props.nodeId ? modelStore.getModelRootForNode(props.nodeId) : undefined
  const parentRootNode = parentRootId ? modelStore.getNode(parentRootId) : undefined
  const parentPath = parentRootNode?.source?.path || 'models/model_NN.md'

  const suggestedPath = deriveSuggestedPath(parentPath, targetTemplate)
  const userPath = window.prompt(`Enter path for new submodel (${targetTemplate}):`, suggestedPath)
  if (!userPath || !userPath.trim()) return

  const cleanPath = userPath.trim().replace(/\\/g, '/')
  const title = `${parentNode?.name || 'Submodel'} - ${targetTemplate}`

  const newModelId = modelStore.scaffoldSubmodel({
    path: cleanPath,
    template: targetTemplate,
    title,
  })

  // Bind path to field
  emit('update:modelValue', cleanPath)
  query.value = cleanPath

  // Navigate to newly created submodel
  uiStore.focusModel(newModelId)
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
    <ul
      v-if="!readonly && showDropdown && filteredSuggestions.length > 0"
      class="field-model-dropdown"
    >
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

    <div v-if="!readonly" class="flex items-center gap-2 mt-1">
      <button
        type="button"
        class="text-xs text-primary hover:text-primary-700 dark:text-primary-400 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
        data-testid="create-submodel-button"
        @click="handleCreateSubmodel"
      >
        <Plus class="w-3.5 h-3.5 shrink-0" />
        <span>Create & bind new model</span>
        <span
          v-if="fieldDefinition?.target_template"
          class="text-3xs px-1 py-0.2 rounded bg-primary/10 text-primary font-mono ml-0.5"
        >
          {{ fieldDefinition.target_template }}
        </span>
      </button>
    </div>
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
