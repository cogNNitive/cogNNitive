# Source Sidecar (Delta against the base-change capability)

Note: `source-sidecar` is introduced by the in-flight change `2026-10-01-lineage-single-edge`. Treat that change's delta as the current text; this delta supersedes it once the base change is archived.

## Purpose

The sidecar moves next to its raw file and gets a contract name. It carries origin metadata for every Source; only binary sources carry a normalized body.

## MODIFIED Requirements

### Requirement: Every citable Source has a normalized sidecar

For every raw file that can be cited (any file that has been cognitivized, including curated CSVs), a co-located `<file>.<ext>_sidecar_NN.md` MUST exist whose frontmatter records non-null `source_file`, `sha256`, `size_bytes`, and `normalized_at`. A Source MUST NOT be registered with null origin metadata. The sidecar's body MUST be present only for binary sources.
(Previously: the sidecar was a normalized `.md` under `sources/nn/` mirroring the raw path.)

#### Scenario: Curated CSV receives a sidecar
- GIVEN a curated `artifacts/prices_20261002T101500Z.csv` that is cognitivized
- WHEN the lineage is built
- THEN `artifacts/prices_20261002T101500Z.csv_sidecar_NN.md` exists with all four fields non-null
- AND the Source row in the lineage record shows the same `sha256`

#### Scenario: Sidecar sha256 matches raw file
- GIVEN a Source with a sidecar
- WHEN the raw bytes change and `cognitivize` runs
- THEN the sidecar `sha256` is updated to the new bytes
- AND no archive snapshot is created

### Requirement: `is_synthetic` is not stored

The `is_synthetic` frontmatter key, the `is_synthetic::` record field, and the sidecar `derived_from` key MUST NOT exist. Authorship, where needed, MUST come from the `## NN Agent Modification` block or `source_type: feedback`; it MUST NOT be derived from a folder prefix. Feedback sidecars keep `source_type: feedback`.
(Previously: synthetic status was derived from the `sources/export/` prefix.)

#### Scenario: Sidecar has no synthetic key
- GIVEN a cognitivized artifact
- WHEN its sidecar is written
- THEN the frontmatter contains no `is_synthetic` and no `derived_from` key

#### Scenario: Citation origin does not use a file-level flag
- GIVEN a citation into a feedback source with `source_type: feedback`
- WHEN the citation is resolved
- THEN `origin` is `reviewer`, independent of any `is_synthetic` value

## REMOVED Requirements

### Requirement: Synthetic Deliverable Ingestion
(Reason: no promotion step exists; an artifact is cognitivized in place.)
(Migration: see `source-normalization-pipeline`.)

### Requirement: Feedback JSON Ingestion
(Reason: restated under `source-normalization-pipeline`, where the requirement lives in the living spec; feedback JSON is now cognitivized in place instead of converted under `sources/nn/`.)
(Migration: none.)
