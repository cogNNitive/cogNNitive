<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-xs">
          <Sparkles class="w-4 h-4 text-white" />
        </div>
        <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">AI Workflow</h2>
      </div>
      <button
        @click="uiStore.setActiveView('editor')"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        title="Return to model editor"
        data-testid="ai-workflow-close-button"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span>Back to editor</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <AIGuidePanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, ArrowLeft } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'
import AIGuidePanel from './AIGuidePanel.vue'

const uiStore = useUiStore()
</script>
