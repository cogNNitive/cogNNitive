import type { ParsedKnowledge } from '../types/index.js'
import type {
  ArtifactRow,
  ArtifactRowStatus,
  RunModel,
  RunStateValue,
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
  return {
    state: runStateOf(header.fields['state']),
    seq: num(header.fields['seq']) ?? 0,
    procedure: str(header.fields['procedure']) ?? '',
    defRev: str(header.fields['def_rev']) ?? null,
    params: json(header.fields['params']) ?? {},
    steps,
    artifacts,
    inputs,
    attempts: {},
  }
}
