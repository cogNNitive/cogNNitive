<template>
  <div data-testid="guided-procedure-view" class="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/40">
    <!-- Top Bar: Procedure Selection & Overall Progress -->
    <div class="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 gap-4 flex-wrap">
      <!-- Procedure Dropdown / Title & Step Selector -->
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
          <Play class="w-5 h-5 fill-current" />
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
              {{ activeProcedureName || 'Guided Procedure Execution' }}
            </h2>
            <div v-if="proceduresList.length > 1" class="relative">
              <select
                :value="activeProcedureName"
                @change="onProcedureChange"
                class="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option v-for="proc in proceduresList" :key="proc" :value="proc">
                  {{ proc }}
                </option>
              </select>
            </div>
            <!-- Step Dropdown Selector -->
            <div v-if="activeSteps.length > 0" class="relative">
              <select
                :value="currentStepIndex"
                @change="currentStepIndex = Number(($event.target as HTMLSelectElement).value)"
                class="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-semibold text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option v-for="(step, idx) in activeSteps" :key="step.id" :value="idx">
                  Step {{ idx + 1 }}/{{ activeSteps.length }}: {{ step.name }}
                </option>
              </select>
            </div>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Artifact-driven finite state machine interpreter
            <span v-if="isStandalone" class="ml-2 px-2 py-0.5 rounded text-3xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Standalone Viewer</span>
          </p>
        </div>
      </div>

      <!-- Progress Stats & Reset Button -->
      <div class="flex items-center gap-4">
        <!-- Progress Bar -->
        <div class="flex items-center gap-3 min-w-[200px]">
          <div class="flex-1">
            <div class="flex justify-between text-2xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>PROGRESS</span>
              <span>{{ progressPercentage }}% ({{ completedCount }}/{{ activeSteps.length }})</span>
            </div>
            <div class="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                :style="{ width: progressPercentage + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <button
          @click="resetProgress"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title="Reset execution progress"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Empty State: No procedure steps found -->
    <div v-if="activeSteps.length === 0" class="flex-1 flex items-center justify-center p-8">
      <div class="max-w-md text-center">
        <div class="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
          <AlertCircle class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No Procedure Steps Found</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          This model does not contain any Work items with sequence links or procedure steps. Load a procedure model to use Guided Execution.
        </p>
      </div>
    </div>

    <!-- Main Content Layout -->
    <div v-else class="flex-1 flex min-h-0 overflow-hidden">
      <!-- Active Step Details & Model Integration -->
      <div v-if="currentStep" class="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/20 overflow-y-auto p-6">
        <div class="max-w-3xl mx-auto w-full space-y-5">
          <!-- Step Header Card -->
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Step {{ currentStepIndex + 1 }} of {{ activeSteps.length }}
                  </span>
                  <Pill
                    kind="instance"
                    :color="stepTypeColor(currentStep.stepType)"
                    :icon="stepTypeIcon(currentStep.stepType)"
                    :name="currentStep.stepType"
                    hide-empty
                  />
                </div>
                <h1 class="text-xl font-black text-slate-900 dark:text-slate-100">
                  {{ currentStep.name }}
                </h1>
              </div>

              <!-- Status Display / Override -->
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-slate-500">FSM State:</span>
                <div
                  class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border"
                  :class="getStatusBadgeClass(getStepStatus(currentStep, currentStepIndex))"
                >
                  <component :is="getStatusIcon(getStepStatus(currentStep, currentStepIndex))" class="w-3.5 h-3.5" />
                  <span class="capitalize">{{ getStepStatus(currentStep, currentStepIndex).replace('_', ' ') }}</span>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div
              v-if="currentStep.description"
              class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none"
              v-html="renderInlineMarkdown(currentStep.description)"
            ></div>
          </div>

          <!-- Sub-steps / Child Work Items Card -->
          <div v-if="childSubSteps.length > 0" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <ListTree class="w-4 h-4 text-primary" />
                <span>Sub-steps &amp; Child Work Items ({{ childSubSteps.length }})</span>
              </h3>
              <span class="text-2xs font-mono font-bold text-slate-500 dark:text-slate-400">
                {{ childSubStepsCompletedCount }}/{{ childSubSteps.length }} Completed
              </span>
            </div>

            <div class="space-y-2">
              <div
                v-for="sub in childSubSteps"
                :key="sub.id"
                class="p-3 rounded-lg border flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
              >
                <!-- Info -->
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <div class="shrink-0">
                    <CheckCircle2 v-if="getStepStatusById(sub.id) === 'completed'" class="w-4 h-4 text-emerald-500" />
                    <Clock v-else-if="getStepStatusById(sub.id) === 'in_progress'" class="w-4 h-4 text-amber-500 animate-pulse" />
                    <AlertTriangle v-else-if="getStepStatusById(sub.id) === 'blocked'" class="w-4 h-4 text-rose-500" />
                    <Circle v-else class="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {{ sub.name }}
                      </span>
                      <Pill
                        kind="instance"
                        :color="stepTypeColor(sub.stepType)"
                        :icon="stepTypeIcon(sub.stepType)"
                        :name="sub.stepType"
                        hide-empty
                        class="shrink-0"
                      />
                    </div>
                    <p v-if="sub.description" class="text-2xs text-slate-500 dark:text-slate-400 truncate">
                      {{ sub.description }}
                    </p>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    v-if="getStepStatusById(sub.id) !== 'completed'"
                    @click="markSubStepCompleted(sub.id)"
                    class="px-2.5 py-1 rounded text-2xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 class="w-3 h-3" />
                    <span>Complete</span>
                  </button>
                  <button
                    v-else
                    @click="markSubStepPending(sub.id)"
                    class="px-2.5 py-1 rounded text-2xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw class="w-3 h-3" />
                    <span>Reopen</span>
                  </button>

                  <button
                    @click="jumpToSubStep(sub.id)"
                    class="px-2.5 py-1 rounded text-2xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Jump to this step"
                  >
                    <span>View</span>
                    <ChevronRight class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Decision / Rule Check Card -->
          <div
            v-if="currentStep.stepType === 'decision' || currentStep.condition"
            class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-5 text-amber-900 dark:text-amber-200"
          >
            <div class="flex items-center gap-2 font-bold text-sm mb-2 text-amber-800 dark:text-amber-300">
              <GitPullRequest class="w-4 h-4" />
              <span>Decision Point / Condition Rule</span>
            </div>
            <p v-if="currentStep.condition" class="text-xs font-mono bg-amber-100/70 dark:bg-amber-900/50 p-2.5 rounded-lg border border-amber-300/40 dark:border-amber-700/40 mb-3">
              Condition: "{{ currentStep.condition }}"
            </p>
            <div class="flex items-center gap-3">
              <button
                @click="passDecision(true)"
                class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>Condition Met (Approve &amp; Next)</span>
              </button>
              <button
                @click="passDecision(false)"
                class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle class="w-4 h-4" />
                <span>Condition Not Met (Mark Blocked)</span>
              </button>
            </div>
          </div>

          <!-- RACI Roles & Accountability Card -->
          <div v-if="currentStepRaci.length > 0" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
            <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users class="w-4 h-4 text-primary" />
              <span>Roles &amp; RACI Accountability</span>
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                v-for="raci in currentStepRaci"
                :key="raci.role"
                class="p-3 rounded-lg border flex flex-col gap-1"
                :class="getRaciBoxClass(raci.value)"
              >
                <span class="text-3xs font-black uppercase tracking-wider" :class="getRaciTextClass(raci.value)">
                  {{ raci.value }}
                </span>
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {{ raci.role }}
                </span>
              </div>
            </div>
          </div>

          <!-- Tools & Artifacts Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Tools Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
              <h4 class="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wrench class="w-3.5 h-3.5 text-blue-500" />
                <span>Required Tool</span>
              </h4>
              <div v-if="currentStep.tool" class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {{ currentStep.tool }}
                </span>
                <span class="px-2 py-0.5 rounded text-3xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Tool
                </span>
              </div>
              <div v-else class="text-xs text-slate-400 italic">No tool specified for this step</div>
            </div>

            <!-- Deliverables Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
              <h4 class="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package class="w-3.5 h-3.5 text-orange-500" />
                <span>Model Artifacts (I/O &amp; State)</span>
              </h4>
              <div class="space-y-2.5">
                <!-- Input Artifact -->
                <div v-if="currentStep.input" class="p-2.5 rounded-lg border bg-orange-50/40 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/40 text-xs">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span class="text-orange-600 font-bold text-2xs uppercase">Input:</span>
                      {{ currentStep.input }}
                    </span>
                    <button
                      v-if="inputArtifactNode && selectNodeHandler"
                      @click="navigateToModelNode(inputArtifactNode.id)"
                      class="px-2 py-0.5 rounded text-3xs font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Inspect artifact in Editor"
                    >
                      <ExternalLink class="w-3 h-3" />
                      <span>View in Editor</span>
                    </button>
                    <span v-else class="text-3xs font-semibold text-slate-400 italic flex items-center gap-1">
                      <Circle class="w-3 h-3" />
                      <span>Not in model</span>
                    </span>
                  </div>
                </div>

                <!-- Output Artifact -->
                <div v-if="currentStep.output" class="p-2.5 rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/40 text-xs">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span class="text-emerald-600 font-bold text-2xs uppercase">Output:</span>
                      {{ currentStep.output }}
                    </span>
                    <button
                      v-if="outputArtifactNode && selectNodeHandler"
                      @click="navigateToModelNode(outputArtifactNode.id)"
                      class="px-2 py-0.5 rounded text-3xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Inspect artifact in Editor"
                    >
                      <ExternalLink class="w-3 h-3" />
                      <span>View in Editor</span>
                    </button>
                    <span v-else class="text-3xs font-semibold text-slate-400 italic flex items-center gap-1">
                      <Circle class="w-3 h-3 text-amber-500" />
                      <span>Pending in model</span>
                    </span>
                  </div>
                </div>

                <div v-if="!currentStep.input && !currentStep.output" class="text-xs text-slate-400 italic">
                  No artifacts specified
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar (Footer Controls) -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <button
              @click="prevStep"
              :disabled="currentStepIndex === 0"
              class="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft class="w-4 h-4" />
              <span>Previous Step</span>
            </button>

            <div class="flex items-center gap-3">
              <button
                @click="completeAndNext"
                class="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>Mark Completed &amp; Next</span>
              </button>

              <button
                @click="nextStep"
                :disabled="currentStepIndex >= activeSteps.length - 1"
                class="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Next Step</span>
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Play,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
  GitPullRequest,
  Users,
  Wrench,
  Package,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ListTree,
} from 'lucide-vue-next'
import Pill from './Pill.vue'
import { renderInlineMarkdown } from '../../utils/renderMarkdown'
import { useWorkspaceExtensionAdapter } from '../../extensions/adapters/workspaceAdapter'
import { useProcedureFSM } from '../../extensions/procedures/useProcedureFSM'
import type { ExtensionContext } from '../../extensions/types'
import type { ModelNode } from '../../model/types'

const props = defineProps<{
  context?: ExtensionContext
  nodes?: Record<string, ModelNode>
  readOnly?: boolean
  standalone?: boolean
}>()

// Default workspace context adapter if no explicit context/nodes passed
const defaultContext = useWorkspaceExtensionAdapter()

const activeNodes = computed(() => {
  if (props.nodes) return props.nodes
  if (props.context?.nodes) return props.context.nodes
  return defaultContext.value.nodes
})

const selectNodeHandler = computed(() => {
  if (props.context?.selectNode) return props.context.selectNode
  return defaultContext.value.selectNode
})

const isStandalone = computed(() => {
  return props.standalone || props.context?.standalone || false
})

// Initialize state machine composable with activeNodes ref
const {
  currentStepIndex,
  activeProcedureName,
  proceduresList,
  setProcedure,
  activeSteps,
  currentStep,
  childSubSteps,
  childSubStepsCompletedCount,
  getStepStatus,
  getStepStatusById,
  completedCount,
  progressPercentage,
  currentStepRaci,
  inputArtifactNode,
  outputArtifactNode,
  completeAndNext,
  nextStep,
  prevStep,
  passDecision,
  markSubStepCompleted,
  markSubStepPending,
  jumpToSubStep,
  resetProgress,
} = useProcedureFSM(activeNodes)

function onProcedureChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  setProcedure(val)
}

function navigateToModelNode(nodeId: string) {
  if (selectNodeHandler.value) {
    selectNodeHandler.value(nodeId)
  }
}

// Styling helper functions
function stepTypeColor(type: string) {
  switch (type?.toLowerCase()) {
    case 'decision':
      return 'amber'
    case 'event':
      return 'green'
    case 'task':
    default:
      return 'blue'
  }
}

function stepTypeIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'decision':
      return 'split'
    case 'event':
      return 'zap'
    case 'task':
    default:
      return 'clipboardcheck'
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
    case 'in_progress':
      return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
    case 'blocked':
      return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
    case 'pending':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return CheckCircle2
    case 'in_progress':
      return Clock
    case 'blocked':
      return AlertTriangle
    case 'pending':
    default:
      return Circle
  }
}

function getRaciBoxClass(val: string) {
  switch (val) {
    case 'Responsible':
      return 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50'
    case 'Accountable':
      return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50'
    case 'Consulted':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50'
    case 'Informed':
      return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
    default:
      return 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
  }
}

function getRaciTextClass(val: string) {
  switch (val) {
    case 'Responsible':
      return 'text-rose-600 dark:text-rose-400'
    case 'Accountable':
      return 'text-amber-600 dark:text-amber-400'
    case 'Consulted':
      return 'text-blue-600 dark:text-blue-400'
    case 'Informed':
      return 'text-emerald-600 dark:text-emerald-400'
    default:
      return 'text-slate-500'
  }
}
</script>
