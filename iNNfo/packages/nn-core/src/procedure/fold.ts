import type {
  ArtifactRow,
  ArtifactState,
  FoldOptions,
  Guard,
  ProcedureGraph,
  RunModel,
  RunState,
  RunStatus,
  StepRow,
  StepState,
} from './types.js'

const TERMINAL: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled'])

/**
 * Derives the state of a run from its stored rows (design §3.3): steps, outcomes, chosen
 * `next` and attempts are read directly from `Step Run`; artifacts from `Run Artifact`. The
 * walk, branches, guards, drift and `canComplete` are unchanged from the event fold.
 *
 * Reads no change log: it is pure over (graph, run model, options).
 */
export function foldRun(graph: ProcedureGraph, run: RunModel, opts: FoldOptions): RunState {
  const steps: Record<string, StepState> = {}
  const startedInputs: Record<string, Record<string, string>> = {}
  for (const slug of Object.keys(graph.steps)) {
    const row: StepRow | undefined = run.steps[slug]
    steps[slug] = {
      status: rowStatusOf(row),
      attempt: row?.attempt ?? 0,
      ...(row?.outcome !== undefined ? { outcome: row.outcome } : {}),
      ...(row?.next !== undefined ? { next: row.next } : {}),
      ...(row?.waitingOn !== undefined ? { waitingOn: row.waitingOn } : {}),
      ...(row?.failure !== undefined ? { failure: row.failure } : {}),
    }
    if (row?.inputs && Object.keys(row.inputs).length > 0) startedInputs[slug] = row.inputs
  }

  const artifacts: Record<string, ArtifactState> = {}
  const validatedRev: Record<string, string | undefined> = {}
  for (const [slug, row] of Object.entries(run.artifacts)) {
    artifacts[slug] = artifactStateOf(row)
    if (row.status === 'validated' && row.rev !== undefined) validatedRev[slug] = row.rev
  }

  const pinned = opts.defRev
  const paused = run.state === 'paused'
  const terminal: RunStatus | undefined = TERMINAL.has(run.state)
    ? (run.state as RunStatus)
    : undefined

  // Walk the path from the start step.
  const path: string[] = []
  let current: string | null = null
  let blockedBy: string | undefined
  if (graph.start === null) blockedBy = 'The procedure has no single start step.'
  for (let s: string | undefined = graph.start ?? undefined; s !== undefined;) {
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
    return Object.entries(consumed).some(
      ([inp, rev]) => validatedRev[inp] !== undefined && validatedRev[inp] !== rev,
    )
  })
  for (const slug of stale) artifacts[slug] = { ...artifacts[slug], status: 'stale' }
  const reopened = path.filter(
    (slug) =>
      steps[slug].status === 'done' && graph.steps[slug].outputs.some((o) => stale.includes(o)),
  )
  for (const slug of reopened) steps[slug] = { ...steps[slug], status: 'reopened' }
  if (reopened.length > 0) current = reopened[0]

  // Steps off the walked path: pending when still reachable from the current step.
  const ahead = reachable(graph, current)
  for (const slug of Object.keys(steps))
    if (!path.includes(slug) && !ahead.has(slug))
      steps[slug] = { ...steps[slug], status: 'off_path' }

  for (const [slug, def] of Object.entries(graph.artifacts)) {
    if (artifacts[slug]) continue
    const offPath =
      def.producers.length > 0 && def.producers.every((p) => steps[p].status === 'off_path')
    artifacts[slug] = { status: !def.required || offPath ? 'not_required' : 'expected' }
  }

  // Crash derivation (design §3.3): an engine step left `active` whose holder is gone. The
  // I/O layer owns the probe; the fold only asks. Never read from the apply lock.
  let crashed = false
  if (opts.activeStepIsStale) {
    for (const [slug, row] of Object.entries(run.steps)) {
      if (row.status !== 'active') continue
      if (graph.steps[slug]?.executor !== 'engine') continue
      if (opts.activeStepIsStale(slug, row)) {
        crashed = true
        if (!blockedBy) blockedBy = `Engine step "${slug}" started and never reported back.`
        break
      }
    }
  }
  if (current && steps[current].status === 'failed' && !blockedBy)
    blockedBy = `Step "${current}" failed: ${steps[current].failure ?? 'no reason recorded'}.`

  const drift = pinned !== graph.defRev ? { pinned, current: graph.defRev } : null
  const waiting = paused || (current !== null && steps[current].status === 'waiting')
  const status: RunStatus =
    terminal ??
    (drift ? 'drifted' : blockedBy ? 'blocked' : paused ? 'paused' : waiting ? 'waiting' : 'open')

  return {
    status,
    currentStep: current,
    path,
    steps,
    artifacts,
    allowedNext: current
      ? graph.steps[current].next.map((to) => ({ to, guard: guardOf(graph, to, artifacts) }))
      : [],
    stale,
    reopened,
    drift,
    crashed,
    paused,
    blockedBy,
    canComplete: terminal === undefined && current === null && path.length > 0 && !blockedBy,
    inputs: {},
    staleInputs: [],
    attempts: run.attempts,
  }
}

function rowStatusOf(row: StepRow | undefined): StepState['status'] {
  if (!row) return 'pending'
  return row.status
}

function artifactStateOf(row: ArtifactRow): ArtifactState {
  return {
    status: row.status,
    ...(row.rev !== undefined ? { rev: row.rev } : {}),
    ...(row.value !== undefined ? { value: row.value } : {}),
    ...(row.step !== undefined ? { step: row.step } : {}),
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
export function guardOf(
  graph: ProcedureGraph,
  step: string,
  artifacts: Record<string, ArtifactState>,
): Guard {
  const condition = graph.steps[step]?.condition?.trim()
  if (!condition) return { kind: 'none' }
  const outcome = /^outcome\s*==\s*["']?([\w-]+)["']?$/.exec(condition)
  if (outcome) return { kind: 'outcome', token: outcome[1]! }
  const art = /^(?:\[\[([^\]]+)\]\]|@([\w-]+))\s+validated$/.exec(condition)
  const ref = art ? (art[1] ?? art[2])!.trim() : undefined
  const slug =
    ref === undefined
      ? undefined
      : graph.artifacts[ref]
        ? ref
        : Object.values(graph.artifacts).find((a) => a.name.toLowerCase() === ref.toLowerCase())
            ?.slug
  if (slug)
    return { kind: 'artifact', artifact: slug, holds: artifacts[slug]?.status === 'validated' }
  return { kind: 'prose', text: condition }
}
