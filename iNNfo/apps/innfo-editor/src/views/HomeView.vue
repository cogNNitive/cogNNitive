<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  FolderOpen,
  FolderClock,
  Sparkles,
  Trash2,
  X,
  AlertCircle,
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
import { modelStemMatches } from '../utils/modelMatching'

const router = useRouter()
const route = useRoute()
const workspace = useWorkspaceStore()
const { show: showToast } = useToast()
const error = ref<string | null>(null)
const history = ref<FolderHistoryEntry[]>([])
const reopenBusy = ref<string | null>(null)
const showWizard = ref(false)
const folderBusy = ref(false)
const folderInputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  history.value = await loadHistory()

  const createTemplate = route.query.createTemplate as string | undefined
  if (createTemplate) {
    showWizard.value = true
    router.replace({ query: {} })
  }

  // Auto-reopen the workspace that contains the deep-linked model, or the one
  // hinted via &ws= when provided. Falls back to the most recent workspace
  // when the model cannot be located in any previously opened folder.
  if (route.query.model && history.value.length > 0) {
    const modelId = typeof route.query.model === 'string' ? route.query.model : undefined
    const wsHint = typeof route.query.ws === 'string' ? route.query.ws : undefined
    const entry = await resolveWorkspaceForDeepLink(history.value, modelId, wsHint)
    if (entry) {
      try {
        const handle = await getStoredHandle(entry.handleKey)
        if (handle) {
          await workspace.open(handle, { force: true })
          await router.push({
            path: '/workspace',
            query: route.query,
            hash: route.hash,
          })
        }
      } catch (e) {
        console.warn('Failed to auto-reopen workspace:', e)
      }
    }
  }
})

/**
 * Picks the workspace entry a deep link (`?view=editor&model=<id>[&ws=<hint>]`)
 * should reopen. Priority: explicit `&ws=` hint, then the most recent entry
 * whose folder actually contains a model matching the deep-linked id. Falls
 * back to the most recent entry when nothing matches.
 */
async function resolveWorkspaceForDeepLink(
  entries: FolderHistoryEntry[],
  modelId?: string,
  wsHint?: string,
): Promise<FolderHistoryEntry | null> {
  if (wsHint) {
    const hinted = entries.find(
      (e) => e.handleKey === wsHint || e.name.toLowerCase() === wsHint.toLowerCase(),
    )
    if (hinted && (await isWorkspaceOpenable(hinted))) return hinted
  }

  if (modelId) {
    for (const entry of entries) {
      if (!(await isWorkspaceOpenable(entry))) continue
      const handle = await getStoredHandle(entry.handleKey)
      if (handle && (await folderContainsModel(handle, modelId))) return entry
    }
  }

  return entries[0] ?? null
}

async function isWorkspaceOpenable(entry: FolderHistoryEntry): Promise<boolean> {
  if (!entry.handleKey) return false
  const handle = await getStoredHandle(entry.handleKey)
  if (!handle) return false
  const status = await (
    handle as unknown as { queryPermission?: (opts: { mode: string }) => Promise<string> }
  ).queryPermission?.({ mode: 'read' })
  return status === 'granted'
}

async function folderContainsModel(root: DirectoryHandleLike, modelId: string): Promise<boolean> {
  let found = false
  const visit = async (dir: DirectoryHandleLike, depth: number): Promise<void> => {
    if (found || depth > 10) return
    for await (const [name, child] of dir.entries()) {
      if (found) return
      if (child.kind === 'directory') {
        await visit(child, depth + 1)
      } else if (modelStemMatches(name, modelId)) {
        found = true
        return
      }
    }
  }
  await visit(root, 0)
  return found
}

watch(
  () => workspace.emptyFolderError,
  (val) => {
    if (val) {
      showToast(
        workspace.error
          ? `Could not load the model: ${workspace.error}`
          : 'No iNNfo models found in this folder.',
        'warning',
      )
      workspace.emptyFolderError = false
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
            : 'No iNNfo model files (_NN.md) found in this folder. Please select a folder containing iNNfo models.'
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
</script>

<template>
  <div class="home max-w-4xl mx-auto p-6 space-y-8">
    <!-- Setup Wizard Modal -->
    <div
      v-if="showWizard"
      class="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">
        <button
          class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          aria-label="Close setup wizard"
          @click="showWizard = false"
        >
          <X class="w-5 h-5" />
        </button>
        <SetupWizard @done="showWizard = false" />
      </div>
    </div>

    <!-- Hero Card -->
    <section class="hero text-center space-y-4">
      <div
        class="bg-gradient-to-br from-purple-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-purple-900/20 dark:border-purple-900/40 rounded-2xl p-8 shadow-xs"
      >
        <h1 class="text-3xl font-black text-purple-950 dark:text-purple-300">
          iNNfo Editor &amp; Modeler
        </h1>
        <p class="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
          Open a local folder containing iNNfo model files (<code class="font-mono text-purple-700 dark:text-purple-300">*_NN.md</code>)
          to explore, edit, and visualize your models.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            class="px-6 py-3 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
            :disabled="folderBusy"
            @click="openWorkspace"
          >
            <FolderOpen class="w-4 h-4" />
            <span>{{ folderBusy ? 'Opening...' : 'Open Workspace Folder' }}</span>
          </button>

          <button
            class="px-5 py-3 rounded-xl bg-white dark:bg-slate-800 border border-purple-900/40 text-purple-900 dark:text-purple-300 font-bold text-xs hover:bg-purple-50 dark:hover:bg-slate-700/60 transition-all flex items-center gap-2 cursor-pointer"
            @click="showWizard = true"
          >
            <Sparkles class="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Guided Setup</span>
          </button>
        </div>

        <div
          v-if="error"
          class="mt-4 p-3 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-center gap-2"
          role="alert"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ error }}</span>
        </div>

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

    <!-- Recent Workspaces -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <FolderClock class="w-3.5 h-3.5" />
          <span>Recent Workspaces</span>
        </h2>
        <button
          v-if="history.length"
          class="text-2xs font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          @click="clearAllHistory"
        >
          Clear all
        </button>
      </div>

      <!-- History entries -->
      <div v-if="history.length" class="space-y-2">
        <button
          v-for="entry in history"
          :key="entry.handleKey"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left hover:border-purple-400 dark:hover:border-purple-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer group disabled:opacity-50"
          :disabled="reopenBusy === entry.handleKey"
          @click="reopenFolder(entry)"
        >
          <span
            class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0"
          >
            <FolderOpen class="w-4 h-4" />
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {{ entry.name }}
            </span>
            <span
              v-if="entry.path && entry.path !== entry.name"
              class="block text-3xs text-slate-400 dark:text-slate-500 truncate"
            >
              {{ entry.path }}
            </span>
          </span>
          <span class="text-3xs text-slate-400 dark:text-slate-500 shrink-0">
            {{ formatTimestamp(entry.timestamp) }}
          </span>
          <button
            type="button"
            class="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-slate-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
            :aria-label="`Remove ${entry.name} from recent workspaces`"
            @click.stop="removeEntry(entry.handleKey)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 space-y-1.5"
      >
        <p class="text-xs font-semibold text-slate-600 dark:text-slate-400">
          No recent workspaces yet
        </p>
        <p class="text-3xs">
          Open a local workspace folder containing iNNfo models to get started.
        </p>
      </div>
    </section>
  </div>
</template>

