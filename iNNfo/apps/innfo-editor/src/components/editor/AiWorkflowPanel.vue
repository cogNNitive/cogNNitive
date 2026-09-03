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
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <AIGuidePanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import AIGuidePanel from './AIGuidePanel.vue'
</script>
