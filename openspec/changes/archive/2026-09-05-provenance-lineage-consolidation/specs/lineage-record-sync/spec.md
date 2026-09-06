# Spec: Lineage Record Filesystem Sync

## ADDED Requirements

### Requirement: All four lineage sections sync from the filesystem

`buildProvenanceModel` MUST populate `# NN Sources`, `# NN Models`, and
`# NN Artifacts` from the current state of `sources/nn/`, `models/`, and
`artifacts/` respectively, on every run (`--scan`, `--import-url`, `--provenance`
/ `--lineage`). `# NN Sources`, `# NN Models`, and `# NN Artifacts` use
idempotent replace: re-running regenerates them from disk with no duplicate
entries.

#### Scenario: Model file produces a lineage entry

- GIVEN `models/Business_Plan_V_1-0-0_NN.md` with `title: "Business Plan"` and an
  element carrying `sources:: interview.md#clients`
- WHEN `buildProvenanceModel` runs
- THEN `# NN Models` contains `## NN Models: Business Plan` with
  `model_ref:: models/Business_Plan_V_1-0-0_NN.md` and
  `derived_from:: [interview.md#clients]`

#### Scenario: Artifact file produces a lineage entry

- GIVEN `artifacts/Executive_Summary_V_1-0-0.md` whose frontmatter references
  model `Business Plan` version `V_1-0-0`
- WHEN `buildProvenanceModel` runs
- THEN `# NN Artifacts` contains `## NN Artifacts: Executive_Summary_V_1-0-0`
  with `derived_from::` naming that model

#### Scenario: Idempotent re-run

- GIVEN a lineage record already synced
- WHEN `buildProvenanceModel` runs again with no filesystem change
- THEN `# NN Sources`, `# NN Models`, and `# NN Artifacts` are byte-identical to
  the previous run

#### Scenario: Removed model drops out

- GIVEN a lineage record with `## NN Models: Old Model`
- AND `models/Old_Model_*_NN.md` has been deleted
- WHEN `buildProvenanceModel` runs
- THEN `# NN Models` no longer contains `## NN Models: Old Model`

### Requirement: Procedure runs are appended, never replaced

`# NN Procedures` MUST use append semantics. Each pipeline operation
(`--scan`, `--import-url`, `--apply`, `--lineage`) MUST append one
`## NN Procedures:` entry recording `command`, `flags`, `run_at` (ISO 8601),
`inputs`, and `outputs`. A refresh of the other three sections MUST NOT remove
existing `# NN Procedures` entries.

#### Scenario: Scan appends a procedure entry

- GIVEN a lineage record with one existing procedure entry
- WHEN `node scripts/index.js --scan` runs
- THEN `# NN Procedures` has two entries, the new one recording `command:: scan`
  and a `run_at` timestamp

#### Scenario: Section refresh preserves procedure history

- GIVEN a lineage record with three `## NN Procedures:` entries
- WHEN `buildProvenanceModel` refreshes `# NN Sources` / `# NN Models` / `# NN Artifacts`
- THEN all three `## NN Procedures:` entries remain

### Requirement: Drift check

`node scripts/index.js --check` MUST report lineage/filesystem drift and exit
non-zero when any `error`-level drift exists.

#### Scenario: Model without lineage entry

- GIVEN `models/New_Model_V_0-1-0_NN.md` exists
- AND the lineage record has no `## NN Models:` entry for it
- WHEN `--check` runs
- THEN it reports the missing entry and exits non-zero

#### Scenario: Artifact citing an absent model version

- GIVEN `# NN Artifacts` entry `derived_from:: [Business Plan V_2-0-0]`
- AND no model `Business Plan` at version `V_2-0-0` exists in `models/`
- WHEN `--check` runs
- THEN it reports the stale reference and exits non-zero

#### Scenario: Clean workspace

- GIVEN a workspace whose lineage record matches the filesystem
- WHEN `--check` runs
- THEN it reports no drift and exits zero
