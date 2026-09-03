<template>
  <div class="flex-1 overflow-y-auto p-6">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm"
        >
          <span class="text-white font-bold text-sm">AI</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100">
            {{ guide.title }}
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ guide.subtitle }}
          </p>
        </div>
      </div>

      <div
        class="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border border-purple-200/60 dark:border-purple-800/30 rounded-xl p-5"
      >
        <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          This guide is generated from the procedure model at
          <code class="text-2xs bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 rounded font-mono"
            >src/ai-guide/procedure_NN.md</code
          >
          — loaded at build time, no workspace required.
        </p>
      </div>

      <!-- Tools -->
      <section v-if="guide.tools.length > 0">
        <h2
          class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <Download class="w-4 h-4 text-purple-500" />
          Tools
        </h2>
        <div class="space-y-2">
          <a
            v-for="tool in guide.tools"
            :key="tool.name"
            :href="tool.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all group"
          >
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0"
            >
              {{ tool.initials }}
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"
              >
                {{ tool.name }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {{ tool.description }}
              </p>
            </div>
            <ExternalLink
              class="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors shrink-0"
            />
          </a>
        </div>
      </section>

      <!-- Steps -->
      <section v-if="guide.steps.length > 0">
        <h2
          class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <ListOrdered class="w-4 h-4 text-purple-500" />
          Steps
        </h2>
        <div class="space-y-2">
          <div
            v-for="(step, index) in guide.steps"
            :key="index"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
          >
            <div
              class="flex items-center gap-3 p-4 cursor-pointer select-none"
              @click="toggleStep(index)"
            >
              <div
                class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                :class="openStep === index
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
              >
                {{ index + 1 }}
              </div>
              <h3 class="flex-1 min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {{ step.title }}
              </h3>
              <ChevronDown
                class="w-4 h-4 text-slate-400 shrink-0 transition-transform"
                :class="openStep === index ? 'rotate-180' : ''"
              />
            </div>
            <div v-if="openStep === index" class="px-4 pb-4 pl-[3.25rem]">
              <div
                class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2"
                v-html="step.descriptionHtml"
              ></div>
              <div
                v-if="step.prompt"
                class="mt-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                <div class="p-3">
                  <code
                    class="block text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap"
                    >{{ step.prompt }}</code
                  >
                </div>
                <div
                  class="flex items-center justify-end px-3 py-2 border-t border-slate-200 dark:border-slate-700"
                >
                  <button
                    @click="copyPrompt(step.prompt, index)"
                    class="inline-flex items-center gap-1.5 text-2xs font-medium px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                  >
                    <Check v-if="copiedIndex === index" class="w-3 h-3" />
                    <Copy v-else class="w-3 h-3" />
                    {{ copiedIndex === index ? 'Copied' : 'Copy' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Roles matrix -->
      <section v-if="guide.matrixHeaders.length > 0">
        <h2
          class="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <Users class="w-4 h-4 text-purple-500" />
          Roles
        </h2>
        <div
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
        >
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                <th
                  v-for="h in guide.matrixHeaders"
                  :key="h"
                  class="text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400"
                >
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, ri) in guide.matrixRows"
                :key="ri"
                class="border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <td
                  v-for="(cell, ci) in row"
                  :key="ci"
                  class="px-4 py-2 text-slate-700 dark:text-slate-300"
                  :class="ci === 0 ? 'font-medium' : ''"
                >
                  {{ cell }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ExternalLink, Download, ListOrdered, Users, Copy, Check, ChevronDown } from 'lucide-vue-next'
import guide from '../../ai-guide/guide'

const openStep = ref<number | null>(0)
const copiedIndex = ref<number | null>(null)

function toggleStep(index: number): void {
  openStep.value = openStep.value === index ? null : index
}

function copyPrompt(text: string, index: number): void {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
  copiedIndex.value = index
  setTimeout(() => { copiedIndex.value = null }, 2000)
}
</script>
