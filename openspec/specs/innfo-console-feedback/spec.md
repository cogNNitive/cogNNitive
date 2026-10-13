# innfo-console-feedback Specification

## Purpose

Reviewer-to-model loop: console reviewers export structured feedback JSON; an agent-reviewed Reconcile Feedback procedure carries accepted items back into the source model with staleness protection and patch-bump versioning.
## Requirements
### Requirement: Feedback JSON Schema

Export files MUST validate against the feedback schema. `meta` MUST carry `source_knowledge`, `source_knowledge_version` (`V_x-y-z`), `artifact`, `artifact_version`, `exported_at` (ISO-8601 with seconds), `author`, `feedback_slug` and `viewer`, and MAY carry `source_sha256`. Each `items[]` entry MUST carry `id` (`fb-NNN`), `kind` (`correction`|`comment`|`new`|`delete`) and `target` (`element_id`/`concept`/`element`/`field`/`matrix`; `field` MUST be under `target`, never top-level), with `original`/`proposed`/`comment` as applicable. Items MUST NOT carry `status`, `layer` or `severity`. Console-exported items MUST carry `base_hash` (the element `hash` the draft was made against); an item anchored to a field row MUST carry `target.field`, and one anchored to a card MUST omit it. The names `knowledge`, `knowledge_version`, `session_label` and `source_model*` MUST NOT appear. Filenames MUST match `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`, where `{PrimaryModel}` is the model slug: `meta.model_slug` when present, else the slugified model identifier, else the slugified title. When the slug would contain no Latin alphanumerics, it MUST be `model-<8 hex>` derived deterministically from the title. `{PrimaryModel}` MUST match `^[A-Za-z0-9-]+$` and MUST NOT be the human title.
(Previously: the console passed the human title to the filename builder, which rejected titles with spaces, so export failed.)

#### Scenario: Valid export validates
- GIVEN a console with draft suggestions and identifier `round-2`
- WHEN exported
- THEN the file validates, uses `target.field` where applicable, carries `base_hash`, and matches the filename pattern

#### Scenario: Malformed item rejected
- GIVEN an item with `kind: rewrite`
- WHEN validated
- THEN validation fails naming the offending `id`

#### Scenario: Field anchor exports target.field
- GIVEN a correction drafted on field `owner` of element `e1`
- WHEN exported
- THEN the item has `target.field: "owner"` and no top-level `field`

#### Scenario: Exported items carry no status
- GIVEN any draft created in the console
- WHEN exported
- THEN the item has no `status` key and carries `base_hash`

#### Scenario: Filename from slug, not title
- GIVEN a model titled `Acme Pricing Model` with `meta.model_slug` `acme-pricing`
- WHEN exported
- THEN the filename starts with `acme-pricing_V_` and the download succeeds

#### Scenario: Non-Latin title falls back to a hashed slug
- GIVEN two models with different non-Latin titles and no slug
- WHEN each is exported
- THEN each filename starts with a distinct `model-<8 hex>` and matches `^[A-Za-z0-9-]+$`

### Requirement: Export Modal

The Export modal MUST extend the feedback modal injected by change A (`innfo-feedback-*` ids; the procedure stepper's `#innfo-export-modal` MUST NOT be reused). It MUST be a preview listing every item (kind, target, text) via the kit `DraftList`, and MUST run `validateFeedback` live on the document built by `buildExportDoc`, blocking download and copy while invalid and naming offending item ids. It MUST require a human reviewer identifier, slugify it to `feedback_slug`, and offer download, copy-to-clipboard (bytes identical to the download), and human-instructions plus agent-prompt tabs. When `navigator.clipboard` is unavailable (e.g. `file://`), copy MUST fall back to a mechanism that works offline (selecting the preview text for manual copy, or `document.execCommand('copy')`) and MUST report success or failure to the user. Drafts MUST persist in `localStorage` under the single key `innfo-console:v2:<meta.modelId>` (not title and version), each anchored by `element_id` plus `base_hash`, so they survive version rebumps. A draft whose element is missing or whose current hash differs MUST be flagged "target changed" and MUST remain exportable. Drafts under the old title+version key MUST be neither read nor migrated. Unknown draft fields MUST be ignored. Exported items MUST NOT carry `status`, and no reviewer verdict control may exist.
(Previously, after A: validate-then-download without preview or copy; drafts keyed by model title and version; no `target changed` flag; `localStorage` resume only.)

#### Scenario: Identifier gate and draft resume
- GIVEN an empty identifier
- WHEN export is attempted
- THEN export is blocked until an identifier is entered
- AND a reloaded modal restores the saved draft

#### Scenario: Drafts survive rebump
- GIVEN drafts saved under `meta.modelId` `m1` at `V_1-0-0`
- WHEN the console is regenerated at `V_1-0-1` with the same `modelId`
- THEN the drafts are restored from `innfo-console:v2:m1`

#### Scenario: Target changed flag
- GIVEN a draft with `base_hash` `h1` and the element now hashes `h2`
- WHEN the modal or draft list renders
- THEN the draft shows "target changed" and is still exported

#### Scenario: Missing element
- GIVEN a draft whose `element_id` no longer exists
- WHEN rendered
- THEN it is flagged "target changed" and remains exportable

#### Scenario: Old-key drafts dropped
- GIVEN drafts under the legacy title+version key
- WHEN the console loads
- THEN they are not shown, not migrated, and the legacy key is left untouched

#### Scenario: Invalid export blocked
- GIVEN a draft that fails `validateFeedback`
- WHEN the preview opens
- THEN the errors name the item id, and download and copy are disabled (`createObjectURL` not called)

#### Scenario: Copy to clipboard
- GIVEN a valid preview, an identifier and an available `navigator.clipboard`
- WHEN copy is activated
- THEN the clipboard receives exactly the JSON the download would contain

#### Scenario: Clipboard unavailable on file://
- GIVEN `navigator.clipboard` is undefined
- WHEN copy is activated
- THEN the offline-safe fallback runs, no exception escapes, and the user sees a success or failure message

#### Scenario: No verdict control
- GIVEN a rendered draft list or preview
- WHEN scanned for status selectors
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

### Requirement: Live draft count

The draft count MUST be shown consistently in the pending banner, the Review tab badge and the Review panel, and MUST update on every draft save or delete without a reload. Updating it MUST NOT remount the element cards.

#### Scenario: Count updates on save
- GIVEN a console with zero drafts
- WHEN a draft is saved
- THEN the banner, the Review tab badge and the Review panel all show `1`

#### Scenario: Count updates on delete
- GIVEN one draft
- WHEN it is deleted from the Review panel
- THEN all three surfaces show `0`

#### Scenario: Cards are not remounted
- GIVEN a rendered element card
- WHEN a draft is saved
- THEN the same card node is still in the DOM and keeps focus on its control

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

