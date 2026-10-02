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
5. kNNowledge names without `_V_`, and procedure files to `<verb>_<noun>_procedures_NN.md`, with `procedure_model::` paths updated. The 9 procedures that originate in the frozen `iNNfo/specs/bluepriNNts/workspace/procedures/` keep their names and are skipped and reported.
6. Citations: `sources/nn/<x>.md@...` rewritten to the raw file for markdown, CSV, and JSON sources, and to the co-located sidecar for binary sources.
7. Old local-time stamps `_YYYYMMDD-HHmmss` converted to the contract UTC suffix.
8. A root `.gitattributes` containing `* -text`, preserving existing lines.

The detector MUST add the signal `legacy-layout` to the legacy detection result, so preflight and the editor report it. The planner MUST return `move`, `write`, and `delete` operations plus a `planHash`; `delete` is limited to byte-identical duplicates and retired mirrors, and the rewriter MUST run only with the same `--plan-hash` consent, a backup, and a prior dry run. After applying, the sidecars MUST be written by core `cognitivize` per subject with a normalizer that preserves the old mirror bodies (read from `staging/migration/`, removed afterwards), so existing `@Heading` citations stay valid.

Frozen content (see `nn-naming-contract`) MUST be skipped and reported. The detector and rewriter MUST carry `legacy:cognitivize-in-place/<id>` markers with ledger entries stating a removal condition.

#### Scenario: Dry report
- GIVEN a workspace with `export/`, `sources/nn/`, and `sources/original/`
- WHEN Flow A runs the detector
- THEN it lists every planned move, rename, and citation rewrite and changes nothing

#### Scenario: Rewrite after confirmation
- GIVEN the same workspace and user confirmation
- WHEN the rewriter runs
- THEN the layout is the new one, sidecars are co-located, and `validateWorkspaceSources` reports no `KU_DANGLING_FILE` for migrated citations

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

The rewriter MUST NOT delete any file without explicit user consent. Content with no destination in the new layout (for example `sources/archive/` snapshots) MUST be listed in the report and left in place as inert files, excluded from the family version chain. Citations into such content keep resolving as plain paths. The migration MUST NEVER delete `sources/archive/` content.

#### Scenario: Archive snapshots preserved
- GIVEN `sources/archive/metrics/V1/metrics.md`
- WHEN the rewriter runs
- THEN the file is listed as unmigrated and remains on disk

### Requirement: Citations into `sources/archive/` are reported as warnings

The migration (detector report and rewriter report) MUST scan the domaiNN for citations whose target is under `sources/archive/`, in kNNowledge `sources::` fields, artifact frontmatter `sources:`, console `innfo-model.meta.sources`, and sidecar `sources`. It MUST report each one as a warning with the citing file, the citation, and the target, so a cited historical snapshot is never silent. The warning MUST NOT block the migration and MUST NOT cause the citation to be rewritten.

#### Scenario: Cited archive snapshot is warned about
- GIVEN `kNNowledge/Plan_business_NN.md` citing `sources/archive/metrics/V1/metrics.md@## Totals`
- WHEN the migration detector or rewriter runs
- THEN the report contains a warning naming `kNNowledge/Plan_business_NN.md`, the citation `sources/archive/metrics/V1/metrics.md@## Totals`, and the target `sources/archive/metrics/V1/metrics.md`
- AND the citation is unchanged and still resolves
- AND the snapshot remains on disk

#### Scenario: Uncited archive snapshot produces no citation warning
- GIVEN an archive snapshot that no file cites
- WHEN the migration runs
- THEN it is listed as unmigrated content but no citation warning is emitted for it
