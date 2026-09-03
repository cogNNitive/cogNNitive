<script setup lang="ts">
/**
 * Renders a read-only code block in read mode and a monospace
 * textarea with line numbers in edit mode.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'code' in the unified widget registry.
 */
import { computed, ref, watch } from 'vue'

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

const lang = computed(() => props.fieldDefinition?.type ?? '')

const lines = computed(() => (props.modelValue ?? '').split('\n'))

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

watch(
  () => props.modelValue,
  () => {
    // Re-calc lines on value change
  },
)
</script>

<template>
  <div class="widget-code">
    <div v-if="!readonly" class="widget-code-edit">
      <div class="widget-code-gutter">
        <span v-for="(_, i) in lines" :key="i" class="widget-code-gutter-line">{{ i + 1 }}</span>
      </div>
      <textarea
        ref="textareaRef"
        class="widget-code-textarea"
        :value="modelValue"
        @input="onInput"
        spellcheck="false"
        wrap="off"
        :placeholder="'Enter ' + (lang || 'code') + '...'"
      ></textarea>
    </div>
    <div v-else class="widget-code-read">
      <span v-if="lang" class="widget-code-lang-badge">{{ lang }}</span>
      <pre class="widget-code-pre"><code>{{ modelValue || '' }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.widget-code {
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 12px;
  line-height: 1.5;
}
.widget-code-edit {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fafbfc;
}
.widget-code-gutter {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  min-width: 2.5rem;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
  user-select: none;
  text-align: right;
  color: #94a3b8;
}
.widget-code-gutter-line {
  padding: 0 0.5rem;
  line-height: 1.5;
  font-size: 11px;
}
.widget-code-textarea {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  resize: vertical;
  min-height: 80px;
  outline: none;
  color: #1e293b;
  tab-size: 2;
}
.widget-code-textarea:focus {
  background: #fff;
}
.widget-code-textarea::placeholder {
  color: #94a3b8;
}
.widget-code-read {
  position: relative;
}
.widget-code-lang-badge {
  position: absolute;
  top: 0.25rem;
  right: 0.5rem;
  padding: 0.1rem 0.4rem;
  font-size: 10px;
  font-family: system-ui, sans-serif;
  background: #e2e8f0;
  border-radius: 3px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.widget-code-pre {
  margin: 0;
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre;
  color: #1e293b;
}
.widget-code-pre code {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}
</style>
