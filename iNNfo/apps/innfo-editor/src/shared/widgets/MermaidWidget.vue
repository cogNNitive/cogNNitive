<script setup lang="ts">
/**
 * Renders a Mermaid diagram in read mode using the mermaid library.
 * In edit mode, a textarea shows the raw Mermaid source.
 * On Ctrl+Enter or blur, re-renders the diagram.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'mermaid' in the unified widget registry.
 */
import { ref, watch, onMounted } from 'vue'
import mermaid from 'mermaid'

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

const svgContainer = ref<HTMLDivElement | null>(null)
const editText = ref(props.modelValue ?? '')
const renderError = ref('')

let diagramId = 0

onMounted(() => {
  mermaid.initialize({ startOnLoad: false, theme: 'default' })
  if (props.readonly && props.modelValue) {
    renderDiagram(props.modelValue)
  }
})

watch(
  () => props.modelValue,
  (val) => {
    editText.value = val ?? ''
    if (props.readonly && val) {
      renderDiagram(val)
    }
  },
)

function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  editText.value = target.value
  emit('update:modelValue', target.value)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    renderDiagram(editText.value)
  }
}

function onBlur(): void {
  if (!props.readonly) {
    renderDiagram(editText.value)
  }
}

async function renderDiagram(source: string): Promise<void> {
  if (!svgContainer.value || !source) return
  renderError.value = ''
  try {
    diagramId++
    const id = `mermaid-diagram-${diagramId}`
    const { svg } = await mermaid.render(id, source)
    svgContainer.value.innerHTML = svg
  } catch (err) {
    renderError.value = `Diagram error: ${err instanceof Error ? err.message : String(err)}`
    svgContainer.value.innerHTML = ''
  }
}
</script>

<template>
  <div class="widget-mermaid">
    <div v-if="!readonly" class="widget-mermaid-edit">
      <textarea
        class="widget-mermaid-textarea"
        :value="editText"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
        spellcheck="false"
        wrap="off"
        placeholder="Enter Mermaid definition (e.g. graph TD; A-->B;)"
      ></textarea>
      <span class="widget-mermaid-hint">Ctrl+Enter to preview</span>
    </div>
    <div v-else class="widget-mermaid-display" ref="svgContainer">
      <div v-if="!modelValue" class="widget-mermaid-empty">—</div>
    </div>
    <div v-if="renderError" class="widget-mermaid-error">{{ renderError }}</div>
  </div>
</template>

<style scoped>
.widget-mermaid {
  font-family: system-ui, sans-serif;
}
.widget-mermaid-edit {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.widget-mermaid-textarea {
  width: 100%;
  min-height: 80px;
  padding: 0.5rem;
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fafbfc;
  resize: vertical;
  outline: none;
  color: #1e293b;
  tab-size: 2;
}
.widget-mermaid-textarea:focus {
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
  background: #fff;
}
.widget-mermaid-hint {
  font-size: 10px;
  color: #94a3b8;
  font-style: italic;
}
.widget-mermaid-display {
  min-height: 60px;
  overflow-x: auto;
  padding: 0.5rem 0;
}
.widget-mermaid-empty {
  font-size: 13px;
  color: #94a3b8;
}
.widget-mermaid-error {
  margin-top: 0.25rem;
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}
</style>
