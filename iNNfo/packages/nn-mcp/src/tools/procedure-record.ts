import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatUtcStamp } from '@cognnitive/nn-core'
import type { ChangeItem, RunEvent, RunState, Transition } from '@cognnitive/nn-core'
import { applyChange } from './apply-change.js'
import { writeProposedChangeset } from './propose-changeset.js'
import { findKnowledgeFile } from './spec.js'
import { loadDeclarations } from './domain-index.js'
import {
  describeRun,
  fail,
  foldStoredRun,
  readRun,
  resolveProcedure,
  substitute,
} from './procedure-state.js'
import type { FoldedRun, ProcedureStateResult, RecordAction, ToolError } from './procedure-state.js'

/**
 * Writing side of the procedure runner (design §4, §6). Every call writes ONE synthesized
 * changeset applied through `applyChange`, so the ledger, the `append-only` write policy, the
 * apply lock and `close_model` all hold. Each event is one `add_element` change carrying its
 * fields (`to:: {json}`). The fold decides what may be recorded; a forbidden fact is refused
 * with a stable code and nothing is written.
 */

/** Where a domain carries the `executions` bluepriNNt package; else the canonical URL. */
const EXECUTIONS_LOCAL = 'specs/bluepriNNts/executions/spec_NN.md'
const EXECUTIONS_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/executions/spec_NN.md'
const RUN_ID = /^[a-z0-9][a-z0-9-]*$/
const DEFAULT_TIMEOUT_MS = 60_000

type Fields = Partial<Record<keyof RunEvent, string>>
type Change = Omit<ChangeItem, 'id'>

const eventFields = (e: RunEvent, actor: string): Fields => {
  const f: Fields = {}
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined) continue
    f[k as keyof RunEvent] = typeof v === 'string' ? v : JSON.stringify(v)
  }
  return { ...f, actor, at: new Date().toISOString() }
}

const eventChange = (run: string, n: number, fields: Fields): Change => ({
  op: 'add_element',
  target: run,
  concept: 'Execution Event',
  name: `e-${String(n).padStart(3, '0')}`,
  to: JSON.stringify(fields),
  evidence: 'decision',
})

/** Writes one changeset and applies it. A refused apply is reported with the engine's errors. */
async function commit(
  root: string,
  changes: Change[],
  meta: { title: string; actor: string; kind: 'agent' | 'engine' },
): Promise<{ ok: true; changeset: string } | ToolError> {
  const written = await writeProposedChangeset(root, {
    changes: changes as ChangeItem[],
    title: meta.title,
    author: meta.actor,
    authorKind: meta.kind,
  })
  const applied = await applyChange(root, written.path)
  if (!applied.success || (applied.errors ?? []).length > 0)
    return fail('APPLY_FAILED', 'The run changeset was not applied.', {
      changeset: written.path,
      errors: applied.errors ?? [],
    })
  return { ok: true, changeset: written.path }
}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== ''
    ? v.trim()
    : typeof v === 'number'
      ? String(v)
      : undefined

/* ── procedure_start ─────────────────────────────────────────── */

export interface StartResult {
  ok: true
  run: string
  procedure: string
  changeset: string
  state: RunState
}

export async function procedureStart(
  root: string,
  args: Record<string, unknown>,
): Promise<StartResult | ToolError> {
  const ref = text(args['procedure'])
  if (!ref)
    return fail(
      'INVALID_ARGUMENT',
      'procedure must be a procedure id or a procedure document path.',
    )
  const given = args['params'] ?? {}
  if (given === null || typeof given !== 'object' || Array.isArray(given))
    return fail('INVALID_ARGUMENT', 'params must be an object of slot values.')
  const resolved = await resolveProcedure(root, ref, text(args['path']) ?? '.')
  if (!resolved.ok) return resolved
  const { address, slots, graph } = resolved.procedure

  // Slots of kind `value` are the run parameters; `procedure` slots are filled by scopes.
  const params: Record<string, unknown> = { ...(given as Record<string, unknown>) }
  for (const slot of slots) {
    if (slot.kind !== 'value' || params[slot.name] !== undefined) continue
    if (slot.default !== undefined) params[slot.name] = slot.default
  }
  const missing = slots
    .filter((s) => s.kind === 'value' && s.required && params[s.name] === undefined)
    .map((s) => s.name)
  if (missing.length > 0)
    return fail('MISSING_REQUIRED_SLOT', `Procedure "${ref}" requires ${missing.join(', ')}.`, {
      missing,
    })

  const procId = ref
    .replace(/^.*\//, '')
    .replace(/_procedures_NN\.md$/i, '')
    .replace(/_/g, '-')
  const run = text(args['run']) ?? `${procId}-${formatUtcStamp(new Date()).toLowerCase()}`
  if (!RUN_ID.test(run)) return fail('INVALID_ARGUMENT', `run "${run}" must be a lowercase slug.`)
  let taken = existsSync(join(root, 'executions', run))
  try {
    taken ||= (await findKnowledgeFile(root, run)) !== null
  } catch {
    // An id that cannot address a model cannot collide with one.
  }
  if (taken) return fail('RUN_EXISTS', `A model "${run}" already exists.`)

  // add_model places a run from the declarations it resolves; without them the run would not
  // land at its `executions/{slug}/` placement, so refuse before writing anything.
  const blueprintUrl = existsSync(join(root, EXECUTIONS_LOCAL)) ? EXECUTIONS_LOCAL : EXECUTIONS_URL
  const declared = await loadDeclarations(root, { name: 'executions', url: blueprintUrl })
  if (declared?.get('Procedure Execution')?.mode !== 'distributed')
    return fail(
      'EXECUTIONS_NOT_INSTALLED',
      `The domaiNN does not carry the executions bluepriNNt package (${EXECUTIONS_LOCAL}).`,
    )

  const actor = text(args['actor']) ?? 'agent'
  const header: Record<string, string> = { procedure: address, params: JSON.stringify(params) }
  if (graph.defRev) header['def_rev'] = graph.defRev
  const committed = await commit(
    root,
    [
      {
        op: 'add_model',
        target: run,
        concept: 'Procedure Execution',
        blueprint_name: 'executions',
        blueprint_url: blueprintUrl,
        name: run,
        evidence: 'decision',
      },
      {
        op: 'set_fields',
        target: `${run}@${run}`,
        to: JSON.stringify(header),
        evidence: 'decision',
      },
      eventChange(run, 1, eventFields({ kind: 'started' }, actor)),
    ],
    { title: `Start ${run}`, actor, kind: 'agent' },
  )
  if (!committed.ok) return committed
  const after = await reload(root, run)
  if (!after.ok) return after
  return { ok: true, run, procedure: address, changeset: committed.changeset, state: after.state }
}

async function reload(root: string, run: string): Promise<ProcedureStateResult | ToolError> {
  const read = await readRun(root, run)
  if (!read.ok) return read
  const folded = await foldStoredRun(root, read.run)
  return folded.ok ? describeRun(folded.folded) : folded
}

/* ── procedure_record ────────────────────────────────────────── */

const ACTIONS: readonly RecordAction[] = [
  'start',
  'run',
  'wait',
  'complete',
  'fail',
  'artifact',
  'input',
  'pause',
  'resume',
  'rebase',
  'cancel',
  'finish',
]
const ARTIFACT_FACTS = {
  produced: 'artifact_produced',
  validated: 'artifact_validated',
  rejected: 'artifact_rejected',
} as const

export interface RecordResult extends ProcedureStateResult {
  recorded: RunEvent[]
  changeset: string
  exitCode?: number | null
}

/** Whether a guard holds for this outcome; prose is asserted only when it is named explicitly. */
const holds = (t: Transition, outcome: string | undefined): boolean | 'asserted' =>
  t.guard.kind === 'none'
    ? true
    : t.guard.kind === 'outcome'
      ? t.guard.token === outcome
      : t.guard.kind === 'artifact'
        ? t.guard.holds
        : 'asserted'

type Planned =
  { events: RunEvent[]; close?: boolean; kind?: 'engine'; exitCode?: number | null } | ToolError

/** Validates the step a step action names: known, current, and in the status the action needs. */
function stepFor(
  f: FoldedRun,
  args: Record<string, unknown>,
): { ok: true; step: string } | ToolError {
  const named = text(args['step'])
  if (named !== undefined && !f.graph.steps[named])
    return fail('UNKNOWN_STEP', `"${named}" is not a step of the procedure.`)
  const current = f.state.currentStep
  if (current === null) return fail('STEP_NOT_CURRENT', 'The run has no current step.')
  if (named !== undefined && named !== current)
    return fail(
      'STEP_NOT_CURRENT',
      `"${named}" is not the current step; the current step is "${current}".`,
      {
        currentStep: current,
      },
    )
  return { ok: true, step: current }
}

function planStepStart(f: FoldedRun, step: string): RunEvent | ToolError {
  const st = f.state.steps[step]!
  if ((st.status === 'active' || st.status === 'waiting') && !f.state.crashed)
    return fail('STEP_ALREADY_STARTED', `Step "${step}" is already ${st.status}.`)
  const inputs: Record<string, string> = {}
  for (const a of f.graph.steps[step]!.inputs) {
    const art = f.state.artifacts[a]
    if (art?.status === 'validated' && art.rev !== undefined) inputs[a] = art.rev
  }
  return {
    kind: 'step_started',
    step,
    attempt: st.attempt + 1,
    ...(Object.keys(inputs).length > 0 ? { inputs } : {}),
  }
}

function plan(
  f: FoldedRun,
  action: RecordAction,
  args: Record<string, unknown>,
  root: string,
): Planned {
  const { state, graph, run } = f
  if (run.closed || ['completed', 'failed', 'cancelled'].includes(state.status))
    return fail('RUN_CLOSED', `Run "${run.id}" is closed (${state.status}).`)
  const value = text(args['value'])
  const stepAction = ['start', 'run', 'wait', 'complete', 'fail'].includes(action)
  if (state.drift && (stepAction || action === 'artifact'))
    return fail(
      'RUN_DRIFTED',
      'The procedure changed since the run started; record rebase first.',
      {
        drift: state.drift,
      },
    )
  if (state.paused && stepAction)
    return fail('RUN_PAUSED', 'The run is paused; record resume first.')

  switch (action) {
    case 'input': {
      const field = text(args['field'])
      if (!field) return fail('INVALID_ARGUMENT', 'input needs field.')
      const rev = text(args['rev'])
      return {
        events: [
          { kind: 'input_recorded', field, ...(value ? { value } : {}), ...(rev ? { rev } : {}) },
        ],
      }
    }
    case 'artifact': {
      const fact = ARTIFACT_FACTS[text(args['fact']) as keyof typeof ARTIFACT_FACTS]
      if (!fact)
        return fail('INVALID_ARGUMENT', 'artifact needs fact: produced, validated or rejected.')
      const field = text(args['field'])
      if (!field || !graph.artifacts[field])
        return fail('UNKNOWN_ARTIFACT', `"${field ?? ''}" is not an artifact of the procedure.`)
      const step =
        text(args['step']) ?? graph.artifacts[field]!.producers[0] ?? state.currentStep ?? undefined
      const rev = text(args['rev'])
      return {
        events: [
          {
            kind: fact,
            field,
            ...(step ? { step } : {}),
            ...(value ? { value } : {}),
            ...(rev ? { rev } : {}),
          },
        ],
      }
    }
    case 'pause':
      return state.paused
        ? fail('RUN_PAUSED', 'The run is already paused.')
        : { events: [{ kind: 'interrupted' }] }
    case 'resume':
      return state.paused
        ? { events: [{ kind: 'resumed' }] }
        : fail('NOT_PAUSED', 'The run is not paused.')
    case 'rebase':
      if (!state.drift)
        return fail('NOT_DRIFTED', 'The run follows the current definition revision.')
      return { events: [{ kind: 'rebased', value: value ?? state.drift.current ?? '' }] }
    case 'cancel':
      return { events: [{ kind: 'cancelled' }], close: true }
    case 'finish': {
      const outcome = text(args['outcome']) ?? 'completed'
      if (outcome === 'failed')
        return { events: [{ kind: 'failed', ...(value ? { value } : {}) }], close: true }
      if (outcome !== 'completed')
        return fail('INVALID_ARGUMENT', 'finish outcome is completed or failed.')
      if (!state.canComplete)
        return fail(
          'CANNOT_COMPLETE',
          state.blockedBy ?? 'The walk has not reached a done terminal step.',
          {
            currentStep: state.currentStep,
          },
        )
      return { events: [{ kind: 'completed' }], close: true }
    }
  }

  const located = stepFor(f, args)
  if (!located.ok) return located
  const step = located.step
  const status = state.steps[step]!.status
  if (action === 'start') {
    const started = planStepStart(f, step)
    return 'ok' in started ? started : { events: [started] }
  }
  if (action === 'run') return planEngineRun(f, step, args, root)
  if (status !== 'active' && status !== 'waiting')
    return fail('STEP_NOT_STARTED', `Step "${step}" is ${status}; record start first.`)
  if (action === 'wait') {
    if (!value) return fail('INVALID_ARGUMENT', 'wait needs value: who or what the step waits on.')
    return { events: [{ kind: 'step_waiting', step, value }] }
  }
  if (action === 'fail')
    return { events: [{ kind: 'step_failed', step, ...(value ? { value } : {}) }] }

  // complete
  const outcome = text(args['outcome'])
  const targets = state.allowedNext
  let next = text(args['next'])
  if (next !== undefined) {
    const t = targets.find((x) => x.to === next)
    if (!t || holds(t, outcome) === false)
      return fail('INVALID_TRANSITION', `"${next}" is not an allowed next step for this outcome.`, {
        allowedNext: targets,
      })
  } else if (targets.length === 1) {
    next = targets[0]!.to
  } else if (targets.length > 1) {
    const holding = targets.filter((t) => holds(t, outcome) === true)
    if (holding.length !== 1)
      return fail(
        'AMBIGUOUS_TRANSITION',
        `${holding.length} transitions hold for outcome "${outcome ?? ''}"; give next or an outcome that picks one.`,
        { allowedNext: targets },
      )
    next = holding[0]!.to
  }
  return {
    events: [
      { kind: 'step_completed', step, ...(outcome ? { outcome } : {}), ...(next ? { next } : {}) },
    ],
  }
}

/** sha256 of a file the `file:<path>` verify names, relative to the domain root; undefined when absent. */
function fileRev(root: string, path: string): string | undefined {
  const abs = join(root, path)
  if (!existsSync(abs)) return undefined
  return createHash('sha256').update(readFileSync(abs)).digest('hex')
}

/**
 * `action=run`: executes the engine step's command (slots substituted) in the domain root,
 * then records step_started, the `file:` artifacts it can verify, and step_completed or
 * step_failed with the exit code, all in the one changeset of the call.
 */
function planEngineRun(
  f: FoldedRun,
  step: string,
  args: Record<string, unknown>,
  root: string,
): Planned {
  const def = f.graph.steps[step]!
  if (def.executor !== 'engine' || !def.command)
    return fail('NOT_ENGINE_STEP', `Step "${step}" is not an engine step with a command.`)
  const started = planStepStart(f, step)
  if ('ok' in started) return started
  const command = substitute(def.command, f.run.params)!
  const timeout = typeof args['timeout_ms'] === 'number' ? args['timeout_ms'] : DEFAULT_TIMEOUT_MS
  const res = spawnSync(command, { cwd: root, shell: true, timeout, encoding: 'utf-8' })
  const exitCode = res.status
  const events: RunEvent[] = [started]
  if (exitCode !== 0) {
    const reason = res.error
      ? res.error.message
      : exitCode === null
        ? `signal ${res.signal}`
        : `exit ${exitCode}`
    events.push({ kind: 'step_failed', step, value: reason })
    return { events, kind: 'engine', exitCode }
  }
  const missing: string[] = []
  for (const slug of def.outputs) {
    const verify = substitute(f.graph.artifacts[slug]?.verify, f.run.params)
    if (!verify?.startsWith('file:')) continue
    const path = verify.slice('file:'.length).trim()
    const rev = fileRev(root, path)
    if (rev) events.push({ kind: 'artifact_validated', step, field: slug, value: path, rev })
    else {
      events.push({ kind: 'artifact_rejected', step, field: slug, value: path })
      missing.push(path)
    }
  }
  events.push(
    missing.length > 0
      ? { kind: 'step_failed', step, value: `missing ${missing.join(', ')}` }
      : { kind: 'step_completed', step, ...(def.next.length === 1 ? { next: def.next[0] } : {}) },
  )
  return { events, kind: 'engine', exitCode }
}

export async function procedureRecord(
  root: string,
  args: Record<string, unknown>,
): Promise<RecordResult | ToolError> {
  const action = text(args['action']) as RecordAction | undefined
  if (!action || !ACTIONS.includes(action))
    return fail('INVALID_ACTION', `action must be one of ${ACTIONS.join(', ')}.`)
  const read = await readRun(root, args['run'])
  if (!read.ok) return read
  const folded = await foldStoredRun(root, read.run)
  if (!folded.ok) return folded
  const planned = plan(folded.folded, action, args, root)
  if ('ok' in planned) return planned

  const kind = planned.kind ?? 'agent'
  const actor = text(args['actor']) ?? kind
  const run = read.run.id
  const base = read.run.events.length + 1
  const changes: Change[] = planned.events.map((e, i) =>
    eventChange(run, base + i, eventFields(e, actor)),
  )
  if (planned.close) changes.push({ op: 'close_model', target: run, evidence: 'decision' })
  const committed = await commit(root, changes, { title: `${action} ${run}`, actor, kind })
  if (!committed.ok) return committed
  const after = await reload(root, run)
  if (!after.ok) return after
  return {
    ...after,
    recorded: planned.events,
    changeset: committed.changeset,
    ...(planned.kind === 'engine' ? { exitCode: planned.exitCode } : {}),
  }
}
