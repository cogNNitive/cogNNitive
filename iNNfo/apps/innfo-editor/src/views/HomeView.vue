<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Component } from 'vue'
import {
  Building2,
  ClipboardList,
  Users,
  FlaskConical,
  BookOpen,
  Play,
  Layout,
  Sparkles,
  Terminal,
  Copy,
  Check,
} from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspaceStore'
import type { DirectoryHandleLike } from '../model/fs-types'
import type { FolderHistoryEntry } from '../shared/validation-types'
import {
  loadHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  formatTimestamp,
  getStoredHandle,
} from '../stores/historyStore'
import { normalizeSingleModel } from '@cognnitive/innfo-core'
import { useModelStore } from '../stores/modelStore'
import { resolveParentSpecs } from '../services/SpecResolverService'
import { useToast } from '../shared/useToast'
import SetupWizard from '../components/layout/SetupWizard.vue'
import { SAMPLE_BASE } from '../config/samples'

const router = useRouter()
const route = useRoute()
const workspace = useWorkspaceStore()
const { show: showToast } = useToast()
const error = ref<string | null>(null)
const busy = ref(false)
const urlInput = ref('')
const urlBusy = ref(false)
const history = ref<FolderHistoryEntry[]>([])
const reopenBusy = ref<string | null>(null)

const samplePrompt = ref(
  'Analiza este proyecto y genera la documentación siguiendo el metamodelo iNNfo.',
)
const copiedPrompt = ref(false)

function copyPromptToClipboard(): void {
  navigator.clipboard.writeText(samplePrompt.value)
  copiedPrompt.value = true
  setTimeout(() => {
    copiedPrompt.value = false
  }, 2000)
}

interface ExampleModel {
  id: string
  name: string
  description: string
  templateName: string
  url: string
  supportsStandalone?: boolean
}

const samples: ExampleModel[] = [
  {
    id: 'sample-code-review',
    name: 'Ghostbusters',
    description:
      'Ghost containment protocol: roles, step-by-step workflow, tool bindings, and recovery path.',
    templateName: 'procedures',
    url: `${SAMPLE_BASE}/procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md`,
    supportsStandalone: true,
  },
  {
    id: 'sample-ghostbusters',
    name: 'Ghostbusters',
    description:
      'Business model for a fictional ghost-catching franchise: SWOT, risks, market segments, finance, legal, and operations.',
    templateName: 'business',
    url: `${SAMPLE_BASE}/business/samples/Ghostbusters_V_0-2-0_business_NN.md`,
  },
  {
    id: 'sample-organization',
    name: 'Ghostbusters Inc.',
    description:
      'Organization structure: positions, roles, members, reporting lines, and a skills matrix.',
    templateName: 'organization',
    url: `${SAMPLE_BASE}/organization/samples/Ghostbusters_V_0-2-0_organization_NN.md`,
  },
]

onMounted(async () => {
  history.value = await loadHistory()

  const createTemplate = route.query.createTemplate as string | undefined
  if (createTemplate) {
    showWizard.value = true
    router.replace({ query: {} })
  }

  // Auto-reopen most recent workspace if deep link parameters are present
  if (route.query.model && history.value.length > 0) {
    const entry = history.value[0]
    try {
      const handle = await getStoredHandle(entry.handleKey)
      if (handle) {
        const status = await (
          handle as unknown as { queryPermission?: (opts: { mode: string }) => Promise<string> }
        ).queryPermission?.({ mode: 'read' })
        if (status === 'granted') {
          await workspace.open(handle, { force: true })
          await router.push({
            path: '/workspace',
            query: route.query,
            hash: route.hash,
          })
        }
      }
    } catch (e) {
      console.warn('Failed to auto-reopen workspace:', e)
    }
  }
})

watch(
  () => workspace.emptyFolderError,
  (val) => {
    if (val) {
      showToast(
        workspace.error
          ? `Could not load the model: ${workspace.error}`
          : 'No iNNfo models found in this folder. Try the examples below to get started.',
        'warning',
      )
      workspace.emptyFolderError = false
      const el = document.querySelector('.samples')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  },
)

async function reopenFolder(entry: FolderHistoryEntry): Promise<void> {
  error.value = null
  if (reopenBusy.value) return
  reopenBusy.value = entry.handleKey
  try {
    const handle = await getStoredHandle(entry.handleKey)
    if (!handle) {
      await removeFromHistory(entry.handleKey)
      history.value = await loadHistory()
      error.value = `"${entry.name}" is no longer accessible. It has been removed from your recent list.`
      return
    }

    const perm = await (
      handle as unknown as { requestPermission?: (opts: { mode: string }) => Promise<string> }
    ).requestPermission?.({ mode: 'read' })

    if (perm === 'denied' || perm === 'prompt') {
      await removeFromHistory(entry.handleKey)
      history.value = await loadHistory()
      error.value = `Cannot open "${entry.name}" — permission was denied.`
      return
    }

    await workspace.open(handle, { force: true })
    await router.push({ path: '/workspace', query: route.query, hash: route.hash })
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    reopenBusy.value = null
  }
}

async function removeEntry(handleKey: string): Promise<void> {
  await removeFromHistory(handleKey)
  history.value = await loadHistory()
}

async function clearAllHistory(): Promise<void> {
  await clearHistory()
  history.value = await loadHistory()
}

const sandboxUrl = `${SAMPLE_BASE}/organization/samples/Ghostbusters_V_0-2-0_organization_NN.md`
const sandboxBusy = ref(false)
const showSandbox = ref(!localStorage.getItem('nn_hide_sandbox'))
const showWizard = ref(false)
const folderBusy = ref(false)
const folderInputRef = ref<HTMLInputElement | null>(null)

const docsUrl = 'https://cognnitive.com/innfo/documentation/'

async function openWorkspace(): Promise<void> {
  error.value = null
  folderBusy.value = true
  try {
    const picker = (
      window as unknown as {
        showDirectoryPicker?: (opts?: { id?: string }) => Promise<DirectoryHandleLike>
      }
    ).showDirectoryPicker
    if (picker) {
      const handle = await picker.call(window, { id: 'innfo-workspace' })
      await workspace.open(handle)
      if (!workspace.hasParsed) {
        if (workspace.emptyFolderError) {
          error.value = workspace.error
            ? `Could not load any iNNfo model: ${workspace.error}`
            : 'No iNNfo model files (_NN.md) found in this folder. Try opening a folder that contains model files, or use the samples below.'
        } else if (workspace.error) {
          error.value = workspace.error
        }
        return
      }
      if (workspace.error) {
        error.value = workspace.error
        return
      }
      await addToHistory(handle.name, handle)
      history.value = await loadHistory()
      await router.push({ path: '/workspace', query: route.query, hash: route.hash })
    } else {
      error.value =
        'Your browser does not support the File System Access API. Using fallback folder picker (read-only).'
      folderInputRef.value?.click()
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    folderBusy.value = false
  }
}

async function onFolderInputChange(event: Event): Promise<void> {
  error.value = null
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  folderBusy.value = true
  try {
    const nnFiles = Array.from(files).filter((f) => f.name.endsWith('_NN.md'))
    if (nnFiles.length === 0) {
      error.value = 'No iNNfo model files (_NN.md) found in this folder.'
      return
    }

    const modelStore = useModelStore()
    const allNodes: Record<string, import('../model/types').ModelNode> = {}
    const rootIds: string[] = []

    for (const file of nnFiles) {
      const content = await file.text()
      const rootId = file.name.replace(/\.md$/i, '')
      const result = normalizeSingleModel(content, file.webkitRelativePath || file.name, rootId)
      Object.assign(allNodes, result.nodes)
      rootIds.push(rootId)
    }

    await resolveParentSpecs(allNodes, rootIds)
    modelStore.setGraph(allNodes, rootIds)

    workspace.hasParsed = true
    workspace.parseCount += 1
    workspace.emptyFolderError = false

    const relPath = nnFiles[0].webkitRelativePath
    const dirName = relPath.split('/')[0] || 'workspace'
    await addToHistory(dirName, null as unknown as any, relPath)
    history.value = await loadHistory()
    router.push({ path: '/workspace', query: route.query, hash: route.hash })
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    folderBusy.value = false
    input.value = ''
  }
}

async function loadFromUrl(): Promise<void> {
  error.value = null
  const url = urlInput.value.trim()
  if (!url) {
    error.value = 'Please enter a valid URL.'
    return
  }
  try {
    new URL(url)
  } catch {
    error.value = 'Invalid URL format.'
    return
  }
  urlBusy.value = true
  try {
    await workspace.loadFromUrl(url)
    await addToHistory(url, null as unknown as any, url)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    urlBusy.value = false
  }
}

async function loadSandbox(): Promise<void> {
  error.value = null
  sandboxBusy.value = true
  try {
    await workspace.loadFromUrl(sandboxUrl)
    await addToHistory('Sandbox', null as unknown as any)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    sandboxBusy.value = false
  }
}

async function onSampleClick(sample: ExampleModel): Promise<void> {
  error.value = null
  urlBusy.value = true
  try {
    await workspace.loadFromUrl(sample.url, sample.templateName)
    await addToHistory(`${sample.name} Sample`, null as unknown as any)
    history.value = await loadHistory()
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    urlBusy.value = false
  }
}

function openStandaloneSample(sample: ExampleModel): void {
  router.push({ name: 'view-procedure', query: { url: sample.url } })
}
</script>

<template>
  <div class="home max-w-5xl mx-auto p-6 space-y-8">
    <!-- Setup Wizard Modal -->
    <div
      v-if="showWizard"
      class="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">
        <button
          class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          @click="showWizard = false"
        >
          &times;
        </button>
        <SetupWizard @done="showWizard = false" />
      </div>
    </div>

    <!-- Hero Card -->
    <section class="hero text-center space-y-4">
      <div
        class="bg-gradient-to-br from-purple-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-2 border-purple-900/30 dark:border-purple-900/50 rounded-2xl p-8 shadow-sm"
      >
        <h1 class="text-3xl font-black text-purple-950 dark:text-purple-300">
          iNNfo Editor &amp; Modeler
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Open a folder containing iNNfo model files, explore live sample models in the workspace or
          run them standalone.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3 mt-5">
          <button
            class="px-6 py-3 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            :disabled="folderBusy"
            @click="openWorkspace"
          >
            <Layout class="w-4 h-4" />
            <span>{{ folderBusy ? 'Opening...' : 'Open Existing Workspace' }}</span>
          </button>

          <button
            class="px-5 py-3 rounded-xl bg-white dark:bg-slate-800 border border-purple-900/40 text-purple-900 dark:text-purple-300 font-bold text-xs hover:bg-purple-50 transition-all cursor-pointer"
            @click="showWizard = true"
          >
            Guided Setup &rarr;
          </button>
        </div>

        <p
          v-if="error"
          class="mt-4 p-3 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
          role="alert"
        >
          {{ error }}
        </p>

        <input
          ref="folderInputRef"
          type="file"
          webkitdirectory
          multiple
          class="hidden"
          @change="onFolderInputChange"
        />
      </div>
    </section>

    <!-- Recent Models -->
    <section v-if="history.length" class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Recent Models
        </h3>
        <button
          class="text-2xs font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
          @click="clearAllHistory"
        >
          Clear
        </button>
      </div>

      <div class="space-y-1.5">
        <button
          v-for="entry in history"
          :key="entry.handleKey"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer group disabled:opacity-50"
          :disabled="reopenBusy === entry.handleKey"
          @click="reopenFolder(entry)"
        >
          <span
            class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0"
          >
            <Layout class="w-4 h-4" />
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{{
              entry.name
            }}</span>
            <span
              v-if="entry.path && entry.path !== entry.name"
              class="block text-3xs text-slate-400 dark:text-slate-500 truncate"
              >{{ entry.path }}</span
            >
          </span>
          <span class="text-3xs text-slate-400 dark:text-slate-500 shrink-0">{{
            formatTimestamp(entry.timestamp)
          }}</span>
          <span
            class="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            role="button"
            tabindex="0"
            aria-label="Remove {{ entry.name }} from recent models"
            @click.stop="removeEntry(entry.handleKey)"
            @keydown.enter.prevent="removeEntry(entry.handleKey)"
            @keydown.space.prevent="removeEntry(entry.handleKey)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </span>
        </button>
      </div>
    </section>

    <!-- OpenCode Model Generation Section -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Creating Models from Templates
        </h3>
        <span
          class="px-2 py-0.5 rounded text-3xs font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
        >
          Recommended: OpenCode + AI Skill
        </span>
      </div>

      <div
        class="p-6 rounded-2xl border border-purple-900/20 dark:border-purple-900/40 bg-gradient-to-br from-purple-50/50 via-white to-slate-50 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 shadow-xs space-y-5"
      >
        <div class="flex items-start gap-4">
          <div
            class="w-10 h-10 rounded-xl bg-purple-900/10 dark:bg-purple-900/30 text-purple-900 dark:text-purple-300 flex items-center justify-center shrink-0"
          >
            <Sparkles class="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="space-y-1">
            <h4 class="text-base font-bold text-slate-900 dark:text-slate-100">
              Creación Inteligente con OpenCode y el Skill iNNfo
            </h4>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Las plantillas estáticas "Starter" han sido sustituidas por la generación dinámica
              mediante Inteligencia Artificial. La forma recomendada de crear un modelo completo y
              actualizado desde cualquier plantilla (Business, Procedures, Organization) es
              utilizando <strong>OpenCode</strong> con el skill <strong>iNNfo</strong>.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div
            class="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1"
          >
            <div class="text-2xs font-black uppercase text-purple-600 dark:text-purple-400">
              Paso 1
            </div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Abre OpenCode</div>
            <p class="text-3xs text-slate-500 dark:text-slate-400">
              Ejecuta
              <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">npx opencode</code> en el
              directorio de tu proyecto.
            </p>
          </div>

          <div
            class="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1"
          >
            <div class="text-2xs font-black uppercase text-purple-600 dark:text-purple-400">
              Paso 2
            </div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Instruye a la IA</div>
            <p class="text-3xs text-slate-500 dark:text-slate-400">
              Pídele al agente que cree un modelo usando la plantilla de nivel 2 (ej. Business
              v0.2.0).
            </p>
          </div>

          <div
            class="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1"
          >
            <div class="text-2xs font-black uppercase text-purple-600 dark:text-purple-400">
              Paso 3
            </div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
              Generación directa
            </div>
            <p class="text-3xs text-slate-500 dark:text-slate-400">
              El agente generará el archivo
              <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">_NN.md</code> completo y
              sincronizado.
            </p>
          </div>

          <div
            class="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1"
          >
            <div class="text-2xs font-black uppercase text-purple-600 dark:text-purple-400">
              Paso 4
            </div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Abre en Editor</div>
            <p class="text-3xs text-slate-500 dark:text-slate-400">
              Abre el workspace aquí para explorar las matrices y el árbol interactivo.
            </p>
          </div>
        </div>

        <!-- Prompt Copy Box -->
        <div class="p-3.5 rounded-xl bg-slate-900 text-slate-200 space-y-2">
          <div class="flex items-center justify-between text-3xs font-mono text-slate-400">
            <span class="flex items-center gap-1.5"
              ><Terminal class="w-3.5 h-3.5 text-purple-400" /> Prompt de ejemplo para
              OpenCode:</span
            >
            <button
              class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-xs font-sans font-semibold"
              @click="copyPromptToClipboard"
            >
              <Check v-if="copiedPrompt" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copiedPrompt ? '¡Copiado!' : 'Copiar Prompt' }}</span>
            </button>
          </div>
          <code
            class="block text-xs font-mono text-purple-200 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800"
          >
            {{ samplePrompt }}
          </code>
        </div>

        <div class="flex items-center justify-between pt-1">
          <button
            v-if="showSandbox"
            class="px-4 py-2 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200 text-xs font-bold hover:border-amber-500 transition-all flex items-center gap-2 cursor-pointer"
            :disabled="sandboxBusy"
            @click="loadSandbox"
          >
            <FlaskConical class="w-4 h-4 text-amber-600" />
            <span
              >¿Quieres probar la interfaz sin crear archivos? Probar Sandbox Instantáneo
              &rarr;</span
            >
          </button>
        </div>
      </div>
    </section>

    <!-- Sample Models Section with Workspace vs Standalone buttons -->
    <section class="space-y-4">
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Explore Example Models
        </h3>
        <p class="text-2xs text-slate-500">
          Launch live samples in full Workspace Editor or Standalone Viewer mode.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="s in samples"
          :key="s.id"
          class="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">{{ s.name }}</h4>
              <span
                class="px-2 py-0.5 rounded text-3xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {{ s.templateName }}
              </span>
            </div>
            <p class="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {{ s.description }}
            </p>
          </div>

          <div class="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              :disabled="urlBusy"
              @click="onSampleClick(s)"
            >
              <Layout class="w-3.5 h-3.5 text-blue-500" />
              <span>Explore in Workspace</span>
            </button>

            <button
              v-if="s.supportsStandalone"
              class="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              @click="openStandaloneSample(s)"
            >
              <Play class="w-3.5 h-3.5" />
              <span>Launch Standalone Viewer</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Load from URL -->
    <section
      class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3"
    >
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Load Model from URL
      </h3>
      <div class="flex gap-2">
        <input
          v-model="urlInput"
          type="url"
          placeholder="https://example.com/Ghostbusters_V_0-2-0_procedures_NN.md"
          class="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
          @keydown.enter="loadFromUrl"
        />
        <button
          class="px-4 py-2 text-xs font-bold bg-purple-900 hover:bg-purple-950 text-white rounded-lg transition-colors cursor-pointer"
          :disabled="urlBusy || !urlInput.trim()"
          @click="loadFromUrl"
        >
          {{ urlBusy ? 'Loading...' : 'Load Workspace' }}
        </button>
      </div>
      <p class="text-3xs text-slate-400 flex items-center gap-1">
        <BookOpen class="w-3 h-3" />
        Learn more in the
        <a :href="docsUrl" target="_blank" class="underline hover:text-purple-600">documentation</a
        >.
      </p>
    </section>
  </div>
</template>
