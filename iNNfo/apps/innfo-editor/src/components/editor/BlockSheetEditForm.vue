<template>
  <div class="space-y-6 flex flex-col">
    <!-- Warning banner for concepts -->
    <div
      v-if="isConcept"
      class="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-300 text-sm font-medium flex flex-col gap-3"
    >
      <div>
        These fields are inherited from the template and must be edited in the template.
      </div>

      <div
        v-if="templateNode"
        class="mt-2 border-t border-amber-200 dark:border-amber-900/40 pt-3 flex flex-col gap-2 font-normal"
      >
        <div
          class="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wide"
        >
          OpenCode Prompt (AI Editor)
        </div>
        <p class="text-xs text-amber-700 dark:text-amber-500">
          Copy and paste this prompt into OpenCode to ask the AI to perform modifications on
          the template file
          <code
            class="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded font-mono font-bold"
            >{{ templateFilename }}</code
          >:
        </p>

        <div class="relative mt-1">
          <textarea
            readonly
            :value="generatedPrompt"
            rows="6"
            class="w-full text-xs font-mono p-2 pr-10 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/80 rounded-md focus:outline-none text-slate-700 dark:text-slate-300 resize-none leading-normal"
          ></textarea>
          <button
            type="button"
            @click="$emit('copy-prompt')"
            class="absolute top-2 right-2 p-1.5 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 transition-all cursor-pointer flex items-center justify-center"
            :title="copied ? 'Copied!' : 'Copy prompt'"
          >
            <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          v-if="copied"
          class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold self-end transition-all"
        >
          Prompt copied to clipboard!
        </div>

        <div class="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/40 flex justify-end">
          <button
            type="button"
            @click="$emit('open-prompt-modal')"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            data-testid="open-custom-prompt-modal-btn"
          >
            <Terminal class="w-3.5 h-3.5" />
            <span>Generate custom prompt with notes...</span>
          </button>
        </div>
      </div>

      <!-- Concept Tags Editor -->
      <div
        class="mt-3 border-t border-amber-200 dark:border-amber-900/40 pt-3 flex flex-col gap-1.5"
        data-testid="concept-tags-editor"
      >
        <label
          class="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wide"
        >
          Concept Tags
        </label>
        <TagInput :model-value="localTags" @update:model-value="$emit('update:concept-tags', $event)" />
      </div>
    </div>

    <div
      v-else-if="conceptFields && conceptFields.length"
      class="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <div v-for="field in conceptFields" :key="field.name" class="flex flex-col gap-1">
        <label
          class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
          >{{ field.name.replace(/_/g, ' ') }}</label
        >
        <WidgetField
          :node-id="blockIdForFields"
          :field-key="field.name"
          :widget-type="field.type || 'string'"
          :field-definition="field"
        />
      </div>
    </div>

    <!-- Element Tags Editor -->
    <div
      v-if="!isConcept"
      class="flex flex-col gap-1.5"
      data-testid="block-sheet-tags-editor"
    >
      <label
        class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >Tags</label
      >
      <TagInput :model-value="localTags" @update:model-value="$emit('update:tags', $event)" />
    </div>

    <!-- Description / Details (WYSIWYG Markdown Editor) -->
    <div class="flex flex-col min-h-[120px] gap-1.5">
      <label
        class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >Description / Details</label
      >
      <MinimalMarkdownEditor
        :model-value="description"
        @update:model-value="$emit('update:description', $event)"
        placeholder="Enter description (supports WYSIWYG formatting & markdown)..."
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Copy, Terminal } from 'lucide-vue-next'
import WidgetField from '../../shared/widgets/WidgetField.vue'
import MinimalMarkdownEditor from '../ui/MinimalMarkdownEditor.vue'
import TagInput from '../ui/TagInput.vue'

defineProps<{
  isConcept: boolean
  templateNode?: any
  templateFilename: string
  generatedPrompt: string
  copied: boolean
  localTags: string[]
  conceptFields?: any[]
  blockIdForFields: string
  description: string
}>()

defineEmits<{
  'copy-prompt': []
  'open-prompt-modal': []
  'update:concept-tags': [tags: string[]]
  'update:tags': [tags: string[]]
  'update:description': [val: string]
}>()
</script>
