# Workspace Template Upgrade Flow

## Purpose

Give workspaces a safe, consent-gated path to adopt newer canonical template versions. A committed, generator-produced Level-2 template catalog (`iNNfo/specs/bluepriNNts/catalog.json`) records every published template version and the `adopted` (highest) version; the preflight runner performs a non-mutating Tier-3 scan classifying each Level-3 model as `current` / `upgrade-available` / `ahead` / `unlisted`; and a dedicated `nn-upgrade` skill owns the detect → consent → backup → impact analysis → migrate → confirm flow, asking mapping questions only on real schema impact and never targeting local specialization templates.

## Requirements

### Requirement: Template Catalog Artifact

A Level-2 template catalog MUST exist as a committed, machine-readable JSON file at
`iNNfo/specs/bluepriNNts/catalog.json`. For every canonical template discovered in the
`iNNfo/specs/bluepriNNts/` tree, the catalog MUST record:

- `name` — the canonical template name (e.g. `business`, `workspace`, `documentation`).
- `versions` — the published immutable versions found on disk, each with its
  `template_version` and the exact `spec_url` used to pin a model to it.
- `adopted` — the published version with the highest `template_version`; this is the
  version a workspace upgrade targets.

The catalog MUST be produced by a deterministic generator
(`scripts/template-catalog.mjs`). The generator MUST exit non-zero with a drift report
when invoked with `--check` and the committed `catalog.json` is stale, so the artifact
cannot silently rot. The catalog MUST NOT include local/specialization templates that are
not canonical (they are never an upgrade target).

#### Scenario: Generator produces and validates the catalog
- GIVEN the canonical templates `business_V_0-2-0`, `business_V_0-1-0` in the specs tree
- WHEN `scripts/template-catalog.mjs` runs without `--check`
- THEN it writes `catalog.json` where `business.versions` contains both versions
- AND `business.adopted == "V_0-2-0"`

#### Scenario: Drift is detected
- GIVEN a committed `catalog.json` that is missing a newly added template version
- WHEN `scripts/template-catalog.mjs --check` runs
- THEN it exits non-zero and reports the stale entries

### Requirement: Tier-3 Upgrade Detection Scan

The preflight runner MUST detect template upgrades for a workspace without mutating it.
When `preflight-check.js` is invoked with `--workspace-dir`, it SHALL:

1. Discover all Level-3 models in the workspace (from `models/` and the workspace root).
2. Read each model's `parent_spec.url` (or `spec_url`).
3. Match the template basename against the committed catalog.
4. Classify the model against the catalog's `adopted` version:

   - `current` — the model's template version equals the catalog `adopted` version.
   - `upgrade-available` — a newer published version exists and is the `adopted` version;
     the bump gap (`major` / `minor` / `patch` per `defiNNe` §7) MUST be reported.
   - `ahead` — the model is pinned to a published version newer than the catalog
     `adopted` version.
   - `unlisted` — the template is not in the catalog (e.g. a local specialization).

The detection scan MUST be non-mutating and MUST NOT flip the preflight exit code to a
blocker. An available upgrade SHALL be reported as an informational/actionable item, not
a blocker. If the catalog cannot be resolved, the scan MUST degrade to an `offline`
notice rather than fail the run.

#### Scenario: Model is current
- GIVEN a workspace model pinned to the catalog `adopted` version of `business`
- WHEN the Tier-3 scan runs
- THEN the model is classified `current`
- AND no upgrade is offered

#### Scenario: Model has an upgrade available
- GIVEN a workspace model pinned to `business_V_0-1-0`
- AND the catalog `adopted` version of `business` is `V_0-2-0`
- WHEN the Tier-3 scan runs
- THEN the model is classified `upgrade-available`
- AND the gap is reported as `minor`
- AND the preflight exit code stays `0`

#### Scenario: Catalog is offline
- GIVEN a workspace whose catalog cannot be resolved
- WHEN the Tier-3 scan runs
- THEN the scan reports an `offline` notice
- AND does not classify models as upgrade-available or current

### Requirement: nn-upgrade Guided Migration Skill

A new skill `nn-upgrade` MUST own the consent-gated migration flow. The flow MUST, in
order:

1. **Detect** — run the Tier-3 upgrade scan and present the per-model classification.
2. **Inform & consent** — present `[a] (Recommended) Upgrade / [b] Continue` before any
   mutation. Consent is mandatory; no file is written without it.
3. **Backup** — create a timestamped backup **outside** the workspace (a sibling backup
   directory or a zip archive). The backup MUST include `kNNowledge/`, `specs/`,
   `sources/import/` (and `sources/conversations/`), `procedures/`, and `domaiNN_NN.md`. A manual-backup fallback instruction
   MUST be shown when the automated backup is unavailable.
4. **Impact analysis** — for each model to migrate, compare the pinned template against
   the adopted template. Mapping questions MUST be asked **only** when the schema diff
   removes, renames, or re-types a Concept/Field/Matrix/Marker that the model actually
   uses. No mapping question MAY be asked for additive or unchanged definitions.
5. **Migrate** — hydrate the adopted template package into the workspace (write-once,
   leaving the pinned frozen template intact), repoint the model's `parent_spec` to the
   adopted version, apply the agreed mappings, and re-validate every migrated model
   through `innfo-mcp`.
6. **Confirm** — present a before/after report (version, gap, mapping decisions, and
   validation outcome) and close the flow.

The skill MUST NOT touch local specialization templates as migration targets; it MUST
report them `unlisted` and direct them to the documented backlog guidance.

#### Scenario: Consent before any mutation
- GIVEN a model classified `upgrade-available`
- WHEN the user runs the `nn-upgrade` flow
- THEN the skill presents `[a] Upgrade / [b] Continue`
- AND no workspace file is written until the user chooses `[a]`

#### Scenario: Backup precedes migration
- GIVEN a user choosing to upgrade
- WHEN the migration phase begins
- THEN a timestamped backup outside the workspace is created
- AND every migrated model is re-validated before the flow reports success

#### Scenario: Mapping question is only asked on real impact
- GIVEN a pinned template `V_0-1-0` where the adopted template `V_0-2-0` only **adds** a
  new optional Field
- WHEN the migration runs for a model using no removed/renamed/re-typed definition
- THEN no mapping question is asked
- AND the model is repointed and re-validated

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
