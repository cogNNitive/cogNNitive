import type { ParsedKnowledge } from '../types/index.js'
import type {
  ArtifactRow,
  ArtifactRowStatus,
  RunModel,
  RunStateValue,
  StepRequestAction,
  StepRequestRow,
  StepRequestStatus,
  StepRow,
  StepRowStatus,
} from './types.js'

const str = (v: unknown): string | undefined =>
  v === undefined || v === null || v === '' ? undefined : String(v)

function json(v: unknown): Record<string, unknown> | undefined {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  const text = str(v)
  if (text === undefined) return undefined
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

function stringMap(v: unknown): Record<string, string> {
  const obj = json(v)
  if (!obj) return {}
  return Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, String(val)]))
}

function num(v: unknown): number | undefined {
  const text = str(v)
  if (text === undefined) return undefined
  const n = Number(text)
  return Number.isFinite(n) ? n : undefined
}

const RUN_STATES: ReadonlySet<string> = new Set([
  'open',
  'paused',
  'completed',
  'failed',
  'cancelled',
])
const STEP_STATES: ReadonlySet<string> = new Set(['pending', 'active', 'waiting', 'done', 'failed'])
const ARTIFACT_STATES: ReadonlySet<string> = new Set([
  'expected',
  'produced',
  'validated',
  'rejected',
])
const REQUEST_STATES: ReadonlySet<string> = new Set(['pending', 'done', 'stale', 'rejected'])
const REQUEST_ACTIONS: ReadonlySet<string> = new Set(['wait', 'complete', 'fail'])

/**
 * A template seed writes its field values as the type placeholders the bluepriNNt template
 * carries (`<string>`, `<model>@<element>`, …). A value that is exactly one of those is not a
 * value a person recorded.
 */
function isTemplatePlaceholder(v: unknown): boolean {
  const text = str(v)
  return text !== undefined && /^<[^>]+>(@<[^>]+>)?$/.test(text)
}

function runStateOf(v: unknown): RunStateValue {
  const text = str(v)
  return text !== undefined && RUN_STATES.has(text) ? (text as RunStateValue) : 'open'
}

function stepStatusOf(v: unknown): StepRowStatus {
  const text = str(v)
  return text !== undefined && STEP_STATES.has(text) ? (text as StepRowStatus) : 'pending'
}

function artifactStatusOf(v: unknown): ArtifactRowStatus {
  const text = str(v)
  return text !== undefined && ARTIFACT_STATES.has(text) ? (text as ArtifactRowStatus) : 'expected'
}

function requestRowOf(fields: Record<string, unknown>): StepRequestRow | null {
  const action = str(fields['action'])
  const status = str(fields['request_status'])
  // `add_model` seeds one example row per list concept from the bluepriNNt template, whose
  // field values are `<type>` placeholders. That seed is not a person's request.
  if (action === undefined || !REQUEST_ACTIONS.has(action)) return null
  if (isTemplatePlaceholder(fields['step'])) return null
  return {
    action: action as StepRequestAction,
    status:
      status !== undefined && REQUEST_STATES.has(status)
        ? (status as StepRequestStatus)
        : 'pending',
    ...(num(fields['base_seq']) !== undefined ? { baseSeq: num(fields['base_seq']) } : {}),
    ...(str(fields['step']) !== undefined ? { step: str(fields['step']) } : {}),
    ...(str(fields['requested_outcome']) !== undefined
      ? { outcome: str(fields['requested_outcome']) }
      : {}),
    ...(str(fields['requested_value']) !== undefined
      ? { value: str(fields['requested_value']) }
      : {}),
    ...(str(fields['reason']) !== undefined ? { reason: str(fields['reason']) } : {}),
    ...(str(fields['at']) !== undefined ? { at: str(fields['at']) } : {}),
  }
}

function stepRowOf(fields: Record<string, unknown>): StepRow {
  const row: StepRow = {
    status: stepStatusOf(fields['status']),
    attempt: num(fields['attempt']) ?? 0,
    inputs: stringMap(fields['inputs']),
  }
  for (const key of ['outcome', 'next', 'waiting_on', 'failure', 'claimed_at', 'holder'] as const) {
    const v = str(fields[key])
    if (v !== undefined) {
      if (key === 'waiting_on') row.waitingOn = v
      else if (key === 'claimed_at') row.claimedAt = v
      else row[key] = v
    }
  }
  const timeout = num(fields['timeout_ms'])
  if (timeout !== undefined) row.timeoutMs = timeout
  return row
}

function artifactRowOf(fields: Record<string, unknown>): ArtifactRow {
  const kind = str(fields['kind'])
  return {
    kind: kind === 'element' || kind === 'changeset' ? kind : 'file',
    status: artifactStatusOf(fields['status']),
    ...(str(fields['value']) !== undefined ? { value: str(fields['value']) } : {}),
    ...(str(fields['rev']) !== undefined ? { rev: str(fields['rev']) } : {}),
  }
}

/**
 * Reads a parsed `executions` instance model as the run it holds (design §3.1): the header
 * (`state`, `seq`, `procedure`, `def_rev`, `params`) and one row per `Step Run` and per
 * `Run Artifact` element, by slug. Null when the model holds no run header.
 *
 * The model is the state; its history is the change log of that model, never a second ledger.
 */
export function runModelOf(model: ParsedKnowledge): RunModel | null {
  const header = model.elements.get('Procedure Execution')?.[0]
  if (!header) return null
  const steps: Record<string, StepRow> = {}
  for (const el of model.elements.get('Step Run') ?? []) {
    if (el.slug) steps[el.slug] = stepRowOf(el.fields)
  }
  const artifacts: Record<string, ArtifactRow> = {}
  for (const el of model.elements.get('Run Artifact') ?? []) {
    if (el.slug) artifacts[el.slug] = artifactRowOf(el.fields)
  }
  const inputs: Record<string, { value?: string; rev?: string }> = {}
  for (const el of model.elements.get('Input') ?? []) {
    if (!el.slug) continue
    inputs[el.slug] = {
      ...(str(el.fields['value']) !== undefined ? { value: str(el.fields['value'])! } : {}),
      ...(str(el.fields['rev']) !== undefined ? { rev: str(el.fields['rev'])! } : {}),
    }
  }
  const requests: Record<string, StepRequestRow> = {}
  for (const el of model.elements.get('Step Request') ?? []) {
    if (!el.slug) continue
    const row = requestRowOf(el.fields)
    if (row) requests[el.slug] = row
  }
  return {
    state: runStateOf(header.fields['state']),
    seq: num(header.fields['seq']) ?? 0,
    procedure: str(header.fields['procedure']) ?? '',
    defRev: str(header.fields['def_rev']) ?? null,
    params: json(header.fields['params']) ?? {},
    steps,
    artifacts,
    inputs,
    requests,
    attempts: {},
  }
}
