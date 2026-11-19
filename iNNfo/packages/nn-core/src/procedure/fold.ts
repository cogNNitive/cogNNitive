import type {
  ArtifactState,
  FoldOptions,
  Guard,
  ProcedureGraph,
  RunEvent,
  RunState,
  RunStatus,
  StepState,
} from './types.js'

const TERMINAL: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled'])
const ARTIFACT_STATUS = {
  artifact_produced: 'produced',
  artifact_validated: 'validated',
  artifact_rejected: 'rejected',
} as const

/**
 * Derives the state of a run from its recorded facts (design §5, R1). Pure: the same graph,
 * events and options always give the same state. Loops are not walked (slice 1): a revisited
 * step blocks the run instead of looping.
 */
export function foldRun(graph: ProcedureGraph, events: readonly RunEvent[], opts: FoldOptions): RunState {
  const steps: Record<string, StepState> = {}
  for (const slug of Object.keys(graph.steps)) steps[slug] = { status: 'pending', attempt: 0 }
  const startedInputs: Record<string, Record<string, string>> = {}
  const artifacts: Record<string, ArtifactState> = {}
  const validatedRev: Record<string, string | undefined> = {}
  const inputs: RunState['inputs'] = {}
  let pinned = opts.defRev
  let paused = false
  let terminal: RunStatus | undefined

  for (const e of events) {
    const prev = e.step !== undefined ? steps[e.step] : undefined
    if (prev && e.step !== undefined) {
      if (e.kind === 'step_started') {
        steps[e.step] = { status: 'active', attempt: e.attempt ?? prev.attempt + 1 }
        startedInputs[e.step] = e.inputs ?? {}
      } else if (e.kind === 'step_waiting') steps[e.step] = { ...prev, status: 'waiting', waitingOn: e.value }
      else if (e.kind === 'step_completed')
        steps[e.step] = { status: 'done', attempt: prev.attempt, outcome: e.outcome, next: e.next }
      else if (e.kind === 'step_failed') steps[e.step] = { status: 'failed', attempt: prev.attempt, failure: e.value }
    }
    if (e.kind in ARTIFACT_STATUS && e.field !== undefined) {
      const status = ARTIFACT_STATUS[e.kind as keyof typeof ARTIFACT_STATUS]
      artifacts[e.field] = { status, rev: e.rev, value: e.value, step: e.step }
      if (status === 'validated') validatedRev[e.field] = e.rev
    }
    if (e.kind === 'input_recorded' && e.field !== undefined) inputs[e.field] = { value: e.value, rev: e.rev }
    if (e.kind === 'interrupted') paused = true
    if (e.kind === 'resumed') paused = false
    if (e.kind === 'rebased') pinned = e.value ?? null
    if (TERMINAL.has(e.kind)) terminal = e.kind as RunStatus
  }

  // Walk the path from the start step.
  const path: string[] = []
  let current: string | null = null
  let blockedBy: string | undefined
  if (graph.start === null) blockedBy = 'The procedure has no single start step.'
  for (let s: string | undefined = graph.start ?? undefined; s !== undefined; ) {
    if (path.includes(s)) {
      blockedBy = `Step "${s}" is reached twice; loops are not runnable yet.`
      current = s
      break
    }
    path.push(s)
    const def = graph.steps[s]
    const st = steps[s]
    if (st.status !== 'done') {
      current = s
      break
    }
    if (def.next.length === 0) break
    const t: string | undefined = st.next ?? (def.next.length === 1 ? def.next[0] : undefined)
    if (t === undefined || !def.next.includes(t)) {
      current = s
      blockedBy =
        t === undefined
          ? `Step "${s}" completed without choosing among ${def.next.join(', ')}.`
          : `Step "${s}" completed with next "${t}", which is not one of ${def.next.join(', ')}.`
      break
    }
    s = t
  }

  // Stale artifacts and reopened steps.
  const stale = Object.keys(artifacts).filter((slug) => {
    const a = artifacts[slug]
    if (a.status !== 'validated') return false
    const producer = a.step ?? graph.artifacts[slug]?.producers[0]
    const consumed = (producer && startedInputs[producer]) || {}
    return Object.entries(consumed).some(([inp, rev]) => validatedRev[inp] !== undefined && validatedRev[inp] !== rev)
  })
  for (const slug of stale) artifacts[slug] = { ...artifacts[slug], status: 'stale' }
  const reopened = path.filter(
    (slug) => steps[slug].status === 'done' && graph.steps[slug].outputs.some((o) => stale.includes(o)),
  )
  for (const slug of reopened) steps[slug] = { ...steps[slug], status: 'reopened' }
  if (reopened.length > 0) current = reopened[0]

  // Steps off the walked path: pending when still reachable from the current step.
  const ahead = reachable(graph, current)
  for (const slug of Object.keys(steps))
    if (!path.includes(slug) && !ahead.has(slug)) steps[slug] = { ...steps[slug], status: 'off_path' }

  for (const [slug, def] of Object.entries(graph.artifacts)) {
    if (artifacts[slug]) continue
    const offPath = def.producers.length > 0 && def.producers.every((p) => steps[p].status === 'off_path')
    artifacts[slug] = { status: !def.required || offPath ? 'not_required' : 'expected' }
  }

  const last = events[events.length - 1]
  const crashed =
    opts.lockFree === true &&
    last?.kind === 'step_started' &&
    last.step !== undefined &&
    graph.steps[last.step]?.executor === 'engine'
  if (crashed && !blockedBy) blockedBy = `Engine step "${last.step}" started and never reported back.`
  if (current && steps[current].status === 'failed' && !blockedBy)
    blockedBy = `Step "${current}" failed: ${steps[current].failure ?? 'no reason recorded'}.`

  const drift = pinned !== graph.defRev ? { pinned, current: graph.defRev } : null
  const waiting = paused || (current !== null && steps[current].status === 'waiting')
  const status: RunStatus =
    terminal ?? (drift ? 'drifted' : blockedBy ? 'blocked' : waiting ? 'waiting' : 'open')

  return {
    status,
    currentStep: current,
    path,
    steps,
    artifacts,
    allowedNext: current ? graph.steps[current].next.map((to) => ({ to, guard: guardOf(graph, to, artifacts) })) : [],
    stale,
    reopened,
    drift,
    crashed,
    paused,
    blockedBy,
    canComplete: terminal === undefined && current === null && path.length > 0 && !blockedBy,
    inputs,
    staleInputs: Object.keys(inputs).filter((f) => {
      const now = opts.currentRevs?.[f]
      return now !== undefined && now !== inputs[f].rev
    }),
  }
}

function reachable(graph: ProcedureGraph, from: string | null): Set<string> {
  const seen = new Set<string>()
  const todo = from ? [...graph.steps[from].next] : []
  for (let s = todo.pop(); s !== undefined; s = todo.pop()) {
    if (seen.has(s)) continue
    seen.add(s)
    todo.push(...graph.steps[s].next)
  }
  return seen
}

/** Evaluable guards: `outcome == <token>` and `[[artifact]] validated`; anything else is prose (asserted). */
function guardOf(graph: ProcedureGraph, to: string, artifacts: Record<string, ArtifactState>): Guard {
  const text = graph.steps[to].condition?.trim()
  if (!text) return { kind: 'none' }
  const outcome = /^outcome\s*==\s*["']?([\w-]+)["']?$/.exec(text)
  if (outcome) return { kind: 'outcome', token: outcome[1] }
  const art = /^(?:\[\[([^\]]+)\]\]|@([\w-]+))\s+validated$/.exec(text)
  const ref = art ? (art[1] ?? art[2]).trim() : undefined
  const slug =
    ref === undefined
      ? undefined
      : graph.artifacts[ref]
        ? ref
        : Object.values(graph.artifacts).find((a) => a.name.toLowerCase() === ref.toLowerCase())?.slug
  if (slug) return { kind: 'artifact', artifact: slug, holds: artifacts[slug]?.status === 'validated' }
  return { kind: 'prose', text }
}
