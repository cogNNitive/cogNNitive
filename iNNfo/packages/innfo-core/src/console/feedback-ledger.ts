/**
 * Feedback Verdict Ledger.
 * Append-only ledger format for tracking feedback reconciliation verdicts.
 */

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
      if (!parsed || typeof parsed !== 'object') {
        errors.push({ line: i + 1, error: 'Entry is not a JSON object', raw })
        continue
      }
      if (!parsed.source || !parsed.item || !parsed.status) {
        errors.push({ line: i + 1, error: 'Entry missing required fields (source, item, status)', raw })
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
