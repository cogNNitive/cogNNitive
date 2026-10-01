# Delta for innfo-console-feedback

## MODIFIED Requirements

### Requirement: Feedback JSON Schema

Export files MUST validate against the feedback schema. `meta` MUST be present and carry `source_knowledge` (the model id), `source_knowledge_version` (`V_x-y-z`), `artifact`, `artifact_version`, `exported_at` (ISO-8601 with seconds), `author`, `feedback_slug`, `viewer`, and MAY carry `source_sha256`. Each `items[]` entry MUST carry `id` (`fb-NNN`), `kind` (`correction`|`comment`|`new`|`delete`), `target` (`element_id`/`concept`/`element`/`field`/`matrix`; `field` MUST be under `target`, never top-level), `original`/`proposed`/`comment` as applicable, and MAY carry `base_hash` (the element `hash` at export time). Items MUST NOT carry `status`, `layer` or `severity`: verdicts and triage live only in the ledger. The schema MUST define only `source_knowledge*`; the aliases `knowledge`, `knowledge_version` and `session_label`, and the `source_model*` names, MUST NOT appear in schema, validators or procedure prose. Filenames MUST match `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`. The schema `$id` is left to the nomenclature rename change.
(Previously: required item `status`, defined alias pairs and `session_label`, carried no `base_hash`, and the live export did not conform.)

#### Scenario: Valid export validates

- GIVEN a console with draft suggestions and identifier `round-2`
- WHEN exported
- THEN the file validates, has `meta`, uses `target.field`, carries `base_hash`, and matches the filename pattern

#### Scenario: Malformed item rejected

- GIVEN an item with `kind: rewrite`
- WHEN validated
- THEN validation fails naming the offending `id`

#### Scenario: Alias or item status rejected

- GIVEN a document using `knowledge` instead of `source_knowledge`, or an item carrying `status`
- WHEN validated
- THEN validation fails

#### Scenario: Ingestion

- GIVEN a console export
- WHEN `nn-trannsform --scan` ingests it
- THEN it is accepted by the aligned validator

#### Scenario: Validators agree

- GIVEN the labeled corpus in `test/fixtures/feedback/{valid,invalid}/`
- WHEN the bundle validator and the `nn-trannsform` validator each classify it
- THEN both agree with every label

### Requirement: Export Modal

The Export modal MUST require a human identifier, slugify it to `feedback_slug`, and offer human-instructions plus agent-prompt tabs. Before download it MUST build the document with `draftToItem` + `buildExportDoc` (meta `source_knowledge` = `modelId`, plus `source_sha256`) and run `validateFeedback`; on failure it MUST block download and list the errors. `buildReviewDoc`, `validateReviewDoc`, `REVIEW_FILENAME_PATTERN` and the `console-review-v1` format MUST NOT exist. Drafts MUST persist in `localStorage` and resume on reopen. Unknown draft fields MUST be ignored.
(Previously: no validation step; export emitted `console-review-v1`.)

#### Scenario: Identifier gate and draft resume

- GIVEN an empty identifier
- WHEN export is attempted
- THEN export is blocked until an identifier is entered
- AND a reloaded modal restores the saved draft

#### Scenario: Invalid document blocks download

- GIVEN a draft that fails `validateFeedback`
- WHEN export is attempted
- THEN no file downloads (`createObjectURL` is not called) and errors are shown

### Requirement: Reconcile Console Feedback Procedure

A single `reconcile_console_feedback` procedure, located at `workspace/procedures/reconcile_console_feedback_NN.md` next to `reconcile_artifact_feedback`, MUST replace both `apply_feedback_NN.md` copies, which MUST be deleted. It MUST read item state through `feedback_items_status`, check `source_knowledge_version` and, when versions match, compare content hash against `meta.sha256`; either mismatch MUST block until the reviewer confirms. It MUST render a diff preview, apply accepted items via `innfo-mcp apply_change`, run `validate_model`, bump the patch version, record verdicts through `record_feedback_verdict`, and run the regenerate step: metrics runs `create_timeline`; every other blueprint runs `compile_model_console`. The Staleness Report MUST be shared. Timestamped copies SHALL be archive-only.
(Previously: two per-blueprint apply procedures, version-only staleness, verdicts marked only in the working copy; named `reconcile_feedback` in the proposal.)

#### Scenario: Happy-path apply

- GIVEN fresh feedback with two `pending` corrections
- WHEN reconciled and approved
- THEN the model patch-bumps, validates, verdicts are ledgered, and the console regenerates

#### Scenario: Stale feedback blocked

- GIVEN feedback pinned to an older `source_knowledge_version`
- WHEN reconciled
- THEN the run blocks with a staleness report until confirmed

#### Scenario: Same version, changed content

- GIVEN matching versions but a differing content hash
- WHEN reconciled
- THEN the run blocks until confirmed

#### Scenario: Failed validation aborts

- GIVEN applied items that break `validate_model`
- WHEN validation runs
- THEN the run aborts with no version bump, no ledger `applied` entries, and no console rewrite

#### Scenario: Single procedure

- GIVEN the blueprint tree
- WHEN scanned for `apply_feedback_NN.md`
- THEN none exists and all references point to `reconcile_console_feedback`

## ADDED Requirements

### Requirement: Normalized Feedback Anchors

`nn-trannsform` MUST normalize each feedback item under the heading `### fb-001` (no kind or status in the heading) followed by a `- **Kind**:` bullet, so a `#fb-001` citation resolves through `resolveHeadingSection`. The heading MUST carry no status.

#### Scenario: Citation resolves

- GIVEN a normalized feedback document
- WHEN `#fb-001` is resolved
- THEN the section is found (before, `### fb-001 (correction, pending)` slugged to `fb-001-correction-pending` and never matched)
