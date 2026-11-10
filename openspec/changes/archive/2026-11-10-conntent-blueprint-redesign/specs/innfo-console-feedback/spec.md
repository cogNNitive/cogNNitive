# innfo-console-feedback Delta Spec

Slice 3 lifts the "no verdicts in exports" rule. The console-side implementation (controls, direct write) belongs to Slice 4 and is referenced here only where the export contract changes.

## MODIFIED Requirements

### Requirement: Export Modal

The export modal MUST preview the changeset that the current drafts produce (one change per draft, via the kit `DraftList`) and MUST offer download, copy-to-clipboard (bytes identical to the download), and human-instructions plus agent-prompt tabs. It MUST require a human reviewer identifier, used as the changeset `author` and as the frontmatter `reviewer` of the exported changeset. When `navigator.clipboard` is unavailable (e.g. `file://`), copy MUST fall back to a mechanism that works offline (selecting the preview text for manual copy, or `document.execCommand('copy')`) and MUST report success or failure to the user. Drafts persist in the console draft store (`console-review-mode`); each is anchored by its element id plus `base_hash`. A draft whose element is missing or whose current hash differs MUST be flagged "target changed" and MUST remain exportable. Exported content changes MUST NOT carry `status`. A verdict control MUST exist only for gates that the console payload declares (see `changeset-review-gate`); where it exists, it produces a `review_gate` change (schema owned by `changeset-review-gate`) with the gate's `reviewed_hash` (and `plan_hash` when the payload supplies one for that gate) copied from the payload, and `notes` for `needs-change`, in a changeset whose frontmatter carries `author_kind: human`, `origin: console` and the reviewer identifier as `reviewer`. A console whose payload declares no gates MUST offer no verdict control. No JSON export exists. (Previously: exported changes carried no verdict and no verdict control could exist.)

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

#### Scenario: No gates, no verdict control
- GIVEN a console whose payload declares no gates
- WHEN a rendered draft list or preview is scanned for verdict controls
- THEN none exists

#### Scenario: Declared gate offers a verdict
- GIVEN a payload declaring the gate `script` for a scene with current hash `h`
- WHEN the reviewer approves it with identifier `Ana`
- THEN the preview holds a `review_gate` change with `gate:: script`, `verdict:: approved` and `reviewed_hash:: h`
- AND the changeset frontmatter carries `author_kind: human`, `origin: console` and `reviewer: Ana`

#### Scenario: Verdict needs an identifier
- GIVEN a pending verdict and an empty identifier
- WHEN export is attempted
- THEN export is blocked

#### Scenario: Verdict never carries status
- GIVEN an exported `review_gate` change
- WHEN its keys are read
- THEN it has no `status` key

## ADDED Requirements

### Requirement: Verdicts are the only status-like export, and only through `review_gate`

The export MUST express a reviewer's decision about a gate only as a `review_gate` change. It MUST NOT write a verdict into an element field (including `review::`). An export that contains an edit and a verdict for the same element MUST carry, for the verdict, the `reviewed_hash` the payload showed before the edit, so that the edit invalidates it by construction.

#### Scenario: No verdict in a field

- GIVEN a reviewer who approved a scene
- WHEN the exported changeset is scanned
- THEN no change updates a `review` field and the approval is a `review_gate` change

#### Scenario: Edit and approval together do not approve

- GIVEN an edit to a scene narration and an approval of the same scene in one export
- WHEN the changeset is applied
- THEN the approval's `reviewed_hash` no longer equals the current content hash (the gate stays open, see `conntent-review-gates`)
