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
  /** Exit code -> outcome name (`waiting`, `failed`, or any outcome the walk branches on). */
  exitCodes?: Record<string, string>
  /** Artifact slugs consumed / produced. */
  inputs: string[]
  outputs: string[]
  /**
   * The most attempts the step may take when a loop sends the run back to it (`max_attempts`).
   * Absent means `DEFAULT_MAX_ATTEMPTS`.
   */
  maxAttempts?: number
}

/** How an output artifact is carried (design §4.1). */
export type ArtifactKind = 'file' | 'element' | 'changeset'

export interface ProcedureArtifact {
  slug: string
  name: string
  kind: ArtifactKind
  /** The single owner of the output's location: a path, a `model@element` address, or a changeset path. */
  at?: string
  verify?: string
  /** Default true; only meaningful for producers on the walked path. */
  required: boolean
  /** Slugs of the steps that list this artifact as an output. */
  producers: string[]
}

export type GraphDiagnosticCode =
  'MISSING_SLUG' | 'UNKNOWN_NEXT' | 'NO_START' | 'MULTIPLE_STARTS' | 'CYCLE' | 'UNRESOLVED_SLOT'

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
  /** Slot names the procedure declares (`{name}` placeholders). */
  slots: string[]
  diagnostics: GraphDiagnostic[]
}

/**
 * The stored lifecycle of a run (design §3.1). The header holds `state`; the tools return the
 * fold's derived `RunStatus`, which reports `paused` when `state` is `paused`.
 */
export type RunStateValue = 'open' | 'paused' | 'completed' | 'failed' | 'cancelled'

/** The stored lifecycle of one step row. `""` (unset) reads as `pending`. */
export type StepRowStatus = 'pending' | 'active' | 'waiting' | 'done' | 'failed'

/** The stored lifecycle of one artifact row. `""` (unset) reads as `expected`. */
export type ArtifactRowStatus = 'expected' | 'produced' | 'validated' | 'rejected'

/** What the tools return: the fold's derived status. Unchanged names for existing consumers. */
export type RunStatus =
  'open' | 'waiting' | 'blocked' | 'drifted' | 'completed' | 'failed' | 'cancelled' | 'paused'
export type StepStatus =
  'pending' | 'active' | 'waiting' | 'done' | 'failed' | 'reopened' | 'off_path'
export type ArtifactStatus =
  'expected' | 'produced' | 'validated' | 'rejected' | 'stale' | 'not_required'

/** One `Step Run` row as stored (design §3.1). Slug = step slug. */
export interface StepRow {
  status: StepRowStatus
  attempt: number
  outcome?: string
  next?: string
  /** Frozen input artifact revs at claim time: artifact slug -> rev. */
  inputs: Record<string, string>
  waitingOn?: string
  failure?: string
  claimedAt?: string
  timeoutMs?: number
  /** `pid@host` of the claimant, for crash derivation. */
  holder?: string
}

/** One `Run Artifact` row as stored (design §3.1). Slug = artifact slug. */
export interface ArtifactRow {
  kind: ArtifactKind
  value?: string
  rev?: string
  status: ArtifactRowStatus
  /** The step that produced it, from the producing change's run context. */
  step?: string
}

/** The run as its model holds it: header + one row per step and per artifact (design §3.1). */
export interface RunModel {
  state: RunStateValue
  seq: number
  procedure: string
  defRev: string | null
  params: Record<string, unknown>
  /** Step slug -> row. A step the model has no row for reads as pending. */
  steps: Record<string, StepRow>
  /** Artifact slug -> row. An artifact the model has no row for reads as expected. */
  artifacts: Record<string, ArtifactRow>
  /** Input name -> the value and revision the run recorded. */
  inputs: Record<string, { value?: string; rev?: string }>
  /** Request slug -> the human request that an action be recorded. Empty when nobody asked. */
  requests: Record<string, StepRequestRow>
  /** Each step's attempts as the model's change log recorded them, oldest first. */
  attempts: Record<string, AttemptRecord[]>
}

/** The action a `Step Request` asks the runner to record. Closing a run is never one of them. */
export type StepRequestAction = 'start' | 'wait' | 'complete' | 'fail'

/** The life of one request: nobody consumed it yet, or what became of it. */
export type StepRequestStatus = 'pending' | 'done' | 'stale' | 'rejected'

/**
 * One `Step Request` row as stored. Intent, never state: it names an action and the `seq` it
 * was asked at, and only the runner consumes it.
 */
export interface StepRequestRow {
  action: StepRequestAction
  status: StepRequestStatus
  /** The run header's `seq` at creation; a consumer refuses the request when the run moved on. */
  baseSeq?: number
  /** The step slug the request names. */
  step?: string
  /** The outcome the person asked for, on a branching step. */
  outcome?: string
  /** Who or what a wait waits on, or why a step failed. */
  value?: string
  /**
   * The `requested_outputs` of a `complete` request, as the JSON text it was stored as: artifact
   * slug -> `{ name?, text }`. The runner parses and validates it; the reader keeps it verbatim.
   */
  outputs?: string
  /** Why the runner rejected the request or found it stale. */
  reason?: string
  /** When the request was made (ISO 8601). */
  at?: string
}

/** One attempt of a step, rebuilt from the run model's change log (design B2 acceptance). */
export interface AttemptRecord {
  attempt: number
  inputs: Record<string, string>
  failure?: string
  actor?: string
}

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
  /** An engine step left `active` whose holder is gone (or whose attempt outlived its timeout). Derived, never written. */
  crashed: boolean
  paused: boolean
  /** Why the run is blocked, when it is. */
  blockedBy?: string
  /** The walk reached a done terminal step and nothing is stale: the terminal `completed` may be recorded. */
  canComplete: boolean
  /** Latest recorded input per field (design §7). */
  inputs: Record<string, { value?: string; rev?: string }>
  /** Recorded inputs whose rev differs from the caller-supplied current rev: the computed value must be recomputed. */
  staleInputs: string[]
  /** Every attempt of every step, as the run model's change log recorded them (design B2). */
  attempts: Record<string, AttemptRecord[]>
}

export interface FoldOptions {
  /** The run's pinned `def_rev` from its header. */
  defRev: string | null
  /**
   * Crash derivation input (design §3.3): whether the holder of an `active` step is gone.
   * The I/O layer probes the pid for this host and falls back to `claimed_at + timeout_ms +
   * grace` when the pid cannot be probed. Never read from the apply lock.
   */
  activeStepIsStale?: (step: string, row: StepRow) => boolean
  /** Current revisions of recorded input fields, for computed values (design §7). */
  currentRevs?: Record<string, string>
}
