<template>
  <div
    data-testid="graph-viewer"
    class="flex flex-col"
    :class="inline ? '' : localNodeId ? 'h-[480px] min-h-0' : 'h-full'"
    :style="inline ? { height: height + 'px', minHeight: height + 'px' } : {}"
  >
    <!-- Layout selector header (hidden in inline mode) -->
    <div
      v-if="!inline"
      class="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 shrink-0"
    >
      <button
        v-for="l in layouts"
        :key="l.id"
        @click="currentLayout = l.id"
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
        :class="
          currentLayout === l.id
            ? 'bg-primary/10 text-primary border border-primary/30 shadow-xs'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent'
        "
      >
        <component :is="l.icon" class="w-3.5 h-3.5" />
        {{ l.label }}
      </button>
      <div class="flex-1"></div>
      <div v-if="selectedNode" class="flex items-center gap-1.5 mr-3 text-xs text-muted-foreground">
        <span class="font-medium">{{ selectedNode.label }}</span>
      </div>
      <div
        v-if="selectedNode"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/50"
      >
        <span class="text-xs text-muted-foreground font-medium leading-none">Depth</span>
        <input
          type="range"
          min="0"
          max="5"
          v-model.number="depthLimit"
          class="w-16 h-1 accent-primary cursor-pointer"
        />
        <span class="text-xs text-muted-foreground w-3 tabular-nums text-center">{{
          depthLimit
        }}</span>
        <button
          @click="clearExpanded"
          class="text-xs underline text-muted-foreground/60 hover:text-foreground cursor-pointer leading-none"
          title="Reset per-node expansions"
        >
          Reset
        </button>
      </div>
      <span class="text-xs text-muted-foreground"
        >{{ displayNodes.length }} nodes &middot; {{ displayEdges.length }} edges</span
      >
    </div>

    <div
      ref="containerRef"
      class="flex-1 min-h-0 relative overflow-auto bg-slate-50/50 dark:bg-slate-950/30"
      :class="inline ? 'rounded-lg' : localNodeId ? 'rounded-b-lg' : ''"
    >
      <svg ref="svgRef" class="w-full h-full" style="display: block"></svg>
      <div
        v-if="displayNodes.length === 0"
        class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground"
      >
        No relationships for this element.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue'
import { GitFork, Share2 } from 'lucide-vue-next'
import { useModelStore } from '../../stores/modelStore'
import { useGraphData } from './composables/useGraphData'
import { useGraphRenderer } from './composables/useGraphRenderer'

const props = withDefaults(
  defineProps<{
    localNodeId?: string
    autoSelectConcept?: string
    /** When true, renders in compact mode: no layout selector, uses `height` prop for sizing */
    inline?: boolean
    /** Container height in pixels (used only when `inline` is true). Default: 320 */
    height?: number
  }>(),
  {
    localNodeId: '',
    autoSelectConcept: '',
    inline: false,
    height: 320,
  },
)

const emit = defineEmits<{
  'select-node': [nodeId: string]
}>()

const localNodeIdRef = toRef(props, 'localNodeId')
const {
  conceptColors,
  initConceptColors,
  getHexColor,
  hslStr,
  textColor,
  allNodes,
  allEdges,
  displayNodes,
  displayEdges,
} = useGraphData(localNodeIdRef)

const containerRef = ref<HTMLDivElement>()
const svgRef = ref<SVGSVGElement>()
const currentLayout = ref('sankey')
const layouts = [
  { id: 'sankey', label: 'Sankey', icon: GitFork },
  { id: 'force', label: 'Force', icon: Share2 },
]

const selectedNodeId = ref('')
const highlightedConcept = ref('')
const selectedNode = computed(() => displayNodes.value.find((n) => n.id === selectedNodeId.value))

const depthLimit = ref(1)
const expandedNodes = new Set<string>()
const expansionSig = ref(0)

const appContext = getCurrentInstance()?.appContext

const {
  initSvg,
  render,
  applyForceSelection,
  clearSelection,
  selectNode,
  expandNode,
  clearExpanded,
  navigateToNode,
  stopSimulation,
  disconnectResizeObserver,
} = useGraphRenderer({
  containerRef,
  svgRef,
  currentLayout,
  depthLimit,
  expandedNodes,
  expansionSig,
  selectedNodeId,
  highlightedConcept,
  displayNodes,
  displayEdges,
  getHexColor,
  hslStr,
  textColor,
  emit,
  appContext,
})

const modelStore = useModelStore()

watch(currentLayout, () => render())

// Watch modelStore.nodes for reactivity (re-render on graph changes)
watch(
  () => Object.keys(modelStore.nodes).length,
  () => {
    initConceptColors()
    render()
  },
)

watch(selectedNodeId, () => {
  if (!svgRef.value) return
  expandedNodes.clear()
  expansionSig.value++
  if (currentLayout.value === 'force') {
    applyForceSelection()
  } else {
    render()
  }
})

watch(depthLimit, () => {
  if (currentLayout.value === 'force' && svgRef.value) {
    applyForceSelection()
  } else {
    render()
  }
})

watch(expansionSig, () => {
  if (currentLayout.value === 'force' && svgRef.value) {
    applyForceSelection()
  } else {
    render()
  }
})

watch(
  () => props.autoSelectConcept,
  (concept) => {
    highlightedConcept.value = concept || ''
    if (concept) {
      const firstInst = allNodes.value.find((n) => n.concept === concept && n.inst)
      if (firstInst) {
        selectedNodeId.value = firstInst.id
        return
      }
    }
    if (selectedNodeId.value) {
      clearSelection()
    }
  },
  { immediate: true },
)

watch(
  () => props.localNodeId,
  (nodeId) => {
    if (nodeId) {
      const match = allNodes.value.find((n) => n.id === `inst:${nodeId}`)
      if (match) {
        selectedNodeId.value = match.id
        return
      }
    }
    if (selectedNodeId.value) {
      clearSelection()
    }
  },
  { immediate: true },
)

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') clearSelection()
}

onMounted(() => {
  initSvg()
  render()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  stopSimulation()
  disconnectResizeObserver()
  window.removeEventListener('keydown', onKeyDown)
})
</script>
