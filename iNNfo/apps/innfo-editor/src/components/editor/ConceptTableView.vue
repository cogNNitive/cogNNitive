<template>
  <div class="flex flex-col gap-1">
    <!-- Top Horizontal Scrollbar Container -->
    <div
      ref="topScrollRef"
      @scroll="syncTopScroll"
      class="overflow-x-auto overflow-y-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800/80 border border-b-0 border-slate-200 dark:border-slate-700 h-3"
    >
      <div :style="{ width: tableWidth + 'px' }" class="h-px"></div>
    </div>

    <!-- Table Container -->
    <div
      ref="tableContainerRef"
      @scroll="syncTableScroll"
      class="overflow-x-auto rounded-b-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
    >
      <table
        ref="tableRef"
        class="w-full caption-bottom text-sm border-separate border-spacing-0 min-w-[600px]"
      >
        <thead class="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 shadow-2xs">
          <tr>
            <th
              class="sticky left-0 top-0 z-30 bg-slate-50 dark:bg-slate-800/95 text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 min-w-[280px]"
            >
              <div class="flex items-center gap-2">
                <span>Element</span>
                <button
                  @click="addElement"
                  class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xs hover:scale-110 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Add element"
                  aria-label="Add element"
                  data-testid="add-element-btn"
                >
                  <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <button
                  @click="isEditMode = !isEditMode"
                  class="inline-flex items-center justify-center w-5 h-5 rounded-full shadow-xs hover:scale-110 active:scale-95 transition-all cursor-pointer shrink-0"
                  :class="isEditMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'"
                  :title="isEditMode ? 'Save changes' : 'Edit element fields'"
                  aria-label="Toggle edit mode"
                  data-testid="toggle-edit-btn"
                >
                  <Check v-if="isEditMode" class="w-3 h-3 stroke-[2.5]" />
                  <Pencil v-else class="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            </th>
            <th
              v-for="field in conceptFields"
              :key="field.name"
              class="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 min-w-[140px]"
            >
              {{ field.name.replace(/_/g, ' ') }}
            </th>
            <th
              class="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 text-center px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 min-w-[80px] w-[80px]"
            >
              Order
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(child, idx) in children"
            :key="child.id"
            @click="navigateTo(child.id)"
            :draggable="draggableRowId === child.id"
            @dragstart="onDragStart($event, idx)"
            @dragover.prevent="onDragOver($event, idx)"
            @dragend="onDragEnd"
            @drop="onDrop($event, idx)"
            class="group transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
            :class="[
              idx === children.length - 1 ? 'border-b-0' : '',
              draggedIndex === idx ? 'opacity-40 bg-slate-100 dark:bg-slate-700/50' : '',
              dragOverIndex === idx ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
            ]"
          >
            <td
              class="sticky left-0 z-10 px-2 py-1 border-r border-slate-100 dark:border-slate-700/50 min-w-[280px]"
              :class="[
                draggedIndex === idx ? 'bg-slate-100/40 dark:bg-slate-700/20' : (dragOverIndex === idx ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30')
              ]"
            >
              <Pill
                kind="instance"
                :concept-type="conceptType"
                :name="child.name"
                :node-id="child.id"
                :block-id="child.id"
                :description="getDescription(child)"
                :fields="getRawFields(child)"
                :concept-fields="conceptFields || []"
                :show-markers="true"
                interactive
                full-width
              />
            </td>
            <td
              v-for="field in conceptFields"
              :key="field.name"
              @click.stop
              @dblclick="!isEditMode && handleFieldDblClick(child.id, field)"
              class="px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
              :class="{ 'cursor-zoom-in hover:bg-slate-50 dark:hover:bg-slate-700/20 select-text': !isEditMode && isTruncatableType(field.type) }"
            >
              <div
                v-if="!isEditMode && isTruncatableType(field.type)"
                class="max-w-[300px] line-clamp-3 overflow-hidden text-ellipsis break-words"
                title="Double click to view full content"
              >
                <WidgetField
                  :node-id="child.id"
                  :field-key="field.name"
                  :widget-type="field.type || 'string'"
                  :field-definition="field"
                  :readonly="true"
                />
              </div>
              <WidgetField
                v-else
                :node-id="child.id"
                :field-key="field.name"
                :widget-type="field.type || 'string'"
                :field-definition="field"
                :readonly="!isEditMode"
              />
            </td>
            <td class="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 text-center">
              <div class="flex items-center justify-center">
                <span
                  class="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors flex items-center justify-center"
                  title="Drag to reorder"
                  @mousedown="draggableRowId = child.id"
                  @mouseup="draggableRowId = null"
                  @mouseleave="draggableRowId = null"
                >
                  <GripVertical class="w-4 h-4" />
                </span>
              </div>
            </td>
          </tr>
          <tr v-if="children.length === 0">
            <td
              :colspan="2 + (conceptFields?.length || 0)"
              class="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500 italic"
            >
              No elements for this concept.
              <button
                @click="addElement"
                class="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Add the first one.
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Field Detail Modal -->
    <FieldDetailModal
      :is-open="isModalOpen"
      :node-id="selectedNodeId"
      :field-key="selectedFieldKey"
      :field-type="selectedFieldType"
      :field-definition="selectedFieldDefinition"
      @close="isModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { GripVertical, Plus, Pencil, Check } from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import { useConfirmStore } from '../../stores/confirmStore'
import { useUiStore } from '../../stores/uiStore'
import WidgetField from '../../shared/widgets/WidgetField.vue'
import Pill from './Pill.vue'
import FieldDetailModal from './FieldDetailModal.vue'
import type { FieldValue } from '@cognnitive/innfo-core'

const props = defineProps<{
  nodeId: string
  conceptType?: string
  conceptFields?: any[]
}>()

const modelStore = useModelStore()
const confirmStore = useConfirmStore()
const uiStore = useUiStore()

const isEditMode = ref(false)

const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const draggableRowId = ref<string | null>(null)

const topScrollRef = ref<HTMLDivElement | null>(null)
const tableContainerRef = ref<HTMLDivElement | null>(null)
const tableRef = ref<HTMLTableElement | null>(null)
const tableWidth = ref(600)

let isSyncing = false

function syncTopScroll(e: Event): void {
  if (isSyncing) return
  isSyncing = true
  if (tableContainerRef.value && topScrollRef.value) {
    tableContainerRef.value.scrollLeft = (e.target as HTMLElement).scrollLeft
  }
  requestAnimationFrame(() => {
    isSyncing = false
  })
}

function syncTableScroll(e: Event): void {
  if (isSyncing) return
  isSyncing = true
  if (topScrollRef.value && tableContainerRef.value) {
    topScrollRef.value.scrollLeft = (e.target as HTMLElement).scrollLeft
  }
  requestAnimationFrame(() => {
    isSyncing = false
  })
}

function updateTableWidth(): void {
  if (tableRef.value) {
    tableWidth.value = tableRef.value.scrollWidth
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    updateTableWidth()
    if (tableRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateTableWidth())
      resizeObserver.observe(tableRef.value)
    }
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

function getRawFields(child: { fields?: Record<string, FieldValue | unknown> }): Record<string, unknown> {
  if (!child.fields) return {}
  const raw: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(child.fields)) {
    if (val && typeof val === 'object' && 'value' in (val as FieldValue)) {
      raw[key] = (val as FieldValue).value
    } else {
      raw[key] = val
    }
  }
  return raw
}

function getDescription(child: { rawSections?: Record<string, string> }): string {
  return child.rawSections?.description ?? ''
}

const children = computed(() => {
  console.log('ConceptTableView computed children: nodeId =', props.nodeId)
  const id = props.nodeId
  if (id.startsWith('virtual:')) {
    const parts = id.split(':')
    const parentId = parts[1]
    const conceptName = parts[2]
    const parentNode = modelStore.getNode(parentId)
    if (!parentNode) {
      console.log('ConceptTableView computed children: parentNode not found for parentId =', parentId)
      return []
    }
    const result = parentNode.childIds
      .map((cid) => modelStore.getNode(cid))
      .filter(
        (child): child is any => !!child && child.type === conceptName && child.kind === 'element',
      )
    console.log('ConceptTableView computed children: mapped elements count =', result.length)
    return result
  }
  const result = modelStore.getChildren(id)
  console.log('ConceptTableView computed children: getChildren count =', result.length)
  return result
})

function navigateTo(nodeId: string): void {
  uiStore.selectNode(nodeId)
}

function onDragStart(e: DragEvent, index: number): void {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }
}

function onDragOver(e: DragEvent, index: number): void {
  if (draggedIndex.value === null) return
  if (draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function onDragEnd(): void {
  draggedIndex.value = null
  dragOverIndex.value = null
  draggableRowId.value = null
}

function onDrop(e: DragEvent, targetIdx: number): void {
  e.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === targetIdx) {
    draggedIndex.value = null
    dragOverIndex.value = null
    draggableRowId.value = null
    return
  }

  const childId = children.value[draggedIndex.value].id
  const id = props.nodeId
  const parentId = id.startsWith('virtual:') ? id.split(':')[1] : id

  modelStore.moveChildToIndex(parentId, childId, targetIdx)

  draggedIndex.value = null
  dragOverIndex.value = null
  draggableRowId.value = null
}

async function deleteElement(childId: string): Promise<void> {
  const ok = await confirmStore.confirm({
    title: 'Delete element?',
    message: 'This will permanently remove the element and all its content.',
    confirmLabel: 'Delete',
    danger: true,
  })
  if (!ok) return
  modelStore.removeNodeTree(childId)
}

function addElement(): void {
  let parentId = props.nodeId
  let conceptName = props.conceptType || ''
  if (props.nodeId.startsWith('virtual:')) {
    const parts = props.nodeId.split(':')
    parentId = parts[1]
    conceptName = parts[2]
  }

  console.log('ConceptTableView addElement clicked. conceptName =', conceptName, 'nodeId =', props.nodeId)
  if (!conceptName) {
    console.error('ConceptTableView addElement: conceptName/conceptType is missing!')
    return
  }

  let index = 1
  let elementName = `New ${conceptName}`
  let targetId = `${parentId}/${elementName}`
  while (modelStore.getNode(targetId)) {
    index++
    elementName = `New ${conceptName} ${index}`
    targetId = `${parentId}/${elementName}`
  }

  console.log('ConceptTableView addElement: calling createChild with parentId =', parentId, 'elementName =', elementName, 'type =', conceptName)
  const newId = modelStore.createChild(parentId, elementName, conceptName, 'element')
  console.log('ConceptTableView addElement: createChild returned =', newId)
  if (newId) {
    isEditMode.value = true
  }
}

const isModalOpen = ref(false)
const selectedNodeId = ref('')
const selectedFieldKey = ref('')
const selectedFieldType = ref('')
const selectedFieldDefinition = ref<any>(null)

function isTruncatableType(type?: string): boolean {
  const t = type || 'string'
  return t === 'string' || t === 'markdown_inline' || t === 'markdown_file' || t === 'markdown'
}

function handleFieldDblClick(nodeId: string, field: any): void {
  selectedNodeId.value = nodeId
  selectedFieldKey.value = field.name
  selectedFieldType.value = field.type || 'string'
  selectedFieldDefinition.value = field
  isModalOpen.value = true
}
</script>
