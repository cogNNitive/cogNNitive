<template>
  <div
    data-testid="block-sheet"
    class="rounded-lg bg-slate-50 dark:bg-slate-800/50 transition-all duration-200 flex flex-col relative border border-slate-200 dark:border-slate-700 overflow-hidden"
  >
    <!-- Header: concept label + markers + controls -->
    <div
      class="flex items-center rounded-t-lg px-3 py-2.5 transition-all duration-150 gap-2 select-none border-b"
      :class="[palette.bg, palette.border, palette.text]"
    >
      <!-- Title: icon + name(s) -->
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        <template v-if="kind === 'concept'">
          <IconRenderer
            :icon="resolvedIcon"
            custom-class="w-5 h-5 shrink-0"
            :class="[palette.text]"
          />
          <input
            v-if="isEditing"
            :value="conceptName"
            @input="onConceptNameInput"
            class="font-bold text-2xl border border-slate-200 dark:border-slate-600 rounded-md px-1 py-0.5 focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 min-w-0 flex-1"
            placeholder="Concept name"
          />
          <span v-else class="font-bold text-2xl truncate" :class="[palette.text]">{{
            cleanConceptName
          }}</span>
          <span class="font-normal text-sm opacity-80 shrink-0"
            >({{ conceptType }})</span
          >
        </template>
        <template v-else>
          <IconRenderer
            :icon="resolvedIcon"
            custom-class="w-4 h-4 shrink-0"
            :class="[palette.text]"
          />
          <span class="font-bold text-sm" :class="[palette.text]">{{ cleanConceptName }}</span>
          <span class="opacity-40 mx-0.5">:</span>
          <button
            v-if="!isEditing"
            @click.stop="navigateToInstance"
            class="font-semibold text-2xl hover:underline transition-colors cursor-pointer text-left truncate min-w-0"
            :class="[palette.text]"
            :title="block.name || '(Empty)'"
          >
            {{ block.name || '(Empty)' }}
          </button>
          <input
            v-else
            :value="localBlockName"
            @input="onNameInput"
            @change="onNameChange"
            @blur="onNameChange"
            @keydown.enter="onNameChange"
            class="flex-1 border border-slate-200 dark:border-slate-600 rounded-md p-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 min-w-0"
            placeholder="Enter block name"
          />
        </template>
      </div>

      <!-- Marker cycling toolbar -->
      <template v-if="hasMarkers && block.id">
        <MarkerButton
          v-for="marker in allMarkers"
          :key="marker.name"
          :marker-name="marker.name"
          :node-id="block.id"
          @change="$emit('change')"
        />
        <span class="w-px h-3.5 bg-current/20 mx-0.5"></span>
      </template>

      <!-- Add child -->
      <button
        v-if="showAddChild"
        @click.stop="$emit('add-child')"
        aria-label="Add child"
        class="p-0.5 hover:bg-current/10 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
      >
        <PlusCircle class="w-3.5 h-3.5" />
      </button>

      <!-- Reorder controls -->
      <template v-if="showReorder">
        <button
          @click.stop="$emit('move-up')"
          :disabled="isFirst"
          aria-label="Move up"
          class="p-0.5 hover:bg-current/10 disabled:opacity-20 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowUp class="w-3 h-3" />
        </button>
        <button
          @click.stop="$emit('move-down')"
          :disabled="isLast"
          aria-label="Move down"
          class="p-0.5 hover:bg-current/10 disabled:opacity-20 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <ArrowDown class="w-3 h-3" />
        </button>
      </template>

      <!-- Edit mode: big action buttons -->
      <template v-if="isEditing">
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Save -->
          <button
            @click.stop="$emit('edit-toggle')"
            class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check class="w-4 h-4" />
            Save
          </button>

          <!-- Close -->
          <button
            @click.stop="$emit('edit-toggle')"
            class="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <X class="w-4 h-4" />
            Close
          </button>

          <!-- Delete -->
          <button
            v-if="showDelete"
            @click.stop="$emit('delete')"
            class="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 class="w-4 h-4" />
            Delete
          </button>
        </div>
      </template>

      <!-- Read mode: compact icon-only controls -->
      <template v-else>
        <!-- Pencil edit button -->
        <button
          @click.stop="$emit('edit-toggle')"
          aria-label="Edit"
          class="p-0.5 hover:bg-current/10 rounded transition-all cursor-pointer flex items-center justify-center shrink-0 opacity-80"
        >
          <Pencil class="w-3.5 h-3.5" />
        </button>

        <!-- Delete -->
        <button
          v-if="showDelete"
          @click.stop="$emit('delete')"
          aria-label="Delete"
          class="p-0.5 opacity-70 hover:text-rose-600 hover:scale-105 active:scale-95 rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </template>

      <!-- Chevron expand/collapse (far right) -->
      <button
        v-if="!disableExpand"
        @click.stop="$emit('update:collapsed', !collapsed)"
        aria-label="Toggle expand"
        class="p-0.5 hover:bg-current/10 rounded transition-colors cursor-pointer flex items-center justify-center shrink-0"
      >
        <ChevronDown
          class="w-3.5 h-3.5 transition-transform duration-200"
          :class="{ '-rotate-90': collapsed }"
        />
      </button>
    </div>

    <!-- Expandable body / edit form -->
    <div
      v-show="(!collapsed && !disableExpand) || isEditing"
      class="overflow-hidden transition-all duration-300"
    >
      <div class="px-3 pb-4 pt-2 space-y-6 flex flex-col">
        <!-- Edit-mode field inputs -->
        <template v-if="isEditing">
          <!-- Warning banner for concepts -->
          <div
            v-if="isConcept"
            class="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-300 text-sm font-medium flex flex-col gap-3"
          >
            <div>
              These fields are inherited from the template and must be edited in the template.
            </div>

            <div v-if="templateNode" class="mt-2 border-t border-amber-200 dark:border-amber-900/40 pt-3 flex flex-col gap-2 font-normal">
              <div class="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wide">
                OpenCode Prompt (AI Editor)
              </div>
              <p class="text-xs text-amber-700 dark:text-amber-500">
                Copy and paste this prompt into OpenCode to ask the AI to perform modifications on the template file <code class="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded font-mono font-bold">{{ templateFilename }}</code>:
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
                  @click="copyPrompt"
                  class="absolute top-2 right-2 p-1.5 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 transition-all cursor-pointer flex items-center justify-center"
                  :title="copied ? 'Copied!' : 'Copy prompt'"
                >
                  <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>

              <div v-if="copied" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold self-end transition-all">
                Prompt copied to clipboard!
              </div>
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

          <!-- Description / Details (WYSIWYG Markdown Editor) -->
          <div class="flex flex-col min-h-[120px] gap-1.5">
            <label
              class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >Description / Details</label
            >
            <MinimalMarkdownEditor
              :model-value="block.description"
              @update:model-value="onDescriptionUpdate"
              placeholder="Enter description (supports WYSIWYG formatting & markdown)..."
            />
          </div>
        </template>

        <!-- Read-mode layout -->
        <template v-else>
          <!-- ═══ Concept Layout ═══ -->
          <div v-if="isConcept" class="space-y-6">
            <ConceptTableView
              v-if="block.id"
              :node-id="block.id"
              :concept-type="conceptType"
              :concept-fields="conceptFields"
            />

            <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Description
              </div>
              <div
                v-if="renderedDescription"
                class="prose prose-slate max-w-none text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-words bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700"
                v-html="renderedDescription"
              ></div>
              <div v-else class="text-sm text-slate-400 dark:text-slate-500 italic">No description</div>
            </div>

            <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Fields Schema
              </div>
              <div
                v-if="conceptFields && conceptFields.length > 0"
                class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4"
              >
                <FieldSchemaView :field-definitions="conceptFields" />
              </div>
              <div v-else class="text-sm text-slate-400 dark:text-slate-500 italic">
                No fields defined
              </div>
            </div>

            <!-- Unified Connections & Relationships -->
            <div
              v-if="hasRelationships || (hasMatrices && block.id)"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-indigo-500 shrink-0"></span>
                Concept Connections &amp; Matrices
              </div>
              <BlockConnections
                :root-node-id="rootNodeId"
                :node-concept="conceptName || conceptType"
                :node-id="block.id"
                :is-concept="true"
                :relationships="relationshipsList"
                :on-navigate="navigateToNode"
              />
            </div>

            <div class="border-t border-slate-200 dark:border-slate-700 pt-5">
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Media &amp; Attachments
              </div>
              <NodeMedia :assets="resolvedAssetItems" />
            </div>
          </div>

          <!-- ═══ Element (Instance) Layout ═══ -->
          <div v-else class="space-y-6">
            <div
              v-if="renderedDescription"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Content
              </div>
              <div
                class="prose prose-slate max-w-none text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-words bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-100 dark:border-slate-700"
                v-html="renderedDescription"
              ></div>
            </div>

            <div
              v-if="conceptFields && conceptFields.length > 0"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                  Fields
                </div>
                <button
                  @click.stop="$emit('edit-toggle')"
                  class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Pencil class="w-3 h-3" />
                  Edit
                </button>
              </div>
              <div
                class="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-4"
              >
                <FieldViewer
                  :node-id="blockIdForFields"
                  :field-definitions="conceptFields"
                  :readonly="!isEditing"
                />
              </div>
            </div>

            <!-- Unified Connections & Relationships -->
            <div
              v-if="hasRelationships || (hasMatrices && block.id)"
              class="border-t border-slate-200 dark:border-slate-700 pt-5"
            >
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-indigo-500 shrink-0"></span>
                Connections &amp; Relationships
              </div>
              <BlockConnections
                :root-node-id="rootNodeId"
                :node-concept="conceptType"
                :node-id="block.id"
                :is-concept="false"
                :relationships="relationshipsList"
                :on-navigate="navigateToNode"
              />
            </div>

            <div v-if="block.id" class="border-t border-slate-200 dark:border-slate-700 pt-5">
              <div
                class="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2"
              >
                <span class="w-1.5 h-4 rounded-full bg-slate-400 shrink-0"></span>
                Media &amp; Attachments
              </div>
              <NodeMedia :assets="resolvedAssetItems" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown, ArrowUp, ArrowDown, Pencil, Check, Trash2, PlusCircle, X, Copy } from 'lucide-vue-next'
import IconRenderer from './IconRenderer.vue'
import MarkerButton from './MarkerButton.vue'
import WidgetField from '../../shared/widgets/WidgetField.vue'
import MinimalMarkdownEditor from '../ui/MinimalMarkdownEditor.vue'
import { getMarkerDefinitions } from './MarkerIcons'
import { renderMarkdown } from '../../utils/markdown'
import { useModelStore } from '../../stores/modelStore'
import { useNodeMediaScan } from '../../composables/useNodeMediaScan'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { getColorClasses } from '../../utils/colors'
import type { BlockKind } from '../../utils/conceptVisuals'
import { useConceptVisuals, getConceptMeta } from '../../composables/useConceptVisuals'

// Tab dependencies
import FieldViewer from './FieldViewer.vue'
import FieldSchemaView from './FieldSchemaView.vue'
import BlockConnections from './BlockConnections.vue'
import BlockRelationships from './BlockRelationships.vue'
import BlockMatrixSummary from './BlockMatrixSummary.vue'
import NodeMedia from './NodeMedia.vue'
import ConceptTableView from './ConceptTableView.vue'
import { parseFrontmatter } from '@cognnitive/innfo-core'
import { readMatrixDefsField } from '../../composables/useMatrixDefinitions'
import { useBlockAssets } from './composables/useBlockAssets'

const props = withDefaults(
  defineProps<{
    block: { id?: string; name: string; description: string; fields?: Record<string, any> }
    kind: BlockKind
    conceptType: string
    conceptName: string
    conceptFields?: any[]
    conceptColor?: string
    conceptIcon?: string
    collapsed: boolean
    isEditing: boolean
    disableExpand?: boolean
    hasMarkers?: boolean
    showDelete?: boolean
    showReorder?: boolean
    showAddChild?: boolean
    isFirst?: boolean
    isLast?: boolean
  }>(),
  {
    conceptFields: () => [],
    conceptColor: '',
    conceptIcon: '',
    disableExpand: false,
    hasMarkers: false,
    showDelete: false,
    showReorder: false,
    showAddChild: false,
    isFirst: false,
    isLast: false,
  },
)

const emit = defineEmits<{
  'update:collapsed': [val: boolean]
  'edit-toggle': []
  'move-up': []
  'move-down': []
  delete: []
  'add-child': []
  change: []
  'update:field': [fieldName: string, value: unknown]
  'update:concept-name': [name: string]
  'navigate-to-node': [nodeId: string]
}>()

const modelStore = useModelStore()
const conceptVisuals = useConceptVisuals()

const isConcept = computed(() => props.kind === 'concept')

// ── Palette & Visual Resolution ─────────────────────────────────

const effectiveColorName = computed(() => {
  if (props.conceptColor) return props.conceptColor
  if (props.block.id) {
    const node = modelStore.getNode(props.block.id)
    if (node) return conceptVisuals.resolveColorName(node)
  }
  const targetConcept = props.conceptName || props.conceptType
  if (targetConcept) {
    const meta = getConceptMeta(targetConcept)
    if (meta.color) return meta.color
  }
  return ''
})

const resolvedIcon = computed(() => {
  if (props.conceptIcon) return props.conceptIcon
  if (props.block.id) {
    const node = modelStore.getNode(props.block.id)
    if (node) return conceptVisuals.resolveIcon(node)
  }
  const targetConcept = props.conceptName || props.conceptType
  if (targetConcept) {
    const meta = getConceptMeta(targetConcept)
    if (meta.icon) return meta.icon
  }
  return 'layers'
})

const palette = computed(() => getColorClasses(effectiveColorName.value))

// ── Markers ─────────────────────────────────────────────────────

const allMarkers = computed(() => getMarkerDefinitions())

// ── Name helpers ────────────────────────────────────────────────

const cleanConceptName = computed(() => {
  const name = props.conceptName
  return name.endsWith('s') ? name.slice(0, -1) : name
})

// ── Markdown rendering ──────────────────────────────────────────

/** Strip everything from the first _NN marker onwards. */
function stripBlockDefinitions(text: string): string {
  const blockPattern = /^[ \t]*(?:[-*+]|\d+\.)?[ \t]*_NN\s+[\w\s-]+?:/m
  const idx = text.search(blockPattern)
  if (idx === -1) return text
  return text.substring(0, idx).trim()
}

const renderedDescription = computed(() => {
  const text =
    props.kind === 'concept'
      ? stripBlockDefinitions(props.block.description)
      : props.block.description
  return renderMarkdown(text)
})

// ── Node from store (full model data) ───────────────────────────

const nodeFromStore = computed(() =>
  props.block.id ? modelStore.getNode(props.block.id) : undefined,
)

// ── Relationships ───────────────────────────────────────────────

const hasRelationships = computed(() => {
  if (!props.block.id) return false
  const node = modelStore.getNode(props.block.id)
  return node && node.relationships && node.relationships.length > 0
})

const relationshipsList = computed(() => {
  if (!props.block.id) return []
  const node = modelStore.getNode(props.block.id)
  return node?.relationships ?? []
})

// ── Matrix summaries ────────────────────────────────────────────

const rootNodeId = computed(() => {
  if (!props.block.id) return modelStore.rootIds[0] ?? ''
  let curr = modelStore.getNode(props.block.id)
  while (curr && curr.parentId) {
    curr = modelStore.getNode(curr.parentId)
  }
  return curr ? curr.id : (modelStore.rootIds[0] ?? '')
})

const hasMatrices = computed(() => {
  if (!rootNodeId.value) return false
  const root = modelStore.getNode(rootNodeId.value)
  if (!root) return false
  const defs = readMatrixDefsField(root)
  if (defs.length > 0) return true
  if (!root.rawContent) return false
  const fm = parseFrontmatter(root.rawContent)
  const matrices: unknown[] = (fm as any)?.matrices ?? []
  return matrices.length > 0
})

// ── Assets / Media ──────────────────────────────────────────────

const { scannedAssets, scan: scanMedia } = useNodeMediaScan()

// Trigger scan when the block is expanded and has an id
watch(
  () => props.block.id,
  (id) => {
    if (id && !props.collapsed && useWorkspaceStore().handle) {
      scanMedia(id)
    }
  },
  { immediate: false },
)

// Also scan when uncollapsed
watch(
  () => props.collapsed,
  (collapsed) => {
    if (!collapsed && props.block.id && useWorkspaceStore().handle) {
      scanMedia(props.block.id)
    }
  },
  { immediate: false },
)

const { resolveAssetUrl, assetItems } = useBlockAssets(nodeFromStore, scannedAssets)

// Resolve scanned asset paths to blob URLs for display
const resolvedAssetItems = ref<Array<{ filename: string; url: string }>>([])

watch(
  [assetItems, scannedAssets],
  async () => {
    const resolved = await Promise.all(
      assetItems.value.map(async (item) => ({
        filename: item.filename,
        url: await resolveAssetUrl(item.url),
      })),
    )
    resolvedAssetItems.value = resolved
  },
  { immediate: true, deep: true },
)

// ── Field viewer node ID ────────────────────────────────────────

const blockIdForFields = computed(() => props.block.id || '')

// ── Navigation ──────────────────────────────────────────────────

const navigateToNode = (targetId: string) => {
  emit('navigate-to-node', targetId)
}

const navigateToInstance = () => {
  if (!props.block.name || !props.conceptName) return
  emit('navigate-to-node', props.block.name)
  emit('update:collapsed', false)
}

const onConceptNameInput = (event: Event) => {
  const newName = (event.target as HTMLInputElement).value
  emit('update:concept-name', newName)
}

// ── Input handlers ──────────────────────────────────────────────

const localBlockName = ref(props.block.name)

watch(
  () => props.block.name,
  (newVal) => {
    localBlockName.value = newVal
  },
)

const onDescriptionUpdate = (val: string) => {
  props.block.description = val
  if (props.block.id) {
    const node = modelStore.getNode(props.block.id)
    if (node) {
      modelStore.upsertNode({
        ...node,
        rawSections: { ...node.rawSections, description: val },
      })
    }
  }
  modelStore.markDirty(props.block.id || '')
  emit('change')
}

const onNameChange = () => {
  const newName = localBlockName.value.trim()
  if (!newName) {
    localBlockName.value = props.block.name
    return
  }
  if (newName === props.block.name) return

  props.block.name = newName
  if (props.block.id) {
    modelStore.renameElementNode(props.block.id, newName)
  }
  emit('change')
}

const onNameInput = (event: Event) => {
  localBlockName.value = (event.target as HTMLInputElement).value
}

watch(
  () => props.isEditing,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      onNameChange()
    }
  },
)

const copied = ref(false)

const templateNode = computed(() => {
  if (!rootNodeId.value) return undefined
  const rootNode = modelStore.getNode(rootNodeId.value)
  if (!rootNode?.rawContent) return undefined

  const fm = parseFrontmatter(rootNode.rawContent)
  const parentName = (fm as any)?.parent_spec?.name
  if (!parentName) return undefined

  const templateId = `spec:${parentName}`
  return modelStore.getNode(templateId)
})

const templatePath = computed(() => templateNode.value?.source?.path || '')
const templateFilename = computed(() => {
  const path = templatePath.value
  return path.split('/').pop() || path.split('\\').pop() || 'template'
})

const modelPath = computed(() => {
  if (!rootNodeId.value) return ''
  const rootNode = modelStore.getNode(rootNodeId.value)
  return rootNode?.source?.path || ''
})

const modelFilename = computed(() => {
  const path = modelPath.value
  return path.split('/').pop() || path.split('\\').pop() || 'model'
})

const generatedPrompt = computed(() => {
  const concept = props.conceptName || props.conceptType
  const templateName = templateFilename.value
  const templateLoc = templatePath.value ? ` (located at "${templatePath.value}")` : ''
  const modelName = modelFilename.value
  const modelLoc = modelPath.value ? ` (located at "${modelPath.value}")` : ''

  return `I need to edit the concept "${concept}" in the specification template "${templateName}"${templateLoc}.

This template is used by the model "${modelName}"${modelLoc}.

Please inspect the template file and perform the corresponding modifications to the definition of "${concept}" (e.g., modify fields, types, descriptions, or relationships as needed).`
})

const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(generatedPrompt.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}
</script>
