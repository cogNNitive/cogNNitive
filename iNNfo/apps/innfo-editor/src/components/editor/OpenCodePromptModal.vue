<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      @click.self="close"
    >
      <div
        class="relative flex flex-col w-[92vw] max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        @keydown.escape="close"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Terminal class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
                OpenCode Prompt Generator
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Generate contextual instructions to paste directly into OpenCode
              </p>
            </div>
          </div>
          <button
            @click="close"
            class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
          <!-- Target Context summary badge -->
          <div class="text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <span class="font-semibold text-indigo-600 dark:text-indigo-400">Target:</span>
            <span class="font-mono truncate">{{ targetDescription }}</span>
          </div>

          <!-- User Notes Textarea -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Agent Instructions (Comments or notes)
            </label>
            <textarea
              v-model="userNotes"
              rows="3"
              placeholder="Type your comments or instructions for the agent here (e.g., refactor this block, add validation...)"
              class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-y"
              data-testid="prompt-notes-input"
            />
          </div>

          <!-- Generated Prompt Preview -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Prompt Preview
              </label>
              <span class="text-[11px] text-slate-400">Ready to copy</span>
            </div>
            <div
              class="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto max-h-64 whitespace-pre-wrap select-all"
              data-testid="prompt-preview-box"
            >
              {{ generatedPrompt }}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <button
            @click="close"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="copyPrompt"
            class="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            data-testid="copy-generated-prompt-btn"
          >
            <component :is="copied ? Check : Copy" class="w-4 h-4" />
            <span>{{ copied ? 'Prompt Copied!' : 'Copy Prompt for OpenCode' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Terminal, Copy, Check, X } from 'lucide-vue-next'
import { generateOpenCodePrompt, type PromptContext } from '../../utils/promptGenerator'

const props = defineProps<{
  isOpen: boolean
  context: PromptContext
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const userNotes = ref('')
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

const targetDescription = computed(() => {
  const c = props.context
  if (c.elementName) return `${c.conceptName || 'Element'}: ${c.elementName}`
  if (c.conceptName) return `Concept: ${c.conceptName}`
  if (c.modelName) return `Model: ${c.modelName}`
  return 'Workspace'
})

const generatedPrompt = computed(() => {
  return generateOpenCodePrompt({
    ...props.context,
    userNotes: userNotes.value.trim()
  })
})

function close(): void {
  emit('close')
}

async function copyPrompt(): Promise<void> {
  try {
    const text = generatedPrompt.value
    await navigator.clipboard.writeText(text)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch (err) {
    // Fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = generatedPrompt.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 2500)
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      userNotes.value = ''
      copied.value = false
    }
  }
)
</script>
