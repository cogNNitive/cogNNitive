import type { ParsedKnowledge } from '../types/index.js'
import type { RunEvent, RunEventKind } from './types.js'

/** A run as recorded in its `executions` instance model (design §4): its header and its events. */
export interface RunRecord {
  closed: boolean
  /** Domain-relative procedure document, or `bluepriNNt:<package>/<doc>` for the floor. */
  procedure: string
  defRev: string | null
  params: Record<string, unknown>
  /** Events in file order. */
  events: RunEvent[]
}

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

function eventOf(fields: Record<string, unknown>): RunEvent {
  const e: RunEvent = { kind: String(fields['kind']) as RunEventKind }
  for (const key of ['step', 'outcome', 'next', 'field', 'value', 'rev', 'actor', 'at'] as const) {
    const v = str(fields[key])
    if (v !== undefined) e[key] = v
  }
  const attempt = Number(fields['attempt'])
  if (str(fields['attempt']) !== undefined && Number.isFinite(attempt)) e.attempt = attempt
  const inputs = json(fields['inputs'])
  if (inputs) e.inputs = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, String(v)]))
  return e
}

/**
 * Reads a parsed `executions` instance model: its `Procedure Execution` header and its
 * `Execution Event` elements. Null when the model holds no run header. The one reader of a
 * run, shared by the runner tools and the console export.
 */
export function runRecordOf(model: ParsedKnowledge): RunRecord | null {
  const header = model.elements.get('Procedure Execution')?.[0]
  if (!header) return null
  return {
    closed: (model.frontmatter as Record<string, unknown>)['closed'] === true,
    procedure: str(header.fields['procedure']) ?? '',
    defRev: str(header.fields['def_rev']) ?? null,
    params: json(header.fields['params']) ?? {},
    events: (model.elements.get('Execution Event') ?? []).map((el) => eventOf(el.fields)),
  }
}
