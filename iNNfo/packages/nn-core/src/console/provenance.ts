/**
 * Derived provenance (provenance-as-changes, change C).
 *
 * The change is the ONLY provenance of a mutation. A knowledge unit carries no
 * provenance of its own: a field's origin and a target's history are DERIVED from
 * the changes whose `target` points at it — `changes.filter(target).sort(applied_at)`.
 *
 * These functions are pure: they take the parsed changeset records (see
 * `./element-history.ts`) plus the model elements, and compute the origin, the value
 * timeline, and the "edited without record" drift fingerprint.
 */
import type { ChangesetRecord } from './element-history.js'
import { normalizeAddressKey, parseChangesetTarget } from './element-history.js'

/** One hop of a target's value timeline, in `applied_at` order. */
export interface ValueHop {
  changeId: string
  batch?: string
  op: string
  author?: string
  /** The change's evidence — the sole provenance of this hop. */
  evidence?: string
  appliedAt?: string
  from?: string
  to?: string
}

/** The last change that touched a field: its author, evidence and resulting value. */
export interface FieldOrigin {
  changeId: string
  batch?: string
  author?: string
  evidence?: string
  appliedAt?: string
  from?: string
  to?: string
}

/** A drift fingerprint: a field whose value does not match the last recorded change. */
export interface DriftDiagnostic {
  code: 'EDITED_WITHOUT_RECORD'
  severity: 'warning'
  path: string
  message: string
}

/** A model element as this module needs it (id/slug and current field values). */
export interface ProvenanceElement {
  id: string
  name?: string
  fields?: Record<string, unknown>
}

/** Splits a D5 address `model@element&field`; returns null for a matrix cell or a bare target. */
function changeFieldPart(target: string): { elementPart: string; field: string } | null {
  const { elementPart } = parseChangesetTarget(target)
  const amp = String(target).indexOf('&')
  if (amp === -1) return null
  const field = String(target).slice(amp + 1)
  // A matrix cell (`model@matrix&row&col`) is not a field; a field has one `&`.
  if (field.includes('&')) return null
  if (!elementPart || !field) return null
  return { elementPart, field }
}

function hopAppliedAt(change: ChangesetRecord['changes'][number], cs: ChangesetRecord): string {
  return change.applied_at || cs.appliedAt || ''
}

/**
 * The full value timeline of a target (`model@element&field`), oldest first. Matches
 * by the element&field part (case/separator-insensitive), like element history, so a
 * domain console aggregating several models still finds the hops.
 */
export function deriveValueHistory(changes: ReadonlyArray<ChangesetRecord>, target: string): ValueHop[] {
  const wanted = changeFieldPart(target)
  if (!wanted) return []
  const key = `${normalizeAddressKey(wanted.elementPart)}\u0000${wanted.field.toLowerCase()}`
  const hops: ValueHop[] = []
  for (const cs of changes) {
    for (const change of cs.changes) {
      const part = changeFieldPart(change.target)
      if (!part) continue
      if (`${normalizeAddressKey(part.elementPart)}\u0000${part.field.toLowerCase()}` !== key) continue
      hops.push({
        changeId: change.id,
        batch: change.batch,
        op: change.op,
        author: change.author || cs.author,
        evidence: change.evidence,
        appliedAt: hopAppliedAt(change, cs),
        from: change.from,
        to: change.to,
      })
    }
  }
  hops.sort((a, b) => (a.appliedAt! < b.appliedAt! ? -1 : a.appliedAt! > b.appliedAt! ? 1 : 0))
  return hops
}

/**
 * The origin of a field: the LAST change that touched it (its author, evidence and
 * resulting value), or null when no change targets it.
 */
export function deriveFieldOrigin(
  changes: ReadonlyArray<ChangesetRecord>,
  element: string,
  field: string,
): FieldOrigin | null {
  const hops = deriveValueHistory(changes, `${element}@${element}&${field}`)
  if (hops.length === 0) return null
  const last = hops[hops.length - 1]
  return {
    changeId: last.changeId,
    batch: last.batch,
    author: last.author,
    evidence: last.evidence,
    appliedAt: last.appliedAt,
    from: last.from,
    to: last.to,
  }
}

/**
 * The drift fingerprint: a field whose current value is not equal to the `to` of the
 * last applied change targeting it. A field with no targeting change emits nothing.
 * Hand/git edits cannot be prevented, only detected — this is the enforcement of the
 * "change via the agent/changeset, not by hand" stance.
 */
export function detectUnrecordedEdits(
  elements: ReadonlyArray<ProvenanceElement>,
  changes: ReadonlyArray<ChangesetRecord>,
): DriftDiagnostic[] {
  // Last applied `to` per element&field.
  const lastTo = new Map<string, string>()
  for (const cs of changes) {
    for (const change of cs.changes) {
      if (change.status !== 'applied') continue
      if (change.to === undefined) continue
      const part = changeFieldPart(change.target)
      if (!part) continue
      const key = `${normalizeAddressKey(part.elementPart)}\u0000${part.field.toLowerCase()}`
      lastTo.set(key, change.to)
    }
  }

  const out: DriftDiagnostic[] = []
  for (const el of elements) {
    if (!el.fields) continue
    for (const [field, current] of Object.entries(el.fields)) {
      const key = `${normalizeAddressKey(el.id)}\u0000${field.toLowerCase()}`
      if (!lastTo.has(key)) continue
      const expected = lastTo.get(key)!
      if (String(current ?? '') !== String(expected ?? '')) {
        out.push({
          code: 'EDITED_WITHOUT_RECORD',
          severity: 'warning',
          path: `${el.id}&${field}`,
          message:
            `field "${field}" of "${el.id}" is "${String(current ?? '')}" but the last recorded change ` +
            `sets it to "${expected}"; record the change or revert`,
        })
      }
    }
  }
  return out
}
