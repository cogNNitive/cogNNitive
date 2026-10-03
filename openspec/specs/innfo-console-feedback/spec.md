# innfo-console-feedback Specification

## Purpose

Reviewer-to-model loop: console reviewers export structured feedback JSON; an agent-reviewed Reconcile Feedback procedure carries accepted items back into the source model with staleness protection and patch-bump versioning.

## Requirements

### Requirement: Feedback JSON Schema

Export files MUST validate against the feedback schema. `meta` MUST carry `source_knowledge`, `source_knowledge_version` (`V_x-y-z`), `artifact`, `artifact_version`, `exported_at` (ISO-8601 with seconds), `author`, `feedback_slug` and `viewer`, and MAY carry `source_sha256`. Each `items[]` entry MUST carry `id` (`fb-NNN`), `kind` (`correction`|`comment`|`new`|`delete`) and `target` (`element_id`/`concept`/`element`/`field`/`matrix`; `field` MUST be under `target`, never top-level), with `original`/`proposed`/`comment` as applicable, and MAY carry `base_hash` (`^[0-9a-f]{16}$`, the element `hash` at export time); `base_hash` is optional in the schema and all three validators, but every item of a console export MUST carry it (enforced where the console builds items, `draftToItem`/`buildExportDoc`, not by the validators, so hand-written and `nn-trannsform` documents stay valid). Items MUST NOT carry `status`, `layer`, `severity`, `target_hash` or `stale`. The schema MUST define only `source_knowledge*`. Because the schema keeps `additionalProperties: true`, it MUST forbid the rejected names as explicit `false` properties: in `meta`, `knowledge`, `knowledge_version`, `session_label` and `source_model*`; on items, `status`, `layer`, `severity`, `target_hash`, `stale` and a top-level `field`. No validator or procedure prose may accept or mention those names as valid. Filenames MUST match `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`.
(Previously: `source_model*` names, `session_label` alias and required item `status`; the live export did not conform; no `base_hash`.)

#### Scenario: Valid export validates

- GIVEN a console with draft suggestions and identifier `round-2`
- WHEN exported
- THEN the file validates, has `meta`, uses `target.field`, carries `base_hash`, and matches the filename pattern

#### Scenario: Malformed item rejected

- GIVEN an item with `kind: rewrite`
- WHEN validated
- THEN validation fails naming the offending `id`

#### Scenario: Alias or item status rejected

- GIVEN a document using `knowledge`, `session_label`, or an item carrying `status`
- WHEN validated
- THEN validation fails

#### Scenario: Three validators agree

- GIVEN one labeled corpus `test/fixtures/feedback/{valid,invalid}/` of feedback documents (alias, item `status`, top-level `field`, `kind: rewrite`, valid with `target.field` and `base_hash`, valid without `base_hash`)
- WHEN the schema (checked with `ajv@^8`, an explicit root devDependency), the bundle `validateFeedback` and the `nn-trannsform` `validateFeedbackJson` each classify it
- THEN all three agree with every label

#### Scenario: Console export requires base_hash

- GIVEN a draft without a recorded `base_hash`
- WHEN the console builds the export document
- THEN the build fails with an error naming the draft, while a document without `base_hash` still passes the schema

#### Scenario: Ingestion

- GIVEN a real console export
- WHEN `nn-trannsform --scan` ingests it
- THEN it is accepted

### Requirement: Export Modal

The Export modal MUST require a human identifier, slugify it to `feedback_slug`, and offer human-instructions plus agent-prompt tabs. Before download it MUST build the document with `buildExportDoc` and run `validateFeedback`; on failure it MUST list the errors and MUST NOT download. `buildReviewDoc`, `validateReviewDoc` and the `console-review-v1` format MUST NOT exist. The reviewer-editable status `<select>` and `updateDraftStatus` MUST NOT exist. Drafts MUST persist in `localStorage` and resume on reopen; unknown draft fields MUST be ignored.
(Previously: export went through `buildReviewDoc` with no validation, and a reviewer status `<select>` edited item status.)

#### Scenario: Identifier gate and draft resume

- GIVEN an empty identifier
- WHEN export is attempted
- THEN export is blocked until an identifier is entered
- AND a reloaded modal restores the saved draft

#### Scenario: Invalid document blocks download

- GIVEN a draft that fails `validateFeedback`
- WHEN export is attempted
- THEN `createObjectURL` is not called and the errors are listed

#### Scenario: No reviewer verdict control

- GIVEN a rendered draft list
- WHEN scanned for `.innfo-review-status-select`
- THEN none exists

### Requirement: Reconcile Feedback Procedure

`workspace/procedures/reconcile_feedback_NN.md` MUST be the single procedure for console feedback; both `{business,metrics}/procedures/apply_feedback_NN.md` MUST be deleted. It MUST check `source_knowledge_version`, then check content staleness by comparing `meta.source_sha256` to the current model hash and each item's `base_hash` to the current element hash; any mismatch MUST block until the reviewer confirms. The staleness check MUST run before any item is applied, through `evaluate_feedback_items`. It MUST render a diff preview, apply accepted items via `apply_change`, run `validate_model`, bump the patch version, record verdicts through `record_feedback_verdict` (passing `confirm_stale: true` only for items the reviewer confirmed) into `<domaiNN root>/feedback-ledger.jsonl`, and regenerate the console (metrics via `create_timeline`, others via `compile_model_console`). It MUST NOT reference `sources/import/feedback/ledger.jsonl`.
(Previously: `apply_feedback`, version-only staleness, no ledger; as built, `reconcile_feedback_NN.md` compared versions only and wrote the ledger under `sources/import/feedback/`.)

#### Scenario: Happy-path apply

- GIVEN fresh feedback with two `pending` corrections
- WHEN reconciled and approved
- THEN the model patch-bumps, validates, two verdicts are ledgered at the domaiNN root, and the console regenerates

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

### Requirement: Normalized Feedback Anchors

`nn-trannsform` MUST normalize each feedback item under the heading `### fb-001` (no kind or status in the heading) followed by a `- **Kind**:` bullet, so `#fb-001` citations resolve. `SKILL.md`, `reviewer-guide.md` and `templates.md` MUST describe this format and MUST NOT mention `console-review-v1`.

#### Scenario: Citation resolves

- GIVEN a normalized feedback document
- WHEN `#fb-001` is resolved by heading
- THEN the section is found (before, `### fb-001 (correction, pending)` slugged to `fb-001-correction-pending`)
