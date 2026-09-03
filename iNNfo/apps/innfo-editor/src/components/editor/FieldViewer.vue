<template>
  <div
    data-testid="field-viewer"
    class="field-viewer grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4"
  >
    <div v-for="entry in fieldEntries" :key="entry.def.name" class="flex flex-col gap-1">
      <label
        class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
      >
        {{ entry.def.name.replace(/_/g, ' ').toUpperCase() }}
      </label>

      <!-- Edit mode: use WidgetField for interactive editing -->
      <WidgetField
        v-if="!readonly"
        :node-id="nodeId"
        :field-key="entry.def.name"
        :widget-type="entry.def.type"
        :field-definition="entry.def"
      />

      <!-- Read mode: display formatted value -->
      <div
        v-else
        class="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center min-h-[24px]"
      >
        <!-- Markdown & Asset field types: render via WidgetField for proper rendering -->
        <WidgetField
          v-if="entry.isMarkdownType || entry.isAssetType"
          :node-id="nodeId"
          :field-key="entry.def.name"
          :widget-type="entry.def.type"
          :field-definition="entry.def"
          :readonly="true"
        />
        <template v-else-if="entry.hasValue && entry.displayValue !== ''">
          <template v-if="entry.def.type === 'select' && entry.def.options">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
            >
              {{ entry.displayValue }}
            </span>
          </template>
          <template v-else-if="entry.def.type === 'model'">
            <div class="inline-flex items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition-colors"
                @click="handleModelPillClick(entry.displayValue)"
                data-testid="model-field-pill"
              >
                <Boxes class="w-3.5 h-3.5 shrink-0" />
                <span>{{ entry.displayValue }}</span>
              </button>
              <span
                v-if="entry.def.target_template"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                :title="`Expected Template: ${entry.def.target_template}`"
                data-testid="model-target-template-badge"
              >
                {{ entry.def.target_template }}
              </span>
            </div>
          </template>
          <template v-else-if="entry.def.type === 'reference'">
            <Pill
              v-if="entry.refNode"
              :node-id="entry.refNode.id"
              :name="entry.refNode.name"
              :kind="entry.refNode.conceptBinding?.name ? 'instance' : 'concept'"
              :concept-type="entry.refNode.type"
              :block-id="entry.refNode.id"
              :description="entry.refNode.rawContent || entry.refNode.rawSections?.description || ''"
              :fields="entry.refNode.fields"
              :concept-fields="getConceptFields(entry.refNode.type)"
              interactive
              class="cursor-pointer"
              @click="uiStore.selectNode(entry.refNode.id)"
            />
            <span
              v-else
              class="text-slate-400 dark:text-slate-500 italic underline decoration-dotted cursor-help"
              title="Referenced node not found in this model"
            >
              [[{{ cleanReferenceName(entry.displayValue) }}]]
            </span>
          </template>
          <template v-else-if="entry.def.type === 'boolean'">
            <span
              :class="
                entry.displayValue
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              "
            >
              {{ entry.displayValue ? 'Yes' : 'No' }}
            </span>
          </template>
          <template v-else-if="Array.isArray(entry.displayValue)">
            <div class="flex flex-wrap gap-1.5 items-center">
              <template v-for="(item, idx) in entry.displayValue" :key="idx">
                <FileRefPill v-if="isSourceRef(item)" kind="source" v-bind="toFileRef(String(item))" />
                <span v-else>{{ item }}</span>
              </template>
            </div>
          </template>
          <template v-else-if="isSourceRef(entry.displayValue)">
            <FileRefPill kind="source" v-bind="toFileRef(String(entry.displayValue))" />
          </template>
          <template v-else>
            {{ entry.displayValue }}
          </template>
        </template>
        <span v-else class="text-slate-300 dark:text-slate-600 italic">—</span>
      </div>
    </div>

    <!-- Empty state -->
    <p
      v-if="fieldDefinitions.length === 0"
      class="col-span-full text-xs text-slate-400 dark:text-slate-500 italic"
    >
      No fields defined for this concept.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Boxes } from 'lucide-vue-next'
import WidgetField from '../../shared/widgets/WidgetField.vue'
import { useModelStore } from '../../stores/modelStore'
import { useUiStore } from '../../stores/uiStore'
import type { ModelNode } from '../../model/types'
import Pill from './Pill.vue'
import FileRefPill from './FileRefPill.vue'
import { parseSourceRef } from '../../utils/sourceRef'
import { isImageFieldValue } from '../../utils/imageDetection'

function handleModelPillClick(val: unknown): void {
  if (!val || typeof val !== 'string') return
  const clean = val.replace(/^\[\[\s*/, '').replace(/\s*\]\]$/, '').trim()
  const matchingNode = Object.values(modelStore.nodes).find((n) => {
    const path = n.source?.path || ''
    const baseName = path.split('/').pop()?.split('\\').pop()?.replace(/\.md$/i, '') || ''
    return (
      n.id.toLowerCase() === clean.toLowerCase() ||
      n.name.toLowerCase() === clean.toLowerCase() ||
      path.toLowerCase() === clean.toLowerCase() ||
      baseName.toLowerCase() === clean.toLowerCase()
    )
  })
  if (matchingNode) {
    uiStore.focusModel(matchingNode.id)
  } else {
    uiStore.focusModel(clean)
  }
}

function cleanReferenceName(val: unknown): string {
  if (typeof val !== 'string') return ''
  return val.replace(/^\[\[\s*/, '').replace(/\s*\]\]$/, '').trim()
}

function isSourceRef(val: unknown): boolean {
  if (typeof val !== 'string') return false
  return parseSourceRef(val).isValid
}

function toFileRef(val: string): { filePath: string; fileName: string; slug?: string } {
  const { filePath, fileName, slug } = parseSourceRef(val)
  return { filePath, fileName, slug }
}

const MARKDOWN_FIELD_TYPES = new Set(['markdown_inline', 'markdown_file', 'markdown'])
const ASSET_FIELD_TYPES = new Set(['image', 'image_url', 'asset', 'file', 'video', 'audio'])

function isAssetField(def: { name: string; type: string }, val: unknown): boolean {
  if (ASSET_FIELD_TYPES.has(def.type)) return true
  if (typeof val === 'string' && val.trim()) {
    if (isImageFieldValue(def.name, val)) return true
  }
  return false
}

interface FieldEntry {
  def: {
    name: string
    type: string
    options?: string[]
    target_concepts?: string[]
    target_template?: string
  }
  hasValue: boolean
  displayValue: unknown
  isMarkdownType: boolean
  isAssetType: boolean
  refNode?: ModelNode | null
}

/**
 * FieldViewer renders node fields using the widget registry.
 *
 * In read mode, fields display as formatted labels/values.
 * In edit mode, fields render as interactive WidgetField instances
 * backed by the widget registry.
 */
const props = withDefaults(
  defineProps<{
    nodeId: string
    fieldDefinitions: Array<{
      name: string
      type: string
      options?: string[]
      target_concepts?: string[]
      target_template?: string
    }>
    readonly?: boolean
  }>(),
  {
    readonly: true,
  },
)

const modelStore = useModelStore()
const uiStore = useUiStore()

const getConceptFields = (typeName: string | undefined) => {
  if (!typeName) return []
  const rootId = modelStore.rootIds[0]
  if (!rootId) return []
  const root = modelStore.getNode(rootId)
  return root?.localMetamodel?.concepts?.find(
    (c) => c.name.toLowerCase() === typeName.toLowerCase(),
  )?.fields ?? []
}

/**
 * Computes an array of field entries pairing each field definition
 * with its current value from the store.
 */
const fieldEntries = computed<FieldEntry[]>(() => {
  const node = modelStore.getNode(props.nodeId)

  return props.fieldDefinitions.map((def) => {
    const fv = node?.fields?.[def.name]
    const rawValue = fv?.value ?? fv ?? undefined
    const hasValue = rawValue !== undefined && rawValue !== null && rawValue !== ''

    let refNode = null
    if (def.type === 'reference' && hasValue && typeof rawValue === 'string') {
      let name = rawValue.replace(/^\[\[\s*/, '').replace(/\s*\]\]$/, '').trim()
      if (name.startsWith('[[') && name.endsWith(']]')) {
        name = name.slice(2, -2).trim()
      }

      let modelPrefix = ''
      if (name.startsWith('[') && name.includes(']')) {
        const closingBracket = name.indexOf(']')
        modelPrefix = name.slice(1, closingBracket).trim().toLowerCase()
        name = name.slice(closingBracket + 1).trim()
      }

      refNode = Object.values(modelStore.nodes).find((n) => {
        if (modelPrefix) {
          const path = n.source?.path || ''
          const modelFileName = path.split('/').pop()?.split('\\').pop() || ''
          const modelBaseName = modelFileName.replace(/\.md$/i, '').replace(/_NN$/i, '').toLowerCase()
          return n.name.toLowerCase() === name.toLowerCase() && modelBaseName === modelPrefix
        }
        return n.name.toLowerCase() === name.toLowerCase()
      }) || null
    }

    return {
      def,
      hasValue,
      displayValue: rawValue ?? '',
      isMarkdownType: MARKDOWN_FIELD_TYPES.has(def.type),
      isAssetType: isAssetField(def, rawValue),
      refNode,
    }
  })
})
</script>
