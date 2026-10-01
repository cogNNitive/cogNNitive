# Delta for innfo-console-feedback

Applies AFTER change A (`2026-10-01-console-feedback-roundtrip-completion`) is archived: "Previously" lines describe A's resulting text. Requirements not listed here (Reconcile Feedback Procedure, Normalized Feedback Anchors) are untouched.

## MODIFIED Requirements

### Requirement: Feedback JSON Schema

Export files MUST validate against the feedback schema. `meta` MUST carry `source_knowledge`, `source_knowledge_version` (`V_x-y-z`), `artifact`, `artifact_version`, `exported_at` (ISO-8601 with seconds), `author`, `feedback_slug` and `viewer`, and MAY carry `source_sha256`. Each `items[]` entry MUST carry `id` (`fb-NNN`), `kind` (`correction`|`comment`|`new`|`delete`) and `target` (`element_id`/`concept`/`element`/`field`/`matrix`; `field` MUST be under `target`, never top-level), with `original`/`proposed`/`comment` as applicable. Items MUST NOT carry `status`, `layer` or `severity`. Console-exported items MUST carry `base_hash` (the element `hash` the draft was made against); an item anchored to a field row MUST carry `target.field`, and one anchored to a card MUST omit it. The names `knowledge`, `knowledge_version`, `session_label` and `source_model*` MUST NOT appear. Filenames MUST match `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`.
(Previously: `base_hash` was optional in the schema and no rule tied `target.field` to the field-row anchor. The schema itself keeps `base_hash` optional; this requirement binds console exports only.)

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

## Deferred

- Creating `new`-kind items from the console, print/PDF view, threaded replies, multi-reviewer merge.
