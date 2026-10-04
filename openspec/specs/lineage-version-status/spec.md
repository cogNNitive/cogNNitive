# Lineage Version Status

## Purpose

Versions are write-once family members. `version` is `V<rank>` in the family, `superseded_by` is the path of the next member, and `archive_path` no longer exists. The unmodified requirement "New lineage records reference current spec versions" is not touched by this change.

## Requirements

### Requirement: `# NN Sources` lists every family member with version metadata

`buildProvenanceModel` (the core projection) MUST emit one element per Source file, named by the raw file's basename. Within a family (per `nn-naming-contract`) each element MUST carry `version::` equal to `V<rank>`, where rank is its 1-based position in the family order. Every element except the latest MUST carry `superseded_by::` holding the workspace-relative path of the next member; the latest MUST NOT. An element's `derived_from` MUST be the subject's declared `sources` (or, for a binary subject, the sidecar's `sources`). No element MAY carry `archive_path::`, `status::`, `curated_csv::`, `media_filename::`, or `normalized_content::` pointing at an archive. Pre-existing `sources/archive/` snapshots are not family members and are excluded from the version chain. The section MUST be regenerated idempotently with no duplicate entries.

#### Scenario: Two members of a family
- GIVEN `sources/import/metrics.csv` and `sources/import/metrics_20261002T101500Z.csv`
- WHEN the projection runs
- THEN `# NN Sources` contains `## NN Sources: metrics.csv` with `version:: V1` and `superseded_by:: sources/import/metrics_20261002T101500Z.csv`
- AND `## NN Sources: metrics_20261002T101500Z.csv` with `version:: V2` and no `superseded_by::`

#### Scenario: No archive fields
- GIVEN any workspace
- WHEN the projection runs
- THEN no element contains `archive_path::`

#### Scenario: Idempotent re-run
- GIVEN a record already synced
- WHEN the projection runs again with no filesystem change
- THEN `# NN Sources` is byte-identical

### Requirement: Family members are validated by `--check`

`nn-trannsform --lineage --check` MUST report and exit non-zero for these error-level conditions:
1. a family member on disk with no element in `# NN Sources` (unlisted member);
2. a `superseded_by::` value that resolves to no element or file (dangling pointer);
3. a sidecar `sha256` that differs from the hash of the raw bytes (hash mismatch).

An orphaned sidecar (raw missing) MUST be reported as a warning and not change the exit code.

#### Scenario: Unlisted member is flagged
- GIVEN `sources/import/metrics_20261003T080000Z.csv` on disk and no matching element
- WHEN `--check` runs
- THEN it reports the unlisted member and exits non-zero

#### Scenario: Dangling pointer is flagged
- GIVEN an element with `superseded_by:: sources/import/metrics_20269999T000000Z.csv` and no such file
- WHEN `--check` runs
- THEN it reports the dangling pointer and exits non-zero

#### Scenario: Hash mismatch is flagged
- GIVEN a Source whose raw bytes no longer match its sidecar `sha256`
- WHEN `--check` runs
- THEN it reports the mismatch and exits non-zero

#### Scenario: Orphan sidecar is a warning only
- GIVEN a sidecar whose raw file is missing
- WHEN `--check` runs
- THEN it is reported as a warning and the exit code is unaffected

### Requirement: New lineage records reference current spec versions

`provenance-model.js` MUST point new lineage records at the canonical fused workspace template: `TEMPLATE_URL` MUST reference `.../workspace_V_0-3-0_spec_NN.md` and `TEMPLATE_NAME` MUST be `workspace_V_0-3-0_spec_NN`. New records MUST use the filename suffix `_workspace_NN.md` instead of `_cogNNitive_NN.md`. New records MUST set `model_version: "V_0-2-0"` and MUST reference `iNNfo_V_0-2-1_NN.md` as the specification URL. The `cogNNitive_V_0-2-0_NN.md` template is frozen and legacy: it MUST remain byte-identical and MUST NOT be referenced by newly generated lineage records.

#### Scenario: New record uses canonical workspace URLs and suffix

- GIVEN a project with no lineage record
- WHEN `buildProvenanceModel` runs
- THEN the record's `parent_spec.url` references `workspace_V_0-3-0_spec_NN.md`, `specification_url` references `iNNfo_V_0-2-1_NN.md`, and `model_version` is `V_0-2-0`
- AND the record filename ends in `_workspace_NN.md`

#### Scenario: Write-once templates untouched

- GIVEN the change is applied
- WHEN the git diff of `iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` and `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md` is inspected
- THEN it is empty for both files

### Requirement: Workspace-Conforming Lineage Records Are Excluded from Manifest Reconciliation

Workspace discovery MUST classify a document whose role is `lineage-record` (bluepriNNt `cogNNitive`) or whose bluepriNNt is `workspace` as a non-navigation record through the single contract predicate (`isModelCandidate`, whose non-knowledge bluepriNNt set includes both). The reconciliation helper `isReconcilableModel` keeps only its manifest self-reference check. Such records MUST NOT be navigation candidates and MUST NOT take part in manifest reconciliation.

#### Scenario: Lineage record stays out of manifest reconciliation
- GIVEN `Acme_cogNNitive_NN.md` with `parent_spec` naming `cogNNitive`
- WHEN workspace discovery runs
- THEN it is classified as a lineage record and is not a manifest candidate

#### Scenario: No local regex
- GIVEN `discoverModels.ts`
- WHEN searched for the `cognnitive|workspace` filename regex
- THEN none exists
