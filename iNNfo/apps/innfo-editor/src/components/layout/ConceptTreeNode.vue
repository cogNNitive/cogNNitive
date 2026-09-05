<template>
  <div data-testid="concept-tree-node" class="select-none">
    <!-- ── Node row ── -->
    <div
      class="flex items-center gap-1 px-2 py-1 rounded-md transition-colors text-xs group cursor-pointer"
      :class="rowClasses"
      :style="rowStyle"
      @click="onSelect"
    >
      <!-- Expand/collapse chevron or spacer -->
      <button
        v-if="hasChildren"
        @click.stop="toggleCollapse"
        class="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center shrink-0"
        :title="isCollapsed ? 'Expand' : 'Collapse'"
      >
        <ChevronDown
          class="transition-transform duration-200 w-3.5 h-3.5"
          :class="{ '-rotate-90': isCollapsed }"
        />
      </button>
      <span v-else class="w-5 shrink-0"></span>

      <!-- Pill: colored pill with icon + name + YIQ text + markers + info popup -->
      <Pill
        :node-id="nodeId"
        :name="node?.name ?? '(unknown)'"
        :kind="isConceptLike ? 'concept' : 'instance'"
        :concept-type="node?.type"
        :selected="isSelected"
        :block-id="nodeId"
        :description="description"
        :fields="fields"
        :concept-fields="conceptFields"
        :instance-count="instanceCount"
        :show-markers="true"
        :interactive="false"
        :full-width="true"
        class="flex-1 min-w-0"
      />

      <!-- Instance counter badge -->
      <span
        v-if="instanceCount > 0"
        class="text-2xs px-1.5 py-0.5 rounded-full shrink-0 font-medium tabular-nums"
        :style="{
          backgroundColor: nodeColorHex + '18',
          color: nodeColorHex,
        }"
      >
        {{ instanceCount }}
      </span>

      <!-- Kind badge (only non-standard kinds) -->
      <span
        v-if="node?.kind && node.kind !== 'root' && node.kind !== 'element'"
        class="text-2xs px-1 py-0.5 rounded shrink-0 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600"
      >
        {{ node.kind }}
      </span>
    </div>

    <!-- ── Children (recursive, with optional virtual grouping) ── -->
    <div
      v-if="hasChildren && !isCollapsed"
      class="ml-4 pl-1 border-l border-slate-200 dark:border-slate-700 space-y-0.5"
    >
      <!-- When groupByConcept is set, group flat elements by their type -->
      <template v-if="props.groupByConcept">
        <template v-for="item in groupedChildren" :key="item.key">
          <VirtualGroupNode
            v-if="item.kind === 'vg'"
            :concept-name="item.name"
            :children="item.nodes"
            :selected-id="selectedId"
            :depth="(depth ?? 0) + 1"
            :expanded-generation="expandedGeneration"
            @select="(id: string) => $emit('select', id)"
          />
          <ConceptTreeNode
            v-else
            :node-id="item.nodeId"
            :selected-id="selectedId"
            :depth="(depth ?? 0) + 1"
            :expanded-generation="expandedGeneration"
            @select="(id: string) => $emit('select', id)"
          />
        </template>
      </template>

      <!-- Standard recursive children (no grouping) -->
      <template v-else>
        <ConceptTreeNode
          v-for="child in children"
          :key="child.id"
          :node-id="child.id"
          :selected-id="selectedId"
          :depth="(depth ?? 0) + 1"
          :expanded-generation="expandedGeneration"
          @select="(id: string) => $emit('select', id)"
        />
      </template>

      <!-- Nested Submodel Items -->
      <div
        v-for="sub in elementSubmodels"
        :key="sub.submodelId"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
        data-testid="nested-submodel-node"
        @click.stop="uiStore.focusModel(sub.submodelId)"
      >
        <Boxes class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span class="font-medium text-slate-700 dark:text-slate-200 truncate flex-1">
          {{ sub.submodelName }}
        </span>
        <span
          v-if="sub.targetTemplate"
          class="text-3xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-mono"
          data-testid="nested-submodel-badge"
        >
          {{ sub.targetTemplate }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown, Boxes } from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import { useUiStore } from '../../stores/uiStore'
import { useConceptVisuals, getHexColorMedium } from '../../composables/useConceptVisuals'
import Pill from '../editor/Pill.vue'
import VirtualGroupNode from './VirtualGroupNode.vue'
import type { ModelNode } from '../../model/types'

const props = withDefaults(
  defineProps<{
    nodeId: string
    selectedId: string | null
    depth?: number
    expandedGeneration?: number
    /** When true, flat element children are grouped by type (concept name)
     *  under virtual concept group headers instead of rendered directly. */
    groupByConcept?: boolean
    /** Field definitions for the current concept (used for popup field chips). */
    conceptFields?: any[]
  }>(),
  {
    depth: 0,
    expandedGeneration: undefined,
    groupByConcept: false,
    conceptFields: () => [],
  },
)

const emit = defineEmits<{
  select: [nodeId: string]
}>()

const modelStore = useModelStore()
const uiStore = useUiStore()
const visuals = useConceptVisuals()

const isCollapsed = ref(false)

watch(
  () => props.expandedGeneration,
  (gen) => {
    if (gen !== undefined) {
      isCollapsed.value = gen < 0
    }
  },
  { immediate: true },
)

const node = computed<ModelNode | undefined>(() => modelStore.getNode(props.nodeId))

const children = computed<ModelNode[]>(() => {
  const astKids = modelStore.getChildren(props.nodeId)
  if (astKids.length > 0) {
    // R8 (PR1 diamond-vs-cycle fix): a child referenced by more than one
    // parent now legitimately appears in every referring parent's
    // `childIds`, but keeps a single primary `parentId` (first parent
    // wins). Only render it once, under that primary parent — otherwise
    // this recursive walk would render the same node under every parent
    // that lists it.
    return astKids.filter((child) => child.parentId === props.nodeId)
  }

  const thisName = node.value?.name
  if (!thisName) return []

  const nodePath = node.value?.source?.path
  const rootId = modelStore.getModelRootForNode(props.nodeId)
  return Object.values(modelStore.nodes).filter((n) => {
    if (n.kind !== 'element' || n.fields?.parent?.value !== thisName) return false
    if (rootId) {
      return modelStore.getModelRootForNode(n.id) === rootId
    }
    return !nodePath || n.source?.path === nodePath
  })
})

interface ElementSubmodel {
  fieldKey: string
  submodelId: string
  submodelName: string
  targetTemplate?: string
  path: string
}

const elementSubmodels = computed<ElementSubmodel[]>(() => {
  const n = node.value
  if (!n || n.kind !== 'element' || !n.fields) return []

  const rootId = modelStore.getModelRootForNode(props.nodeId)
  const rootNode = rootId ? modelStore.getNode(rootId) : null
  const conceptDef = rootNode?.localMetamodel?.concepts?.find(
    (c) => c.name.toLowerCase() === (n.type || '').toLowerCase(),
  )

  const result: ElementSubmodel[] = []

  for (const [key, field] of Object.entries(n.fields)) {
    if (!field?.value || typeof field.value !== 'string') continue
    const fieldDef = conceptDef?.fields?.find((f: any) => f.name === key)
    const isModelType = fieldDef?.type === 'model' || (field as any)?.type === 'model'
    if (!isModelType) continue

    const clean = field.value
      .replace(/^\[\[\s*/, '')
      .replace(/\s*\]\]$/, '')
      .trim()
    if (!clean) continue

    const matchingNode = Object.values(modelStore.nodes).find((cand) => {
      const p = cand.source?.path || ''
      return (
        cand.id.toLowerCase() === clean.toLowerCase() ||
        cand.name.toLowerCase() === clean.toLowerCase() ||
        p.toLowerCase() === clean.toLowerCase() ||
        p.replace(/\.md$/i, '').toLowerCase().endsWith(clean.toLowerCase())
      )
    })

    if (matchingNode) {
      result.push({
        fieldKey: key,
        submodelId: matchingNode.id,
        submodelName: matchingNode.name || clean.split('/').pop() || clean,
        targetTemplate: fieldDef?.target_template,
        path: matchingNode.source?.path || clean,
      })
    }
  }

  return result
})

const hasChildren = computed(() => children.value.length > 0 || elementSubmodels.value.length > 0)

const instanceCount = computed(() => children.value.length)

const isSelected = computed(() => props.nodeId === props.selectedId)

function toggleCollapse(): void {
  isCollapsed.value = !isCollapsed.value
}

function onSelect(): void {
  emit('select', props.nodeId)
}

// ── Ghost state detection ──────────────────────────────────────
const description = computed(
  () => node.value?.rawContent || node.value?.rawSections?.description || '',
)

const fields = computed(() => node.value?.fields ?? {})

/** True when node has no content, no fields, and no children. */
const isGhost = computed(() => {
  const n = node.value
  if (!n) return false
  const hasDesc = description.value.trim().length > 0
  const hasFields = Object.values(n.fields).some(
    (f: any) =>
      f?.value !== undefined && f?.value !== null && f?.value !== '' && f?.value !== false,
  )
  return !hasDesc && !hasFields && children.value.length === 0
})

// ── Virtual grouping (for FILE mode) ──

type RenderItem =
  | { kind: 'node'; key: string; nodeId: string }
  | { kind: 'vg'; key: string; name: string; nodes: ModelNode[] }

const groupedChildren = computed<RenderItem[]>(() => {
  const kids = children.value

  // Check if grouping is needed: flat elements under a FILE parent
  const needsGrouping =
    props.groupByConcept &&
    kids.length > 0 &&
    !kids.some((c) => c.kind === 'concept' || c.kind === 'root')

  if (!needsGrouping) {
    return kids.map((c) => ({ kind: 'node' as const, key: c.id, nodeId: c.id }))
  }

  // Group element children by their type (concept name)
  const groups = new Map<string, ModelNode[]>()
  const ungrouped: ModelNode[] = []

  for (const child of kids) {
    if (child.kind !== 'concept' && child.type) {
      const key = child.type
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(child)
    } else {
      ungrouped.push(child)
    }
  }

  // Preserve insertion order — follows _NN index order from the parser
  const sortedGroups = [...groups.entries()]

  const result: RenderItem[] = []

  // Ungrouped first
  for (const n of ungrouped) {
    result.push({ kind: 'node', key: n.id, nodeId: n.id })
  }

  // Virtual groups
  for (const [name, members] of sortedGroups) {
    result.push({ kind: 'vg', key: `vg:${name}`, name, nodes: members })
  }

  return result
})

// ── Visual resolution ──

const isConceptLike = computed(() => {
  const n = node.value
  if (!n) return false
  return n.kind === 'concept' || n.kind === 'root' || n.kind === undefined
})

const nodeColorHex = computed(() => {
  const n = node.value
  if (!n) return '#94a3b8'
  return visuals.resolveColor(n)
})

// ── Row styling ──

const rowClasses = computed(() => {
  const base = 'text-slate-700 dark:text-slate-300'
  if (isSelected.value) return `${base} font-semibold`
  return `${base} hover:bg-slate-50 dark:hover:bg-slate-800/60`
})

const rowStyle = computed(() => {
  const color = nodeColorHex.value
  const sel = isSelected.value
  const isConcept = isConceptLike.value

  const style: Record<string, string> = {}

  if (sel && isConcept) {
    style.backgroundColor = getHexColorMedium(color)
  }

  style.paddingLeft = '0.5rem'

  // Ghost state: reduced opacity on the entire row
  if (isGhost.value) {
    style.opacity = '0.45'
  }

  return style
})
</script>
