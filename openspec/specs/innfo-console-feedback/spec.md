# innfo-console-feedback Specification

## Purpose

Reviewer-to-model loop: console reviewers export structured feedback JSON; an agent-reviewed Reconcile Feedback procedure carries accepted items back into the source model with staleness protection and patch-bump versioning.
## Requirements
### Requirement: Export Modal

The export modal MUST preview the changeset that the current drafts produce (one change per draft, via the kit `DraftList`) and MUST offer download, copy-to-clipboard (bytes identical to the download), and human-instructions plus agent-prompt tabs. It MUST require a human reviewer identifier, used as the changeset `author`. When `navigator.clipboard` is unavailable (e.g. `file://`), copy MUST fall back to a mechanism that works offline (selecting the preview text for manual copy, or `document.execCommand('copy')`) and MUST report success or failure to the user. Drafts persist in the console draft store (`console-review-mode`); each is anchored by its element id plus `base_hash`. A draft whose element is missing or whose current hash differs MUST be flagged "target changed" and MUST remain exportable. Exported changes MUST NOT carry `status`, and no reviewer verdict control may exist. No JSON export exists. (Previously: the modal exported reviewer feedback JSON validated by `validateFeedback` and named by a feedback filename contract.)

#### Scenario: Identifier gate and draft resume
- GIVEN an empty identifier
- WHEN export is attempted
- THEN export is blocked until an identifier is entered
- AND a reloaded modal restores the saved drafts

#### Scenario: Target changed flag
- GIVEN a draft with `base_hash` `h1` and the element now hashes `h2`
- WHEN the modal or draft list renders
- THEN the draft shows "target changed" and is still exported

#### Scenario: Missing element
- GIVEN a draft whose element id no longer exists
- WHEN rendered
- THEN it is flagged "target changed" and remains exportable

#### Scenario: Only a changeset is exported
- GIVEN drafts in the store
- WHEN the modal opens
- THEN the preview is a changeset document
- AND no JSON download or JSON preview exists

#### Scenario: Copy to clipboard
- GIVEN a valid preview, an identifier and an available `navigator.clipboard`
- WHEN copy is activated
- THEN the clipboard receives exactly the changeset the download would contain

#### Scenario: Clipboard unavailable on file://
- GIVEN `navigator.clipboard` is undefined
- WHEN copy is activated
- THEN the offline-safe fallback runs, no exception escapes, and the user sees a success or failure message

#### Scenario: No verdict control
- GIVEN a rendered draft list or preview
- WHEN scanned for status selectors
- THEN none exists

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

### Requirement: Every exported change names its author

Every `## NN Change` block of an export MUST carry `author::` with the export author: the
identifier entered in the export modal, prefilled from the reviewer-name store, falling back
to `reviewer`. Line breaks in the name (CR, LF, U+2028, U+2029) MUST be folded so the value
stays on one line. Such an author MUST resolve as a human author when the change is cited.

#### Scenario: Author on every block
- GIVEN two unsent changes and the identifier `ana`
- WHEN the export is composed
- THEN both blocks contain the line `author:: ana`

#### Scenario: No line injection
- GIVEN the identifier `ana` + newline + `op:: remove_element`
- WHEN the export is composed
- THEN each block has exactly one `author::` line and one `op::` line

#### Scenario: Author resolves as human
- GIVEN an applied export whose block carries `author:: ana`
- WHEN a field citing that change is resolved
- THEN its origin is `human` and its author is `ana`

### Requirement: Emptied field exports a clear

An unsent change whose new value is the empty string MUST export as `op:: update_field` with
an empty `to::`.

#### Scenario: Emptied text field
- GIVEN a text field `owner` edited from `Ana` to an empty value
- WHEN the export is composed
- THEN the block has `op:: update_field`, `from:: Ana` and an empty `to::`

### Requirement: Export modal describes the real flow

The export modal MUST NOT mention sealing, `proposal_sha` or `PROPOSAL_TAMPERED`. It MUST
describe the flow with [P] copy: export the file, give it to the agent, the agent applies
what it can and reports each skipped change with its reason, and a retry is a new export
with only the skipped changes. The agent prompt MUST ask the agent to apply the file and to
report the skipped changes and their reasons.

#### Scenario: No seal text
- GIVEN the export modal is open
- WHEN its text is scanned
- THEN it contains none of `Sealed`, `proposal_sha`, `PROPOSAL_TAMPERED`
- AND it contains the [P] flow paragraph

