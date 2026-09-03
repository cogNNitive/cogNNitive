<template>
  <div
    class="minimal-markdown-editor border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 transition-all focus-within:ring-1 focus-within:ring-indigo-500"
  >
    <!-- Toolbar -->
    <div
      v-if="!readonly"
      class="widget-markdown-toolbar flex items-center flex-wrap gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 select-none text-xs"
    >
      <!-- Bold -->
      <button
        type="button"
        @click="toggleBold"
        :class="[
          'p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
          isBoldActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold' : ''
        ]"
        title="Bold (Ctrl+B)"
      >
        <Bold class="w-3.5 h-3.5" />
      </button>

      <!-- Italic -->
      <button
        type="button"
        @click="toggleItalic"
        :class="[
          'p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
          isItalicActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold' : ''
        ]"
        title="Italic (Ctrl+I)"
      >
        <Italic class="w-3.5 h-3.5" />
      </button>

      <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

      <!-- Headings dropdown (H2, H3, H4, H5) -->
      <div class="relative" ref="headingMenuRef">
        <button
          type="button"
          @click="showHeadingMenu = !showHeadingMenu"
          class="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold"
          title="Headings (H2-H5)"
        >
          <Heading class="w-3.5 h-3.5" />
          <span>{{ currentHeadingLabel }}</span>
          <ChevronDown class="w-3 h-3 text-slate-400" />
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="showHeadingMenu"
          class="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 min-w-[110px]"
        >
          <button
            v-for="h in headingOptions"
            :key="h.level"
            type="button"
            @click="selectHeading(h.level)"
            class="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
          >
            <span :class="h.class">{{ h.label }}</span>
            <Check v-if="activeHeadingLevel === h.level" class="w-3.5 h-3.5 text-indigo-500" />
          </button>
        </div>
      </div>

      <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

      <!-- Callout / Notes dropdown ( > Quote / > [!NOTE] / > [!TIP] / > [!WARNING] ) -->
      <div class="relative" ref="noteMenuRef">
        <button
          type="button"
          @click="showNoteMenu = !showNoteMenu"
          class="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold"
          title="Insert Note / Callout (>)"
        >
          <Quote class="w-3.5 h-3.5" />
          <span>Note</span>
          <ChevronDown class="w-3 h-3 text-slate-400" />
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="showNoteMenu"
          class="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 min-w-[140px]"
        >
          <button
            v-for="n in noteOptions"
            :key="n.type"
            type="button"
            @click="insertNote(n.prefix)"
            class="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-xs"
          >
            <span class="w-2 h-2 rounded-full" :class="n.dotColor"></span>
            <span>{{ n.label }}</span>
          </button>
        </div>
      </div>

      <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

      <!-- Bullet list -->
      <button
        type="button"
        @click="toggleBulletList"
        :class="[
          'p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
          isBulletActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : ''
        ]"
        title="Bullet list"
      >
        <List class="w-3.5 h-3.5" />
      </button>

      <!-- Numbered list -->
      <button
        type="button"
        @click="toggleOrderedList"
        :class="[
          'p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
          isOrderedActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : ''
        ]"
        title="Numbered list"
      >
        <ListOrdered class="w-3.5 h-3.5" />
      </button>

      <!-- Code block -->
      <button
        type="button"
        @click="toggleCode"
        :class="[
          'p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
          isCodeActive ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : ''
        ]"
        title="Code block / inline"
      >
        <Code class="w-3.5 h-3.5" />
      </button>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Mode Toggle: Visual (WYSIWYG) vs Raw Markdown -->
      <button
        type="button"
        @click="isRawMode = !isRawMode"
        class="flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300"
        :title="isRawMode ? 'Switch to WYSIWYG Visual Editor' : 'Switch to Raw Markdown Source'"
      >
        <component :is="isRawMode ? Eye : FileCode" class="w-3 h-3" />
        <span>{{ isRawMode ? 'WYSIWYG' : 'Raw' }}</span>
      </button>
    </div>

    <!-- Body: WYSIWYG Editor vs Raw Textarea -->
    <div class="relative p-3 min-h-[120px]">
      <!-- TipTap / Visual WYSIWYG Mode -->
      <div v-if="!isRawMode && !readonly && editor" class="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
        <EditorContent :editor="editor" class="focus:outline-none min-h-[100px]" />
      </div>

      <!-- Raw Textarea Fallback Mode -->
      <textarea
        v-else-if="isRawMode && !readonly"
        ref="rawTextareaRef"
        :value="modelValue"
        @input="onRawInput"
        rows="5"
        class="w-full h-full min-h-[100px] font-mono text-xs p-2 border-0 focus:ring-0 outline-none resize-y bg-slate-900 text-slate-100 rounded-md"
        :placeholder="placeholder || 'Enter Markdown content...'"
      />

      <!-- Readonly Rendered Output -->
      <div
        v-else-if="readonly && modelValue"
        class="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed"
        v-html="renderedMarkdown"
      />

      <!-- Readonly Empty Output -->
      <span v-else-if="readonly && !modelValue" class="text-xs text-slate-400 dark:text-slate-500">—</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Quote,
  Code,
  ChevronDown,
  Check,
  Eye,
  FileCode,
} from 'lucide-vue-next'
import { renderMarkdown } from '../../utils/markdown'

// TipTap imports
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    readonly?: boolean
  }>(),
  {
    placeholder: '',
    readonly: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [val: string]
  change: []
}>()

const isRawMode = ref(false)
const showHeadingMenu = ref(false)
const showNoteMenu = ref(false)
const headingMenuRef = ref<HTMLElement | null>(null)
const noteMenuRef = ref<HTMLElement | null>(null)
const rawTextareaRef = ref<HTMLTextAreaElement | null>(null)

// Use shallowRef to avoid Vue reactive proxy wrapping on TipTap Editor
const editor = shallowRef<Editor | null>(null)

onMounted(() => {
  if (!props.readonly) {
    initTipTap()
  }
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  if (editor.value) {
    editor.value.destroy()
  }
})

function initTipTap() {
  editor.value = new Editor({
    content: props.modelValue,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4, 5] },
      }),
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    editable: !props.readonly,
    onUpdate: () => {
      if (!editor.value) return
      const storage = editor.value.storage as any
      const md = storage?.markdown?.getMarkdown?.() ?? ''
      emit('update:modelValue', md)
      emit('change')
    },
  })
}

// Watch modelValue external updates (e.g. switching node)
watch(
  () => props.modelValue,
  (newVal) => {
    if (editor.value && !editor.value.isFocused) {
      const storage = editor.value.storage as any
      const currentMd = storage?.markdown?.getMarkdown?.() ?? ''
      if (currentMd !== newVal) {
        editor.value.commands.setContent(newVal, { emitUpdate: false })
      }
    }
  },
)

// ── Toolbar Actions & Status ────────────────────────────────────

const isBoldActive = computed(() => editor.value?.isActive('bold') ?? false)
const isItalicActive = computed(() => editor.value?.isActive('italic') ?? false)
const isBulletActive = computed(() => editor.value?.isActive('bulletList') ?? false)
const isOrderedActive = computed(() => editor.value?.isActive('orderedList') ?? false)
const isCodeActive = computed(() => editor.value?.isActive('code') || editor.value?.isActive('codeBlock'))

const activeHeadingLevel = computed<number | null>(() => {
  if (!editor.value) return null
  for (let l = 2; l <= 5; l++) {
    if (editor.value.isActive('heading', { level: l })) return l
  }
  return null
})

const currentHeadingLabel = computed(() => {
  const lvl = activeHeadingLevel.value
  return lvl ? `H${lvl}` : 'Heading'
})

const headingOptions = [
  { level: 2, label: 'Heading 2 (H2)', class: 'font-bold text-base' },
  { level: 3, label: 'Heading 3 (H3)', class: 'font-bold text-sm' },
  { level: 4, label: 'Heading 4 (H4)', class: 'font-semibold text-xs' },
  { level: 5, label: 'Heading 5 (H5)', class: 'font-medium text-xs' },
]

const noteOptions = [
  { type: 'quote', label: 'Quote ( > )', prefix: '> ', dotColor: 'bg-slate-400' },
  { type: 'note', label: 'Note ( [!NOTE] )', prefix: '> [!NOTE]\n> ', dotColor: 'bg-blue-500' },
  { type: 'tip', label: 'Tip ( [!TIP] )', prefix: '> [!TIP]\n> ', dotColor: 'bg-emerald-500' },
  { type: 'warning', label: 'Warning ( [!WARNING] )', prefix: '> [!WARNING]\n> ', dotColor: 'bg-amber-500' },
  { type: 'important', label: 'Important ( [!IMPORTANT] )', prefix: '> [!IMPORTANT]\n> ', dotColor: 'bg-purple-500' },
]

function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}

function toggleCode() {
  editor.value?.chain().focus().toggleCode().run()
}

function selectHeading(level: number) {
  showHeadingMenu.value = false
  if (editor.value?.isActive('heading', { level })) {
    editor.value.chain().focus().setParagraph().run()
  } else {
    editor.value?.chain().focus().toggleHeading({ level: level as any }).run()
  }
}

function insertNote(prefix: string) {
  showNoteMenu.value = false
  if (isRawMode.value && rawTextareaRef.value) {
    const ta = rawTextareaRef.value
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = ta.value
    const newText = text.substring(0, start) + prefix + text.substring(end)
    emit('update:modelValue', newText)
    emit('change')
    return
  }
  if (editor.value) {
    if (prefix.startsWith('> [')) {
      editor.value.chain().focus().insertContent(`\n${prefix}\n`).run()
    } else {
      editor.value.chain().focus().toggleBlockquote().run()
    }
  }
}

function handleClickOutside(event: MouseEvent) {
  if (headingMenuRef.value && !headingMenuRef.value.contains(event.target as Node)) {
    showHeadingMenu.value = false
  }
  if (noteMenuRef.value && !noteMenuRef.value.contains(event.target as Node)) {
    showNoteMenu.value = false
  }
}

function onRawInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  emit('update:modelValue', val)
  emit('change')
}

const renderedMarkdown = computed(() => renderMarkdown(props.modelValue))
</script>

<style scoped>
.minimal-markdown-editor :deep(.ProseMirror) {
  outline: none;
  min-height: 100px;
}
.minimal-markdown-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #94a3b8;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
