<script setup lang="ts">
/**
 * Renders rendered Markdown in read mode via `MinimalMarkdownEditor`,
 * and a visual WYSIWYG Markdown editor in edit mode.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'markdown' in the unified widget registry.
 */
import MinimalMarkdownEditor from '../../components/ui/MinimalMarkdownEditor.vue'

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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onUpdate(val: string) {
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="widget-markdown">
    <MinimalMarkdownEditor
      :model-value="modelValue"
      :readonly="readonly"
      @update:model-value="onUpdate"
      placeholder="Enter Markdown..."
    />
  </div>
</template>

<style scoped>
.widget-markdown {
  width: 100%;
}
</style>
