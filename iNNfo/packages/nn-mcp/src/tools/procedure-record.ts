import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_STEP_TIMEOUT_MS,
  MAX_STEP_TIMEOUT_MS,
  chooseNext,
  fillSlots,
  formatUtcStamp,
  guardOf,
  holderOf,
  loadChangeLog,
  procedureIdOf,
  unresolvedSlots,
} from '@cognnitive/nn-core'
import type { ChangeItem, RunState, StepRow } from '@cognnitive/nn-core'
import { applyChange } from './apply-change.js'
import { writeProposedChangeset } from './propose-changeset.js'
import { findKnowledgeFile } from './spec.js'
import { artifactRowChange, stageOutputs, writeOutputs } from './run-outputs.js'
import { artifactFileRev, artifactPathCandidate, resolveArtifactPath } from './artifact-path.js'
import { loadDeclarations } from './domain-index.js'
import {
  describeRun,
  ARTIFACT_REPORTING,
  fail,
  foldStoredRun,
  readRun,
  resolveProcedure,
  slotValuesOf,
  substitute,
} from './procedure-state.js'
import type { FoldedRun, ProcedureStateResult, RecordAction, ToolError } from './procedure-state.js'

/**
 * Writing side of the procedure runner (design §3.1-3.4).
 *
 * A run is a model with state: the header (`seq`, `state`), one `Step Run` row per step and
 * one `Run Artifact` row per artifact. Every call reads the model, folds it, plans one
 * changeset and applies it. The changeset is ATOMIC and holds the header's `seq: n -> n+1`
 * with `from: {seq: n}`, so a concurrent write to the same run conflicts the whole
 * changeset and is reported as `RUN_BUSY`; the caller re-reads and retries. A step
 * completion also guards the step's `status` and `attempt`, the fence against a late
 * completion from an older attempt. There is no run lock and no event log.
 */

/** Where a domain carries the `executions` bluepriNNt package; else the canonical URL. */
const EXECUTIONS_LOCAL = 'specs/bluepriNNts/executions/spec_NN.md'
const EXECUTIONS_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/executions/spec_NN.md'
const RUN_ID = /^[a-z0-9][a-z0-9-]*$/

type Change = Omit<ChangeItem, 'id'>

/**
 * The run context every runner changeset carries (design §3.2): `<run-id>@<step-slug>`. A
 * run-wide write (pause, cancel, finish) has no step and stamps only the run id.
 */
const runContext = (run: string, step?: string): string => (step ? `${run}@${step}` : run)

/**
 * Writes one changeset and applies it. The changeset is atomic: either every change lands or
 * the file is recorded as `conflict` and nothing is written. A conflict of the header `seq`
 * guard is `RUN_BUSY`, the signal to re-read and re-plan.
 */
async function commit(
  root: string,
  changes: Change[],
  meta: { title: string; actor: string; kind: 'agent' | 'engine'; run: string },
): Promise<{ ok: true; changeset: string } | ToolError> {
  const written = await writeProposedChangeset(root, {
    changes: changes as ChangeItem[],
    title: meta.title,
    author: meta.actor,
    authorKind: meta.kind,
    run: meta.run,
    atomic: true,
  })
  const applied = await applyChange(root, written.path)
  if (!applied.success || (applied.errors ?? []).length > 0) {
    // The header guard is the first change of every runner changeset: when the atomic apply
    // reports this run's seq precondition as the conflicted one, another caller got there
    // first and the caller must re-read. The check names the guarded target instead of
    // matching message prose, so a reworded diagnostic cannot turn RUN_BUSY into a failure.
    const headerTarget = `${meta.run}@${meta.run}&seq`
    const busy = (applied.errors ?? []).some(
      (e) =>
        e.code === 'ATOMIC_CHANGESET_CONFLICT' &&
        typeof e.message === 'string' &&
        e.message.includes(headerTarget),
    )
    if (busy)
      return fail('RUN_BUSY', 'Another caller wrote this run; re-read its state and retry.', {
        changeset: written.path,
      })
    return fail('APPLY_FAILED', 'The run changeset was not applied.', {
      changeset: written.path,
      errors: applied.errors ?? [],
    })
  }
  return { ok: true, changeset: written.path }
}

/** The header `seq` guard every runner changeset carries first. */
const seqGuard = (run: string, seq: number): Change => ({
  op: 'update_field',
  target: `${run}@${run}&seq`,
  from: String(seq),
  to: String(seq + 1),
  evidence: 'decision',
})

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

/**
 * Starts a run: refuses a graph with an error diagnostic or an unresolved declared slot
 * before writing anything (design §3.1), then writes ONE atomic changeset — the model, the
 * header and one row per step and per artifact. Either the whole run exists or none of it
 * does.
 */
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

  // Start-time refusal (design §3.1): structural errors are fatal to a run, because the
  // runner is the only validator of the run-to-procedure relation.
  const errors = graph.diagnostics.filter((d) => d.severity === 'error')
  if (errors.length > 0)
    return fail(
      'PROCEDURE_NOT_RUNNABLE',
      `Procedure "${ref}" cannot be run: ${errors.map((d) => d.code).join(', ')}.`,
      { diagnostics: graph.diagnostics },
    )

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
  // A declared slot the procedure declares but the run cannot fill leaves a `{name}` that
  // would be executed verbatim: refuse at start.
  const unfilled = graph.slots.filter((s) => params[s] === undefined)
  if (unfilled.length > 0)
    return fail(
      'MISSING_REQUIRED_SLOT',
      `Procedure "${ref}" declares slots ${unfilled.map((s) => `{${s}}`).join(', ')} with no value.`,
      { missing: unfilled },
    )

  // A container run is named after its document and the container: `usage-define-a-frame`.
  const at = ref.lastIndexOf('@')
  const procId =
    at > 0 && !ref.slice(0, at).includes('://')
      ? `${procedureIdOf(ref.slice(0, at))}-${ref.slice(at + 1)}`
      : procedureIdOf(ref)
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
      `The domaiNN does not carry the executions bluepriNNt package (${EXECUTIONS_LOCAL}). Install it with hydrate_blueprint (blueprint_name: "executions"), then start the run again.`,
      { fix: { tool: 'hydrate_blueprint', args: { blueprint_name: 'executions' } } },
    )

  const actor = text(args['actor']) ?? 'agent'
  const header: Record<string, string> = {
    procedure: address,
    params: JSON.stringify(params),
    seq: '1',
    state: 'open',
  }
  if (graph.defRev) header['def_rev'] = graph.defRev

  const slotValues = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ) as Record<string, string>
  slotValues['run'] = run

  const changes: Change[] = [
    {
      op: 'add_model',
      target: run,
      concept: 'Procedure Execution',
      blueprint_name: 'executions',
      blueprint_url: blueprintUrl,
      name: run,
      evidence: 'decision',
    },
    { op: 'set_fields', target: `${run}@${run}`, to: JSON.stringify(header), evidence: 'decision' },
    ...Object.values(graph.steps).map((def): Change => ({
      op: 'add_element',
      target: run,
      concept: 'Step Run',
      name: def.name,
      slug: def.slug,
      to: JSON.stringify({ status: 'pending', attempt: 0 }),
      evidence: 'decision',
    })),
    ...Object.values(graph.artifacts).map((art): Change => ({
      op: 'add_element',
      target: run,
      concept: 'Run Artifact',
      name: art.name,
      slug: art.slug,
      to: JSON.stringify({
        kind: art.kind,
        status: 'expected',
        ...(art.at !== undefined ? { value: fillSlots(art.at, slotValues) } : {}),
      }),
      evidence: 'decision',
    })),
  ]

  const committed = await commit(root, changes, {
    title: `Start ${run}`,
    actor,
    kind: 'agent',
    run,
  })
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
const ARTIFACT_STATUS = {
  produced: 'produced',
  validated: 'validated',
  rejected: 'rejected',
} as const

/** A step reports an artifact fact only once it has started. */

export interface RecordResult extends ProcedureStateResult {
  /** The applied changeset path (the run context is on it); replaces the old event list. */
  changeset: string
  exitCode?: number | null
}

/**
 * The holder a plain `start` records. It only books the step for a later `run`, so it names
 * the claim rather than a process; `action=run` records the pid of the child that executes
 * the command, because that child — not the long-lived MCP server — is what a crash kills.
 */
const AGENT_HOLDER = 'agent'

/** A parameter value spliced into a shell command: letters, digits and a safe punctuation set. */
const SHELL_SAFE = /^[A-Za-z0-9._+\-/:,=@\s]+$/

/**
 * Spawns one engine command in the domain root. The child is asynchronous, so the MCP server
 * keeps answering while a step runs, and `onSpawn` hands its pid to the caller, which writes
 * the claim with that pid as the holder: the crash probe then watches the process that runs
 * the command, not the long-lived server that only reported it. Nothing is written here, so
 * the claim stays one atomic changeset.
 */
interface EngineResult {
  exitCode: number | null
  reason?: string
}

function startEngineCommand(opts: {
  root: string
  command: string
  timeout: number
  params: Record<string, unknown>
  onSpawn: (pid: number) => void
}): { pid?: number; kill: () => void; done: Promise<EngineResult> } {
  // Slot values also travel as environment variables, so a procedure can read a parameter
  // without splicing it into shell text.
  const env = { ...process.env }
  for (const [name, value] of Object.entries(opts.params)) env[`NN_SLOT_${name}`] = String(value)
  const child = spawn(opts.command, { cwd: opts.root, shell: true, env, stdio: 'ignore' })
  if (child.pid !== undefined) opts.onSpawn(child.pid)
  const done = new Promise<EngineResult>((resolve) => {
    let settled = false
    const finish = (result: EngineResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => {
      child.kill()
      finish({ exitCode: null, reason: `timed out after ${opts.timeout} ms` })
    }, opts.timeout)
    timer.unref?.()
    child.on('error', (err) => finish({ exitCode: null, reason: err.message }))
    child.on('close', (code, signal) =>
      finish({ exitCode: code, reason: code === null ? `signal ${signal}` : undefined }),
    )
  })
  return { pid: child.pid, kill: () => child.kill(), done }
}

/**
 * One planned change: the changeset lines that record it, plus what the caller reports back.
 * `step` is the step the write belongs to, for the run context.
 */
interface Planned {
  changes: Change[]
  step?: string
  close?: boolean
  kind?: 'engine'
  exitCode?: number | null
  /** The attempt this plan guarded, for a completion fence. */
  attempt?: number
  /**
   * The header `seq` this plan already advanced and wrote itself, because the command had to
   * run after the claim landed. The completion changeset then guards `seq + 1`.
   */
  claimedSeq?: number
}

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
      { currentStep: current },
    )
  return { ok: true, step: current }
}

/** The engine row for a step, or a fresh pending row when the model has none. */
const rowOf = (f: FoldedRun, step: string): StepRow =>
  f.run.steps[step] ?? { status: 'pending', attempt: 0, inputs: {} }

/** A reopened step row: pending again, its attempt kept so the next start counts on from it. */
const reopenedRow = (attempt: number): string =>
  JSON.stringify({
    status: 'pending',
    attempt,
    outcome: '',
    next: '',
    waiting_on: '',
    failure: '',
    holder: '',
  })

/**
 * A loop's back-edge (design §10.2): `next` is a step the walk already passed before `step`.
 * Taking it reopens that step and every step walked from it up to `step`: their rows go back
 * to `pending` with their attempts kept, and every output of the span that was validated goes
 * back to `produced`, so the fold reports it stale until its producer runs again. The caller
 * writes `step`'s own row as reopened too, in the same changeset.
 *
 * Bounded: when the target already took its `max_attempts` (default `DEFAULT_MAX_ATTEMPTS`),
 * the back-edge is refused with `LOOP_LIMIT` and nothing is written. Null for a forward next.
 */
function backEdge(
  f: FoldedRun,
  step: string,
  next: string | undefined,
): { changes: Change[] } | ToolError | null {
  if (next === undefined) return null
  const at = f.state.path.indexOf(next)
  const from = f.state.path.indexOf(step)
  if (at === -1 || from === -1 || at >= from) return null
  const max = f.graph.steps[next]!.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const attempt = f.state.steps[next]!.attempt
  if (attempt >= max)
    return fail(
      'LOOP_LIMIT',
      `Step "${next}" already took ${attempt} of its ${max} attempts, so "${step}" cannot send the run back to it; fail "${step}" or take another branch.`,
      { step: next, attempt, maxAttempts: max },
    )
  const span = f.state.path.slice(at, from)
  const changes: Change[] = span.map((slug) => {
    const row = rowOf(f, slug)
    return {
      op: 'set_fields',
      target: `${f.run.id}@${slug}`,
      from: JSON.stringify({ status: row.status, attempt: row.attempt }),
      to: reopenedRow(row.attempt),
      evidence: 'decision',
    }
  })
  // What the completing step itself just recorded is the loop's fresh result (the revised
  // report its review reads next), so only the earlier outputs of the span go back.
  const outputs = new Set([...span, step].flatMap((slug) => f.graph.steps[slug]!.outputs))
  for (const slug of outputs) {
    if (f.run.artifacts[slug]?.status !== 'validated') continue
    if (f.run.artifacts[slug]?.step === step) continue
    changes.push({
      op: 'set_fields',
      target: `${f.run.id}@${slug}`,
      from: JSON.stringify({ status: 'validated' }),
      to: JSON.stringify({ status: 'produced' }),
      evidence: 'decision',
    })
  }
  return { changes }
}

/**
 * The loop step a forward `next` is certain to walk back to: following `next` through steps
 * with a single successor (no branch left to choose) reaches a step already on the walked path
 * at or before `step`. Null when the walk can leave the loop, or `next` is not forward.
 */
function certainLoopTarget(f: FoldedRun, step: string, next: string | undefined): string | null {
  if (next === undefined) return null
  const from = f.state.path.indexOf(step)
  if (from === -1 || f.state.path.indexOf(next) !== -1) return null
  const seen = new Set<string>()
  let at: string | undefined = next
  while (at !== undefined && !seen.has(at)) {
    seen.add(at)
    const succ: string[] = f.graph.steps[at]?.next ?? []
    if (succ.length !== 1) return null
    const to = succ[0]!
    const idx = f.state.path.indexOf(to)
    if (idx !== -1) return idx <= from ? to : null
    at = to
  }
  return null
}

/**
 * A decision on its loop target's last attempt cannot choose the branch that only leads back
 * to it: that branch's back-edge would be refused with `LOOP_LIMIT` one step later, leaving the
 * run with no way forward but failing the step it is sent to. Refusing here keeps the choice
 * where it can still be made (another outcome, or failing the decision). Null when allowed.
 */
function exhaustedLoop(f: FoldedRun, step: string, next: string | undefined): ToolError | null {
  const target = certainLoopTarget(f, step, next)
  if (target === null) return null
  const max = f.graph.steps[target]!.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const attempt = f.state.steps[target]!.attempt
  if (attempt < max) return null
  return fail(
    'LOOP_LIMIT',
    `Step "${target}" already took ${attempt} of its ${max} attempts, so "${step}" cannot choose "${next}": that branch only leads back to "${target}". Choose another outcome or fail "${step}".`,
    { step: target, attempt, maxAttempts: max, next },
  )
}

/**
 * A step's required outputs that this step has not recorded. Completing a step is the point
 * where the runner stops letting an actor move on with an empty result: `required` emphasizes
 * the gate for the artifacts every run needs, and an optional output (declared without it) is
 * never a reason to stop. The fold already reports the worth of an output for this run; an
 * artifact the fold marks `not_required` (off the walked path) is not asked of this step.
 *
 * The output counts only when this step recorded it. An artifact another producer validated
 * earlier (the first draft, before a loop's revise step) is not this step's result, so every
 * pass of a loop records its own output, the first one included.
 */
function unrecordedRequiredOutputs(
  f: FoldedRun,
  step: string,
): Array<{ slug: string; name: string }> {
  return f.graph.steps[step]!.outputs.filter((slug) => f.graph.artifacts[slug]?.required !== false)
    .filter((slug) => {
      const status = f.state.artifacts[slug]?.status
      if (status === 'not_required') return false
      return status !== 'validated' || f.run.artifacts[slug]?.step !== step
    })
    .map((slug) => ({ slug, name: f.graph.artifacts[slug]!.name }))
}

function planStepStart(
  f: FoldedRun,
  step: string,
  args: Record<string, unknown>,
  holder = AGENT_HOLDER,
): Planned | ToolError {
  const st = f.state.steps[step]!
  // A live engine claim is released only by the crash probe. A `waiting` step is a controlled
  // stop of the same attempt, so both paths reclaim it as the next attempt instead of the run
  // being stuck between waiting and done.
  if (
    st.status === 'active' &&
    !f.state.crashed &&
    f.graph.steps[step]!.executor === 'engine' &&
    holder === AGENT_HOLDER
  )
    return fail('STEP_ALREADY_STARTED', `Step "${step}" is already active.`)
  const row = rowOf(f, step)
  const inputs: Record<string, string> = {}
  // The revision the step reads is the stored row's. The fold may call a validated input
  // `stale` while a loop is open (its producer can still run again), but that revision is still
  // the one this attempt consumes, so it is recorded.
  for (const a of f.graph.steps[step]!.inputs) {
    const row = f.run.artifacts[a]
    if (row?.status === 'validated' && row.rev !== undefined) inputs[a] = row.rev
  }
  const attempt = (row.attempt ?? 0) + 1
  const requested =
    typeof args['timeout_ms'] === 'number' ? args['timeout_ms'] : DEFAULT_STEP_TIMEOUT_MS
  // The step's length is the crash window (design §3.3), so it is bounded: an unbounded
  // (or zero, which means "no timeout") value makes a live holder indistinguishable from a
  // crashed one.
  const timeout = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1_000), MAX_STEP_TIMEOUT_MS)
    : DEFAULT_STEP_TIMEOUT_MS
  // Claim (design §3.4): pending|failed -> active, attempt + 1, the claim facts. The `from`
  // guards make it a compare-and-set, so only one caller wins.
  return {
    step,
    attempt,
    changes: [
      {
        op: 'set_fields',
        target: `${f.run.id}@${step}`,
        from: JSON.stringify({ status: row.status, attempt: row.attempt }),
        to: JSON.stringify({
          status: 'active',
          attempt,
          claimed_at: new Date().toISOString(),
          timeout_ms: timeout,
          holder,
          inputs: JSON.stringify(inputs),
        }),
        evidence: 'decision',
      },
      // A loop sent the run back through this step (pending again after an attempt): what it
      // validated in its earlier pass is not this pass's result, so it goes back to
      // `produced` and the completion gate asks the step to record it again.
      ...(row.status === 'pending' && (row.attempt ?? 0) > 0
        ? f.graph.steps[step]!.outputs.filter(
            (slug) =>
              f.run.artifacts[slug]?.status === 'validated' && f.run.artifacts[slug]?.step === step,
          ).map((slug) => ({
            op: 'set_fields' as const,
            target: `${f.run.id}@${slug}`,
            from: JSON.stringify({ status: 'validated' }),
            to: JSON.stringify({ status: 'produced' }),
            evidence: 'decision' as const,
          }))
        : []),
    ],
  }
}

function plan(
  f: FoldedRun,
  action: RecordAction,
  args: Record<string, unknown>,
  root: string,
): Planned | ToolError | Promise<Planned | ToolError> {
  const { state, graph, run } = f
  if (run.closed || ['completed', 'failed', 'cancelled'].includes(state.status))
    return fail('RUN_CLOSED', `Run "${run.id}" is closed (${state.status}).`)
  const value = text(args['value'])
  const stepAction = ['start', 'run', 'wait', 'complete', 'fail'].includes(action)
  if (state.drift && (stepAction || action === 'artifact'))
    return fail(
      'RUN_DRIFTED',
      'The procedure changed since the run started; record rebase first.',
      { drift: state.drift },
    )
  if (state.paused && stepAction)
    return fail('RUN_PAUSED', 'The run is paused; record resume first.')

  switch (action) {
    case 'input': {
      const field = text(args['field'])
      if (!field) return fail('INVALID_ARGUMENT', 'input needs field.')
      const rev = text(args['rev'])
      // One row per input name: slug it, and set the row's value and rev.
      const slug = field
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
      const exists = f.run.inputs[slug] !== undefined
      const fields: Record<string, string> = {}
      if (value !== undefined) fields['value'] = value
      if (rev !== undefined) fields['rev'] = rev
      return {
        changes: [
          exists
            ? {
                op: 'set_fields',
                target: `${run.id}@${slug}`,
                to: JSON.stringify(fields),
                evidence: 'decision',
              }
            : {
                op: 'add_element',
                target: run.id,
                concept: 'Input',
                name: field,
                slug,
                to: JSON.stringify(fields),
                evidence: 'decision',
              },
        ],
      }
    }
    case 'artifact': {
      const status = ARTIFACT_STATUS[text(args['fact']) as keyof typeof ARTIFACT_STATUS]
      if (!status)
        return fail('INVALID_ARGUMENT', 'artifact needs fact: produced, validated or rejected.')
      const field = text(args['field'])
      if (!field || !graph.artifacts[field])
        return fail('UNKNOWN_ARTIFACT', `"${field ?? ''}" is not an artifact of the procedure.`)
      const named = text(args['step'])
      if (named !== undefined && !graph.steps[named])
        return fail('UNKNOWN_STEP', `"${named}" is not a step of the procedure.`)
      // With no step named, the current step reports the output when it declares it: a loop's
      // revise step re-records the artifact the first producer made, and the gate asks it to.
      const producers = graph.artifacts[field]!.producers
      const current = state.currentStep ?? undefined
      const step =
        named ??
        (current !== undefined && producers.includes(current) ? current : undefined) ??
        producers[0] ??
        current
      if (step === undefined)
        return fail(
          'STEP_NOT_STARTED',
          `Artifact "${field}" has no producer step to report it from; start a step first.`,
        )
      const stepStatus = state.steps[step]!.status
      if (!ARTIFACT_REPORTING.has(stepStatus))
        return fail(
          'STEP_NOT_STARTED',
          `Step "${step}" is ${stepStatus}; an artifact can only be reported by a step that started.`,
          { step, status: stepStatus },
        )
      const rev = text(args['rev'])
      // An element artifact's rev is the element's last applied change id, computed by the
      // runner and never passed by the agent (design §4.3): the agent records the output, the
      // run model pins what the change log says it is now.
      const kind = f.graph.artifacts[field]!.kind
      let elementRev: string | undefined
      if (kind === 'element') {
        const address =
          text(args['value']) ??
          substitute(f.graph.artifacts[field]!.at, slotValuesOf(f.run)) ??
          undefined
        if (!address)
          return fail(
            'INVALID_ARGUMENT',
            `Artifact "${field}" is an element artifact with no address; give value as model@element.`,
          )
        // The rev is the element's origin change id, and `origin()` is asked for
        // `<model>@<element>`. An address with no `@` names no element at all: refuse it
        // instead of slicing a different name out of it.
        const at = address.indexOf('@')
        if (at <= 0 || at === address.length - 1)
          return fail(
            'INVALID_ARGUMENT',
            `Artifact "${field}" is an element artifact; give value as model@element, not "${address}".`,
            { artifact: field, address },
          )
        elementRev = loadChangeLog(root).origin(address)?.id
        if (!elementRev)
          return fail(
            'ARTIFACT_NOT_RECORDED',
            `No applied change records element "${address}"; write it with a change before recording the artifact.`,
            { artifact: field, address },
          )
      }
      let fileRevValue: string | undefined
      let effectiveValue = value
      if (kind === 'file') {
        const candidate = artifactPathCandidate(f.graph.artifacts[field], f.run, value)
        const resolved = candidate ? resolveArtifactPath(root, field, candidate) : undefined
        if (resolved && 'ok' in resolved) return resolved
        const filePath = resolved?.path
        if (filePath) {
          const onDisk = artifactFileRev(root, field, filePath)
          if ('ok' in onDisk) return onDisk
          const actualRev = onDisk.rev
          if (status === 'validated') {
            if (!actualRev) {
              return fail(
                'FILE_NOT_FOUND',
                `Artifact "${field}" file "${filePath}" does not exist on disk; an unwritten file cannot be validated.`,
                { artifact: field, path: filePath },
              )
            }
            if (rev !== undefined && rev.trim() !== '' && rev.trim() !== actualRev) {
              return fail(
                'REV_MISMATCH',
                `Artifact "${field}" rev mismatch: supplied "${rev}" does not match file sha256 "${actualRev}".`,
                { artifact: field, path: filePath, supplied: rev, actual: actualRev },
              )
            }
            fileRevValue = actualRev
            effectiveValue = filePath
          } else {
            if (actualRev) {
              if (rev !== undefined && rev.trim() !== '' && rev.trim() !== actualRev) {
                return fail(
                  'REV_MISMATCH',
                  `Artifact "${field}" rev mismatch: supplied "${rev}" does not match file sha256 "${actualRev}".`,
                  { artifact: field, path: filePath, supplied: rev, actual: actualRev },
                )
              }
              fileRevValue = actualRev
              effectiveValue = filePath
            } else if (rev !== undefined && rev.trim() !== '') {
              return fail(
                'FILE_NOT_FOUND',
                `Artifact "${field}" file "${filePath}" does not exist on disk; cannot supply rev for an unwritten file.`,
                { artifact: field, path: filePath },
              )
            }
          }
        } else {
          fileRevValue = rev
        }
      }
      return {
        step,
        changes: [
          artifactRowChange(run.id, field, {
            status,
            ...(effectiveValue !== undefined ? { value: effectiveValue } : {}),
            ...(kind === 'element' && elementRev !== undefined ? { rev: elementRev } : {}),
            ...(kind === 'file' && fileRevValue !== undefined ? { rev: fileRevValue } : {}),
            ...(kind !== 'element' && kind !== 'file' && rev !== undefined ? { rev } : {}),
            step,
          }),
        ],
      }
    }
    case 'pause':
      return state.paused
        ? fail('RUN_PAUSED', 'The run is already paused.')
        : {
            changes: [
              {
                op: 'update_field',
                target: `${run.id}@${run.id}&state`,
                from: run.state,
                to: 'paused',
                evidence: 'decision',
              },
            ],
          }
    case 'resume':
      return state.paused
        ? {
            changes: [
              {
                op: 'update_field',
                target: `${run.id}@${run.id}&state`,
                from: 'paused',
                to: 'open',
                evidence: 'decision',
              },
            ],
          }
        : fail('NOT_PAUSED', 'The run is not paused.')
    case 'rebase': {
      if (!state.drift)
        return fail('NOT_DRIFTED', 'The run follows the current definition revision.')
      const next = value ?? state.drift.current ?? ''
      // A definition that grew since the run started names steps and artifacts the model has
      // no row for: without one, every later `start` or `artifact` on them addresses nothing.
      // The rebase is the one call that accepts the new definition, so it creates their rows.
      const stepRows: Change[] = Object.keys(graph.steps)
        .filter((slug) => f.run.steps[slug] === undefined)
        .map((slug) => ({
          op: 'add_element',
          target: run.id,
          concept: 'Step Run',
          name: graph.steps[slug]!.name,
          slug,
          to: JSON.stringify({ status: 'pending', attempt: 0 }),
          evidence: 'decision',
        }))
      const artifactRows: Change[] = Object.keys(graph.artifacts)
        .filter((slug) => f.run.artifacts[slug] === undefined)
        .map((slug) => ({
          op: 'add_element',
          target: run.id,
          concept: 'Run Artifact',
          name: graph.artifacts[slug]!.name,
          slug,
          to: JSON.stringify({ kind: graph.artifacts[slug]!.kind, status: 'expected' }),
          evidence: 'decision',
        }))
      return {
        changes: [
          {
            op: 'update_field',
            target: `${run.id}@${run.id}&def_rev`,
            to: next,
            evidence: 'decision',
          },
          ...stepRows,
          ...artifactRows,
        ],
      }
    }
    case 'cancel':
      return {
        close: true,
        changes: [
          {
            op: 'update_field',
            target: `${run.id}@${run.id}&state`,
            from: run.state,
            to: 'cancelled',
            evidence: 'decision',
          },
        ],
      }
    case 'finish': {
      const outcome = text(args['outcome']) ?? 'completed'
      if (outcome === 'failed')
        return {
          close: true,
          changes: [
            {
              op: 'update_field',
              target: `${run.id}@${run.id}&state`,
              from: run.state,
              to: 'failed',
              evidence: 'decision',
            },
          ],
        }
      if (outcome !== 'completed')
        return fail('INVALID_ARGUMENT', 'finish outcome is completed or failed.')
      if (!state.canComplete)
        return fail(
          'CANNOT_COMPLETE',
          state.blockedBy ?? 'The walk has not reached a done terminal step.',
          { currentStep: state.currentStep },
        )
      // The run's own gate: every required artifact the walked path produced is recorded
      // before the execution closes. Optional outputs never block it.
      const unrecorded = Object.entries(f.graph.artifacts)
        .filter(([, def]) => def.required)
        .filter(([, def]) => def.producers.some((p) => state.steps[p]?.status === 'done'))
        .filter(([slug]) => {
          const status = state.artifacts[slug]?.status
          return status !== 'validated' && status !== 'not_required'
        })
        .map(([slug, def]) => ({ slug, name: def.name }))
      if (unrecorded.length > 0)
        return fail(
          'MISSING_OUTPUT',
          `The run cannot close: required output${unrecorded.length > 1 ? 's' : ''} not recorded: ${unrecorded.map((m) => `"${m.name}" (${m.slug})`).join(', ')}.`,
          { missing: unrecorded },
        )
      return {
        close: true,
        changes: [
          {
            op: 'update_field',
            target: `${run.id}@${run.id}&state`,
            from: run.state,
            to: 'completed',
            evidence: 'decision',
          },
        ],
      }
    }
  }

  const located = stepFor(f, args)
  if (!located.ok) return located
  const step = located.step
  const status = state.steps[step]!.status
  if (action === 'start') return planStepStart(f, step, args)
  if (action === 'run') return planEngineRun(f, step, args, root)
  if (status !== 'active' && status !== 'waiting')
    return fail('STEP_NOT_STARTED', `Step "${step}" is ${status}; record start first.`)
  if (action === 'wait') {
    if (!value) return fail('INVALID_ARGUMENT', 'wait needs value: who or what the step waits on.')
    // `waiting` is a step STATUS, not only a note: the fold reports the run as waiting while the
    // current step holds it, and the row may then be completed or failed. A second `wait` only
    // restates what it waits on.
    return {
      step,
      changes: [
        ...(status === 'active'
          ? [
              {
                op: 'update_field' as const,
                target: `${run.id}@${step}&status`,
                from: 'active',
                to: 'waiting',
                evidence: 'decision' as const,
              },
            ]
          : []),
        {
          op: 'update_field',
          target: `${run.id}@${step}&waiting_on`,
          to: value,
          evidence: 'decision',
        },
      ],
    }
  }
  if (action === 'fail')
    return {
      step,
      changes: [
        {
          op: 'update_field',
          target: `${run.id}@${step}&status`,
          from: status,
          to: 'failed',
          evidence: 'decision',
        },
        ...(value
          ? [
              {
                op: 'update_field' as const,
                target: `${run.id}@${step}&failure`,
                to: value,
                evidence: 'decision',
              },
            ]
          : []),
      ],
    }

  // complete
  // Completing the step is where the runner refuses to walk past an unrecorded result: the
  // outputs the procedure declares as required exist by the time it moves on. A refusal
  // writes nothing, so the step stays active and the actor can attach the output and retry.
  // This check runs before the transition is chosen on purpose: a missing output is the
  // actionable answer, and reporting a transition problem first would hide it.
  const missing = unrecordedRequiredOutputs(f, step)
  if (missing.length > 0)
    return fail(
      'MISSING_OUTPUT',
      `Step "${step}" must record its required output${missing.length > 1 ? 's' : ''}: ${missing.map((m) => `"${m.name}" (${m.slug})`).join(', ')}.`,
      { step, missing },
    )
  const stepOutputs = f.graph.steps[step]?.outputs ?? []
  let stagedSlugs = new Set<string>()
  if (args['outputs'] !== undefined) {
    let raw = args['outputs']
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw)
      } catch {
        // Ignored: downstream handles malformed payloads
      }
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      stagedSlugs = new Set(Object.keys(raw))
    }
  }
  for (const slug of stepOutputs) {
    if (stagedSlugs.has(slug)) continue
    const artDef = f.graph.artifacts[slug]
    if (!artDef || artDef.kind !== 'file') continue
    const artRow = f.run.artifacts[slug]
    if (artRow?.status === 'validated') {
      const candidate = artifactPathCandidate(artDef, f.run, artRow.value)
      if (!candidate) continue
      const resolved = resolveArtifactPath(root, slug, candidate)
      if ('ok' in resolved) return resolved
      const filePath = resolved.path
      const onDisk = artifactFileRev(root, slug, filePath)
      if ('ok' in onDisk) return onDisk
      const actualRev = onDisk.rev
      if (!actualRev) {
        return fail(
          'FILE_NOT_FOUND',
          `Artifact "${slug}" file "${filePath}" does not exist on disk; an unwritten file cannot be validated.`,
          { artifact: slug, path: filePath },
        )
      }
      if (artRow.rev && artRow.rev.trim() !== '' && artRow.rev.trim() !== actualRev) {
        return fail(
          'REV_MISMATCH',
          `Artifact "${slug}" rev mismatch: file sha256 "${actualRev}" does not match recorded "${artRow.rev}".`,
          { artifact: slug, path: filePath, supplied: artRow.rev, actual: actualRev },
        )
      }
    }
  }
  const outcome = text(args['outcome'])
  const targets = state.allowedNext
  const chosen = chooseNext(targets, outcome, text(args['next']))
  if (!chosen.ok && chosen.reason === 'invalid')
    return fail(
      'INVALID_TRANSITION',
      `"${chosen.next}" is not an allowed next step for this outcome.`,
      {
        allowedNext: targets,
      },
    )
  if (!chosen.ok)
    return fail(
      'AMBIGUOUS_TRANSITION',
      `${chosen.holding.length} transitions hold for outcome "${outcome ?? ''}"; give next or an outcome that picks one.`,
      { allowedNext: targets },
    )
  const next = chosen.next
  const row = rowOf(f, step)
  const loop = backEdge(f, step, next)
  if (loop && 'ok' in loop) return loop
  const exhausted = exhaustedLoop(f, step, next)
  if (exhausted) return exhausted
  // Completion (design §3.4): the step row guard (`from` status + attempt) is the fence
  // against a late completion from an older attempt. A waiting step completes the same way.
  // Taking a loop's back-edge reopens this step with the rest of its span instead.
  return {
    step,
    attempt: row.attempt,
    changes: [
      ...(loop?.changes ?? []),
      {
        op: 'set_fields',
        target: `${run.id}@${step}`,
        from: JSON.stringify({ status, attempt: row.attempt }),
        to: loop
          ? reopenedRow(row.attempt)
          : JSON.stringify({
              status: 'done',
              attempt: row.attempt,
              ...(outcome ? { outcome } : {}),
              ...(next ? { next } : {}),
            }),
        evidence: 'decision',
      },
    ],
  }
}

/**
 * `action=run`: claims the engine step in its own changeset, executes its command (slots
 * substituted) in the domain root, maps its exit code through `exit_codes` (§4.6), verifies
 * the `file:` outputs it can, and completes or fails the step in a second atomic changeset.
 *
 * The claim lands first on purpose: a second caller then folds the row as `active` and finds
 * the step taken instead of running the same command twice. It also carries the placeholder
 * holder that `runEngineCommand` replaces with the pid of the child it spawns.
 */
function planEngineRun(
  f: FoldedRun,
  step: string,
  args: Record<string, unknown>,
  root: string,
): Promise<Planned | ToolError> {
  const def = f.graph.steps[step]!
  if (def.executor !== 'engine' || !def.command)
    return Promise.resolve(
      fail('NOT_ENGINE_STEP', `Step "${step}" is not an engine step with a command.`),
    )
  const started = planStepStart(f, step, args)
  if ('ok' in started) return Promise.resolve(started)
  const claim = started.changes[0] as { to: string }
  const claimFields = JSON.parse(claim.to) as { timeout_ms: number }
  const slots = slotValuesOf(f.run)
  const command = substitute(def.command, slots)!
  const left = unresolvedSlots(command)
  if (left.length > 0)
    return Promise.resolve(
      fail(
        'UNRESOLVED_SLOT',
        `Step "${step}" still carries ${left.map((s) => `{${s}}`).join(', ')}; fill the slots first.`,
        { missing: left },
      ),
    )
  // The command runs through a shell with the run's parameter values spliced in, so a value
  // carrying shell syntax would execute. Refuse the whole call before anything runs.
  const unsafe = Object.keys(f.run.params).filter(
    (name) => !SHELL_SAFE.test(String(f.run.params[name])),
  )
  if (unsafe.length > 0)
    return Promise.resolve(
      fail(
        'UNSAFE_COMMAND',
        `Parameter${unsafe.length > 1 ? 's' : ''} ${unsafe.map((n) => `"${n}"`).join(', ')} carr${unsafe.length > 1 ? 'y' : 'ies'} shell syntax; a command parameter may only hold letters, digits and . _ + - / : , = @`,
        { unsafe },
      ),
    )
  const timeout = claimFields.timeout_ms
  const claimTo = JSON.parse(claim.to) as Record<string, string>
  const attempt = started.attempt

  return (async () => {
    // The child is spawned BEFORE the claim lands, so its pid can travel inside the claim
    // itself: the crash probe then names the process that actually runs the command from the
    // moment it is claimed, and no second write has to race the apply lock.
    let finishClaim: ((pid: number) => void) | undefined
    const pidReady = new Promise<number>((resolve) => {
      finishClaim = resolve
    })
    const child = startEngineCommand({
      root,
      command,
      timeout,
      params: slots,
      onSpawn: (pid) => finishClaim?.(pid),
    })
    const pid = await Promise.race([
      pidReady,
      child.done.then(() => undefined as number | undefined),
    ])
    if (pid === undefined) {
      // No process was created, so there is nothing to claim and nothing to wait on.
      const result = await child.done
      return fail(
        'ENGINE_SPAWN_FAILED',
        `Step "${step}" could not start: ${result.reason ?? 'no process'}.`,
      )
    }
    const claimed = await commit(
      f.root!,
      [
        seqGuard(f.run.id, f.run.seq),
        {
          ...(started.changes[0] as Change),
          to: JSON.stringify({ ...claimTo, holder: holderOf(pid) }),
        },
      ],
      {
        title: `run ${f.run.id}`,
        actor: text(args['actor']) ?? 'engine',
        kind: 'engine',
        run: runContext(f.run.id, step),
      },
    )
    if (!claimed.ok) {
      child.kill()
      return claimed
    }
    const claimedSeq = f.run.seq + 1
    const { exitCode, reason: runError } = await child.done
    // Re-read the run model: if other writes landed while the command was running, the
    // header seq moved. Re-reading ensures the completion changeset guards the CURRENT seq.
    const reloaded = await readRun(root, f.run.id)
    const freshSeq = reloaded.ok ? reloaded.run.seq : claimedSeq
    // The holder is the child's pid, so the crash probe names the process that runs the
    // command; the completion clears that column.
    const settledClaim = { ...claimTo, holder: '' }

    // The claim and the completion of one engine call are ONE `set_fields` on the step row:
    // `from` is evaluated against the model as it stands, so a separate completion change could
    // not guard the `active` status its sibling in the same batch writes. The claim's guard
    // (`from` status + attempt) is delivered once and fences the whole column.
    const finishRow = (
      status: 'done' | 'waiting' | 'failed' | 'pending',
      extra: Record<string, string>,
    ): Change => ({
      op: 'set_fields',
      target: `${f.run.id}@${step}`,
      from: JSON.stringify({ status: 'active', attempt }),
      to: JSON.stringify({ ...claimTo, ...settledClaim, status, attempt, ...extra }),
      evidence: 'decision',
    })
    // A transition the engine takes back to an earlier step is a loop's back-edge, exactly as
    // in `complete`. The claim already landed, so a refused one fails the step instead.
    const settle = (next: string | undefined, done: Record<string, string>): Change[] => {
      const loop = backEdge(f, step, next)
      if (loop && 'ok' in loop)
        return [finishRow('failed', { failure: `${loop.code}: ${loop.detail}` })]
      if (loop)
        return [
          ...loop.changes,
          finishRow('pending', { outcome: '', next: '', waiting_on: '', failure: '' }),
        ]
      return [finishRow('done', done)]
    }

    if (exitCode !== 0) {
      // Exit-code mapping (design §4.6): 0 is done, an unmapped nonzero is failed, and
      // `exit_codes` turns a controlled stop into a wait or a named outcome.
      const mapped = def.exitCodes?.[String(exitCode)]
      const reason = runError ?? (exitCode === null ? 'terminated by a signal' : `exit ${exitCode}`)
      if (mapped === 'waiting')
        return {
          step,
          attempt,
          kind: 'engine',
          exitCode,
          claimedSeq: freshSeq,
          changes: [finishRow('waiting', { waiting_on: reason })],
        }
      if (mapped && mapped !== 'failed') {
        // A named outcome branches exactly like a human one: it is what the guards test.
        const targets = def.next.map((to) => ({
          to,
          guard: guardOf(f.graph, to, f.state.artifacts),
        }))
        const chosen = chooseNext(targets, mapped, text(args['next']))
        if (!chosen.ok && chosen.reason === 'ambiguous')
          return fail(
            'AMBIGUOUS_TRANSITION',
            `Outcome "${mapped}" holds for ${chosen.holding.length} next steps (${chosen.holding.map((t) => t.to).join(', ')}); name one with next.`,
            { allowedNext: targets },
          )
        if (!chosen.ok)
          return fail(
            'INVALID_TRANSITION',
            `next "${chosen.next}" is not an outcome "${mapped}" target.`,
            { allowedNext: targets },
          )
        return {
          step,
          attempt,
          kind: 'engine',
          exitCode,
          claimedSeq: freshSeq,
          changes: settle(chosen.next, {
            outcome: mapped,
            ...(chosen.next ? { next: chosen.next } : {}),
          }),
        }
      }
      return {
        step,
        attempt,
        kind: 'engine',
        exitCode,
        claimedSeq: freshSeq,
        changes: [
          finishRow('failed', {
            failure: mapped && mapped !== 'failed' ? `${mapped}: ${reason}` : reason,
          }),
        ],
      }
    }

    const missing: string[] = []
    const artifactChanges: Change[] = []
    for (const slug of def.outputs) {
      const declaredAt = substitute(f.graph.artifacts[slug]?.at, slots)
      const verify = substitute(f.graph.artifacts[slug]?.verify, slots)
      const candidate = verify?.startsWith('file:')
        ? verify.slice('file:'.length).trim()
        : f.graph.artifacts[slug]?.kind === 'file'
          ? declaredAt?.trim()
          : undefined
      if (!candidate) continue
      // A path outside the domaiNN, a model or a directory is never hashed: the step did
      // not produce a file the run can pin, so the output is rejected like a missing one.
      const resolved = resolveArtifactPath(root, slug, candidate)
      const path = 'ok' in resolved ? candidate.replace(/\\/g, '/') : resolved.path
      const onDisk = 'ok' in resolved ? resolved : artifactFileRev(root, slug, path)
      const rev = 'ok' in onDisk ? undefined : onDisk.rev
      if (rev)
        artifactChanges.push({
          op: 'set_fields',
          target: `${f.run.id}@${slug}`,
          to: JSON.stringify({ status: 'validated', value: path, rev, step }),
          evidence: 'decision',
        })
      else {
        artifactChanges.push({
          op: 'set_fields',
          target: `${f.run.id}@${slug}`,
          to: JSON.stringify({ status: 'rejected', value: path, step }),
          evidence: 'decision',
        })
        missing.push(path)
      }
    }
    // A step with no declared target never asks for one, so nothing can be ambiguous.
    const targets = def.next.map((to) => ({ to, guard: guardOf(f.graph, to, f.state.artifacts) }))
    const chosen = chooseNext(targets, text(args['outcome']), text(args['next']))
    if (!chosen.ok && targets.length > 0)
      return fail(
        chosen.reason === 'ambiguous' ? 'AMBIGUOUS_TRANSITION' : 'INVALID_TRANSITION',
        chosen.reason === 'ambiguous'
          ? `${chosen.holding.length} transitions hold for this step (${chosen.holding.map((t) => t.to).join(', ')}); name one with next.`
          : `"${chosen.next}" is not an allowed next step.`,
        { allowedNext: targets },
      )
    const next = chosen.ok ? chosen.next : undefined
    // An engine step that finishes without one of its required outputs fails with that same
    // `missing` reason, so a gate never looks like a plain absent command.
    const unrecorded = [
      ...missing,
      ...unrecordedRequiredOutputs(f, step)
        .filter(
          (m) =>
            !def.outputs.some(
              (o) =>
                f.graph.artifacts[o]?.verify?.trim().startsWith('file:') ||
                (f.graph.artifacts[o]?.kind === 'file' && f.graph.artifacts[o]?.at?.trim()),
            ),
        )
        .map((m) => m.name),
    ]
    return {
      step,
      attempt,
      kind: 'engine',
      exitCode,
      claimedSeq,
      changes: [
        ...artifactChanges,
        ...(unrecorded.length > 0
          ? [finishRow('failed', { failure: `missing ${unrecorded.join(', ')}` })]
          : settle(next, { ...(next ? { next } : {}) })),
      ],
    }
  })()
}

/**
 * Marks a request `stale` or `rejected` in its own small changeset and reports the mark instead
 * of the refusal that produced it. The mark IS the answer the person gets, so the tool succeeds
 * at marking even though the action was refused: the queue must say what happened to the ask.
 */
async function markRequest(
  root: string,
  run: string,
  id: string,
  seq: number,
  status: 'stale' | 'rejected',
  meta: { title: string; reason: string },
): Promise<RecordResult | ToolError> {
  const committed = await commit(
    root,
    [
      seqGuard(run, seq),
      {
        op: 'set_fields',
        target: `${run}@${id}`,
        from: JSON.stringify({ request_status: 'pending' }),
        to: JSON.stringify({ request_status: status, reason: meta.reason }),
        evidence: 'decision',
      },
    ],
    { title: meta.title, actor: 'agent', kind: 'agent', run: runContext(run) },
  )
  if (!committed.ok) return committed
  const after = await reload(root, run)
  if (!after.ok) return after
  return { ...after, changeset: committed.changeset }
}

/** A request whose action the planner refused: mark it, and report the planner's refusal. */
async function rejectRequest(
  root: string,
  read: { run: { id: string; seq: number } },
  requestId: string | undefined,
  refused: ToolError,
): Promise<RecordResult | ToolError> {
  if (requestId === undefined) return refused
  await markRequest(root, read.run.id, requestId, read.run.seq, 'rejected', {
    title: `request ${requestId} rejected`,
    reason: `${refused.code}: ${refused.detail}`,
  })
  return refused
}

/* ── compact completion ──────────────────────────────────────── */

/**
 * The run as it would read with `changes` applied: every `set_fields` on a step row or an
 * artifact row is merged into the in-memory model, so a later part of the same completion is
 * planned against what the earlier parts record. Nothing is written.
 */
function overlayRun(f: FoldedRun, changes: Change[]): FoldedRun['run'] {
  const steps = { ...f.run.steps }
  const artifacts = { ...f.run.artifacts }
  const prefix = `${f.run.id}@`
  for (const c of changes) {
    if (c.op !== 'set_fields' || typeof c.to !== 'string' || !c.target.startsWith(prefix)) continue
    const slug = c.target.slice(prefix.length)
    const to = JSON.parse(c.to) as Record<string, unknown>
    const str = (v: unknown): string | undefined =>
      v === '' || v === undefined ? undefined : String(v)
    if (f.graph.steps[slug]) {
      const row: StepRow = { ...rowOf({ ...f, run: { ...f.run, steps } }, slug) }
      for (const [k, v] of Object.entries(to)) {
        if (k === 'status') row.status = v as StepRow['status']
        else if (k === 'attempt') row.attempt = Number(v)
        else if (k === 'inputs')
          row.inputs =
            typeof v === 'string' ? (JSON.parse(v || '{}') as Record<string, string>) : {}
        else if (k === 'timeout_ms') row.timeoutMs = Number(v)
        else if (k === 'claimed_at') row.claimedAt = str(v)
        else if (k === 'waiting_on') row.waitingOn = str(v)
        else if (k === 'outcome' || k === 'next' || k === 'failure' || k === 'holder')
          row[k] = str(v)
      }
      steps[slug] = row
    } else if (f.graph.artifacts[slug]) {
      artifacts[slug] = { ...artifacts[slug], ...(to as object) } as (typeof artifacts)[string]
    }
  }
  return { ...f.run, steps, artifacts }
}

/** Refolds the run with `changes` overlaid; the plan of the next part reads this. */
async function overlaid(
  root: string,
  f: FoldedRun,
  changes: Change[],
): Promise<{ ok: true; folded: FoldedRun } | ToolError> {
  return changes.length === 0
    ? { ok: true, folded: f }
    : foldStoredRun(root, overlayRun(f, changes))
}

/** The `artifacts` argument: an array of `{ fact, field, value?, rev?, step? }`, or its JSON text. */
function artifactsArg(raw: unknown): { list: Record<string, unknown>[] } | ToolError {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      value = undefined
    }
  }
  if (
    !Array.isArray(value) ||
    value.some((e) => e === null || typeof e !== 'object' || Array.isArray(e))
  )
    return fail(
      'INVALID_ARGUMENT',
      'artifacts must be an array of { fact, field, value?, rev?, step? }.',
    )
  return { list: value as Record<string, unknown>[] }
}

/** The `finish` argument: `true` or `"completed"` closes the run completed, `"failed"` failed. */
function finishArg(raw: unknown): { outcome: 'completed' | 'failed' } | ToolError {
  if (raw === true || raw === 'completed') return { outcome: 'completed' }
  if (raw === 'failed') return { outcome: 'failed' }
  return fail('INVALID_ARGUMENT', 'finish is true, "completed" or "failed".')
}

export async function procedureRecord(
  root: string,
  args: Record<string, unknown>,
): Promise<RecordResult | ToolError> {
  const requestId = text(args['request'])
  const action = text(args['action']) as RecordAction | undefined
  if (requestId === undefined && (!action || !ACTIONS.includes(action)))
    return fail(
      'INVALID_ACTION',
      `action must be one of ${ACTIONS.join(', ')} unless a request names it.`,
    )
  if (action !== undefined && !ACTIONS.includes(action))
    return fail('INVALID_ACTION', `action must be one of ${ACTIONS.join(', ')}.`)
  const runId = text(args['run'])
  if (!runId) return fail('INVALID_ARGUMENT', 'run must be a non-empty run id.')

  // The compact form (S8): `artifacts` and `finish` ride on a direct `complete` only, so one
  // completion writes the claim, the step's artifacts, the completion and the closing of the
  // run in ONE atomic changeset. Both are checked before anything is read or written.
  if (
    (args['artifacts'] !== undefined || args['finish'] !== undefined) &&
    (requestId !== undefined || action !== 'complete')
  )
    return fail(
      'INVALID_ARGUMENT',
      'artifacts and finish travel only with action complete, never with a request.',
    )
  const artifactList =
    args['artifacts'] !== undefined ? artifactsArg(args['artifacts']) : { list: [] }
  if ('ok' in artifactList) return artifactList
  const finishWith = args['finish'] !== undefined ? finishArg(args['finish']) : undefined
  if (finishWith !== undefined && 'ok' in finishWith) return finishWith

  const read = await readRun(root, runId)
  if (!read.ok) return read
  const folded = await foldStoredRun(root, read.run)
  if (!folded.ok) return folded

  // A request is consumed here and marked in the same changeset that records the action: one
  // read, one plan, one write. An action given alongside a request is refused rather than
  // merged, so nobody can feed two intents into one call.
  let effectiveArgs = args
  let resolvedAction = action
  let requestMark: Change | undefined
  if (requestId !== undefined) {
    if (action !== undefined)
      return fail(
        'INVALID_ARGUMENT',
        'give a request or an action, never both: the request already names the action.',
      )
    // A deliverable consumed with a request is the person's own; the caller never adds one.
    if (args['outputs'] !== undefined)
      return fail(
        'INVALID_ARGUMENT',
        'give a request or outputs, never both: the outputs of a request are the ones the person attached to it.',
      )
    const request = read.run.requests[requestId]
    if (!request) return fail('REQUEST_NOT_FOUND', `Run "${runId}" has no request "${requestId}".`)
    if (request.status !== 'pending')
      return fail(
        'REQUEST_NOT_PENDING',
        `Request "${requestId}" is ${request.status}; only a pending request can be consumed.`,
      )
    const currentSeq = read.run.seq
    const targetStep = request.step ?? folded.folded.state.currentStep
    const stepRow = targetStep ? read.run.steps[targetStep] : undefined
    const stepStatus = stepRow?.status ?? 'pending'

    let isStale = false
    let staleReason = ''
    if (request.baseSeq === undefined) {
      isStale = true
      staleReason = `Request "${requestId}" carries no baseSeq.`
    } else if (request.baseSeq > currentSeq) {
      isStale = true
      staleReason = `Request "${requestId}" was made at future seq ${request.baseSeq}; run is at ${currentSeq}.`
    } else if (request.baseSeq < currentSeq) {
      // The run advanced since the request was made. A request is only stale if the step it
      // targets moved away from the state the action needed.
      if (
        targetStep &&
        request.action === 'start' &&
        (stepStatus === 'active' || stepStatus === 'done')
      ) {
        isStale = true
        staleReason = `Step "${targetStep}" moved to status "${stepStatus}" before the start request was consumed.`
      } else if (
        targetStep &&
        (request.action === 'complete' || request.action === 'fail') &&
        stepStatus !== 'active' &&
        stepStatus !== 'waiting'
      ) {
        isStale = true
        staleReason = `Step "${targetStep}" moved to status "${stepStatus}" before the ${request.action} request was consumed.`
      } else if (targetStep && request.action === 'wait' && stepStatus !== 'active') {
        isStale = true
        staleReason = `Step "${targetStep}" moved to status "${stepStatus}" before the wait request was consumed.`
      }
    }

    if (isStale) {
      const marked = await markRequest(root, runId, requestId, currentSeq, 'stale', {
        title: `request ${requestId} stale`,
        reason: staleReason,
      })
      if ('ok' in marked && !marked.ok) return marked
      return fail(
        'REQUEST_STALE',
        `Request "${requestId}" was made at seq ${request.baseSeq ?? '?'}; the run is at ${currentSeq}. It is marked stale: ${staleReason}`,
        { request: requestId, baseSeq: request.baseSeq, seq: currentSeq },
      )
    }
    resolvedAction = request.action
    effectiveArgs = {
      ...args,
      action: request.action,
      ...(request.step !== undefined ? { step: request.step } : {}),
      ...(request.outcome !== undefined ? { outcome: request.outcome } : {}),
      ...(request.value !== undefined ? { value: request.value } : {}),
      ...(request.outputs !== undefined ? { outputs: request.outputs } : {}),
    }
    requestMark = {
      op: 'set_fields',
      target: `${runId}@${requestId}`,
      from: JSON.stringify({ request_status: 'pending' }),
      to: JSON.stringify({ request_status: 'done' }),
      evidence: 'decision',
    }
  }

  // Private outputs (executions spec, "Artifacts") travel only with a completion, from a
  // request's requested_outputs or the outputs argument alike. They are validated before
  // anything is written, and the completion is planned against the run with their artifact
  // rows applied, so the MISSING_OUTPUT gate sees them as recorded by this step. A step the
  // planner will refuse anyway (not current, run closed) is left to its refusal.
  let target = folded.folded

  // A direct `complete` on the current step that was not started claims it first, with the
  // same plan (and the same refusals) as `start`. The claim is planned now and folded into the
  // run the rest of the call reads, and it lands in the completion's changeset: the claim and
  // the completion become ONE `set_fields` on the step row, guarded by the row as it stands.
  // A request keeps its own staleness rules, so it never claims implicitly.
  let claim: Planned | undefined
  if (requestId === undefined && resolvedAction === 'complete') {
    const located = stepFor(target, effectiveArgs)
    const status = located.ok ? target.state.steps[located.step]!.status : undefined
    if (status === 'pending' || status === 'failed' || status === 'reopened') {
      const started = await plan(target, 'start', effectiveArgs, root)
      if ('ok' in started) return started
      const next = await overlaid(root, target, started.changes)
      if (!next.ok) return next
      target = next.folded
      claim = started
    }
  }

  let staged: Exclude<ReturnType<typeof stageOutputs>, ToolError> | undefined
  if (effectiveArgs['outputs'] !== undefined) {
    if (resolvedAction !== 'complete')
      return rejectRequest(
        root,
        read,
        requestId,
        fail('INVALID_OUTPUT', `outputs travel only with action complete, not ${resolvedAction}.`),
      )
    const located = stepFor(target, effectiveArgs)
    if (located.ok) {
      const outputs = stageOutputs(root, target, located.step, effectiveArgs['outputs'])
      if ('ok' in outputs) return rejectRequest(root, read, requestId, outputs)
      const overlaid = await foldStoredRun(root, outputs.run)
      if (!overlaid.ok) return overlaid
      target = overlaid.folded
      staged = outputs
    }
  }

  // The artifacts a completion carries are planned one by one exactly as `action=artifact`
  // plans them, each against the run with the earlier ones applied, so the completion's
  // MISSING_OUTPUT gate sees them. Any refusal refuses the whole call before anything lands.
  const recorded: Change[] = []
  for (const entry of artifactList.list) {
    const one = await plan(target, 'artifact', entry, root)
    if ('ok' in one) return one
    const next = await overlaid(root, target, one.changes)
    if (!next.ok) return next
    target = next.folded
    recorded.push(...one.changes)
  }

  const planned = await plan(target, resolvedAction!, effectiveArgs, root)
  if ('ok' in planned) return rejectRequest(root, read, requestId, planned)

  // `finish` closes the run in the same changeset, planned exactly as `action=finish` against
  // the run as this completion leaves it. A run the completion does not make closable refuses
  // the whole call (CANNOT_COMPLETE, MISSING_OUTPUT), so nothing is written.
  if (finishWith !== undefined) {
    const after = await overlaid(root, target, planned.changes)
    if (!after.ok) return after
    const closing = await plan(after.folded, 'finish', { outcome: finishWith.outcome }, root)
    if ('ok' in closing) return closing
    planned.changes = [...planned.changes, ...closing.changes]
    planned.close = true
  }

  // The implicit claim and the completion are one `set_fields` on the step row: `from` is
  // evaluated against the model as it stands, so the completion cannot guard the `active`
  // status its claim writes in the same batch. The claim's guard fences the whole write.
  // The claim's own resets (a loop pass's earlier outputs back to `produced`) go first, ahead
  // of the outputs and artifacts this call records again.
  let claimResets: Change[] = []
  if (claim) {
    const [claimRow, ...claimRest] = claim.changes as [Change, ...Change[]]
    claimResets = claimRest
    planned.changes = [
      ...recorded,
      ...planned.changes.map((c) =>
        c.op === 'set_fields' && c.target === claimRow.target
          ? {
              ...c,
              from: claimRow.from,
              to: JSON.stringify({
                ...(JSON.parse(claimRow.to as string) as object),
                ...(JSON.parse(c.to as string) as object),
              }),
            }
          : c,
      ),
    ]
  } else planned.changes = [...recorded, ...planned.changes]

  const kind = planned.kind ?? 'agent'
  const actor = text(args['actor']) ?? kind
  const run = read.run.id
  // A plan that already wrote its own claim continues the counter it advanced.
  let seq = planned.claimedSeq ?? read.run.seq
  if (planned.kind === 'engine') {
    const fresh = await readRun(root, run)
    if (fresh.ok) seq = fresh.run.seq
  }
  const changes: Change[] = [
    seqGuard(run, seq),
    ...claimResets,
    ...(staged?.changes ?? []),
    ...planned.changes,
  ]
  if (requestMark) changes.push(requestMark)
  if (planned.close) changes.push({ op: 'close_model', target: run, evidence: 'decision' })
  // The output files land right before the commit that records them, and go away again when
  // that commit does not apply: the run folder never holds an output its model does not pin.
  let rollback: (() => Promise<void>) | undefined
  if (staged && staged.outputs.length > 0) {
    try {
      rollback = await writeOutputs(root, staged.outputs)
    } catch (err) {
      return fail('APPLY_FAILED', `The run outputs could not be written: ${(err as Error).message}`)
    }
  }
  let committed = await commit(root, changes, {
    title: `${resolvedAction} ${run}`,
    actor,
    kind,
    run: runContext(run, planned.step),
  })
  if (!committed.ok && committed.code === 'RUN_BUSY' && planned.kind === 'engine') {
    // Retry completion once if another writer bumped seq at this exact instant
    const fresh = await readRun(root, run)
    if (
      fresh.ok &&
      fresh.run.steps[planned.step!]?.status === 'active' &&
      fresh.run.steps[planned.step!]?.attempt === planned.attempt
    ) {
      const retryChanges = [seqGuard(run, fresh.run.seq), ...planned.changes]
      if (requestMark) retryChanges.push(requestMark)
      if (planned.close) retryChanges.push({ op: 'close_model', target: run, evidence: 'decision' })
      committed = await commit(root, retryChanges, {
        title: `${resolvedAction} ${run}`,
        actor,
        kind,
        run: runContext(run, planned.step),
      })
    }
  }
  if (!committed.ok) {
    await rollback?.()
    return committed
  }
  const after = await reload(root, run)
  if (!after.ok) return after
  return {
    ...after,
    changeset: committed.changeset,
    ...(planned.kind === 'engine' ? { exitCode: planned.exitCode } : {}),
  }
}
