<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useUiStore } from '../../stores/uiStore'
import {
  Layers,
  ExternalLink,
  RefreshCw,
  FileText,
  Play,
  Terminal,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-vue-next'

const modelStore = useModelStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUiStore()

const iframeKey = ref(0)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const isFrameLoading = ref(false)

// Discovered models from modelStore
const discoveredModels = computed(() => {
  return modelStore.rootIds.map((rootId) => {
    const node = modelStore.getNode(rootId)
    const name = node?.name || rootId
    const templateName =
      node?.fields?.['template']?.value ||
      (node?.fields?.['parent_spec']?.value as any)?.name ||
      node?.type ||
      'business'
    const version = node?.fields?.['model_version']?.value || (node as any)?.version || '1.0.0'
    const desc = node?.rawSections?.description || node?.fields?.['description']?.value || ''

    // Derive canonical console path (e.g. artifacts/business_console.html)
    const normalizedTemplate = String(templateName).toLowerCase().replace(/_v_.*$/, '').replace(/_spec.*$/, '')
    const consolePath = `artifacts/${normalizedTemplate}_console.html`

    return {
      id: rootId,
      name,
      template: normalizedTemplate,
      version,
      description: desc,
      consolePath,
      sourcePath: node?.source?.path || `models/${name}_NN.md`,
    }
  })
})

const selectedConsoleTarget = ref<string>('hub')

const currentFrameUrl = computed(() => {
  if (selectedConsoleTarget.value === 'hub') {
    return 'artifacts/workspace_hub.html'
  }
  const targetModel = discoveredModels.value.find((m) => m.id === selectedConsoleTarget.value)
  return targetModel ? targetModel.consolePath : 'artifacts/workspace_hub.html'
})

const currentConsoleTitle = computed(() => {
  if (selectedConsoleTarget.value === 'hub') {
    return 'Workspace Console Hub'
  }
  const targetModel = discoveredModels.value.find((m) => m.id === selectedConsoleTarget.value)
  return targetModel ? `${targetModel.name} Console` : 'Model Console'
})

function reloadIframe() {
  iframeKey.value++
  isFrameLoading.value = true
}

function onFrameLoad() {
  isFrameLoading.value = false
}

function selectTarget(target: string) {
  selectedConsoleTarget.value = target
  reloadIframe()
}
</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
    <!-- Top Bar: Navigation & Action Toolbar -->
    <header class="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
          <Layers class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {{ currentConsoleTitle }}
            </h2>
            <span class="px-2 py-0.5 text-2xs font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Sandboxed View
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Interactive deliverables & aggregated workspace console portal
          </p>
        </div>
      </div>

      <!-- Console Switcher Tabs -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <button
          @click="selectTarget('hub')"
          class="px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5"
          :class="
            selectedConsoleTarget === 'hub'
              ? 'bg-white dark:bg-slate-700 text-primary shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          "
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Workspace Hub</span>
        </button>

        <button
          v-for="model in discoveredModels"
          :key="model.id"
          @click="selectTarget(model.id)"
          class="px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 capitalize"
          :class="
            selectedConsoleTarget === model.id
              ? 'bg-white dark:bg-slate-700 text-primary shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          "
          :title="`Launch ${model.name} Console`"
        >
          <FileText class="w-3.5 h-3.5" />
          <span class="truncate max-w-[120px]">{{ model.name }}</span>
        </button>
      </div>

      <!-- Actions: Refresh & Open in New Window -->
      <div class="flex items-center gap-2">
        <button
          @click="reloadIframe"
          class="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Reload Console"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isFrameLoading }" />
        </button>
        <a
          :href="currentFrameUrl"
          target="_blank"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs"
          title="Open in external browser window"
        >
          <span>Open External</span>
          <ExternalLink class="w-3.5 h-3.5" />
        </a>
      </div>
    </header>

    <!-- Main Content: Embedded Iframe or Guidance Empty State -->
    <div class="flex-1 relative overflow-hidden bg-slate-950 flex flex-col">
      <iframe
        :key="iframeKey"
        ref="iframeRef"
        :src="currentFrameUrl"
        class="w-full h-full border-none bg-slate-950"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        @load="onFrameLoad"
      ></iframe>
    </div>
  </div>
</template>
