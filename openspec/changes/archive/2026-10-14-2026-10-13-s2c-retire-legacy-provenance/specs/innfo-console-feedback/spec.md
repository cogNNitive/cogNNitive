# Delta for innfo-console-feedback

## REMOVED Requirements

### Requirement: Feedback JSON Schema

(Reason: the console exports a changeset, the only change record; the reviewer JSON format, its schema and its filename contract are retired.)
(Migration: None. Existing JSON files stay on disk and are read by no tool.)

### Requirement: Reconcile Feedback Procedure

(Reason: the procedure and the two MCP tools it called are retired; the agent applies reviewer changesets with `apply_change`.)
(Migration: None.)

### Requirement: Normalized Feedback Anchors

(Reason: reviewer JSON is no longer imported or normalized; reviewer changes are changeset changes, cited as `changes/<file>@## NN Change: <id>`.)
(Migration: None.)

## MODIFIED Requirements

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
