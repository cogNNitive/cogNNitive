<template>
  <div class="space-y-6">
    <ConceptTableView
      v-if="blockId"
      :node-id="blockId"
      :concept-type="conceptType"
      :concept-fields="conceptFields"
    />

    <!-- Concept Tags Read View -->
    <TagList :tags="currentTags" label="Concept Tags" data-testid="concept-tags-read" />

    <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
      <div
        class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
      >
        <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
        Description
      </div>
      <div
        v-if="renderedDescription"
        class="prose prose-slate max-w-none text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-words bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700"
        v-html="renderedDescription"
      ></div>
      <div v-else class="text-sm text-slate-400 dark:text-slate-500 italic">
        No description
      </div>
    </div>

    <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
      <div
        class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
      >
        <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
        Fields Schema
      </div>
      <div
        v-if="conceptFields && conceptFields.length > 0"
        class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4"
      >
        <FieldSchemaView :field-definitions="conceptFields" />
      </div>
      <div v-else class="text-sm text-slate-400 dark:text-slate-500 italic">
        No fields defined
      </div>
    </div>

    <!-- Unified Connections & Relationships -->
    <div
      v-if="hasRelationships || (hasMatrices && blockId)"
      class="border-t border-slate-200 dark:border-slate-700 pt-5"
    >
      <div
        class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
      >
        <span class="w-1.5 h-4 rounded-full bg-indigo-500 shrink-0"></span>
        Concept Connections &amp; Matrices
      </div>
      <BlockConnections
        :root-node-id="rootNodeId"
        :node-concept="conceptName || conceptType"
        :node-id="blockId"
        :is-concept="true"
        :relationships="relationshipsList"
        :on-navigate="onNavigate"
      />
    </div>

    <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
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
import ConceptTableView from './ConceptTableView.vue'
import TagList from '../ui/TagList.vue'
import FieldSchemaView from './FieldSchemaView.vue'
import BlockConnections from './BlockConnections.vue'
import NodeMedia from './NodeMedia.vue'

defineProps<{
  blockId?: string
  conceptType: string
  conceptName: string
  conceptFields?: any[]
  currentTags: string[]
  renderedDescription: string
  hasRelationships: boolean
  hasMatrices: boolean
  rootNodeId: string
  relationshipsList: any[]
  resolvedAssetItems: Array<{ filename: string; url: string }>
  onNavigate: (targetId: string) => void
}>()
</script>
