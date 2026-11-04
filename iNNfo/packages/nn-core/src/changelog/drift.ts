/**
 * Drift: the fold must reproduce the file (change-provenance).
 *
 * `checkProvenance` compares every live unit of the log with every unit the model
 * file carries. A mismatch, or an expected value missing from the file, is
 * `EDITED_WITHOUT_RECORD`; a file unit with no live entry is `UNIT_WITHOUT_RECORD`.
 * Evidence diagnostics (`EVIDENCE_UNKNOWN`, `EVIDENCE_SOURCE_CHANGED`) come from
 * the applied changes themselves. Warnings in fold mode, errors in strict mode.
 *
 * Browser-safe: pure over parsed input. The caller supplies the model entries and,
 * optionally, a sha resolver for the evidence anchors.
 */
import type { ChangeLog, LoggedChange } from './index.js'
import type { ModelId } from '../address/index.js'
import { canonicalValue, splitUnitKey } from './fold.js'
import type { ParsedKnowledge, ElementNode } from '../types/index.js'
import { slugifyHeading } from '../sourceRef.js'
import { splitEvidence } from '../changeset/evidence.js'

export interface ProvenanceModel {
  /** Canonical model id (no version token), as `resolved_target` carries it. */
  modelId: string
  model: ParsedKnowledge
  /** Workspace-relative path, used in messages only. */
  path?: string
}

export interface ProvenanceOptions {
  /** Errors instead of warnings (the strict contract; the replay engine lands in S2b). */
  strict?: boolean
  /** Current sha256 of a cited file, for `EVIDENCE_SOURCE_CHANGED`. */
  sha256?: (path: string) => string | undefined
}

export interface ProvenanceDiagnostic {
  code:
    | 'EDITED_WITHOUT_RECORD'
    | 'UNIT_WITHOUT_RECORD'
    | 'MODEL_WITHOUT_RECORD'
    | 'MODEL_WITHOUT_FILE'
    | 'EVIDENCE_UNKNOWN'
    | 'EVIDENCE_SOURCE_CHANGED'
  severity: 'warning' | 'error'
  message: string
  /** Unit address the diagnostic is filed against, when it has one. */
  unit?: string
  expected?: string
  actual?: string
  changeId?: string
  author?: string
  citation?: string
}

export interface ProvenanceReport {
  ok: boolean
  mode: 'fold' | 'strict'
  diagnostics: ProvenanceDiagnostic[]
}

/** Canonical form of a value the parser already typed. */
function canonicalFromValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return `[${value.map((v) => String(v)).join(', ')}]`
  if (typeof value === 'string') return canonicalValue(value)
  return String(value)
}

/**
 * A concept unit key in its canonical form: the concept segment is the concept
 * slug (`model@concept:goal`). Earlier changesets recorded the display name
 * (`model@concept:Goal`); both sides compare in the slug form so no recorded
 * history is rewritten (distributed-storage S6c).
 */
function normalizeConceptKey(key: string): string {
  const { model, parts } = splitUnitKey(key)
  if (parts.length === 0 || !parts[0].startsWith('concept:')) return key
  const name = parts[0].slice('concept:'.length)
  const slug = slugifyHeading(name)
  if (slug === name) return key
  const rest = parts.length > 1 ? `&${parts.slice(1).join('&')}` : ''
  return `${model}@concept:${slug}${rest}`
}

function isKeyword(item: string): boolean {
  const lower = item.toLowerCase()
  return lower === 'decision' || lower === 'unknown'
}

/** Every unit the model file currently carries, in canonical value form. */
function fileUnits(modelId: string, model: ParsedKnowledge): Map<string, string> {
  const units = new Map<string, string>()
  const nameToSlug = new Map<string, string>()
  for (const [, elements] of model.elements.entries()) {
    for (const el of elements) {
      if (el.slug) nameToSlug.set(el.name.toLowerCase(), el.slug)
    }
  }

  for (const [concept, elements] of model.elements.entries()) {
    for (const el of elements as ElementNode[]) {
      if (!el.slug) continue
      const elementKey = `${modelId}@${el.slug}`
      for (const [field, value] of Object.entries(el.fields ?? {})) {
        const canonical = canonicalFromValue(value)
        if (canonical !== '') units.set(`${elementKey}&${field}`, canonical)
      }
      const body = canonicalFromValue(el.description)
      if (body !== '') units.set(`${elementKey}&#body`, body)
    }
    const text = model.rawSections?.[concept]
    const conceptText = canonicalFromValue(text)
    if (conceptText !== '') units.set(`${modelId}@concept:${slugifyHeading(concept)}`, conceptText)
  }

  for (const [concept, fields] of Object.entries(model.conceptFields ?? {})) {
    for (const [field, value] of Object.entries(fields)) {
      const canonical = canonicalFromValue(value)
      if (canonical !== '') units.set(`${modelId}@concept:${slugifyHeading(concept)}&${field}`, canonical)
    }
  }

  for (const matrix of model.matrices ?? []) {
    const matrixSlug = slugifyHeading(matrix.name)
    for (const cell of matrix.cells ?? []) {
      const canonical = canonicalFromValue(cell.value)
      if (canonical === '') continue
      const rowSlug = nameToSlug.get(cell.row.toLowerCase()) ?? slugifyHeading(cell.row)
      const colSlug = nameToSlug.get(cell.col.toLowerCase()) ?? slugifyHeading(cell.col)
      units.set(`${modelId}@${matrixSlug}&${rowSlug}&${colSlug}`, canonical)
    }
  }

  return units
}

function modelOfUnit(unit: string): string {
  return splitUnitKey(unit).model
}

function evidenceDiagnostics(
  log: ChangeLog,
  options: ProvenanceOptions,
  severity: 'warning' | 'error',
): ProvenanceDiagnostic[] {
  const out: ProvenanceDiagnostic[] = []
  for (const change of log.all) {
    if (!change.applied) continue
    const items = change.evidenceItems ?? splitEvidence(change.evidence)

    // `unknown` (or no evidence at all) applies, but is a visible warning.
    if (items.length === 0 || items.some((item) => item.toLowerCase() === 'unknown')) {
      out.push({
        code: 'EVIDENCE_UNKNOWN',
        severity,
        message: `EVIDENCE_UNKNOWN: change "${change.id}" by ${change.author ?? 'unknown'} on ${change.target} has ${items.length === 0 ? 'no evidence' : 'unknown evidence'}`,
        unit: change.resolvedTarget ?? change.target,
        changeId: change.id,
        author: change.author,
        citation: items.join(', '),
      })
    }

    if (!options.sha256 || !change.evidenceSha256) continue
    items.forEach((item, index) => {
      if (isKeyword(item)) return
      const stamped = change.evidenceSha256?.[index]
      if (!stamped) return
      const path = item.split('@')[0]
      const current = options.sha256!(path)
      if (current !== undefined && current !== stamped) {
        out.push({
          code: 'EVIDENCE_SOURCE_CHANGED',
          severity,
          message: `EVIDENCE_SOURCE_CHANGED: change "${change.id}" cites ${item}, but the source changed since it was applied`,
          unit: change.resolvedTarget ?? change.target,
          changeId: change.id,
          author: change.author,
          citation: item,
        })
      }
    })
  }
  return out
}

/**
 * Computes the provenance report for the given models. Only models the log
 * touches are checked; a log with no applied change yields no drift diagnostics.
 */
export function checkProvenance(
  log: ChangeLog,
  models: readonly ProvenanceModel[],
  options: ProvenanceOptions = {},
): ProvenanceReport {
  const strict = options.strict === true
  const mode: 'fold' | 'strict' = strict ? 'strict' : 'fold'
  const severity: 'warning' | 'error' = strict ? 'error' : 'warning'
  const diagnostics: ProvenanceDiagnostic[] = []
  /** Touched model id -> the first applied change that touched it. */
  const touched = new Map<string, LoggedChange>()
  for (const change of log.all) {
    if (!change.applied) continue
    const model = modelOfUnit(change.resolvedTarget ?? change.target)
    if (model && !touched.has(model)) touched.set(model, change)
  }
  // A rekey moves units (and element origins) under a model id no change ever
  // targeted directly: an extracted instance and a moved model are both touched
  // by the change that carried the rekey, so their files are still checked
  // (design A10, A11).
  for (const rekey of log.rekeys) {
    if (touched.has(rekey.to)) continue
    if (rekey.change) touched.set(rekey.to, rekey.change)
  }

  diagnostics.push(...evidenceDiagnostics(log, options, severity))

  // An id the log touched is covered by a live entry when it is the entry's id or
  // one of the ids the entry carried before a recorded move (design A10). A
  // rename whose chain ends in a live model is therefore not drift; a model that
  // vanished without a recorded move is (A-5).
  const covered = new Set<string>()
  for (const entry of models) {
    covered.add(entry.modelId)
    for (const former of log.identities(entry.modelId as ModelId)) covered.add(former)
  }
  for (const [modelId, change] of touched) {
    if (covered.has(modelId)) continue
    diagnostics.push({
      code: 'MODEL_WITHOUT_FILE',
      severity,
      message: `MODEL_WITHOUT_FILE: model "${modelId}" is touched by change "${change.id}" but has no file entry; restore the file or record the change`,
      unit: modelId,
      changeId: change.id,
    })
  }

  for (const entry of models) {
    if (!touched.has(entry.modelId) && !log.identities(entry.modelId as ModelId).some((former) => touched.has(former))) continue
    const units = fileUnits(entry.modelId, entry.model)
    const live = new Map([...log.units(entry.modelId)].map((unit) => [normalizeConceptKey(unit.key), unit]))
    const cleared = new Set([...log.cleared].map(normalizeConceptKey))

    for (const [key, actual] of units) {
      const unit = live.get(key)
      if (unit) {
        if (unit.value !== actual) {
          diagnostics.push({
            code: 'EDITED_WITHOUT_RECORD',
            severity,
            message: `EDITED_WITHOUT_RECORD: ${key} is "${actual}" in the file but the last applied change sets "${unit.value}"; record the change or revert it`,
            unit: key,
            expected: unit.value,
            actual,
            changeId: unit.origin.id,
          })
        }
      } else if (cleared.has(key)) {
        diagnostics.push({
          code: 'EDITED_WITHOUT_RECORD',
          severity,
          message: `EDITED_WITHOUT_RECORD: ${key} was cleared by an applied change but is "${actual}" in the file`,
          unit: key,
          expected: '',
          actual,
        })
      } else {
        diagnostics.push({
          code: 'UNIT_WITHOUT_RECORD',
          severity,
          message: `UNIT_WITHOUT_RECORD: ${key} is "${actual}" in the file and no applied change set it`,
          unit: key,
          actual,
        })
      }
    }

    for (const [key, unit] of live) {
      if (units.has(key)) continue
      diagnostics.push({
        code: 'EDITED_WITHOUT_RECORD',
        severity,
        message: `EDITED_WITHOUT_RECORD: the last applied change sets ${key} to "${unit.value}" but the file has no such value`,
        unit: key,
        expected: unit.value,
        actual: '',
        changeId: unit.origin.id,
      })
    }

    // Element existence: a frozen slug is required to address an element at all.
    const fileSlugs = new Set<string>()
    for (const [, elements] of entry.model.elements.entries()) {
      for (const el of elements) {
        if (!el.slug || el.slugExplicit !== true) {
          diagnostics.push({
            code: 'UNIT_WITHOUT_RECORD',
            severity,
            message: `UNIT_WITHOUT_RECORD: element "${el.name}" of model "${entry.modelId}" has no frozen slug`,
            unit: el.slug ? `${entry.modelId}@${el.slug}` : undefined,
            actual: el.name,
          })
        }
        if (el.slug) fileSlugs.add(el.slug)
      }
    }
    for (const [key, origin] of log.elements) {
      if (modelOfUnit(key) !== entry.modelId) continue
      const slug = key.slice(key.indexOf('@') + 1)
      if (origin.op === 'remove_element') {
        if (fileSlugs.has(slug)) {
          diagnostics.push({
            code: 'EDITED_WITHOUT_RECORD',
            severity,
            message: `EDITED_WITHOUT_RECORD: element ${key} was removed by an applied change but is present in the file`,
            unit: key,
            expected: '',
            actual: slug,
            changeId: origin.id,
          })
        }
        continue
      }
      if (!fileSlugs.has(slug)) {
        diagnostics.push({
          code: 'EDITED_WITHOUT_RECORD',
          severity,
          message: `EDITED_WITHOUT_RECORD: element ${key} was created by an applied change but is missing from the file`,
          unit: key,
          expected: slug,
          actual: '',
          changeId: origin.id,
        })
      }
    }
  }

  return { ok: !diagnostics.some((d) => d.severity === 'error'), mode, diagnostics }
}
