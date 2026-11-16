/**
 * Recordless models: the write path that skips the changeset (issue #587).
 *
 * A model written straight to disk and registered in the domain manifest — the
 * `sync_domain_manifest` path — is a valid document that no changeset created.
 * Its elements carry no `history` and no provenance, so every aggregate view is
 * empty for them: the console Changes tab renders "No recorded changes
 * targeting this unit", and nothing on the write path rejects the file.
 *
 * This audit names those models instead of letting them vanish behind an empty
 * history. It is report-only: a warning, never an error, so an export, a
 * validation or a manifest sync still succeeds.
 *
 * `checkProvenance` complements it: that one reports drift INSIDE a model the log
 * touches (including an element no applied change created), and by contract says
 * nothing about a model the log never names. This audit covers exactly that gap.
 *
 * Browser-safe: pure over parsed input.
 */
import type { ChangeLog } from './index.js'
import type { ModelId } from '../address/index.js'
import { canonicalUnitModelId } from '../changeset/resolved-target.js'
import { touchedModels, type ProvenanceDiagnostic } from './drift.js'

/** A model as an audit caller knows it: its id and, for the message, its path. */
export interface RecordedModel {
  /** Canonical model id (no version token), as `resolved_target` carries it. */
  modelId: string
  /** Workspace-relative path, used in messages only. */
  path?: string
}

/**
 * Every model id the log names. `touchedModels` covers the unit targets and the
 * rekey destinations; a model-level change (`add_model`) names its model
 * directly, with no unit part, so it is read here.
 */
function recordedModelIds(log: ChangeLog): Set<string> {
  const recorded = new Set<string>()
  for (const model of touchedModels(log).keys()) recorded.add(canonicalUnitModelId(model))
  for (const change of log.all) {
    if (!change.applied) continue
    const unit = change.resolvedTarget ?? change.target
    if (unit.includes('@')) continue
    const modelId = canonicalUnitModelId(unit)
    if (modelId) recorded.add(modelId)
  }
  return recorded
}

/**
 * One `MODEL_WITHOUT_RECORD` warning per model no applied change names, in the
 * caller's order. A model whose recorded history belongs to an id it carried
 * before a recorded move is not an orphan (design A10).
 */
export function auditModelRecords(
  log: ChangeLog,
  models: readonly RecordedModel[],
): ProvenanceDiagnostic[] {
  const recorded = recordedModelIds(log)

  const diagnostics: ProvenanceDiagnostic[] = []
  for (const entry of models) {
    const modelId = canonicalUnitModelId(entry.modelId)
    if (!modelId) continue
    if (recorded.has(modelId)) continue
    if (log.identities(modelId as ModelId).some((former) => recorded.has(canonicalUnitModelId(former)))) {
      continue
    }
    const where = entry.path ? ` (${entry.path})` : ''
    diagnostics.push({
      code: 'MODEL_WITHOUT_RECORD',
      severity: 'warning',
      message: `MODEL_WITHOUT_RECORD: model "${modelId}"${where} is named by no applied change, so it was created outside a changeset and its elements carry no lineage; record it with an applied add_model change`,
      unit: modelId,
    })
  }
  return diagnostics
}
