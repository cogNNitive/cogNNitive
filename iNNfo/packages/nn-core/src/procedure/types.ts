/** Who performs a step (design §3). Absent means asserted by whoever drives the run. */
export type Executor = 'human' | 'agent' | 'engine'

export interface ProcedureStep {
  slug: string
  name: string
  stepType?: string
  executor?: Executor
  parent?: string
  /** Target step slugs, in declaration order. */
  next: string[]
  /** Guard to enter this step. */
  condition?: string
  /** The question a decision step asks; its answer is the `outcome`. */
  decision?: string
  command?: string
  produces?: string
  /** Artifact slugs consumed / produced. */
  inputs: string[]
  outputs: string[]
}

export interface ProcedureArtifact {
  slug: string
  name: string
  verify?: string
  /** Default true; only meaningful for producers on the walked path. */
  required: boolean
  /** Slugs of the steps that list this artifact as an output. */
  producers: string[]
}

export type GraphDiagnosticCode =
  'MISSING_SLUG' | 'UNKNOWN_NEXT' | 'NO_START' | 'MULTIPLE_STARTS' | 'CYCLE'

export interface GraphDiagnostic {
  code: GraphDiagnosticCode
  severity: 'error' | 'warning'
  step?: string
  detail: string
}

export interface ProcedureGraph {
  /** The definition's revision (`knowledge_version`), compared with a run's pinned `def_rev` (R5). */
  defRev: string | null
  steps: Record<string, ProcedureStep>
  artifacts: Record<string, ProcedureArtifact>
  /** The one step with no incoming `next`, or null when there is none or several. */
  start: string | null
  /** Steps with no `next`. */
  terminals: string[]
  diagnostics: GraphDiagnostic[]
}

export type RunEventKind =
  | 'started'
  | 'step_started'
  | 'step_waiting'
  | 'step_completed'
  | 'step_failed'
  | 'input_recorded'
  | 'artifact_produced'
  | 'artifact_validated'
  | 'artifact_rejected'
  | 'interrupted'
  | 'resumed'
  | 'rebased'
  | 'completed'
  | 'failed'
  | 'cancelled'

/** One recorded fact of a run (design §4). Steps and artifacts are referenced by slug (R4). */
export interface RunEvent {
  kind: RunEventKind
  step?: string
  outcome?: string
  next?: string
  attempt?: number
  /** Frozen input revisions at `step_started`: artifact slug -> rev. */
  inputs?: Record<string, string>
  field?: string
  value?: string
  rev?: string
  actor?: string
  at?: string
}

export type RunStatus =
  'open' | 'waiting' | 'blocked' | 'drifted' | 'completed' | 'failed' | 'cancelled'
export type StepStatus =
  'pending' | 'active' | 'waiting' | 'done' | 'failed' | 'reopened' | 'off_path'
export type ArtifactStatus =
  'expected' | 'produced' | 'validated' | 'rejected' | 'stale' | 'not_required'

export interface StepState {
  status: StepStatus
  /** Highest attempt recorded, 0 when never started. */
  attempt: number
  outcome?: string
  next?: string
  /** What a waiting step waits on. */
  waitingOn?: string
  /** Reason of the last failure. */
  failure?: string
}

export interface ArtifactState {
  status: ArtifactStatus
  rev?: string
  value?: string
  step?: string
}

/** How a target of the current step may be entered: evaluable guards, or prose the actor asserts. */
export type Guard =
  | { kind: 'none' }
  | { kind: 'outcome'; token: string }
  | { kind: 'artifact'; artifact: string; holds: boolean }
  | { kind: 'prose'; text: string }

export interface Transition {
  to: string
  guard: Guard
}

export interface RunState {
  status: RunStatus
  /** The step to act on, or null when the walk reached a done terminal step. */
  currentStep: string | null
  /** Steps walked from the start, current included. */
  path: string[]
  steps: Record<string, StepState>
  artifacts: Record<string, ArtifactState>
  /** Targets of the current step and their guards. */
  allowedNext: Transition[]
  /** Validated artifacts whose producer consumed an outdated input rev. */
  stale: string[]
  /** Done steps on the path with a stale output. */
  reopened: string[]
  /** Set when the pinned def_rev differs from the definition's (R5). */
  drift: { pinned: string | null; current: string | null } | null
  /** An engine step started with no later event while the apply lock is free. Derived, never written. */
  crashed: boolean
  paused: boolean
  /** Why the run is blocked, when it is. */
  blockedBy?: string
  /** The walk reached a done terminal step and nothing is stale: the terminal `completed` may be recorded. */
  canComplete: boolean
  /** Latest `input_recorded` per field (design §7). */
  inputs: Record<string, { value?: string; rev?: string }>
  /** Recorded inputs whose rev differs from the caller-supplied current rev: the computed value must be recomputed. */
  staleInputs: string[]
}

export interface FoldOptions {
  /** The run's pinned `def_rev` from its header. */
  defRev: string | null
  /** Whether the apply lock is free (supplied by the I/O layer). Default false: no crash is claimed. */
  lockFree?: boolean
  /** Current revisions of recorded input fields, for computed values (design §7). */
  currentRevs?: Record<string, string>
}
