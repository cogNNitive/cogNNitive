import { computed, ref, type Ref } from 'vue'

export interface ModelNodeLike {
  id: string
  name: string
  parentId: string | null
  type: string
  kind?: string
  fields?: Record<string, { value?: unknown } | unknown>
}

export interface GanttTask {
  id: string
  name: string
  status: 'backlog' | 'in_progress' | 'blocked' | 'done' | string
  priority: 'critical' | 'high' | 'medium' | 'low' | string
  dependsOn?: string
  duration: string
  durationDays: number
  startDate?: string
  dueDate?: string
  milestone?: string
  deliverable?: string
  nodeId: string
}

export interface GanttMilestone {
  id: string
  name: string
  targetDate?: string
  status: string
  nodeId: string
}

export function parseDurationDays(durationStr?: string): number {
  if (!durationStr) return 1
  const trimmed = durationStr.trim().toLowerCase()
  const daysMatch = trimmed.match(/^(\d+)\s*d(ays?)?$/)
  if (daysMatch) return parseInt(daysMatch[1], 10)
  const weeksMatch = trimmed.match(/^(\d+)\s*w(eeks?)?$/)
  if (weeksMatch) return parseInt(weeksMatch[1], 10) * 5
  const monthsMatch = trimmed.match(/^(\d+)\s*m(onths?)?$/)
  if (monthsMatch) return parseInt(monthsMatch[1], 10) * 20
  const num = parseInt(trimmed, 10)
  return isNaN(num) || num <= 0 ? 1 : num
}

function getFieldValue(node: ModelNodeLike, fieldName: string): string | undefined {
  if (!node.fields) return undefined
  const valObj = node.fields[fieldName]
  if (!valObj) return undefined
  if (typeof valObj === 'object' && valObj !== null && 'value' in valObj) {
    const inner = (valObj as { value: unknown }).value
    return typeof inner === 'string' && inner.trim() !== '' ? inner : undefined
  }
  return typeof valObj === 'string' && valObj.trim() !== '' ? valObj : undefined
}

export function useProjectGantt(nodesRef: Ref<Record<string, ModelNodeLike>>) {
  const selectedMilestoneFilter = ref<string>('all')

  const milestones = computed<GanttMilestone[]>(() => {
    const list: GanttMilestone[] = []
    const nodes = nodesRef.value || {}
    for (const node of Object.values(nodes)) {
      const typeLower = node.type?.toLowerCase()
      if (typeLower === 'milestone' && node.kind !== 'concept' && node.name !== 'Milestone') {
        list.push({
          id: node.id,
          name: node.name,
          targetDate: getFieldValue(node, 'target_date'),
          status: getFieldValue(node, 'milestone_status') || 'planned',
          nodeId: node.id,
        })
      }
    }
    return list
  })

  const tasks = computed<GanttTask[]>(() => {
    const list: GanttTask[] = []
    const nodes = nodesRef.value || {}
    for (const node of Object.values(nodes)) {
      const typeLower = node.type?.toLowerCase()
      if (typeLower === 'task' && node.kind !== 'concept' && node.name !== 'Task') {
        const durationRaw = getFieldValue(node, 'duration') || '1d'
        list.push({
          id: node.id,
          name: node.name,
          status: getFieldValue(node, 'status') || 'backlog',
          priority: getFieldValue(node, 'priority') || 'medium',
          dependsOn: getFieldValue(node, 'depends_on'),
          duration: durationRaw,
          durationDays: parseDurationDays(durationRaw),
          startDate: getFieldValue(node, 'start_date'),
          dueDate: getFieldValue(node, 'due_date'),
          milestone: getFieldValue(node, 'milestone'),
          deliverable: getFieldValue(node, 'deliverable'),
          nodeId: node.id,
        })
      }
    }
    return list
  })

  const filteredTasks = computed(() => {
    if (selectedMilestoneFilter.value === 'all') return tasks.value
    return tasks.value.filter((t) => t.milestone === selectedMilestoneFilter.value)
  })

  const stats = computed(() => {
    const all = tasks.value
    return {
      total: all.length,
      done: all.filter((t) => t.status === 'done').length,
      inProgress: all.filter((t) => t.status === 'in_progress').length,
      blocked: all.filter((t) => t.status === 'blocked').length,
      backlog: all.filter((t) => t.status === 'backlog').length,
    }
  })

  return {
    milestones,
    tasks,
    filteredTasks,
    stats,
    selectedMilestoneFilter,
  }
}
