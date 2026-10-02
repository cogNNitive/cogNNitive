# Workspace Sources Resolution (Delta)

## Purpose

Citation paths are workspace-relative. There is no implicit `sources/nn/` default prefix; nested workspaces resolve against the nearest ancestor that contains `sources/`.

## MODIFIED Requirements

### Requirement: Dynamic Source Root Resolution for Nested Workspaces

When validating a citation in a document inside a nested workspace, the resolver MUST resolve the workspace-relative path against the nearest ancestor directory of the referring document that contains a `sources/` directory, falling back to the enclosing workspace root. A citation path MUST be written in full from that root; the resolver MUST NOT add a default prefix.
(Previously: unqualified paths resolved under `sources/nn/`.)

#### Scenario: Nested document resolves a local sub-workspace source
- GIVEN `subproject/kNNowledge/Finance_business_NN.md` declaring `sources:: sources/import/budget.md@## Intro`
- AND the file `subproject/sources/import/budget.md` exists with that heading
- WHEN `validateWorkspaceSources` runs with a disk-backed resolver
- THEN the citation resolves to `subproject/sources/import/budget.md` without `KU_DANGLING_FILE`

#### Scenario: Nested document falls back to the root workspace
- GIVEN `subproject/kNNowledge/Finance_business_NN.md` with no `subproject/sources/` directory
- AND `sources/import/shared_policy.md` at the root
- AND the document declares `sources:: sources/import/shared_policy.md@## Overview`
- WHEN `validateWorkspaceSources` runs
- THEN the citation resolves to the root file without `KU_DANGLING_FILE`

#### Scenario: No implicit prefix
- GIVEN a citation `budget.md@## Intro` and a file `sources/import/budget.md`
- WHEN `validateWorkspaceSources` runs
- THEN `KU_DANGLING_FILE` is reported because `budget.md` does not exist at the workspace root

### Requirement: Enriched KU_DANGLING_FILE Diagnostics

When a cited file cannot be resolved, the diagnostic MUST distinguish a missing parent directory from a missing file within an existing directory. When the parent exists, the diagnostic SHOULD include a fuzzy "did you mean" suggestion drawn from that directory, excluding sidecar files. When the path begins with a removed prefix (`sources/nn/`, `sources/original/`, `sources/export/`, `sources/archive/`, `export/`, `models/`) the diagnostic MUST say the prefix was removed.
(Previously: suggestions drawn from `sources/nn/`; no removed-prefix message.)

#### Scenario: Missing parent directory
- GIVEN a citation `sources/import/missing_folder/report.md@## Summary` and no `sources/import/missing_folder`
- WHEN validation runs
- THEN a `KU_DANGLING_FILE` error states that the parent directory does not exist

#### Scenario: Fuzzy match suggestion
- GIVEN a citation `sources/import/annual_repots.md@## Intro` and an existing `sources/import/annual_reports.md`
- WHEN validation runs
- THEN the diagnostic suggests `annual_reports.md`

#### Scenario: Removed prefix
- GIVEN a citation `sources/nn/report.md@## Intro`
- WHEN validation runs
- THEN an error states that `sources/nn/` was removed
