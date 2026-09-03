<template>
  <div data-testid="project-gantt-view" class="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/40">
    <!-- Header Bar: Stats, Filters & Title -->
    <div class="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
          <CalendarRange class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
              Gantt Timeline Chart
            </h2>
            <span class="px-2 py-0.5 rounded text-3xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              Projects Extension
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Interactive task timeline, dependencies &amp; milestone schedule
          </p>
        </div>
      </div>

      <!-- Milestone Filter & Stats -->
      <div class="flex items-center gap-4 flex-wrap">
        <div v-if="milestones.length > 0" class="flex items-center gap-2">
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-300">Milestone:</label>
          <select
            v-model="selectedMilestoneFilter"
            class="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Milestones ({{ milestones.length }})</option>
            <option v-for="ms in milestones" :key="ms.id" :value="ms.name">
              {{ ms.name }}
            </option>
          </select>
        </div>

        <!-- Task Stats Badges -->
        <div class="flex items-center gap-2 text-xs font-semibold">
          <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Total: {{ stats.total }}
          </span>
          <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            Done: {{ stats.done }}
          </span>
          <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            In Progress: {{ stats.inProgress }}
          </span>
          <span v-if="stats.blocked > 0" class="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
            Blocked: {{ stats.blocked }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Gantt Chart Content -->
    <div class="flex-1 overflow-auto p-6">
      <div v-if="filteredTasks.length === 0" class="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <FolderKanban class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">No tasks found</h3>
        <p class="text-xs text-slate-400 mt-1">Add tasks under # NN Task in your project model to visualize the Gantt chart.</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        <!-- Table & Timeline Grid -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-slate-100/70 dark:bg-slate-800/60 text-2xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th class="py-3 px-4 w-1/3">Task Name</th>
                <th class="py-3 px-3 w-24">Status</th>
                <th class="py-3 px-3 w-20">Priority</th>
                <th class="py-3 px-3 w-24">Duration</th>
                <th class="py-3 px-3 w-36">Predecessor</th>
                <th class="py-3 px-4">Timeline Bar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              <tr
                v-for="task in filteredTasks"
                :key="task.id"
                class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <!-- Task Name & Click to Navigate -->
                <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                  <button
                    @click="onSelectNode(task.nodeId)"
                    class="hover:text-primary transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare class="w-4 h-4 text-primary shrink-0" />
                    <span>{{ task.name }}</span>
                  </button>
                  <div v-if="task.milestone" class="text-3xs text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                    <Flag class="w-3 h-3 text-purple-400" />
                    <span>{{ task.milestone }}</span>
                  </div>
                </td>

                <!-- Status Badge -->
                <td class="py-3 px-3">
                  <span
                    class="px-2 py-0.5 rounded text-3xs font-bold capitalize"
                    :class="getStatusBadgeClass(task.status)"
                  >
                    {{ task.status.replace('_', ' ') }}
                  </span>
                </td>

                <!-- Priority Badge -->
                <td class="py-3 px-3">
                  <span
                    class="px-2 py-0.5 rounded text-3xs font-bold capitalize"
                    :class="getPriorityBadgeClass(task.priority)"
                  >
                    {{ task.priority }}
                  </span>
                </td>

                <!-- Duration -->
                <td class="py-3 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                  {{ task.duration }}
                </td>

                <!-- Depends On (Predecessor) -->
                <td class="py-3 px-3">
                  <span v-if="task.dependsOn" class="px-2 py-0.5 rounded text-3xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {{ task.dependsOn }}
                  </span>
                  <span v-else class="text-slate-400 italic text-3xs">None</span>
                </td>

                <!-- Timeline Bar Visualizer -->
                <td class="py-3 px-4">
                  <div class="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden relative flex items-center px-1">
                    <div
                      class="h-3.5 rounded-sm transition-all duration-300 flex items-center justify-end px-1 text-3xs font-bold text-white shadow-2xs"
                      :class="getBarColorClass(task.status)"
                      :style="{ width: Math.min(100, Math.max(15, task.durationDays * 12)) + '%' }"
                    >
                      <span>{{ task.duration }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CalendarRange,
  FolderKanban,
  CheckSquare,
  Flag,
} from 'lucide-vue-next'
import type { ExtensionContext } from '../../extensions/types'
import type { ModelNode } from '../../model/types'
import { useWorkspaceExtensionAdapter } from '../../extensions/adapters/workspaceAdapter'
import { useProjectGantt } from '../../extensions/projects/useProjectGantt'

const props = defineProps<{
  context?: ExtensionContext
  nodes?: Record<string, ModelNode>
}>()

const defaultContext = useWorkspaceExtensionAdapter()

const activeNodes = computed<Record<string, any>>(() => {
  if (props.nodes) return props.nodes
  if (props.context?.nodes) return props.context.nodes
  return defaultContext.value.nodes || {}
})

const { milestones, filteredTasks, stats, selectedMilestoneFilter } = useProjectGantt(activeNodes)

function onSelectNode(nodeId: string) {
  if (props.context?.selectNode) {
    props.context.selectNode(nodeId)
  } else if (defaultContext.value.selectNode) {
    defaultContext.value.selectNode(nodeId)
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'done':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
    case 'blocked':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
    case 'high':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  }
}

function getBarColorClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'done':
      return 'bg-emerald-500'
    case 'in_progress':
      return 'bg-blue-500'
    case 'blocked':
      return 'bg-rose-500'
    default:
      return 'bg-slate-400 dark:bg-slate-600'
  }
}
</script>
