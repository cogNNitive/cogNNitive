import type { ValidationError } from '../types'

/**
 * Differential validation against a versioned known-errors baseline.
 *
 * Pure module (no I/O): the host reads the baseline file and passes its raw
 * content to {@link loadBaseline}. Only errors absent from the baseline
 * surface in the main output; matches are counted with a backlog link while
 * stale entries are reported without failing validation. Deleting the
 * baseline restores full output.
 */

/** One suppressed error: stable file location, rule code, message fingerprint. */
export interface BaselineEntry {
  path: string
  code: string
  fingerprint: string
}

/** Versioned known-errors baseline, maintainer-approved and reviewed like code. */
export interface ValidationBaseline {
  version: 1
  backlog: string
  entries: BaselineEntry[]
}

/** Partition of current errors against the baseline. */
export interface BaselineDiff {
  /** Errors absent from the baseline — the only ones in the main output. */
  newErrors: ValidationError[]
  /** Baseline matches hidden from the main output. */
  suppressed: ValidationError[]
  /** Count of suppressed errors (pairs with the backlog link in summaries). */
  suppressedCount: number
  /** Baseline entries matching no current error — reported, never failing. */
  staleEntries: BaselineEntry[]
}

/** Normalize a file path to forward slashes so fingerprints are OS-stable. */
export function normalizeBaselinePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ')
}

/**
 * Stable fingerprint pinning file path + diagnostic location + rule code +
 * normalized message. Hint rewording does not move the fingerprint, but a
 * code change does — codes are therefore frozen once shipped.
 */
export function fingerprint(diag: ValidationError): string {
  const file = normalizeBaselinePath(diag.filePath ?? '')
  return `${file}::${diag.path}::${diag.code ?? ''}::${normalizeMessage(diag.message)}`
}

function isBaselineEntry(value: unknown): value is BaselineEntry {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Record<string, unknown>
  return (
    typeof e['path'] === 'string' &&
    typeof e['code'] === 'string' &&
    typeof e['fingerprint'] === 'string'
  )
}

/**
 * Parse raw baseline file content. Returns `null` when no baseline exists
 * (`null`/`undefined`/empty input) so callers emit full output. Throws on
 * present-but-malformed content rather than silently suppressing nothing.
 */
export function loadBaseline(raw: string | null | undefined): ValidationBaseline | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('[BASELINE_INVALID] Baseline is not valid JSON.')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('[BASELINE_INVALID] Baseline must be a JSON object.')
  }
  const doc = parsed as Record<string, unknown>
  if (doc['version'] !== 1) {
    throw new Error(
      `[BASELINE_INVALID] Unsupported baseline version ${JSON.stringify(doc['version'])}; expected 1.`,
    )
  }
  if (typeof doc['backlog'] !== 'string') {
    throw new Error('[BASELINE_INVALID] Baseline "backlog" must be a string URL.')
  }
  if (!Array.isArray(doc['entries']) || !doc['entries'].every(isBaselineEntry)) {
    throw new Error(
      '[BASELINE_INVALID] Baseline "entries" must be an array of { path, code, fingerprint } strings.',
    )
  }
  return {
    version: 1,
    backlog: doc['backlog'],
    entries: doc['entries'].map((e) => ({
      path: normalizeBaselinePath(e.path),
      code: e.code,
      fingerprint: e.fingerprint,
    })),
  }
}

/**
 * Partition current errors into new (surfaced) vs known (suppressed). A
 * `null` baseline means full output: every error is new, nothing is stale.
 */
export function diffNewOnly(
  errors: ValidationError[],
  baseline: ValidationBaseline | null,
): BaselineDiff {
  if (!baseline) {
    return { newErrors: [...errors], suppressed: [], suppressedCount: 0, staleEntries: [] }
  }
  const known = new Set(baseline.entries.map((e) => e.fingerprint))
  const seen = new Set<string>()
  const newErrors: ValidationError[] = []
  const suppressed: ValidationError[] = []
  for (const error of errors) {
    const fp = fingerprint(error)
    seen.add(fp)
    if (known.has(fp)) suppressed.push(error)
    else newErrors.push(error)
  }
  return {
    newErrors,
    suppressed,
    suppressedCount: suppressed.length,
    staleEntries: baseline.entries.filter((e) => !seen.has(e.fingerprint)),
  }
}
