<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { normalizeSingleModel } from '@cognnitive/innfo-core'
import { useModelStore } from '../stores/modelStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { resolveParentSpecs } from '../services/SpecResolverService'
import { FileText } from 'lucide-vue-next'

const router = useRouter()
const modelStore = useModelStore()
const workspace = useWorkspaceStore()

const busy = ref(false)
const error = ref<string | null>(null)
const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

async function loadFile(file: File): Promise<void> {
  error.value = null
  busy.value = true
  try {
    const content = await file.text()
    const rootId = file.name.replace(/\.md$/i, '')

    workspace.reset()
    workspace.isSampleSession = false

    const rootIds = [rootId]
    const { nodes } = normalizeSingleModel(content, file.name, rootId)

    await resolveParentSpecs(nodes, rootIds)
    modelStore.setGraph(nodes, rootIds)

    workspace.hasParsed = true
    workspace.parseCount += 1
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  loadFile(file)
  input.value = ''
}

function onDrop(event: DragEvent): void {
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}
</script>

<template>
  <div
    class="info-doc min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 flex flex-col items-center"
  >
    <div class="max-w-2xl w-full space-y-6">
      <!-- Main Card -->
      <section
        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm text-center space-y-5"
      >
        <div>
          <span
            class="px-3 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 mb-3 inline-block"
          >
            cogNNitive &bull; iNNfo Document Hub
          </span>
          <h1 class="text-2xl font-black text-slate-900 dark:text-slate-100">
            Open iNNfo Model Document
          </h1>
          <p
            class="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed"
          >
            Open your <code>_NN.md</code> document in the <strong>Workspace Editor</strong>.
          </p>
        </div>

        <!-- File Dropzone -->
        <div
          class="border-2 border-dashed border-purple-200 dark:border-purple-900/60 rounded-xl p-8 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-500 transition-all cursor-pointer flex flex-col items-center gap-2 group"
          :class="{
            'border-purple-600 bg-purple-100/50': dragOver,
            'opacity-50 pointer-events-none': busy,
          }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          @click="fileInputRef?.click()"
        >
          <div
            class="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform"
          >
            <FileText class="w-5 h-5" />
          </div>
          <div>
            <span v-if="busy" class="text-xs font-bold text-slate-700 dark:text-slate-300"
              >Loading document&hellip;</span
            >
            <span v-else class="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Drop your <code class="text-purple-600 dark:text-purple-400">*****_NN.md</code> file here
            </span>
            <span class="text-2xs text-slate-500 dark:text-slate-400"
              >or click to browse your local filesystem</span
            >
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".md"
          class="hidden"
          @change="onFileSelected"
        />

        <p
          v-if="error"
          class="p-2.5 rounded-lg text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60"
          role="alert"
        >
          {{ error }}
        </p>
      </section>
    </div>
  </div>
</template>
