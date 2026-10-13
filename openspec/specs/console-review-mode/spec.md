# console-review-mode Specification

## Purpose

Human review flow inside generated consoles, rendered by `InnfoConsole`: explicit review mode, inline annotation, reviewed progress, verdict badges, change awareness, keyboard access. Consumes the kit (`InnfoUI`: `AnnotationPopover`, `ReviewedToggle`, `RailProgress`, `DraftList`, `StatusBadge`, `ElementCard`, `FieldRow`, `TOKEN_VALUES`; change `2026-10-01-console-ui-kit`) and the payload fields `meta.modelId`, per-element `hash`, `meta.feedbackState` (change `2026-10-01-console-feedback-roundtrip-completion`). Controller: `console/review.js` (`InnfoReview`).
## Requirements
### Requirement: Review Mode Toggle

The console MUST provide an explicit review mode toggle, off by default and not
persisted across loads. The toggle MUST be offered only when `changeset-export` is
declared, `meta.modelId` is present, and EVERY element carries a `hash`; otherwise
it MUST NOT render (no fallback). With review mode off, no edit, annotation, or
reviewed control exists in the DOM (the info action and verdict badges remain).
With review mode on, every unit badge exposes the edit action. The toggle MUST
expose its state via `aria-pressed`. The renderer MUST dispatch `innfo:rendered`
on the document (detail `{ root }`) once per card commit; `InnfoReview` decorates
in response and MUST be idempotent across re-renders.
(Previously: "Each renderer" dispatched the event, and a scenario compared `InnfoConsole` with `InnfoModelViewer`.)

#### Scenario: Off by default
- GIVEN a freshly loaded console with `modelId` and all hashes
- WHEN it renders
- THEN no edit or reviewed controls exist in the DOM but the info action does

#### Scenario: Toggle on
- GIVEN review mode is off
- WHEN the reviewer activates the toggle
- THEN each unit badge exposes its edit action
- AND the toggle reports `aria-pressed="true"`

#### Scenario: Toggle withheld
- GIVEN a payload with no `meta.modelId`, or one element without `hash`
- WHEN the console renders
- THEN no toggle exists and no edit control is rendered

#### Scenario: Not persisted
- GIVEN review mode on, then a reload
- WHEN the console renders
- THEN review mode is off

#### Scenario: Re-render keeps decoration
- GIVEN review mode on and a search or filter that re-renders the cards
- WHEN `innfo:rendered` fires
- THEN every visible card is decorated exactly once

#### Scenario: Scoped console reviews like the domain console
- GIVEN one model rendered in a whole-domaiNN console and in a console scoped to it
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

Each element MUST have a reviewed toggle (`ReviewedToggle`) persisted in the draft store with the element hash recorded at marking. A mark counts as reviewed only while the recorded hash equals the current `hash`; otherwise it shows `changed` and does not count. The rail MUST show `reviewed/total` and the pending-draft count per concept via `RailProgress`; totals come from the payload (the scoped payload for a scoped console), independent of filters. Reviewed controls are shown only in review mode.
(Previously: "in BOTH renderers".)

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

### Requirement: Unit Info And Edit Entry Points

Every knowledge-unit badge MUST expose an **info** action
(`[data-ku-action="info"]`, rendered in a `ku-actions` cluster OUTSIDE the badge,
always present) and, only in review mode, an **edit** affordance. Both MUST open
ONE shared modal: info opens it on the **Info** tab (slug, location, lineage,
provenance, changes); edit opens it on the **Edit** tab. The modal is a single
component with mode-gated tabs, not two modals. With review mode off, no edit
control exists anywhere in the DOM, and the info action MUST still exist. Actions
SHOULD live outside the badge root so they are never nested inside a navigable
badge.

The modal MUST be larger than the pre-change edit modal (a wider dialog with the
tab bar and scrollable body), and MUST retain the existing Edit and
History & Provenance panels.

#### Scenario: Info outside review mode
- GIVEN review mode off
- WHEN a unit badge renders
- THEN it has a `[data-ku-action=info]` in a sibling `ku-actions` cluster and no edit control
- AND activating info opens the modal on the Info tab

#### Scenario: Edit appears in review mode
- GIVEN review mode on
- WHEN a unit badge renders
- THEN an edit affordance opens the modal on the Edit tab

#### Scenario: One modal
- GIVEN the console sources
- WHEN `dialog.innfo-edit-modal` instances are counted per console
- THEN at most one modal element exists and both entry points target it

### Requirement: Pending-Change Indicator

A unit badge whose address has one or more local drafts MUST show a count pip
(`[data-innfo-component="ku-change-pip"]`) and set `data-ku-changes="<n>"`. The pip
count is the number of drafts targeting that unit's address. The badge border MUST
reflect the aggregate draft status using the status tokens, so pending changes are
scannable without opening the modal. Activating the pip MUST open the shared modal
on the Changes/History tab. The indicator MUST be visible in both review modes
(it reflects stored drafts) and MUST update when a draft is added or deleted.

#### Scenario: Draft adds a pip
- GIVEN review mode on and a field with one saved correction draft
- WHEN the cards re-render
- THEN that field badge shows a pip with text `1` and `data-ku-changes="1"`

#### Scenario: Delete removes the pip
- GIVEN a unit with one draft
- WHEN the draft is deleted
- THEN the unit badge no longer carries a pip

#### Scenario: Pip opens changes
- GIVEN a unit badge with a pip
- WHEN the pip is activated
- THEN the shared modal opens on the History/Changes tab

### Requirement: Multi-tab-safe, durable draft store

The draft store MUST re-read persisted state before every write (or reconcile on the
`storage` event) so two tabs never overwrite each other's drafts. A failed write MUST be
surfaced to the user, not swallowed. After a successful export the user MUST be offered
to clear the exported drafts.

#### Scenario: Two tabs add drafts

- GIVEN tab A and tab B open on the same domain
- WHEN A adds draft d1 and then B adds draft d2
- THEN the persisted store contains both d1 and d2

#### Scenario: Storage write fails

- GIVEN `localStorage.setItem` throws (quota or disabled)
- WHEN a draft is saved
- THEN the UI shows a visible save-failure notice

#### Scenario: Drafts cleared after export

- GIVEN three drafts are exported to a changeset
- WHEN the user confirms clearing
- THEN the store holds no exported drafts

## Deferred

- Creating `new`-kind items from the console.
- Print/PDF view.
- Threaded replies.
- Multi-reviewer merge.
- Reviewer-chosen `layer`/`severity`, stable non-name element ids, draft sync beyond `localStorage`.
- The reviewer status `<select>` removal is NOT in this change (it belongs to change A); C only asserts its absence.
