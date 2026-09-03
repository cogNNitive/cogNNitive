<template>
  <div class="flex flex-col flex-1 gap-4">
    <!-- Pinned concept Sheet at top -->
    <BlockSheet
      :block="conceptBlock"
      :kind="topSheetKind"
      :concept-name="topSheetConceptName"
      :concept-type="conceptType"
      :concept-color="conceptColor"
      :concept-icon="conceptIcon"
      :concept-fields="conceptFields"
      :has-markers="hasMarkers"
      :collapsed="conceptCollapsed"
      :is-editing="editingId === 'concept'"
      :show-tabs="true"
      :show-reorder="false"
      :show-delete="deletable"
      :show-add-child="isListConcept"
      @update:collapsed="conceptCollapsed = $event"
      @edit-toggle="toggleEdit('concept')"
      @add-child="$emit('add-item')"
      @delete="$emit('delete-node')"
      @change="$emit('change-concept')"
      @update:concept-name="(name) => $emit('change-concept-name', name)"
      @navigate-to-node="(nodeId) => $emit('navigate-to-node', nodeId)"
    />

    <!-- Instance Sheets (list concept only) -->
    <div v-if="isListConcept" class="pl-4 space-y-3">
      <div
        v-if="items.length === 0"
        class="text-center py-12 text-slate-400 dark:text-slate-500 italic text-xs bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700"
      >
        No elements yet. Add one with the '+' button above or use a _NN block entry in the markdown.
      </div>

      <BlockSheet
        v-for="(item, idx) in items"
        :key="item.id"
        :block="item"
        kind="instance"
        :concept-name="conceptName"
        :concept-type="conceptType"
        :concept-color="conceptColor"
        :concept-icon="conceptIcon"
        :concept-fields="conceptFields"
        :has-markers="hasMarkers"
        :show-reorder="true"
        :show-delete="true"
        :disable-expand="!selectedItemName || item.name !== selectedItemName"
        :is-first="idx === 0"
        :is-last="idx === items.length - 1"
        :collapsed="itemCollapsed(item)"
        :is-editing="editingId === item.id"
        @update:collapsed="onItemCollapsed(item, $event)"
        @edit-toggle="toggleEdit(item.id)"
        @move-up="$emit('move-item-up', idx)"
        @move-down="$emit('move-item-down', idx)"
        @delete="$emit('delete-item', idx)"
        @change="$emit('change-item')"
        @navigate-to-node="(nodeId) => $emit('navigate-to-node', nodeId)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BlockSheet from './BlockSheet.vue'
import type { ParsedItem } from '../../stores/types'
import type { BlockKind } from '../../utils/conceptVisuals'

const props = withDefaults(
  defineProps<{
    conceptName: string
    conceptType: string
    conceptColor?: string
    conceptIcon?: string
    conceptFields?: any[]
    conceptBlock: { id?: string; name: string; description: string; fields?: Record<string, any> }
    items: ParsedItem[]
    isListConcept: boolean
    hasMarkers?: boolean
    selectedItemName?: string
    deletable?: boolean
    isElement?: boolean
    kind?: BlockKind
  }>(),
  {
    conceptColor: '',
    conceptIcon: '',
    conceptFields: () => [],
    hasMarkers: false,
    selectedItemName: '',
    deletable: false,
    isElement: false,
  },
)

const isElementNode = computed(() => props.isElement || props.deletable || props.kind === 'instance')

const topSheetKind = computed<BlockKind>(() => {
  if (props.kind) return props.kind
  return isElementNode.value ? 'instance' : 'concept'
})

const topSheetConceptName = computed(() => {
  if (topSheetKind.value === 'instance') {
    return props.conceptType || props.conceptName
  }
  return props.conceptName
})

const _emit = defineEmits<{
  'change-concept': []
  'change-item': []
  'change-concept-name': [name: string]
  'add-item': []
  'delete-item': [index: number]
  'delete-node': []
  'move-item-up': [index: number]
  'move-item-down': [index: number]
  'navigate-to-node': [nodeId: string]
}>()

// Single-active-editor state: at most ONE editor open at a time
const editingId = ref<string | null>(null)

// Per-item collapsed state tracking
const collapsedOverrides = ref<Record<string, boolean>>({})

// A list concept's sheet is pure context (collapse it); a single-block concept's
// sheet IS the content, so it starts expanded for immediate read/edit.
const conceptCollapsed = ref(props.isListConcept)

const toggleEdit = (key: string) => {
  editingId.value = editingId.value === key ? null : key
}

// Collapse the concept header when a specific element is selected
watch(
  () => props.selectedItemName,
  (name) => {
    collapsedOverrides.value = {}
    if (name) {
      conceptCollapsed.value = true
    }
  },
  { immediate: true },
)

const itemCollapsed = (item: ParsedItem): boolean => {
  const override = collapsedOverrides.value[item.name]
  if (override !== undefined) return override
  return props.selectedItemName ? item.name !== props.selectedItemName : true
}

const onItemCollapsed = (item: ParsedItem, val: boolean) => {
  collapsedOverrides.value = { ...collapsedOverrides.value, [item.name]: val }
}
</script>
