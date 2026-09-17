<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
const resolvedUrl = ref<string | null>(null)

function normalizeSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

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

    const explicitConsole = typeof node?.fields?.['console']?.value === 'string' ? node.fields['console'].value : undefined
    const normalizedTemplate = String(templateName).toLowerCase().replace(/_v_.*$/, '').replace(/_spec.*$/, '')
    const defaultConsolePath = explicitConsole || `artifacts/${normalizedTemplate}_console.html`

    return {
      id: rootId,
      name,
      template: normalizedTemplate,
      version,
      description: desc,
      consolePath: defaultConsolePath,
      explicitConsole,
      sourcePath: node?.source?.path || `models/${name}_NN.md`,
    }
  })
})

const selectedConsoleTarget = ref<string>('hub')

function getCandidatePaths(target: string): string[] {
  if (target === 'hub') {
    const candidates = [
      'artifacts/workspace_hub.html',
      'export/workspace_hub/workspace_hub.html',
      'export/workspace_hub/master.html',
      'export/workspace_hub.html',
      'artifacts/workspace_console.html',
      'export/workspace_console/workspace_console.html',
      'export/workspace_console.html',
    ]

    // Check registered artifacts in modelStore
    for (const node of Object.values(modelStore.nodes)) {
      const isArtifact = node.type === 'Artifacts' || node.conceptBinding?.name === 'Artifacts'
      const ref = typeof node.fields?.['artifact_ref']?.value === 'string' ? node.fields['artifact_ref'].value : ''
      if (isArtifact && ref.endsWith('.html') && (ref.includes('workspace') || ref.includes('hub'))) {
        candidates.unshift(ref)
      }
    }

    return Array.from(new Set(candidates))
  }

  const model = discoveredModels.value.find((m) => m.id === target)
  if (!model) return ['artifacts/workspace_hub.html']

  const candidates: string[] = []

  // 1. Explicit console if specified on node
  if (model.explicitConsole) {
    candidates.push(model.explicitConsole)
  }

  const modelName = model.name
  const modelSlug = normalizeSlug(modelName)
  const sourceBasename = model.sourcePath
    ? model.sourcePath.split('/').pop()?.replace(/_NN\.md$/i, '') || ''
    : ''
  const sourceSlug = normalizeSlug(sourceBasename)

  // 2. Scan registered artifact references in graph
  for (const node of Object.values(modelStore.nodes)) {
    const isArtifact = node.type === 'Artifacts' || node.conceptBinding?.name === 'Artifacts'
    const ref = typeof node.fields?.['artifact_ref']?.value === 'string' ? node.fields['artifact_ref'].value : ''
    if (isArtifact && ref.endsWith('.html')) {
      const lowerRef = ref.toLowerCase()
      if (
        (modelSlug && lowerRef.includes(modelSlug)) ||
        (sourceSlug && lowerRef.includes(sourceSlug)) ||
        (sourceBasename && lowerRef.includes(sourceBasename.toLowerCase()))
      ) {
        candidates.push(ref)
      }
    }
  }

  // 3. Known exported console structures
  if (sourceBasename) {
    candidates.push(`export/${sourceBasename}_console/${sourceBasename}_console.html`)
    candidates.push(`export/${sourceBasename}_console/master.html`)
    candidates.push(`export/${sourceBasename}/${sourceBasename}.html`)
    candidates.push(`export/${sourceBasename}/master.html`)
    candidates.push(`artifacts/exports/${sourceBasename}.html`)
    candidates.push(`artifacts/exports/${sourceBasename}_Strategic_Master_V_0-1-0.html`)
  }

  if (sourceSlug && sourceSlug !== sourceBasename) {
    candidates.push(`export/${sourceSlug}_console/${sourceSlug}_console.html`)
    candidates.push(`export/${sourceSlug}_console/master.html`)
    candidates.push(`export/${sourceSlug}/${sourceSlug}.html`)
    candidates.push(`export/${sourceSlug}/master.html`)
    candidates.push(`artifacts/exports/${sourceSlug}.html`)
  }

  if (modelSlug) {
    candidates.push(`export/${modelSlug}_console/${modelSlug}_console.html`)
    candidates.push(`export/${modelSlug}_console/master.html`)
    candidates.push(`export/${modelSlug}/${modelSlug}.html`)
    candidates.push(`artifacts/exports/${modelSlug}.html`)
    candidates.push(`artifacts/${modelSlug}_console.html`)
  }

  // 4. Canonical template locations
  candidates.push(`artifacts/${model.template}_console.html`)
  candidates.push(`artifacts/${modelName}_console.html`)

  return Array.from(new Set(candidates))
}

const currentFrameUrl = computed<string>(() => {
  if (resolvedUrl.value) return resolvedUrl.value
  const candidates = getCandidatePaths(selectedConsoleTarget.value)
  return candidates[0] || 'artifacts/workspace_hub.html'
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
  const candidates = getCandidatePaths(selectedConsoleTarget.value)

  try {
    if (workspaceStore.handle) {
      for (const candidate of candidates) {
        try {
          const fileHandle = await resolveFileHandleForRead(workspaceStore.handle, candidate)
          if (fileHandle) {
            const file = await fileHandle.getFile()
            const text = await file.text()
            htmlContent.value = text
            resolvedUrl.value = candidate
            loadState.value = 'ready'
            return
          }
        } catch {
          // continue checking next candidate
        }
      }
    }

    // Fallback: try fetching candidates if hosted on web/preview
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate)
        if (res.ok) {
          const text = await res.text()
          htmlContent.value = text
          resolvedUrl.value = candidate
          loadState.value = 'ready'
          return
        }
      } catch {
        // continue
      }
    }

    htmlContent.value = null
    resolvedUrl.value = candidates[0] || null
    loadState.value = 'not_found'
  } catch {
    htmlContent.value = null
    resolvedUrl.value = candidates[0] || null
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
  resolvedUrl.value = null
}

watch([selectedConsoleTarget, () => workspaceStore.handle, iframeKey], () => {
  loadConsole()
})

// "Open External" (F-16): `currentFrameUrl` is a path relative to the user's
// folder, which is meaningless once resolved against the app's own origin —
// that's what makes the link 404 for a local folder opened via the File
// System Access API. When a folder handle is active, `loadConsole()` has
// already read the file content into `htmlContent`; build a Blob URL from
// it so the external link works for that primary flow too. Hosted/sample
// mode has no handle, so it keeps using the plain relative/absolute URL.
const externalBlobUrl = ref<string | null>(null)

function revokeExternalBlobUrl(): void {
  if (externalBlobUrl.value) {
    URL.revokeObjectURL(externalBlobUrl.value)
    externalBlobUrl.value = null
  }
}

watch([htmlContent, () => workspaceStore.handle], ([content, handle]) => {
  revokeExternalBlobUrl()
  if (handle && content) {
    const blob = new Blob([content], { type: 'text/html' })
    externalBlobUrl.value = URL.createObjectURL(blob)
  }
})

const externalHref = computed<string>(() => externalBlobUrl.value ?? currentFrameUrl.value)

onMounted(() => {
  loadConsole()
})

onUnmounted(() => {
  revokeExternalBlobUrl()
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
              <span
                v-if="resolvedUrl && loadState === 'ready'"
                class="px-2 py-0.5 text-2xs font-mono rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0 truncate max-w-xs"
                :title="resolvedUrl"
              >
                {{ resolvedUrl }}
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
            :href="externalHref"
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
    <div class="flex-1 relative overflow-hidden bg-slate-100/70 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <!-- Loading State -->
      <div v-if="loadState === 'loading'" class="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        <RefreshCw class="w-6 h-6 animate-spin text-blue-500" />
        <span class="text-xs font-mono">Loading console artifact...</span>
      </div>

      <!-- Ready State: Mount HTML with srcdoc -->
      <iframe
        v-else-if="loadState === 'ready' && htmlContent"
        :key="iframeKey"
        :srcdoc="htmlContent"
        class="w-full h-full border-none bg-white dark:bg-slate-950 rounded-xl shadow-xs"
        sandbox="allow-scripts allow-forms allow-popups"
      ></iframe>

      <!-- Not Found / Pending Build Empty State -->
      <div
        v-else
        class="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl flex flex-col gap-5 text-center items-center"
      >
        <div class="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
          <AlertCircle class="w-6 h-6" />
        </div>

        <div>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-2xs font-mono font-medium mb-2">
            Artifact Pending Compilation
          </div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white mb-1">
            Console Deliverable Not Found
          </h3>
          <p class="text-xs font-mono text-slate-500 dark:text-slate-400">
            {{ currentFrameUrl }}
          </p>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
          This workspace does not have a compiled console HTML file at this location yet. In iNNfo, interactive consoles are generated deliverables produced by running model compilation procedures.
        </p>

        <div class="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-left flex flex-col gap-2 font-mono text-xs">
          <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-2xs uppercase tracking-wider">
            <Terminal class="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>How to compile this console</span>
          </div>
          <p v-if="selectedConsoleTarget === 'hub'" class="text-slate-600 dark:text-slate-400 text-2xs">
            Run procedure: <span class="text-indigo-600 dark:text-indigo-400 font-semibold">compile_workspace_hub_NN.md</span> to aggregate all workspace models into <span class="text-emerald-600 dark:text-emerald-400">artifacts/workspace_hub.html</span>.
          </p>
          <p v-else class="text-slate-600 dark:text-slate-400 text-2xs">
            Run template procedure for <span class="text-indigo-600 dark:text-indigo-400 font-semibold">{{ currentTargetModel?.template || 'model' }}</span>: <span class="text-blue-600 dark:text-blue-400">compile_{{ currentTargetModel?.template }}_console_NN.md</span>.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="reloadIframe"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Re-check Artifact</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
