import { ref, computed, reactive, watch, type Ref } from 'vue'

export interface ModelNodeLike {
  id: string
  name: string
  type: string
  kind?: string
  fields?: Record<string, { value?: any; [key: string]: any }>
  rawSections?: { description?: string; [key: string]: any }
  childIds?: string[]
  [key: string]: any
}

export interface StepItem {
  id: string
  name: string
  parent: string
  stepType: 'task' | 'decision' | 'event' | string
  next: string
  condition: string
  input: string
  output: string
  tool: string
  description: string
}

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export interface RaciAssignment {
  role: string
  value: string
}

export function useProcedureFSM(nodesRef: Ref<Record<string, ModelNodeLike>>) {
  const currentStepIndex = ref(0)
  const manualOverrides = reactive<Record<string, StepStatus>>({})
  const activeProcedureName = ref<string>('')

  // List of procedures found in node graph (Work items with or without parent)
  const proceduresList = computed<string[]>(() => {
    const procs = new Set<string>()
    for (const node of Object.values(nodesRef.value || {})) {
      if (node.type === 'Work') {
        const parent = node.fields?.parent?.value as string
        if (parent) {
          procs.add(parent)
        } else {
          procs.add(node.name)
        }
      }
    }
    return Array.from(procs)
  })

  watch(
    proceduresList,
    (list) => {
      if (list.length > 0 && !activeProcedureName.value) {
        activeProcedureName.value = list[0]
      }
    },
    { immediate: true },
  )

  function setProcedure(procName: string) {
    activeProcedureName.value = procName
    currentStepIndex.value = 0
  }

  // Map of artifact nodes by name for fast input/output matching
  const artifactNodesByName = computed<Record<string, ModelNodeLike>>(() => {
    const map: Record<string, ModelNodeLike> = {}
    for (const node of Object.values(nodesRef.value || {})) {
      if (node.type === 'Artifact' && node.name) {
        map[node.name] = node
      }
    }
    return map
  })

  // Compute active steps ordered by `next` sequence graph
  const activeSteps = computed<StepItem[]>(() => {
    const procName = activeProcedureName.value
    if (!procName) return []

    const allNodes = Object.values(nodesRef.value || {})
    const includedNames = new Set<string>()

    function collectDescendants(pName: string) {
      for (const node of allNodes) {
        if (node.type === 'Work' && node.fields?.parent?.value === pName) {
          if (!includedNames.has(node.name)) {
            includedNames.add(node.name)
            collectDescendants(node.name)
          }
        }
      }
    }
    collectDescendants(procName)

    const rawSteps: StepItem[] = []
    for (const node of allNodes) {
      if (node.type === 'Work') {
        const parent = (node.fields?.parent?.value as string) || ''
        if (
          parent === procName ||
          (!parent && node.name === procName) ||
          includedNames.has(node.name)
        ) {
          if (
            !parent &&
            node.name === procName &&
            allNodes.some((n) => n.fields?.parent?.value === procName)
          ) {
            continue
          }
          rawSteps.push({
            id: node.id,
            name: node.name,
            parent,
            stepType: (node.fields?.step_type?.value as string) || 'task',
            next: (node.fields?.next?.value as string) || '',
            condition: (node.fields?.condition?.value as string) || '',
            input: (node.fields?.input?.value as string) || '',
            output: (node.fields?.output?.value as string) || '',
            tool: (node.fields?.tool?.value as string) || '',
            description:
              node.rawSections?.description ||
              (node.fields?.description?.value as string) ||
              '',
          })
        }
      }
    }

    if (rawSteps.length === 0) return []

    const targetedNexts = new Set<string>()
    for (const s of rawSteps) {
      if (s.next) {
        targetedNexts.add(s.next)
      }
    }

    const startStep = rawSteps.find((s) => !targetedNexts.has(s.name)) || rawSteps[0]

    const sorted: StepItem[] = []
    const visited = new Set<string>()
    let current: StepItem | undefined = startStep

    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      sorted.push(current)
      const nextName: string = current.next
      current = rawSteps.find((s) => s.name === nextName)
    }

    for (const s of rawSteps) {
      if (!visited.has(s.id)) {
        sorted.push(s)
      }
    }

    return sorted
  })

  const currentStep = computed(() => activeSteps.value[currentStepIndex.value] || null)

  // Direct child sub-steps for current step
  const childSubSteps = computed<StepItem[]>(() => {
    if (!currentStep.value) return []
    const stepName = currentStep.value.name
    const children: StepItem[] = []
    for (const node of Object.values(nodesRef.value || {})) {
      if (node.type === 'Work' && node.fields?.parent?.value === stepName) {
        children.push({
          id: node.id,
          name: node.name,
          parent: stepName,
          stepType: (node.fields?.step_type?.value as string) || 'task',
          next: (node.fields?.next?.value as string) || '',
          condition: (node.fields?.condition?.value as string) || '',
          input: (node.fields?.input?.value as string) || '',
          output: (node.fields?.output?.value as string) || '',
          tool: (node.fields?.tool?.value as string) || '',
          description:
            node.rawSections?.description ||
            (node.fields?.description?.value as string) ||
            '',
        })
      }
    }
    return children
  })

  // FSM State Derivation
  function getStepStatus(step: StepItem, idx: number): StepStatus {
    if (manualOverrides[step.id]) {
      return manualOverrides[step.id]
    }
    if (step.output && artifactNodesByName.value[step.output]) {
      return 'completed'
    }
    if (idx === 0) {
      return 'in_progress'
    }
    const prevStep = activeSteps.value[idx - 1]
    if (prevStep && getStepStatus(prevStep, idx - 1) === 'completed') {
      return 'in_progress'
    }
    return 'pending'
  }

  function getStepStatusById(nodeId: string): StepStatus {
    const stepIdx = activeSteps.value.findIndex((s) => s.id === nodeId)
    if (stepIdx >= 0) {
      return getStepStatus(activeSteps.value[stepIdx], stepIdx)
    }
    if (manualOverrides[nodeId]) {
      return manualOverrides[nodeId]
    }
    return 'pending'
  }

  const completedCount = computed(() => {
    return activeSteps.value.filter((s, idx) => getStepStatus(s, idx) === 'completed').length
  })

  const progressPercentage = computed(() => {
    if (activeSteps.value.length === 0) return 0
    return Math.round((completedCount.value / activeSteps.value.length) * 100)
  })

  const childSubStepsCompletedCount = computed(() => {
    return childSubSteps.value.filter((s) => getStepStatusById(s.id) === 'completed').length
  })

  // RACI Lookup from matrices in node graph
  const currentStepRaci = computed<RaciAssignment[]>(() => {
    if (!currentStep.value) return []
    const stepName = currentStep.value.name
    const result: RaciAssignment[] = []

    const root = Object.values(nodesRef.value || {}).find(
      (n) => n.kind === 'root' || n.fields?.__matrix_defs || n.fields?.matrices,
    )
    if (!root || !root.fields) return result

    const prefix = 'work-roles matrix||' + stepName + '||'
    for (const [key, field] of Object.entries(root.fields)) {
      if (key.startsWith(prefix) && field.value && field.value !== '-') {
        const roleName = key.substring(prefix.length)
        result.push({ role: roleName, value: String(field.value) })
      }
    }

    return result
  })

  const inputArtifactNode = computed<ModelNodeLike | null>(() => {
    if (!currentStep.value?.input) return null
    return artifactNodesByName.value[currentStep.value.input] || null
  })

  const outputArtifactNode = computed<ModelNodeLike | null>(() => {
    if (!currentStep.value?.output) return null
    return artifactNodesByName.value[currentStep.value.output] || null
  })

  // Actions
  function completeAndNext() {
    if (!currentStep.value) return
    manualOverrides[currentStep.value.id] = 'completed'
    if (currentStepIndex.value < activeSteps.value.length - 1) {
      currentStepIndex.value++
    }
  }

  function nextStep() {
    if (currentStepIndex.value < activeSteps.value.length - 1) {
      currentStepIndex.value++
    }
  }

  function prevStep() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  }

  function passDecision(passed: boolean) {
    if (!currentStep.value) return
    if (passed) {
      manualOverrides[currentStep.value.id] = 'completed'
      nextStep()
    } else {
      manualOverrides[currentStep.value.id] = 'blocked'
    }
  }

  function markSubStepCompleted(nodeId: string) {
    manualOverrides[nodeId] = 'completed'
  }

  function markSubStepPending(nodeId: string) {
    manualOverrides[nodeId] = 'in_progress'
  }

  function jumpToSubStep(nodeId: string) {
    const idx = activeSteps.value.findIndex((s) => s.id === nodeId)
    if (idx >= 0) {
      currentStepIndex.value = idx
    }
  }

  function resetProgress() {
    for (const key of Object.keys(manualOverrides)) {
      delete manualOverrides[key]
    }
    currentStepIndex.value = 0
  }

  return {
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
  }
}
