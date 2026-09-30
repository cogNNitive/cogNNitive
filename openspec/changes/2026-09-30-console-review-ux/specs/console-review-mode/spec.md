# console-review-mode Specification

## Purpose

Human review flow inside generated consoles: explicit review mode, inline annotation, reviewed progress, verdict badges, change awareness, keyboard access. Builds on `StatusBadge`/tokens (console-design-tokens-and-ui-kit) and `meta.modelId`, `meta.feedbackState`, per-element `hash` (console-feedback-roundtrip).

## Requirements

### Requirement: Review Mode Toggle

The console MUST provide an explicit review mode toggle, off by default and not persisted. The toggle is rendered only when `feedback-export` is declared and the payload carries `meta.modelId` and a `hash` on every element. With review mode off, the console MUST be read-only: no annotation, reviewed, or draft controls rendered (verdict badges are information and remain visible). The toggle MUST expose its state via `aria-pressed`. Both renderers MUST announce each render with an `innfo:rendered` event on the document; a single review controller (`InnfoReview`) decorates the rendered cards and field rows in response, so the renderers hold no review state.

#### Scenario: Off by default
- GIVEN a freshly loaded console
- WHEN it renders
- THEN no annotate or reviewed controls exist in the DOM

#### Scenario: Toggle on
- GIVEN review mode is off
- WHEN the reviewer activates the toggle
- THEN each element card and field row exposes its annotate control
- AND the toggle reports `aria-pressed="true"`

### Requirement: Inline Annotation Popover

Annotating MUST open an inline popover anchored to the element card or field row, replacing `window.prompt`. Kinds MUST be `comment`, `correction`, `delete`: a card anchor offers `comment` and `delete`; a field-row anchor offers `comment` and `correction`. A field-row anchor MUST set `target.field`; a card anchor MUST omit it. `correction` MUST capture `original` (prefilled from the payload element's field value, not DOM text) and `proposed`. The popover is the kit component `InnfoUI.AnnotationPopover`. Escape or cancel MUST close the popover, return focus to the anchor, and save nothing.

#### Scenario: Field correction
- GIVEN review mode on and a field row with value `A`
- WHEN the reviewer saves a `correction` proposing `B`
- THEN a draft exists with `target.element_id`, `target.field`, `original: "A"`, `proposed: "B"`

#### Scenario: Card comment omits field
- GIVEN a card anchor
- WHEN a `comment` is saved
- THEN the draft has no `target.field`

#### Scenario: Cancel
- GIVEN an open popover
- WHEN Escape is pressed
- THEN the popover closes, focus returns to the anchor, and the draft count is unchanged

### Requirement: No Reviewer Verdicts

The console MUST NOT offer any control to set a draft's status to `applied` or `rejected`. Drafts and exported items MUST NOT carry a `status` at all (the feedback schema has no item `status`; verdicts live only in the ledger).

#### Scenario: No status select
- GIVEN a draft exists
- WHEN the draft list renders
- THEN no status selector exists and the exported item has no `status` key

### Requirement: Reviewed Marks and Progress

Each element MUST have a reviewed toggle persisted in the draft store. An element counts as reviewed only while the recorded hash equals its current `hash`; a mark with a differing hash is shown as "changed" and does not count. The rail MUST show `reviewed/total` and the pending-draft count per concept (totals come from the payload, independent of filters).

#### Scenario: Progress updates
- GIVEN a concept with 4 elements, 1 reviewed, 2 drafts
- WHEN the reviewer marks another reviewed
- THEN the rail shows `2/4` and pending count `2` for that concept

#### Scenario: Reviewed survives reload
- GIVEN an element marked reviewed
- WHEN the console reloads
- THEN it is still reviewed

### Requirement: Verdict Badges

Elements with items in `meta.feedbackState` MUST show a `StatusBadge` per status (`pending`, `applied`, `rejected`, and `stale`, with a count). Badges MUST derive only from `meta.feedbackState`, never from local drafts, and are visible with review mode off. Entries whose element no longer exists are not rendered.

#### Scenario: Applied badge
- GIVEN `feedbackState` has `{id:"fb-001", status:"applied"}` targeting an element
- WHEN rendered
- THEN that element shows an `applied` StatusBadge

#### Scenario: Draft is not a verdict
- GIVEN a local draft and no feedbackState entry
- WHEN rendered
- THEN no verdict badge appears

### Requirement: Changed-Since-Last-Review Filter

A filter MUST show only elements whose current `hash` differs from the hash recorded when last marked reviewed. Never-reviewed elements MUST NOT count as changed.

#### Scenario: Changed element listed
- GIVEN element X reviewed at hash `h1` and now `h2`
- WHEN the filter is enabled
- THEN X is shown and unchanged reviewed elements are hidden

### Requirement: Keyboard and Accessibility

In review mode, `j`/`k` MUST move focus to the next/previous element and `c` MUST open the annotation popover for the focused element; shortcuts MUST be ignored while typing in an input. The popover MUST trap focus while open. The draft counter MUST be in an `aria-live="polite"` region. Controls MUST meet contrast in light and dark themes and the layout MUST remain usable at narrow viewports.

#### Scenario: Keyboard-only annotation
- GIVEN review mode on and focus on an element
- WHEN `j`, `c`, typing, and Enter are pressed
- THEN a draft is saved on the next element and the counter announcement updates

#### Scenario: Shortcuts inert in inputs
- GIVEN focus in the popover textarea
- WHEN `j` is typed
- THEN the character is entered and focus does not move

### Requirement: Offline Invariant

The review flow MUST work from a double-clicked file: no `fetch`, no `type=module`, UMD functions in the bundle only.

#### Scenario: Offline boot
- GIVEN a console opened from `file://` without network
- WHEN review mode is enabled and a draft saved
- THEN no network request is issued

## Deferred

- Creating `new`-kind items from the console.
- Print/PDF view.
- Threaded replies, multi-reviewer merge, reviewer-chosen `layer`/`severity`, stable non-name element ids.
