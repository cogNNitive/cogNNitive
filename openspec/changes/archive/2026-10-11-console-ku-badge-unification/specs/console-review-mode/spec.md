# console-review-mode Specification (delta)

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Review Mode Toggle

The console MUST provide an explicit review mode toggle, off by default and not
persisted across loads. The toggle MUST be offered only when `feedback-export` is
declared, `meta.modelId` is present, and EVERY element carries a `hash`; otherwise
it MUST NOT render (no fallback). With review mode off, no edit, annotation, or
reviewed control exists in the DOM (the info action and verdict badges remain).
With review mode on, every unit badge exposes the edit action. The toggle MUST
expose its state via `aria-pressed`. Each renderer MUST dispatch `innfo:rendered`
on the document (detail `{ root }`) once per card commit; `InnfoReview` decorates
in response and MUST be idempotent across re-renders.

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

#### Scenario: Both renderers
- GIVEN one payload rendered by `InnfoConsole` and by `InnfoModelViewer`
- WHEN review mode is on
- THEN both produce the same `data-innfo-component` review decorations per element
