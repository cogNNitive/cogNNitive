/**
 * Feedback Verdict Ledger.
 * Append-only ledger format for tracking feedback reconciliation verdicts.
 */

import type { ConsolePayload } from './payload-builder.js'

export const FEEDBACK_LEDGER_FILENAME = 'feedback-ledger.jsonl'

export type FeedbackStatus = 'pending' | 'applied' | 'rejected' | 'stale'
export type FeedbackSourceKind = 'console-json' | 'docx'
export type FeedbackTriageLayer = 'scope' | 'data' | 'domain' | 'anomaly'
export type FeedbackSeverity = 'low' | 'medium' | 'high'

export interface FeedbackSourceRef {
  kind: FeedbackSourceKind
  path: string
  sha256: string
}

export interface FeedbackVerdictEntry {
  v: number
  at: string
  source: FeedbackSourceRef
  item: string
  model_id: string
  model_version: string
  status: FeedbackStatus
  by: string
  element_id?: string
  target_hash?: string
  layer?: FeedbackTriageLayer
  severity?: FeedbackSeverity
  note?: string
  confirm_stale?: true
}

export interface FeedbackStateItem {
  id: string
  source: string
  element_id: string
  status: FeedbackStatus
  version: string
}

export interface LedgerParseResult {
  entries: FeedbackVerdictEntry[]
  errors: Array<{ line: number; error: string; raw: string }>
}

export interface FeedbackDoc {
  meta: {
    source_model?: string
    source_knowledge?: string
    source_model_version?: string
    source_knowledge_version?: string
    source_sha256?: string
    [key: string]: unknown
  }
  items: Array<{
    id?: string
    item?: string
    base_hash?: string
    target?: {
      element_id?: string
      concept?: string
      element?: string
      field?: string
    }
    comment?: string
    [key: string]: unknown
  }>
}

export interface EvaluateFeedbackOptions {
  feedback: FeedbackDoc
  sourceSha256: string
  payload: ConsolePayload
  entries?: FeedbackVerdictEntry[]
}

export interface FeedbackItemEvaluation {
  item: string
  element_id?: string
  effective_status: FeedbackStatus
  base_hash?: string
  current_hash?: string
  stale: boolean
  orphaned: boolean
}

const ALLOWED_STATUSES: Set<string> = new Set(['pending', 'applied', 'rejected', 'stale'])
const ALLOWED_KINDS: Set<string> = new Set(['console-json', 'docx'])
const ALLOWED_LAYERS: Set<string> = new Set(['scope', 'data', 'domain', 'anomaly'])
const ALLOWED_SEVERITIES: Set<string> = new Set(['low', 'medium', 'high'])

/**
 * Validates a single feedback verdict entry against ledger schema rules.
 * Returns a list of error strings (empty if valid).
 */
export function validateFeedbackVerdictEntry(entry: unknown): string[] {
  const errors: string[] = []
  if (!entry || typeof entry !== 'object') {
    return ['Entry must be a non-null object']
  }

  const e = entry as Record<string, unknown>

  if (e.v !== 1) {
    errors.push('Entry version (v) must be integer 1')
  }

  if (typeof e.at !== 'string' || !e.at.trim()) {
    errors.push('Entry timestamp (at) must be a non-empty ISO string')
  }

  if (!e.source || typeof e.source !== 'object') {
    errors.push('Entry source must be an object')
  } else {
    const src = e.source as Record<string, unknown>
    if (typeof src.kind !== 'string' || !ALLOWED_KINDS.has(src.kind)) {
      errors.push(`Entry source.kind must be one of: ${Array.from(ALLOWED_KINDS).join(', ')}`)
    }
    if (typeof src.path !== 'string' || !src.path.trim()) {
      errors.push('Entry source.path must be a non-empty string')
    }
    if (typeof src.sha256 !== 'string' || !src.sha256.trim()) {
      errors.push('Entry source.sha256 must be a non-empty string')
    }
  }

  if (typeof e.item !== 'string' || !e.item.trim()) {
    errors.push('Entry item identifier must be a non-empty string')
  }

  if (typeof e.model_id !== 'string' || !e.model_id.trim()) {
    errors.push('Entry model_id must be a non-empty string')
  }

  if (typeof e.model_version !== 'string' || !e.model_version.trim()) {
    errors.push('Entry model_version must be a non-empty string')
  }

  if (typeof e.status !== 'string' || !ALLOWED_STATUSES.has(e.status)) {
    errors.push(`Entry status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`)
  }

  if (typeof e.by !== 'string' || !e.by.trim()) {
    errors.push('Entry by (author) must be a non-empty string')
  }

  if (e.confirm_stale !== undefined && e.confirm_stale !== true) {
    errors.push('Entry confirm_stale must be boolean true if present')
  }

  if (e.layer !== undefined && (typeof e.layer !== 'string' || !ALLOWED_LAYERS.has(e.layer))) {
    errors.push(`Entry layer must be one of: ${Array.from(ALLOWED_LAYERS).join(', ')}`)
  }

  if (e.severity !== undefined && (typeof e.severity !== 'string' || !ALLOWED_SEVERITIES.has(e.severity))) {
    errors.push(`Entry severity must be one of: ${Array.from(ALLOWED_SEVERITIES).join(', ')}`)
  }

  if (e.element_id !== undefined && typeof e.element_id !== 'string') {
    errors.push('Entry element_id must be a string')
  }

  if (e.target_hash !== undefined && typeof e.target_hash !== 'string') {
    errors.push('Entry target_hash must be a string')
  }

  if (e.note !== undefined && typeof e.note !== 'string') {
    errors.push('Entry note must be a string')
  }

  return errors
}

/**
 * Parses append-only feedback ledger lines.
 */
export function parseFeedbackLedger(content: string): LedgerParseResult {
  const entries: FeedbackVerdictEntry[] = []
  const errors: Array<{ line: number; error: string; raw: string }> = []
  if (!content) return { entries, errors }

  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as FeedbackVerdictEntry
      const validationErrors = validateFeedbackVerdictEntry(parsed)
      if (validationErrors.length > 0) {
        errors.push({ line: i + 1, error: validationErrors.join('; '), raw })
        continue
      }
      entries.push(parsed)
    } catch (err) {
      errors.push({ line: i + 1, error: err instanceof Error ? err.message : String(err), raw })
    }
  }

  return { entries, errors }
}

/**
 * Serializes a feedback verdict entry to a single JSONL line.
 */
export function serializeFeedbackLedgerEntry(entry: FeedbackVerdictEntry): string {
  return JSON.stringify(entry) + '\n'
}

/**
 * Computes effective latest status per item key (source.sha256#item).
 */
export function effectiveStatusFor(entries: FeedbackVerdictEntry[]): Map<string, FeedbackVerdictEntry> {
  const latestByKey = new Map<string, FeedbackVerdictEntry>()
  for (const entry of entries) {
    const key = `${entry.source.sha256}#${entry.item}`
    latestByKey.set(key, entry)
  }
  return latestByKey
}

/**
 * Derives `meta.feedbackState` for a given model from effective ledger statuses.
 */
export function feedbackStateFor(entries: FeedbackVerdictEntry[], modelId: string): FeedbackStateItem[] {
  const normalizedModelId = modelId.replace(/^(kNNowledge\/|models\/)/i, '').replace(/(\.md|_NN\.md)$/i, '')
  const latest = effectiveStatusFor(entries)
  const result: FeedbackStateItem[] = []

  for (const entry of latest.values()) {
    const entryModelId = entry.model_id.replace(/^(kNNowledge\/|models\/)/i, '').replace(/(\.md|_NN\.md)$/i, '')
    if (entryModelId === normalizedModelId) {
      result.push({
        id: entry.item,
        source: entry.source.path,
        element_id: entry.element_id || entry.item,
        status: entry.status,
        version: entry.model_version,
      })
    }
  }

  return result
}

/**
 * Evaluates feedback items against current console payload elements and ledger entries.
 * Returns staleness and orphan status per item.
 */
export function evaluateFeedbackItems(options: EvaluateFeedbackOptions): FeedbackItemEvaluation[] {
  const { feedback, sourceSha256, payload, entries = [] } = options
  const results: FeedbackItemEvaluation[] = []

  const latestByKey = effectiveStatusFor(entries)
  const elements = payload.model?.elements || []

  const elementsById = new Map<string, typeof elements[0]>()
  const elementsByConceptName = new Map<string, typeof elements[0]>()

  for (const elem of elements) {
    if (!elementsById.has(elem.id.toLowerCase())) {
      elementsById.set(elem.id.toLowerCase(), elem)
    }
    const conceptNameKey = `${elem.concept.toLowerCase()}::${elem.name.toLowerCase()}`
    if (!elementsByConceptName.has(conceptNameKey)) {
      elementsByConceptName.set(conceptNameKey, elem)
    }
  }

  const modelVersion = payload.model?.meta?.modelVersion || ''
  const sourceKnowledgeVersion =
    (feedback.meta?.source_knowledge_version as string | undefined) ||
    (feedback.meta?.source_model_version as string | undefined) ||
    ''

  const items = feedback.items || []
  for (const item of items) {
    const itemId = item.id || item.item || ''
    const targetElementId = item.target?.element_id
    const targetConcept = item.target?.concept
    const targetElementName = item.target?.element

    let matchedElement = targetElementId ? elementsById.get(targetElementId.toLowerCase()) : undefined
    if (!matchedElement && targetConcept && targetElementName) {
      matchedElement = elementsByConceptName.get(`${targetConcept.toLowerCase()}::${targetElementName.toLowerCase()}`)
    }
    if (!matchedElement && itemId) {
      matchedElement = elementsById.get(itemId.toLowerCase())
    }

    const itemKey = `${sourceSha256}#${itemId}`
    const latestEntry = latestByKey.get(itemKey)
    const effectiveStatus: FeedbackStatus = latestEntry ? latestEntry.status : 'pending'

    if (!matchedElement) {
      results.push({
        item: itemId,
        element_id: targetElementId,
        effective_status: effectiveStatus,
        base_hash: item.base_hash,
        current_hash: undefined,
        stale: false,
        orphaned: true,
      })
    } else {
      let isStale = false
      if (item.base_hash) {
        isStale = item.base_hash !== matchedElement.hash
      } else if (sourceKnowledgeVersion && modelVersion) {
        isStale = sourceKnowledgeVersion !== modelVersion
      }

      results.push({
        item: itemId,
        element_id: matchedElement.id,
        effective_status: effectiveStatus,
        base_hash: item.base_hash,
        current_hash: matchedElement.hash,
        stale: isStale,
        orphaned: false,
      })
    }
  }

  return results
}
