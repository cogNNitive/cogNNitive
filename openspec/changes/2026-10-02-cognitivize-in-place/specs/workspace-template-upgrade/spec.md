# Workspace Template Upgrade (Delta)

## Purpose

nn-upgrade Flow A gains a layout-and-naming migration, following the `models/` to `kNNowledge/` pattern. The detector reports; the rewriter applies with consent. Runtime code never resolves old layouts.

## ADDED Requirements

### Requirement: Layout and naming migration

Flow A MUST detect and, after user confirmation, rewrite non-frozen workspaces from the old layout and names to the new ones:
1. `export/` content to `artifacts/`, and path references to it.
2. `sources/original/` content to `sources/import/`.
3. `sources/nn/` mirrored sidecars to co-located sidecars (`<file>.<ext>_sidecar_NN.md`), carrying the normalized body only for binary sources.
4. `sources/export/` content to `artifacts/` (a byte-identical file already in `artifacts/` MUST NOT be duplicated).
5. kNNowledge names without `_V_`, and procedure files to `<verb>_<noun>_procedures_NN.md`, with `procedure_model::` paths updated.
6. Citations: `sources/nn/<x>.md@...` rewritten to the raw file for markdown, CSV, and JSON sources, and to the co-located sidecar for binary sources.

Frozen content (see `nn-naming-contract`) MUST be skipped and reported. The detector and rewriter MUST carry `legacy:cognitivize-in-place/<id>` markers with ledger entries stating a removal condition.

#### Scenario: Dry report
- GIVEN a workspace with `export/`, `sources/nn/`, and `sources/original/`
- WHEN Flow A runs the detector
- THEN it lists every planned move, rename, and citation rewrite and changes nothing

#### Scenario: Rewrite after confirmation
- GIVEN the same workspace and user confirmation
- WHEN the rewriter runs
- THEN the layout is the new one, sidecars are co-located, and `validateWorkspaceSources` reports no removed-prefix diagnostics

#### Scenario: Idempotent
- GIVEN an already migrated workspace
- WHEN Flow A runs
- THEN no change is proposed

#### Scenario: Frozen content skipped
- GIVEN a frozen sample workspace
- WHEN Flow A runs
- THEN it is reported as skipped and left unchanged

#### Scenario: Fixtures renamed with the tool
- GIVEN test fixtures in the old layout
- WHEN the rewriter is applied to them
- THEN the result satisfies the invariant check

### Requirement: Migration never deletes user data

The rewriter MUST NOT delete any file without explicit user consent. Content with no destination in the new layout (for example `sources/archive/` snapshots) MUST be listed in the report and left in place until the user decides.

#### Scenario: Archive snapshots preserved
- GIVEN `sources/archive/metrics/V1/metrics.md`
- WHEN the rewriter runs
- THEN the file is listed as unmigrated and remains on disk
