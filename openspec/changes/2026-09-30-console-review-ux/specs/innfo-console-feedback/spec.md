# Delta for innfo-console-feedback

## MODIFIED Requirements

### Requirement: Feedback JSON Schema

Export files MUST validate against the feedback schema as amended by change 3 (`console-feedback-roundtrip`): `meta` carries `source_knowledge` (the model id), `source_knowledge_version` (`V_x-y-z`), `artifact`, `artifact_version`, `exported_at` (ISO-8601 with seconds), `author`, `feedback_slug`, `viewer`, and MAY carry `source_sha256`; the aliases `source_model*`, `knowledge*` and `session_label` MUST NOT be used. Each `items[]` entry MUST carry `id` (`fb-NNN`), `kind` (`correction`|`comment`|`new`|`delete`), `target` (`element_id`/`concept`/`element`/`field`/`matrix`), `original`/`proposed`/`comment` as applicable, and `base_hash` (the element `hash` the draft was made against). Console-exported items MUST NOT carry `status` (verdicts live only in the ledger; the schema has no item `status`). An item anchored to a field row MUST carry `target.field` (never a top-level `field`); an item anchored to a card MUST omit it. Filenames MUST match `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`.
(Previously, after change 3: no rule tying `target.field` to the field-row anchor versus the card anchor, and `base_hash` optional; this change makes it required for console exports.)

#### Scenario: Valid export validates

- GIVEN a console with draft suggestions and identifier `round-2`
- WHEN exported
- THEN the file validates and matches the filename pattern

#### Scenario: Malformed item rejected

- GIVEN an item with `kind: rewrite`
- WHEN validated
- THEN validation fails naming the offending `id`

#### Scenario: Field anchor exports target.field

- GIVEN a correction drafted on field `owner` of element `e1`
- WHEN exported
- THEN the item has `target.field: "owner"` and no top-level `field`
- AND the file validates

#### Scenario: Exported items carry no status

- GIVEN any draft created in the console
- WHEN exported
- THEN the item has no `status` key and carries `base_hash`

### Requirement: Export Modal

The Export modal MUST be a preview listing every item (kind, target, text) and MUST validate the document with `validateFeedback` live, blocking download and copy while invalid and naming offending item ids. It MUST extend the feedback modal injected by change 3 (`#innfo-feedback-modal`), require a human identifier (the reviewer identifier), slugify it to `feedback_slug`, and offer download, copy-to-clipboard (bytes identical to the download), and human-instructions plus agent-prompt tabs. The draft list in the modal and in the review tab MUST be the shared `InnfoUI.DraftList` kit component. Drafts MUST persist in `localStorage` keyed by the stable model id from `meta.modelId` (not title and version), so they survive version rebumps; each draft MUST be anchored by `element_id` plus the element's base hash. A draft whose element is missing or whose current hash differs MUST be flagged "target changed". Drafts stored under the old title+version key MUST be ignored (no migration). Unknown draft fields MUST be ignored.
(Previously: identifier gate and tabs only; drafts keyed by model title and version; no preview, validation, clipboard, or change flag)

#### Scenario: Identifier gate and draft resume

- GIVEN an empty identifier
- WHEN export is attempted
- THEN export is blocked until an identifier is entered
- AND a reloaded modal restores the saved draft

#### Scenario: Drafts survive rebump

- GIVEN drafts saved under model id `m1` at version `V_1-0-0`
- WHEN the console is regenerated at `V_1-0-1` with the same `meta.modelId`
- THEN the drafts are restored

#### Scenario: Target changed flag

- GIVEN a draft with base hash `h1` and the element now hashes `h2`
- WHEN the modal or draft list renders
- THEN the draft shows "target changed" and is still exportable

#### Scenario: Missing element

- GIVEN a draft whose `element_id` no longer exists
- WHEN rendered
- THEN it is flagged "target changed"

#### Scenario: Old-key drafts dropped

- GIVEN drafts stored under the legacy title+version key
- WHEN the console loads
- THEN they are not shown and not migrated

#### Scenario: Invalid export blocked

- GIVEN a draft that fails `validateFeedback`
- WHEN the preview opens
- THEN the errors name the item id and download and copy are disabled

#### Scenario: Copy to clipboard

- GIVEN a valid preview and identifier
- WHEN copy is activated
- THEN the clipboard receives the same JSON the download would contain
