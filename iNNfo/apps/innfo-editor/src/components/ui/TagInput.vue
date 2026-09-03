<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModelStore } from '../../stores/modelStore'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const modelStore = useModelStore()
const availableTags = computed(() => modelStore.allTags)

const inputValue = ref('')
const isFocused = ref(false)

const filteredTags = computed(() => {
  const query = inputValue.value.toLowerCase().trim()
  const unselected = availableTags.value.filter((tag) => !props.modelValue.includes(tag))
  if (!query) return unselected
  return unselected.filter((tag) => tag.toLowerCase().includes(query))
})

function addTag(tag: string) {
  const cleanTag = tag.trim().toLowerCase()
  if (cleanTag && !props.modelValue.includes(cleanTag)) {
    emit('update:modelValue', [...props.modelValue, cleanTag])
  }
  inputValue.value = ''
}

function removeTag(index: number) {
  const newTags = [...props.modelValue]
  newTags.splice(index, 1)
  emit('update:modelValue', newTags)
}

function handleEnter() {
  if (inputValue.value) {
    addTag(inputValue.value)
  }
}

function handleBlur() {
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}
</script>

<template>
  <div class="tag-input-container">
    <div class="tags-wrapper">
      <span v-for="(tag, index) in modelValue" :key="tag" class="tag-chip">
        {{ tag }}
        <button @click.prevent="removeTag(index)" class="tag-remove">&times;</button>
      </span>
      <input
        type="text"
        v-model="inputValue"
        @keydown.enter.prevent="handleEnter"
        @focus="isFocused = true"
        @blur="handleBlur"
        placeholder="Add tag..."
        class="tag-input-field"
      />
    </div>

    <ul v-if="isFocused && filteredTags.length > 0" class="tag-dropdown">
      <li v-for="tag in filteredTags" :key="tag" @click="addTag(tag)" class="tag-option">
        {{ tag }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tag-input-container {
  position: relative;
  width: 100%;
}
.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--innfo-color-border, #ccc);
  border-radius: 4px;
  min-height: 32px;
  background: var(--innfo-color-bg, #fff);
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  background-color: var(--innfo-color-primary, #007bff);
  color: #fff;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 0.85em;
}
.tag-remove {
  background: none;
  border: none;
  color: #fff;
  margin-left: 4px;
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0;
}
.tag-input-field {
  flex: 1;
  border: none;
  outline: none;
  min-width: 60px;
  background: transparent;
  color: inherit;
}
.tag-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 2px;
  padding: 0;
  list-style: none;
  background: var(--innfo-color-bg, #fff);
  border: 1px solid var(--innfo-color-border, #ccc);
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.tag-option {
  padding: 6px 10px;
  cursor: pointer;
}
.tag-option:hover {
  background: var(--innfo-color-hover, #f0f0f0);
}
</style>
