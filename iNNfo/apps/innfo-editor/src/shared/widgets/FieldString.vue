<script setup lang="ts">
import { computed } from 'vue'
import FileRefPill from '../../components/editor/FileRefPill.vue'
import { parseSourceRef } from '../../utils/sourceRef'

/**
 * Renders a string field as a text input or FileRefPill if it matches a canonical source reference.
 * Part of the unified widget registry (rebuild-format-editor-ui Phase 4).
 * Uses v-model contract: modelValue / update:modelValue.
 *
 * The `sources` field can carry a single reference string or an array of
 * reference strings (iNNfo's generic `[a, b]` list syntax, already parsed
 * into a real JS array by innfo-core before it reaches this component). In
 * readonly mode each valid entry renders its own FileRefPill; the edit
 * path still operates on the raw string form only (multi-value editing is
 * out of scope for now).
 */
const props = withDefaults(
  defineProps<{
    modelValue: string | string[]
    readonly?: boolean
  }>(),
  { readonly: false },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()

function isSourceRef(val: unknown): boolean {
  if (typeof val !== 'string') return false
  return parseSourceRef(val).isValid
}

function toFileRef(val: string): { filePath: string; fileName: string; slug?: string } {
  const { filePath, fileName, slug } = parseSourceRef(val)
  return { filePath, fileName, slug }
}

const editableValue = computed(() =>
  Array.isArray(props.modelValue) ? props.modelValue.join(', ') : props.modelValue,
)
</script>

<template>
  <template v-if="readonly">
    <div v-if="Array.isArray(modelValue)" class="flex flex-wrap gap-1.5 items-center">
      <template v-for="(item, idx) in modelValue" :key="idx">
        <FileRefPill v-if="isSourceRef(item)" kind="source" v-bind="toFileRef(item)" />
        <span v-else class="field-string-readonly">{{ item }}</span>
      </template>
    </div>
    <template v-else>
      <FileRefPill v-if="isSourceRef(modelValue)" kind="source" v-bind="toFileRef(modelValue as string)" />
      <span v-else class="field-string-readonly">{{ modelValue || '—' }}</span>
    </template>
  </template>
  <input
    v-else
    type="text"
    class="field-string"
    :value="editableValue"
    @input="(e) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
  />
</template>

<style scoped>
.field-string {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: system-ui, sans-serif;
  box-sizing: border-box;
}

.field-string:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}
</style>
