<template>
  <div class="space-y-6">
    <div
      v-if="renderedDescription"
      class="border-t border-slate-200 dark:border-slate-700 pt-5"
    >
      <div
        class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
      >
        <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
        Content
      </div>
      <div
        class="prose prose-slate max-w-none text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-words bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700"
        v-html="renderedDescription"
      ></div>
    </div>

    <div
      v-if="conceptFields && conceptFields.length > 0"
      class="border-t border-slate-200 dark:border-slate-700 pt-5"
    >
      <div
        class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
          Fields
        </div>
        <button
          @click.stop="$emit('edit-toggle')"
          class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
        >
          <Pencil class="w-3 h-3" />
          Edit
        </button>
      </div>
      <div
        class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4"
      >
        <FieldViewer
          :node-id="blockIdForFields"
          :field-definitions="conceptFields"
          :readonly="!isEditing"
        />
      </div>
    </div>

    <!-- Element Tags Read View -->
    <TagList :tags="currentTags" label="Tags" data-testid="block-sheet-tags-read" />

    <!-- Unified Connections & Relationships -->
    <div
      v-if="hasRelationships || (hasMatrices && blockId)"
      class="border-t border-slate-200 dark:border-slate-700 pt-5"
    >
      <div
        class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
      >
        <span class="w-1.5 h-4 rounded-full bg-indigo-500 shrink-0"></span>
        Connections &amp; Relationships
      </div>
      <BlockConnections
        :root-node-id="rootNodeId"
        :node-concept="conceptType"
        :node-id="blockId"
        :is-concept="false"
        :relationships="relationshipsList"
        :on-navigate="onNavigate"
      />
    </div>

    <div v-if="blockId" class="border-t border-slate-200 dark:border-slate-700 pt-5">
      <div
        class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
      >
        <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
        Media &amp; Attachments
      </div>
      <NodeMedia :assets="resolvedAssetItems" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import FieldViewer from './FieldViewer.vue'
import TagList from '../ui/TagList.vue'
import BlockConnections from './BlockConnections.vue'
import NodeMedia from './NodeMedia.vue'

defineProps<{
  blockId?: string
  blockIdForFields: string
  conceptType: string
  conceptFields?: any[]
  isEditing: boolean
  currentTags: string[]
  renderedDescription: string
  hasRelationships: boolean
  hasMatrices: boolean
  rootNodeId: string
  relationshipsList: any[]
  resolvedAssetItems: Array<{ filename: string; url: string }>
  onNavigate: (targetId: string) => void
}>()

defineEmits<{
  'edit-toggle': []
}>()
</script>
