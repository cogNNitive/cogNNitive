<template>
  <div v-if="shouldShow" class="select-none text-xs">
    <!-- Item Row -->
    <div
      class="group flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer border"
      :class="[
        item.kind === 'directory'
          ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-transparent font-semibold'
          : itemKind === 'model'
            ? 'bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-indigo-500/10 dark:from-primary-500/20 dark:via-purple-500/20 dark:to-indigo-500/20 border-primary-300/50 dark:border-primary-600/50 hover:border-primary-500 shadow-xs'
            : itemKind === 'artifact'
              ? 'bg-slate-900/5 dark:bg-slate-100/5 border-slate-400/40 dark:border-slate-500/40 hover:bg-slate-900/10 text-slate-700 dark:text-slate-200'
              : itemKind === 'source'
                ? 'bg-slate-500/5 dark:bg-slate-400/10 border-slate-300/40 dark:border-slate-600/40 hover:bg-slate-500/10 text-slate-700 dark:text-slate-200'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
      ]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="handleClick"
    >
      <!-- Expand / Collapse chevron for Directory -->
      <button
        v-if="item.kind === 'directory'"
        @click.stop="isOpen = !isOpen"
        class="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 dark:text-slate-500 shrink-0"
      >
        <ChevronRight v-if="!isOpen" class="w-3.5 h-3.5" />
        <ChevronDown v-else class="w-3.5 h-3.5" />
      </button>
      <span v-else class="w-4 shrink-0"></span>

      <!-- Directory icon -->
      <Folder v-if="item.kind === 'directory'" class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />

      <!-- Directory name -->
      <span v-if="item.kind === 'directory'" class="truncate font-semibold flex-1">
        {{ item.name }}
      </span>

      <!-- Model / Artifact / Source: unified Pill identity -->
      <Pill
        v-else-if="itemKind"
        :kind="itemKind"
        :color="pillColor"
        :icon="pillIcon"
        :name="item.name"
        interactive
        full-width
        class="flex-1 min-w-0"
      />

      <!-- Plain file (unclassified) -->
      <template v-else>
        <FileText class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <span class="truncate font-medium flex-1">{{ item.name }}</span>
      </template>

      <!-- Hover Actions -->
      <div v-if="item.kind === 'file'" class="hidden group-hover:flex items-center gap-1 shrink-0 ml-1.5">
        <button
          @click.stop="$emit('view-file', item)"
          class="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title="Ver trazabilidad / contenido"
        >
          <Eye class="w-3.5 h-3.5" />
        </button>
        <button
          @click.stop="$emit('download-file', item)"
          class="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          title="Descargar archivo"
        >
          <Download class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Recursive Children for Directories -->
    <div v-if="item.kind === 'directory' && isOpen && item.children && item.children.length > 0">
      <FileTreeNode
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :depth="depth + 1"
        :filter-mode="filterMode"
        :search-query="searchQuery"
        @select-file="$emit('select-file', $event)"
        @view-file="$emit('view-file', $event)"
        @download-file="$emit('download-file', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRight, ChevronDown, Folder, FileText, Eye, Download } from 'lucide-vue-next'
import Pill from '../editor/Pill.vue'
import { classifyExplorerItem, type ExplorerItemKind } from '../../utils/explorerClassify'
import type { ExplorerFilterMode } from '../../stores/uiStore'

export interface FileItem {
  name: string
  kind: 'file' | 'directory'
  path: string
  children?: FileItem[]
}

const props = withDefaults(
  defineProps<{
    item: FileItem
    depth?: number
    filterMode?: ExplorerFilterMode
    searchQuery?: string
  }>(),
  {
    depth: 0,
    filterMode: 'all',
    searchQuery: '',
  },
)

const emit = defineEmits<{
  (e: 'select-file', item: FileItem): void
  (e: 'view-file', item: FileItem): void
  (e: 'download-file', item: FileItem): void
}>()

const isOpen = ref(true)

const itemKind = computed<ExplorerItemKind>(() => classifyExplorerItem(props.item))

const pillColor = computed(() => {
  if (itemKind.value === 'artifact') return 'black'
  if (itemKind.value === 'model') return 'indigo'
  return 'slate'
})

const pillIcon = computed(() => {
  if (itemKind.value === 'artifact') return 'file-output'
  if (itemKind.value === 'model') return 'sparkles'
  return 'file-code'
})

function matchesItemFilter(item: FileItem): boolean {
  if (item.kind === 'directory') return true
  const kind = classifyExplorerItem(item)
  if (props.filterMode === 'models') return kind === 'model'
  if (props.filterMode === 'sources') return kind === 'source'
  if (props.filterMode === 'artifacts') return kind === 'artifact'
  return true
}

function matchesSearch(item: FileItem): boolean {
  if (!props.searchQuery) return true
  return item.name.toLowerCase().includes(props.searchQuery.toLowerCase())
}

function hasMatchingSubtree(item: FileItem): boolean {
  if (item.kind === 'file') {
    return matchesItemFilter(item) && matchesSearch(item)
  }

  // For directory: if no search query and filterMode is 'all', it's visible
  if (!props.searchQuery && props.filterMode === 'all') return true

  // Otherwise, visible if any child recursively matches
  return (item.children ?? []).some((c) => hasMatchingSubtree(c))
}

const shouldShow = computed(() => {
  return hasMatchingSubtree(props.item)
})

function handleClick(): void {
  if (props.item.kind === 'directory') {
    isOpen.value = !isOpen.value
  } else {
    emit('select-file', props.item)
  }
}
</script>
