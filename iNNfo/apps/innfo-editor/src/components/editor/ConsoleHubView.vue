<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useUiStore } from '../../stores/uiStore'
import { resolveFileHandleForRead } from '../../services/WorkspacePersistenceService'
import {
  Layers,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  Terminal,
} from 'lucide-vue-next'

const modelStore = useModelStore()
const workspaceStore = useWorkspaceStore()
const uiStore = useUiStore()

const iframeKey = ref(0)
const isFrameLoading = ref(false)
const htmlContent = ref<string | null>(null)
const loadState = ref<'loading' | 'ready' | 'not_found'>('loading')

// Discovered models from modelStore
const discoveredModels = computed(() => {
  return modelStore.rootIds.map((rootId) => {
    const node = modelStore.getNode(rootId)
    const name = node?.name || rootId
    const templateName =
      (typeof node?.fields?.['template']?.value === 'string' ? node.fields['template'].value : null) ||
      (node?.fields?.['parent_spec']?.value as any)?.name ||
      node?.type ||
      'business'
    const version =
      (typeof node?.fields?.['model_version']?.value === 'string' ? node.fields['model_version'].value : null) ||
      (node as any)?.version ||
      '1.0.0'
    const desc =
      node?.rawSections?.description ||
      (typeof node?.fields?.['description']?.value === 'string' ? node.fields['description'].value : '') ||
      ''

    // Derive canonical console path (e.g. artifacts/business_console.html)
    const explicitConsole = typeof node?.fields?.['console']?.value === 'string' ? node.fields['console'].value : undefined
    const normalizedTemplate = String(templateName).toLowerCase().replace(/_v_.*$/, '').replace(/_spec.*$/, '')
    const consolePath: string = explicitConsole || `artifacts/${normalizedTemplate}_console.html`

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

const currentFrameUrl = computed<string>(() => {
  if (selectedConsoleTarget.value === 'hub') {
    return 'artifacts/workspace_hub.html'
  }
  const targetModel = discoveredModels.value.find((m) => m.id === selectedConsoleTarget.value)
  return targetModel ? targetModel.consolePath : 'artifacts/workspace_hub.html'
})

const currentConsoleTitle = computed<string>(() => {
  if (selectedConsoleTarget.value === 'hub') {
    return 'Workspace Console Hub'
  }
  const targetModel = discoveredModels.value.find((m) => m.id === selectedConsoleTarget.value)
  return targetModel ? `${targetModel.name} Console` : 'Model Console'
})

const currentTargetModel = computed(() => {
  if (selectedConsoleTarget.value === 'hub') return null
  return discoveredModels.value.find((m) => m.id === selectedConsoleTarget.value) || null
})

async function loadConsole() {
  loadState.value = 'loading'
  isFrameLoading.value = true
  const targetPath: string = String(currentFrameUrl.value || 'artifacts/workspace_hub.html')

  try {
    if (workspaceStore.handle) {
      const fileHandle = await resolveFileHandleForRead(workspaceStore.handle, targetPath)
      if (fileHandle) {
        const file = await fileHandle.getFile()
        const text = await file.text()
        htmlContent.value = text
        loadState.value = 'ready'
        return
      }
    }

    // Fallback: try fetching if hosted on web/preview
    const res = await fetch(targetPath)
    if (res.ok) {
      const text = await res.text()
      htmlContent.value = text
      loadState.value = 'ready'
      return
    }

    htmlContent.value = null
    loadState.value = 'not_found'
  } catch {
    htmlContent.value = null
    loadState.value = 'not_found'
  } finally {
    isFrameLoading.value = false
  }
}

function reloadIframe() {
  iframeKey.value++
  loadConsole()
}

function selectTarget(target: string) {
  selectedConsoleTarget.value = target
}

watch([currentFrameUrl, () => workspaceStore.handle, iframeKey], () => {
  loadConsole()
})

onMounted(() => {
  loadConsole()
})
</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
    <!-- Top Bar: Spacious 2-Tier Header Layout -->
    <header class="flex flex-col gap-2.5 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs">
      <!-- Upper Tier: Title, Badge & Global Actions -->
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 shrink-0 shadow-2xs">
            <Layers class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {{ currentConsoleTitle }}
              </h2>
              <span class="px-2 py-0.5 text-2xs font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                Sandboxed View
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
              Interactive deliverables & aggregated workspace console portal
            </p>
          </div>
        </div>

        <!-- Actions: Refresh & Open in New Window -->
        <div class="flex items-center gap-2 shrink-0 ml-auto">
          <button
            @click="reloadIframe"
            class="px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700"
            title="Reload Console"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isFrameLoading }" />
            <span>Reload</span>
          </button>
          <a
            :href="currentFrameUrl"
            target="_blank"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs"
            title="Open in external browser window"
          >
            <span>Open External</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <!-- Lower Tier: Scrollable Console Switcher Tabs -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto scrollbar-none">
        <button
          @click="selectTarget('hub')"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
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
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 capitalize shrink-0"
          :class="
            selectedConsoleTarget === model.id
              ? 'bg-white dark:bg-slate-700 text-primary shadow-xs font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          "
          :title="`Launch ${model.name} Console`"
        >
          <FileText class="w-3.5 h-3.5" />
          <span>{{ model.name }}</span>
        </button>
      </div>
    </header>

    <!-- Main Content: Embedded Iframe or Clean Actionable Empty State -->
    <div class="flex-1 relative overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-6">
      <!-- Loading State -->
      <div v-if="loadState === 'loading'" class="flex flex-col items-center gap-3 text-slate-400">
        <RefreshCw class="w-6 h-6 animate-spin text-blue-500" />
        <span class="text-xs font-mono">Loading console artifact...</span>
      </div>

      <!-- Ready State: Mount HTML with srcdoc -->
      <iframe
        v-else-if="loadState === 'ready' && htmlContent"
        :key="iframeKey"
        :srcdoc="htmlContent"
        class="w-full h-full border-none bg-slate-950"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      ></iframe>

      <!-- Not Found / Pending Build Empty State -->
      <div
        v-else
        class="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col gap-5 text-center items-center"
      >
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
          <AlertCircle class="w-6 h-6" />
        </div>

        <div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-2xs font-mono font-medium mb-2">
            Artifact Pending Compilation
          </div>
          <h3 class="text-base font-bold text-white mb-1">
            Console Deliverable Not Found
          </h3>
          <p class="text-xs font-mono text-slate-400">
            {{ currentFrameUrl }}
          </p>
        </div>

        <p class="text-xs text-slate-400 leading-relaxed max-w-md">
          This workspace does not have a compiled console HTML file at this location yet. In iNNfo, interactive consoles are generated deliverables produced by running model compilation procedures.
        </p>

        <div class="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left flex flex-col gap-2 font-mono text-xs">
          <div class="flex items-center gap-2 text-slate-300 font-semibold text-2xs uppercase tracking-wider">
            <Terminal class="w-3.5 h-3.5 text-blue-400" />
            <span>How to compile this console</span>
          </div>
          <p v-if="selectedConsoleTarget === 'hub'" class="text-slate-400 text-2xs">
            Run procedure: <span class="text-indigo-400 font-semibold">compile_workspace_hub_NN.md</span> to aggregate all workspace models into <span class="text-emerald-400">artifacts/workspace_hub.html</span>.
          </p>
          <p v-else class="text-slate-400 text-2xs">
            Run template procedure for <span class="text-indigo-400 font-semibold">{{ currentTargetModel?.template || 'model' }}</span>: <span class="text-blue-400">compile_{{ currentTargetModel?.template }}_console_NN.md</span>.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="reloadIframe"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Re-check Artifact</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
