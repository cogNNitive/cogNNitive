<script setup lang="ts">
/**
 * Renders a multi-select field as chips — static in read mode,
 * removable with dropdown for unselected options in edit mode.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'multiselect' in the unified widget registry.
 */
import { ref, computed } from 'vue'

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

const dropdownOpen = ref(false)

const selected = computed(() => props.modelValue ?? [])

const unselected = computed(() => {
  const opts = props.fieldDefinition?.options ?? []
  return opts.filter((o) => !selected.value.includes(o))
})

function remove(opt: string): void {
  emit(
    'update:modelValue',
    selected.value.filter((s) => s !== opt),
  )
}

function add(opt: string): void {
  emit('update:modelValue', [...selected.value, opt])
  dropdownOpen.value = false
}

function toggleDropdown(): void {
  dropdownOpen.value = !dropdownOpen.value
}
</script>

<template>
  <div class="widget-multiselect">
    <div class="widget-multiselect-chips">
      <span v-for="item in selected" :key="item" class="widget-multiselect-chip">
        {{ item }}
        <button
          v-if="!readonly"
          class="widget-multiselect-chip-remove"
          @click="remove(item)"
          :aria-label="'Remove ' + item"
        >
          ×
        </button>
      </span>
      <span v-if="selected.length === 0" class="widget-multiselect-empty">—</span>
    </div>
    <div v-if="!readonly && unselected.length > 0" class="widget-multiselect-dropdown-wrap">
      <button class="widget-multiselect-trigger" @click="toggleDropdown">+ Add</button>
      <div v-if="dropdownOpen" class="widget-multiselect-dropdown">
        <button
          v-for="opt in unselected"
          :key="opt"
          class="widget-multiselect-option"
          @click="add(opt)"
        >
          {{ opt }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget-multiselect {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.widget-multiselect-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}
.widget-multiselect-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.5rem;
  font-size: 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-family: system-ui, sans-serif;
}
.widget-multiselect-chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  color: #64748b;
}
.widget-multiselect-chip-remove:hover {
  color: #dc2626;
}
.widget-multiselect-empty {
  font-size: 13px;
  font-family: system-ui, sans-serif;
  color: #94a3b8;
}
.widget-multiselect-dropdown-wrap {
  position: relative;
}
.widget-multiselect-trigger {
  padding: 0.15rem 0.5rem;
  font-size: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #64748b;
  font-family: system-ui, sans-serif;
}
.widget-multiselect-trigger:hover {
  border-color: #4d0e4e;
  color: #4d0e4e;
}
.widget-multiselect-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  min-width: 120px;
  margin-top: 0.25rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.widget-multiselect-option {
  display: block;
  width: 100%;
  padding: 0.35rem 0.75rem;
  font-size: 12px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-family: system-ui, sans-serif;
}
.widget-multiselect-option:hover {
  background: #f8fafc;
  color: #4d0e4e;
}
</style>
