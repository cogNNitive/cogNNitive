# console-review-mode Specification

## Purpose

Human review flow inside generated consoles, rendered by BOTH `InnfoConsole` and `InnfoModelViewer`: explicit review mode, inline annotation, reviewed progress, verdict badges, change awareness, keyboard access. Consumes the kit (`InnfoUI`: `AnnotationPopover`, `ReviewedToggle`, `RailProgress`, `DraftList`, `StatusBadge`, `ElementCard`, `FieldRow`, `TOKEN_VALUES`; change `2026-10-01-console-ui-kit`) and the payload fields `meta.modelId`, per-element `hash`, `meta.feedbackState` (change `2026-10-01-console-feedback-roundtrip-completion`). Controller: `console/review.js` (`InnfoReview`).

## Requirements

### Requirement: Review Mode Toggle

The console MUST provide an explicit review mode toggle, off by default and not persisted across loads. The toggle MUST be offered only when `feedback-export` is declared, `meta.modelId` is present, and EVERY element carries a `hash`; otherwise it MUST NOT render (no fallback). With review mode off, no annotation, reviewed, or draft controls exist in the DOM (verdict badges remain, see below). The toggle MUST expose its state via `aria-pressed`. Each renderer MUST dispatch `innfo:rendered` on the document (detail `{ root }`) once per card commit; `InnfoReview` decorates in response and MUST be idempotent across re-renders.

#### Scenario: Off by default
- GIVEN a freshly loaded console with `modelId` and all hashes
- WHEN it renders
- THEN no annotate or reviewed controls exist in the DOM

#### Scenario: Toggle on
- GIVEN review mode is off
- WHEN the reviewer activates the toggle
- THEN each element card and field row exposes its annotate control
- AND the toggle reports `aria-pressed="true"`

#### Scenario: Toggle withheld
- GIVEN a payload with no `meta.modelId`, or one element without `hash`
- WHEN the console renders
- THEN no toggle exists and no review control is rendered

#### Scenario: Not persisted
- GIVEN review mode on, then a reload
- WHEN the console renders
- THEN review mode is off

#### Scenario: Re-render keeps decoration
- GIVEN review mode on and a search or filter that re-renders the cards
- WHEN `innfo:rendered` fires
- THEN every visible card is decorated exactly once

#### Scenario: Both renderers
- GIVEN one payload rendered by `InnfoConsole` and by `InnfoModelViewer`
- WHEN review mode is on
- THEN both produce the same `data-innfo-component` review decorations per element

### Requirement: Inline Annotation Popover

Annotating MUST open the kit `AnnotationPopover` anchored to the card or field row, replacing `window.prompt` (which MUST NOT remain). A card anchor offers `comment` and `delete`; a field-row anchor offers `comment` and `correction`. A field-row anchor MUST set `target.field`; a card anchor MUST omit it. `correction` MUST prefill `original` from the payload element's field value (not DOM text) and capture `proposed`. Escape or cancel MUST close the popover, return focus to the anchor, and save nothing. Each saved draft MUST record the element's current `hash` as `base_hash`.

#### Scenario: Field correction
- GIVEN review mode on and a field row `owner` with payload value `A`
- WHEN the reviewer saves a `correction` proposing `B`
- THEN a draft exists with `target.element_id`, `target.field: "owner"`, `original: "A"`, `proposed: "B"` and `base_hash`

#### Scenario: Card comment omits field
- GIVEN a card anchor
- WHEN a `comment` is saved
- THEN the draft has no `target.field`

#### Scenario: Cancel
- GIVEN an open popover
- WHEN Escape is pressed
- THEN it closes, focus returns to the anchor, and the draft count is unchanged

#### Scenario: No prompt
- GIVEN the console sources
- WHEN searched for `window.prompt` / `prompt(`
- THEN no call exists

### Requirement: Reviewed Marks and Rail Progress

Each element MUST have a reviewed toggle (`ReviewedToggle`) persisted in the draft store with the element hash recorded at marking. A mark counts as reviewed only while the recorded hash equals the current `hash`; otherwise it shows `changed` and does not count. The rail MUST show `reviewed/total` and the pending-draft count per concept via `RailProgress`, in BOTH renderers; totals come from the payload, independent of filters. Reviewed controls are shown only in review mode.

#### Scenario: Progress updates
- GIVEN a concept with 4 elements, 1 reviewed, 2 drafts
- WHEN the reviewer marks another reviewed
- THEN the rail shows `2/4` and pending `2` for that concept

#### Scenario: Survives reload
- GIVEN an element marked reviewed
- WHEN the console reloads and review mode is enabled
- THEN it is still reviewed

#### Scenario: Hash drift un-counts
- GIVEN an element reviewed at `h1` and now `h2`
- WHEN rendered
- THEN its toggle is `changed` and the rail count excludes it

#### Scenario: Filters do not change totals
- GIVEN an active search hiding 2 of 4 elements
- WHEN the rail renders
- THEN the total is still 4

### Requirement: Verdict Badges

Elements with entries in `meta.feedbackState` MUST show a kit `StatusBadge` per status (`pending`, `applied`, `rejected`, `stale`, with count). Badges MUST derive only from `meta.feedbackState`, never from local drafts, and MUST be visible with review mode off. Entries whose element no longer exists MUST NOT render. Verdicts MUST NOT be settable from the console.

#### Scenario: Applied badge
- GIVEN `feedbackState` has `{id:"fb-001", status:"applied"}` targeting an element
- WHEN rendered
- THEN that element shows an `applied` StatusBadge

#### Scenario: Stale badge
- GIVEN an entry with status `stale`
- WHEN rendered
- THEN the element shows a `stale` StatusBadge

#### Scenario: Draft is not a verdict
- GIVEN a local draft and no `feedbackState` entry
- WHEN rendered
- THEN no verdict badge appears

#### Scenario: Orphan entry
- GIVEN an entry targeting a missing element
- WHEN rendered
- THEN nothing is rendered for it and no error is thrown

### Requirement: Changed-Since-Last-Review Filter

A filter MUST show only elements whose current `hash` differs from the hash recorded when last marked reviewed. Never-reviewed elements MUST NOT count as changed.

#### Scenario: Changed element listed
- GIVEN X reviewed at `h1`, now `h2`, and Y reviewed and unchanged
- WHEN the filter is enabled
- THEN X is shown and Y is hidden

#### Scenario: Never reviewed is not changed
- GIVEN element Z never marked reviewed
- WHEN the filter is enabled
- THEN Z is hidden

### Requirement: Keyboard and Accessibility

In review mode, `j`/`k` MUST move focus to the next/previous element card and `c` MUST open the popover for the focused element; shortcuts MUST be ignored while typing in an input, textarea or select. The popover MUST trap focus. The draft counter MUST live in an `aria-live="polite"` region and update on every add or delete. Focus MUST return to the triggering control after save or cancel. Controls MUST meet the kit contrast floor in light and dark themes, and the layout MUST remain usable at narrow viewports.

#### Scenario: Keyboard-only annotation
- GIVEN review mode on and focus on an element
- WHEN `j`, `c`, text, and Enter are used
- THEN a draft is saved on the next element and the live counter text updates

#### Scenario: Shortcuts inert in inputs
- GIVEN focus in the popover textarea
- WHEN `j` is typed
- THEN the character is entered and focus does not move

#### Scenario: Both themes
- GIVEN `data-theme="light"` and then `"dark"`
- WHEN review controls render
- THEN they use `--innfo-*` tokens only and their text/status pairs pass the kit contrast test

### Requirement: Offline Invariant

The review flow MUST work from a double-clicked `file://` page: no `fetch(`, no `type=module`, UMD only, and no network request.

#### Scenario: Offline boot
- GIVEN a console on `file://` without network
- WHEN review mode is enabled and a draft saved
- THEN no network request is issued and the bundle contains neither `fetch(` nor `type=module`

## Deferred

- Creating `new`-kind items from the console.
- Print/PDF view.
- Threaded replies.
- Multi-reviewer merge.
- Reviewer-chosen `layer`/`severity`, stable non-name element ids, draft sync beyond `localStorage`.
- The reviewer status `<select>` removal is NOT in this change (it belongs to change A); C only asserts its absence.
