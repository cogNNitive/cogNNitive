<template>
  <div
    class="flex items-center rounded-t-lg px-3 py-2.5 transition-all duration-150 gap-2 select-none border-b"
    :class="[palette.bg, palette.border, palette.text]"
  >
    <!-- Title: icon + name(s) -->
    <div class="flex items-center gap-1.5 min-w-0 flex-1">
      <template v-if="kind === 'concept'">
        <IconRenderer
          :icon="resolvedIcon"
          custom-class="w-5 h-5 shrink-0"
          :class="[palette.text]"
        />
        <input
          v-if="isEditing"
          :value="conceptName"
          @input="$emit('update:concept-name', ($event.target as HTMLInputElement).value)"
          class="font-bold text-2xl border border-slate-200 dark:border-slate-600 rounded-md px-1 py-0.5 focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 min-w-0 flex-1"
          placeholder="Concept name"
        />
        <span v-else class="font-bold text-2xl truncate" :class="[palette.text]">{{
          cleanConceptName
        }}</span>
        <span class="font-normal text-sm opacity-80 shrink-0">({{ conceptType }})</span>
      </template>
      <template v-else>
        <IconRenderer
          :icon="resolvedIcon"
          custom-class="w-4 h-4 shrink-0"
          :class="[palette.text]"
        />
        <span class="font-bold text-sm" :class="[palette.text]">{{ cleanConceptName }}</span>
        <span class="opacity-40 mx-0.5">:</span>
        <button
          v-if="!isEditing"
          @click.stop="$emit('navigate-to-instance')"
          class="font-semibold text-2xl hover:underline transition-colors cursor-pointer text-left truncate min-w-0"
          :class="[palette.text]"
          :title="block.name || '(Empty)'"
        >
          {{ block.name || '(Empty)' }}
        </button>
        <input
          v-else
          :value="localBlockName"
          @input="$emit('update:block-name-input', $event)"
          @change="$emit('change-block-name')"
          @blur="$emit('change-block-name')"
          @keydown.enter="$emit('change-block-name')"
          class="flex-1 border border-slate-200 dark:border-slate-600 rounded-md p-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 min-w-0"
          placeholder="Enter block name"
        />
      </template>
    </div>

    <!-- Marker cycling toolbar -->
    <template v-if="hasMarkers && block.id">
      <MarkerButton
        v-for="marker in allMarkers"
        :key="marker.name"
        :marker-name="marker.name"
        :node-id="block.id"
        @change="$emit('change')"
      />
      <span class="w-px h-3.5 bg-current/20 mx-0.5"></span>
    </template>

    <!-- Workspace-defined tags circular badges -->
    <template v-if="activeWorkspaceTags.length > 0">
      <span
        v-for="tag in activeWorkspaceTags"
        :key="tag.name"
        class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-white/20 dark:border-slate-800/20 shadow-xs"
        :style="{ backgroundColor: tag.color || '#64748b' }"
        :title="tag.description ? `${tag.name}: ${tag.description}` : tag.name"
        data-testid="block-sheet-workspace-tag"
      >
        <IconRenderer :icon="tag.icon || 'tag'" custom-class="w-3 h-3 text-white" />
      </span>
      <span class="w-px h-3.5 bg-current/20 mx-0.5"></span>
    </template>

    <!-- Add child -->
    <button
      v-if="showAddChild"
      @click.stop="$emit('add-child')"
      aria-label="Add child"
      class="p-0.5 hover:bg-current/10 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
    >
      <PlusCircle class="w-3.5 h-3.5" />
    </button>

    <!-- Reorder controls -->
    <template v-if="showReorder">
      <button
        @click.stop="$emit('move-up')"
        :disabled="isFirst"
        aria-label="Move up"
        class="p-0.5 hover:bg-current/10 disabled:opacity-20 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
      >
        <ArrowUp class="w-3 h-3" />
      </button>
      <button
        @click.stop="$emit('move-down')"
        :disabled="isLast"
        aria-label="Move down"
        class="p-0.5 hover:bg-current/10 disabled:opacity-20 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
      >
        <ArrowDown class="w-3 h-3" />
      </button>
    </template>

    <!-- Edit mode: big action buttons -->
    <template v-if="isEditing">
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Save -->
        <button
          @click.stop="$emit('save')"
          class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
          data-testid="block-sheet-save-button"
        >
          <Check class="w-4 h-4" />
          Save
        </button>

        <!-- Close -->
        <button
          @click.stop="$emit('edit-toggle')"
          class="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <X class="w-4 h-4" />
          Close
        </button>

        <!-- Delete -->
        <button
          v-if="showDelete"
          @click.stop="$emit('delete')"
          class="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 class="w-4 h-4" />
          Delete
        </button>
      </div>
    </template>

    <!-- Read mode: compact icon-only controls -->
    <template v-else>
      <!-- Pencil edit button -->
      <button
        @click.stop="$emit('edit-toggle')"
        aria-label="Edit"
        class="p-0.5 hover:bg-current/10 rounded transition-all cursor-pointer flex items-center justify-center shrink-0 opacity-80"
      >
        <Pencil class="w-3.5 h-3.5" />
      </button>

      <!-- Delete -->
      <button
        v-if="showDelete"
        @click.stop="$emit('delete')"
        aria-label="Delete"
        class="p-0.5 opacity-70 hover:text-rose-600 hover:scale-105 active:scale-95 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </template>

    <!-- Chevron expand/collapse (far right) -->
    <button
      v-if="!disableExpand"
      @click.stop="$emit('update:collapsed', !collapsed)"
      aria-label="Toggle expand"
      class="p-0.5 hover:bg-current/10 rounded transition-colors cursor-pointer flex items-center justify-center shrink-0"
    >
      <ChevronDown
        class="w-3.5 h-3.5 transition-transform duration-200"
        :class="{ '-rotate-90': collapsed }"
      />
    </button>

    <!-- Global OpenCode Custom Prompt Button -->
    <button
      type="button"
      @click.stop="$emit('open-prompt-modal')"
      class="ml-1 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
      title="Generate custom prompt for OpenCode"
      data-testid="open-custom-prompt-modal-btn"
    >
      <Terminal class="w-3.5 h-3.5" />
      <span class="hidden sm:inline">AI Prompt</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  Trash2,
  PlusCircle,
  X,
  Terminal,
} from 'lucide-vue-next'
import IconRenderer from './IconRenderer.vue'
import MarkerButton from './MarkerButton.vue'
import type { BlockKind } from '../../utils/conceptVisuals'

defineProps<{
  block: {
    id?: string
    name: string
  }
  kind: BlockKind
  conceptType: string
  conceptName: string
  palette: { bg: string; border: string; text: string }
  resolvedIcon: string
  cleanConceptName: string
  isEditing: boolean
  localBlockName: string
  hasMarkers: boolean
  allMarkers: any[]
  activeWorkspaceTags: Array<{ name: string; icon?: string; color?: string; description?: string }>
  showAddChild: boolean
  showReorder: boolean
  isFirst: boolean
  isLast: boolean
  showDelete: boolean
  collapsed: boolean
  disableExpand: boolean
}>()

defineEmits<{
  'update:collapsed': [val: boolean]
  'edit-toggle': []
  'move-up': []
  'move-down': []
  delete: []
  'add-child': []
  change: []
  save: []
  'open-prompt-modal': []
  'update:concept-name': [name: string]
  'update:block-name-input': [event: Event]
  'change-block-name': []
  'navigate-to-instance': []
}>()
</script>
