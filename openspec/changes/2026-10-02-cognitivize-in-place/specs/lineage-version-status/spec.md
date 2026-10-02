# Lineage Version Status (Delta)

## Purpose

Versions are write-once family members. `version` is the rank in the family, `superseded_by` names the next member, and `archive_path` no longer exists. The unmodified requirement "New lineage records reference current spec versions" is not touched by this change.

## RENAMED Requirements

- FROM: `### Requirement: `# NN Sources` lists active and archived versions with version metadata`
- TO: `### Requirement: `# NN Sources` lists every family member with version metadata`

- FROM: `### Requirement: Archived elements are validated by `--check``
- TO: `### Requirement: Family members are validated by `--check``

## MODIFIED Requirements

### Requirement: `# NN Sources` lists every family member with version metadata

`buildProvenanceModel` (the core projection) MUST emit one element per Source file, named by the raw file's basename. Within a family (per `nn-naming-contract`) each element MUST carry `version::` equal to its 1-based rank in the family order. Every element except the latest MUST carry `superseded_by::` naming the next member's element; the latest MUST NOT. No element MAY carry `archive_path::`, `status:: archived`, or `normalized_content::` pointing at an archive. The section MUST be regenerated idempotently with no duplicate entries.
(Previously: active and archived elements collected from `sources/archive/`, with `archive_path::`, `status:: archived`, and `normalized_content::`.)

#### Scenario: Two members of a family
- GIVEN `sources/import/metrics.csv` and `sources/import/metrics_20261002T101500Z.csv`
- WHEN the projection runs
- THEN `# NN Sources` contains `## NN Sources: metrics.csv` with `version:: 1` and `superseded_by:: metrics_20261002T101500Z.csv`
- AND `## NN Sources: metrics_20261002T101500Z.csv` with `version:: 2` and no `superseded_by::`

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
(Previously: the checks targeted `sources/archive/` snapshots, `archive_path::`, and archive snapshot hashes.)

#### Scenario: Unlisted member is flagged
- GIVEN `sources/import/metrics_20261003T080000Z.csv` on disk and no matching element
- WHEN `--check` runs
- THEN it reports the unlisted member and exits non-zero

#### Scenario: Dangling pointer is flagged
- GIVEN an element with `superseded_by:: metrics_20269999T000000Z.csv` and no such file
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

### Requirement: Workspace-Conforming Lineage Records Are Excluded from Manifest Reconciliation

Workspace discovery MUST classify a document whose role is `lineage-record` (bluepriNNt `cogNNitive`) or whose bluepriNNt is `workspace` as a non-navigation record through the single contract predicate. Such records MUST NOT be navigation candidates and MUST NOT take part in manifest reconciliation.
(Previously: matched by the regex `/^(cognnitive|workspace)(_|$)/i` inside `discoverModels.ts`.)

#### Scenario: Lineage record stays out of manifest reconciliation
- GIVEN `Acme_cogNNitive_NN.md` with `parent_spec` naming `cogNNitive`
- WHEN workspace discovery runs
- THEN it is classified as a lineage record and is not a manifest candidate

#### Scenario: No local regex
- GIVEN `discoverModels.ts`
- WHEN searched for the `cognnitive|workspace` filename regex
- THEN none exists
