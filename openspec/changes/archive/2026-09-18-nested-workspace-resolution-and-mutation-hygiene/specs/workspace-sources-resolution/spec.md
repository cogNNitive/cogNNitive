# Workspace Sources Resolution

## Purpose

Ensure accurate source path resolution in nested workspace layouts and provide actionable, enriched diagnostics for dangling file references.

## Requirements

### Requirement: Dynamic Source Root Resolution for Nested Workspaces

When validating source references in a model located within a nested workspace or subdirectory, the resolver MUST resolve relative source paths (`sources/nn/...` or unqualified paths) against the nearest ancestor directory containing a `sources/` directory, taking the referring model's file path into account. The validator MUST NOT assume that the workspace root is always the top-level repository root when a nested sub-workspace contains its own `sources/` directory.

#### Scenario: Nested model resolves local sub-workspace source
- GIVEN a nested model at `subproject/models/finance_NN.md`
- AND a source file exists at `subproject/sources/nn/budget.md`
- AND the model declares `sources:: budget.md#intro`
- WHEN `validateWorkspaceSources` runs with a disk-backed resolver
- THEN the reference resolves to `subproject/sources/nn/budget.md` without emitting `KU_DANGLING_FILE`

#### Scenario: Nested model falls back to root workspace sources
- GIVEN a nested model at `subproject/models/finance_NN.md`
- AND no `subproject/sources/` directory exists
- AND a root source exists at `sources/nn/shared_policy.md`
- AND the model declares `sources:: shared_policy.md#overview`
- WHEN `validateWorkspaceSources` runs with a disk-backed resolver
- THEN the reference resolves to `sources/nn/shared_policy.md` without emitting `KU_DANGLING_FILE`

### Requirement: Enriched KU_DANGLING_FILE Diagnostics

When a referenced source file cannot be resolved, the diagnostic emitter MUST inspect the target file path and distinguish between a missing parent directory and a missing file within an existing directory. If the parent directory exists, the emitter SHOULD perform fuzzy matching (e.g. Levenshtein distance) against existing files in that directory and include a "did you mean" suggestion in the diagnostic message.

#### Scenario: Dangling source with missing parent directory
- GIVEN a model element citing `sources:: missing_folder/report.md#summary`
- AND the directory `sources/nn/missing_folder` does not exist
- WHEN `validateWorkspaceSources` runs
- THEN a `KU_DANGLING_FILE` error diagnostic is reported
- AND the diagnostic message indicates that the parent directory does not exist

#### Scenario: Dangling source with fuzzy match suggestion
- GIVEN a model element citing `sources:: annual_repots.md#intro`
- AND the file `sources/nn/annual_reports.md` exists in `sources/nn/`
- WHEN `validateWorkspaceSources` runs
- THEN a `KU_DANGLING_FILE` error diagnostic is reported
- AND the diagnostic message includes a suggestion recommending `annual_reports.md`
