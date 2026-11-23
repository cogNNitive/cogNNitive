import { readFile } from 'node:fs/promises'
import { dirname, join, posix, relative, resolve } from 'node:path'
import {
  crashProbe,
  fillSlots,
  foldRun,
  parseKnowledge,
  procedureGraph,
  runModelOf,
} from '@cognnitive/nn-core'
import type {
  GraphDiagnostic,
  ProcedureGraph,
  RunModel,
  RunState,
  SlotDecl,
} from '@cognnitive/nn-core'
import { findKnowledgeFile } from './spec.js'
import { listScopedProcedures } from './scoped-procedures.js'
import { locateChain } from './resolve-effective.js'
import { locateFloorProcedures } from './floor-procedures.js'

/**
 * Reading side of the procedure runner (design §3.3): a run is an `executions` instance
 * model; its state is never stored twice, it is folded from its own rows by nn-core
 * `foldRun` against the graph nn-core `procedureGraph` reads from the procedure model.
 * Nothing here writes.
 */

export interface ToolError {
  ok: false
  code: string
  detail: string
  [key: string]: unknown
}

export const fail = (
  code: string,
  detail: string,
  extra: Record<string, unknown> = {},
): ToolError => ({
  ok: false,
  code,
  detail,
  ...extra,
})

const FLOOR_PREFIX = 'bluepriNNt:'

export interface ResolvedProcedure {
  /** What the run header records: a domain-relative document path, or `bluepriNNt:<package>/<doc>` for the floor. */
  address: string
  slots: readonly SlotDecl[]
  graph: ProcedureGraph
}

/** Reads a procedure document by the address a run header records, optionally one container. */
export async function loadProcedure(
  root: string,
  address: string,
): Promise<{ ok: true; graph: ProcedureGraph } | ToolError> {
  // `<doc>@<container-slug>` addresses one sub-procedure of a file (design §4.6).
  const at = address.lastIndexOf('@')
  const docAddress =
    at > 0 && !address.slice(0, at).includes('://') ? address.slice(0, at) : address
  const container =
    at > 0 && !address.slice(0, at).includes('://') ? address.slice(at + 1) : undefined
  let abs: string
  if (docAddress.startsWith(FLOOR_PREFIX)) {
    const located = locateChain(root, '.')
    if (!located.ok) return fail(located.code, located.detail)
    const floor = await locateFloorProcedures(located.chain)
    if (!floor.ok || !floor.packageDir)
      return fail('PROCEDURE_NOT_FOUND', `No bluepriNNt package holds ${docAddress}.`)
    abs = join(floor.packageDir, docAddress.slice(docAddress.indexOf('/') + 1))
  } else {
    abs = resolve(root, docAddress)
    if (relative(root, abs).startsWith('..'))
      return fail('PROCEDURE_NOT_FOUND', `${docAddress} is outside the domain root.`)
  }
  let text: string
  try {
    text = await readFile(abs, 'utf-8')
  } catch {
    return fail('PROCEDURE_NOT_FOUND', `The procedure document ${docAddress} cannot be read.`)
  }
  return { ok: true, graph: procedureGraph(parseKnowledge(text), container) }
}

/**
 * Resolves a procedure with the existing precedence (`list_blueprint_procedures` with a path):
 * an id is the selected definition visible from `scope`; a `.md` path is that domain document.
 */
export async function resolveProcedure(
  root: string,
  ref: string,
  scope = '.',
): Promise<{ ok: true; procedure: ResolvedProcedure } | ToolError> {
  const byPath = ref.endsWith('.md')
  const doc = byPath ? posix.normalize(ref.replace(/\\/g, '/')) : undefined
  const listing = await listScopedProcedures(root, doc ? dirname(dirname(doc)) : scope)
  if (!listing.ok) return fail(listing.code, listing.detail)
  const entry = listing.procedures.find((p) =>
    doc ? p.doc === doc && p.source_kind === 'scope' : p.id === ref && p.status === 'selected',
  )
  if (!entry)
    return fail('PROCEDURE_NOT_FOUND', `No procedure "${ref}" is visible from "${scope}".`)
  const address = entry.source_kind === 'blueprint' ? `${entry.source}/${entry.doc}` : entry.doc
  const loaded = await loadProcedure(root, address)
  if (!loaded.ok) return loaded
  return { ok: true, procedure: { address, slots: entry.slots, graph: loaded.graph } }
}

export interface RunRecord extends RunModel {
  id: string
  /** Whether the run model carries the `close_model` event (frontmatter `closed`). */
  closed: boolean
}

/** Reads a run instance model: its header and its step and artifact rows. */
export async function readRun(
  root: string,
  run: unknown,
): Promise<{ ok: true; run: RunRecord } | ToolError> {
  if (typeof run !== 'string' || run.trim() === '')
    return fail('INVALID_ARGUMENT', 'run must be a non-empty run id.')
  let file: string | null
  try {
    file = await findKnowledgeFile(root, run.trim())
  } catch {
    file = null
  }
  if (!file) return fail('RUN_NOT_FOUND', `No run "${run}" exists in this domaiNN.`)
  const model = parseKnowledge(await readFile(file, 'utf-8'))
  const runModel = runModelOf(model)
  if (!runModel) return fail('RUN_NOT_FOUND', `"${run}" is not a Procedure Execution.`)
  return {
    ok: true,
    run: {
      id: run.trim(),
      ...runModel,
      closed: (model.frontmatter as Record<string, unknown>)['closed'] === true,
    },
  }
}

/** `{slot}` placeholders replaced by the run parameters; unknown placeholders are kept. */
export const substitute = (
  text: string | undefined,
  params: Record<string, unknown>,
): string | undefined =>
  text === undefined
    ? undefined
    : fillSlots(text, Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))

/**
 * The values a run fills `{slot}` placeholders with: its parameters plus the built-in `{run}`,
 * the run id. The id is never stored as a parameter the person gave.
 */
export const slotValuesOf = (run: Pick<RunRecord, 'id' | 'params'>): Record<string, unknown> => ({
  ...run.params,
  run: run.id,
})

export interface FoldedRun {
  run: RunRecord
  graph: ProcedureGraph
  state: RunState
  /** The domaiNN root the run was read from, for a plan that must write before it executes. */
  root: string
}

/**
 * Folds a run against its procedure. Crash derivation probes the holder of an `active`
 * engine step (design §3.3): a pid probe on this host, an age fallback beyond it. It never
 * reads the apply lock.
 */
export async function foldStoredRun(
  root: string,
  run: RunRecord,
): Promise<{ ok: true; folded: FoldedRun } | ToolError> {
  const loaded = await loadProcedure(root, run.procedure)
  if (!loaded.ok) return loaded
  const state = foldRun(loaded.graph, run, {
    defRev: run.defRev,
    activeStepIsStale: (_slug, row) => crashProbe(row, { now: Date.now() }),
  })
  return { ok: true, folded: { run, graph: loaded.graph, state, root } }
}

export type RecordAction =
  | 'start'
  | 'run'
  | 'wait'
  | 'complete'
  | 'fail'
  | 'artifact'
  | 'input'
  | 'pause'
  | 'resume'
  | 'rebase'
  | 'cancel'
  | 'finish'

/** The `procedure_record` actions the fold allows now, in a stable order. */
export function allowedActions({ run, graph, state }: FoldedRun): RecordAction[] {
  if (run.closed || ['completed', 'failed', 'cancelled'].includes(state.status)) return []
  // Allowed in every open state, drift and pause included: recording an input is an external
  // fact, and pause/resume, cancel and finish never touch the walked path.
  const rest: RecordAction[] = [state.paused ? 'resume' : 'pause', 'cancel', 'finish']
  // Drift blocks every step action and every artifact fact until `rebase` is recorded
  // (`procedure-record.ts` `plan`), so the advertisement must not offer them.
  if (state.drift) return ['rebase', 'input', ...rest]
  const open: RecordAction[] = ['input', 'artifact', ...rest]
  if (state.paused) return open
  const actions: RecordAction[] = []
  const current = state.currentStep
  if (current) {
    const status = state.steps[current]!.status
    const def = graph.steps[current]!
    if (status === 'active' || status === 'waiting') {
      // `waiting` is already waiting; the two facts that end it are complete and fail.
      if (status === 'active') actions.push('wait')
      actions.push('complete', 'fail')
    }
    if (!(status === 'active' || status === 'waiting') || state.crashed) {
      actions.push('start')
      if (def.executor === 'engine' && def.command) actions.push('run')
    }
  }
  return [...actions, ...open]
}

/** What the current step needs: its executor, the decision it asks, its command, its inputs and outputs. */
export function currentStepNeeds({ run, graph, state }: FoldedRun): Record<string, unknown> | null {
  const slug = state.currentStep
  if (!slug) return null
  const def = graph.steps[slug]!
  const slots = slotValuesOf(run)
  const artifact = (a: string) => ({
    status: state.artifacts[a]?.status ?? 'expected',
    ...(state.artifacts[a]?.rev ? { rev: state.artifacts[a]!.rev } : {}),
    ...(graph.artifacts[a]?.verify
      ? { verify: substitute(graph.artifacts[a]!.verify, slots) }
      : {}),
  })
  const optional = {
    stepType: def.stepType,
    executor: def.executor,
    condition: def.condition,
    decision: substitute(def.decision, slots),
    command: substitute(def.command, slots),
    produces: substitute(def.produces, slots),
  }
  return {
    slug,
    name: def.name,
    status: state.steps[slug]!.status,
    attempt: state.steps[slug]!.attempt,
    ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)),
    inputs: Object.fromEntries(def.inputs.map((a) => [a, artifact(a)])),
    outputs: Object.fromEntries(def.outputs.map((a) => [a, artifact(a)])),
  }
}

export interface ProcedureStateResult {
  ok: true
  run: string
  procedure: string
  def_rev: string | null
  params: Record<string, unknown>
  closed: boolean
  /** The stored header state (`open`, `paused`, …). The derived status is on `state.status`. */
  headerState: string
  seq: number
  diagnostics: GraphDiagnostic[]
  state: RunState
  step: Record<string, unknown> | null
  allowedNext: RunState['allowedNext']
  actions: RecordAction[]
}

export function describeRun(folded: FoldedRun): ProcedureStateResult {
  const { run, graph, state } = folded
  return {
    ok: true,
    run: run.id,
    procedure: run.procedure,
    def_rev: run.defRev,
    params: run.params,
    closed: run.closed,
    headerState: run.state,
    seq: run.seq,
    diagnostics: graph.diagnostics,
    state,
    step: currentStepNeeds(folded),
    allowedNext: state.allowedNext,
    actions: allowedActions(folded),
  }
}

/** `procedure_state`: read-only. */
export async function procedureState(
  root: string,
  args: Record<string, unknown>,
): Promise<ProcedureStateResult | ToolError> {
  const read = await readRun(root, args['run'])
  if (!read.ok) return read
  const folded = await foldStoredRun(root, read.run)
  if (!folded.ok) return folded
  return describeRun(folded.folded)
}
