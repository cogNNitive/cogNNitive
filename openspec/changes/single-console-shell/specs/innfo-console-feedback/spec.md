# Delta for innfo-console-feedback

## ADDED Requirements

### Requirement: Feedback export reads per-model state from meta.models

The feedback export `meta.source_sha256` MUST be the `sha256` of the `meta.models` entry for the model named by `source_knowledge`, in whole-domaiNN and scoped consoles alike. When no such entry exists, `source_sha256` MUST be omitted rather than invented.

#### Scenario: Scoped export carries the model hash
- GIVEN a console scoped to model A whose `meta.models[0].sha256` is `H`
- WHEN a feedback export is built
- THEN `meta.source_sha256` equals `H`

#### Scenario: No matching entry
- GIVEN a `source_knowledge` that matches no `meta.models` entry
- WHEN a feedback export is built
- THEN `meta.source_sha256` is absent and the file still validates

## MODIFIED Requirements

### Requirement: Reconcile Feedback Procedure

`workspace/procedures/reconcile_feedback_NN.md` MUST be the single procedure for console feedback; both `{business,metrics}/procedures/apply_feedback_NN.md` MUST be deleted. It MUST check `source_knowledge_version`, then check content staleness by comparing `meta.source_sha256` to the current model hash and each item's `base_hash` to the current element hash; any mismatch MUST block until the reviewer confirms. The staleness check MUST run before any item is applied, through `evaluate_feedback_items`. It MUST render a diff preview, apply accepted items via `apply_change`, run `validate_model`, bump the patch version, record verdicts through `record_feedback_verdict` (passing `confirm_stale: true` only for items the reviewer confirmed) into `<domaiNN root>/feedback-ledger.jsonl`, and regenerate the console through `scripts/export-console.mjs`, as a console scoped to the reconciled model. It MUST NOT reference `sources/import/feedback/ledger.jsonl`, `compile_model_console` or `build_console_payload`.
(Previously: regeneration named `create_timeline` for metrics and `compile_model_console` for the others.)

#### Scenario: Happy-path apply

- GIVEN fresh feedback with two `pending` corrections
- WHEN reconciled and approved
- THEN the model patch-bumps, validates, two verdicts are ledgered at the domaiNN root, and the console regenerates as a scoped console for that model

#### Scenario: Same version, changed element

- GIVEN matching versions but an item whose `base_hash` differs from the current element hash
- WHEN reconciled
- THEN the run blocks until the reviewer confirms, and an unconfirmed apply is refused

#### Scenario: Failed validation aborts

- GIVEN applied items that break `validate_model`
- WHEN validation runs
- THEN the run aborts with no version bump, no `applied` ledger entries and no console rewrite

#### Scenario: Single procedure, no live references

- GIVEN the repository
- WHEN searched for `apply_feedback` outside `openspec/changes/archive/` and historical test fixtures
- THEN there are zero hits (including `create_timeline_NN.md`, `nn-trannsform` SKILL.md, docs, and the live `metrics-console-feedback` test)

#### Scenario: No removed tool or procedure referenced

- GIVEN `reconcile_feedback_NN.md`
- WHEN searched for `compile_model_console` and `build_console_payload`
- THEN there are zero hits
