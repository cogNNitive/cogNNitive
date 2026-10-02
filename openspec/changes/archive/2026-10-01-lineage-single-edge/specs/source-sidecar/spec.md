# Source Sidecar (Delta, new capability)

## Purpose

Rule 1: what is cited is a Source. Every citable Source has a normalized `.md` under `sources/nn/` that doubles as the sidecar for the raw file and carries its origin metadata.

## ADDED Requirements

### Requirement: Every citable Source has a normalized sidecar

For every raw file that can be cited (including curated CSVs without a profile `.md`), the workspace MUST contain a normalized `.md` under `sources/nn/` whose frontmatter records `source_file`, `sha256`, `size_bytes`, and `normalized_at`. A Source MUST NOT be registered with null origin metadata.

#### Scenario: Curated CSV receives a sidecar
- GIVEN a curated `sources/import/prices.csv` with no profile `.md`
- WHEN `nn-trannsform` scans and builds the lineage
- THEN `sources/nn/import/prices.md` exists with `source_file`, `sha256`, `size_bytes`, and `normalized_at` set to non-null values
- AND the Source row in the lineage record shows the same `sha256`

#### Scenario: Sidecar sha256 matches raw file
- GIVEN a Source with a sidecar
- WHEN the raw file content changes and the scan reruns
- THEN the sidecar `sha256` is updated and the previous version is archived per `source-versioning-archive`

### Requirement: `is_synthetic` is not stored

The `is_synthetic` frontmatter key and the `is_synthetic::` record field are deleted outright, with no exception and no replacement marker. Synthetic status, where needed, MUST be derived from the Source's `source_file` prefix `sources/export/`. Authorship MUST come from the `## NN Agent Modification` block or `source_type: feedback`. Feedback documents keep `source_type: feedback` (set at `scanner-core.js:661-662`). The sidecar `derived_from` key is deleted likewise.

#### Scenario: Promoted artifact is derived as synthetic
- GIVEN a Source whose `source_file` is `sources/export/Market_Analysis_V_1-0-0.md`
- WHEN a consumer asks whether it is synthetic
- THEN the answer is true, computed from the prefix, with no `is_synthetic` key present in its frontmatter

#### Scenario: Normalizer does not emit `is_synthetic`
- GIVEN a deliverable promoted into `sources/export/`
- WHEN normalization runs
- THEN the sidecar frontmatter contains no `is_synthetic` key

#### Scenario: Citation origin does not use a file-level flag
- GIVEN a citation into a feedback sidecar with `source_type: feedback`
- WHEN the citation is resolved
- THEN `origin` is `reviewer`, independent of any `is_synthetic` value

## MODIFIED Requirements

### Requirement: Synthetic Deliverable Ingestion

When deliverables are promoted from `export/` into `sources/export/` to serve as inputs for secondary models, the pipeline MUST ingest them as Sources with a sidecar:
1. The sidecar in `sources/nn/export/` MUST carry the origin metadata (`source_file`, `sha256`, `size_bytes`, `normalized_at`).
2. The sidecar frontmatter MUST NOT include `is_synthetic` or a `derived_from:` key. The promoted file's upstream lineage is its own `sources:` frontmatter (single edge).
3. The lineage record `# NN Sources` view MUST be produced by the innfo-core projection and MUST NOT contain a stored `is_synthetic::` field.
(Previously: sidecar included `is_synthetic: true` and retained `derived_from:`; the provenance builder recorded `is_synthetic:: true` in `# NN Sources`.)

#### Scenario: Ingestion of a promoted deliverable
- GIVEN `export/Market_Analysis_V_1-0-0.md` with frontmatter `sources: [kNNowledge/Market_Strategy_V_1-0-0_NN.md@## NN Strategy: Positioning]`
- AND it is promoted to `sources/export/Market_Analysis_V_1-0-0.md`
- WHEN normalization and lineage synchronization run
- THEN `sources/nn/export/Market_Analysis_V_1-0-0.md` exists with origin metadata and no `is_synthetic` or `derived_from` key
- AND the record `# NN Sources` entry has no `is_synthetic::` field

### Requirement: Feedback JSON Ingestion

The normalization scanner (`nn-trannsform --scan`) MUST ingest `sources/import/feedback/*.json` conforming to the `innfo-console-feedback` schema into canonical Markdown under `sources/nn/` (mirrored path). Emitted frontmatter MUST include `file:` (origin path) and `source_type: feedback`, and MUST NOT include `is_synthetic`. Normalized feedback MUST be citable via `sources::` per `document-citations`, using Source/Citation/Lineage vocabulary per `provenance-vocabulary`.
(Previously: frontmatter also MUST include `is_synthetic: true`.)

#### Scenario: Feedback scan to sources/nn
- GIVEN `sources/import/feedback/Client_V_0-2-0_round-2_feedback_20260909-120000.json`
- WHEN `nn-trannsform --scan` runs
- THEN `sources/nn/import/feedback/` gains the normalized file with `source_type: feedback`
- AND its items are addressable via `sources::`

#### Scenario: Invalid feedback skipped with report
- GIVEN a feedback JSON failing schema validation
- WHEN the scan runs
- THEN the file is skipped and reported without aborting the run
