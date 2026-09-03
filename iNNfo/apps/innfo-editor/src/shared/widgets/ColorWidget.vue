<script setup lang="ts">
/**
 * Renders a color field as a 20×20px color swatch with hex text
 * in read mode, and a native color picker in edit mode.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'color' in the unified widget registry.
 */

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

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function isValidHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color)
}
</script>

<template>
  <div class="widget-color">
    <span
      class="widget-color-swatch"
      :style="{ backgroundColor: isValidHex(modelValue) ? modelValue : '#ccc' }"
    />
    <input
      v-if="!readonly"
      type="color"
      class="widget-color-picker"
      :value="isValidHex(modelValue) ? modelValue : '#000000'"
      @input="onInput"
    />
    <code class="widget-color-hex">{{ modelValue || '—' }}</code>
  </div>
</template>

<style scoped>
.widget-color {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.widget-color-swatch {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.widget-color-picker {
  width: 36px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 4px;
  cursor: pointer;
  background: none;
}
.widget-color-picker::-webkit-color-swatch-wrapper {
  padding: 2px;
}
.widget-color-picker::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}
.widget-color-hex {
  font-size: 12px;
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  color: inherit;
}
</style>
