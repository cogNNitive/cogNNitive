# Review Workflow Specification

## Purpose

Defines the asynchronous review workflow, including reviewer identity, visual feedback badges, universal review summary, and standardized feedback artifact export.
## Requirements
### Requirement: Reviewer Identity Profile Chip

Consoles MUST display a reviewer profile chip in the top-right header. The reviewer name MUST be editable on click and persisted in `localStorage`. If unset, it MUST default to `reviewer`.

#### Scenario: Reviewer name persistence
- GIVEN a user updates their reviewer name in the chip
- WHEN the page reloads or another console opens
- THEN the chip displays the persisted reviewer name

### Requirement: Card and Rail Review Badges

Element cards and concept rail items MUST show a change signal only for unsent changes
held in the browser draft store (see `console-review-mode`, "One Change-State Signal Per
Row"). No signal is derived from the console payload.
(Previously: a review badge indicated unexported feedback without excluding payload state.)

#### Scenario: Visual badge on an element with an unsent change
- GIVEN an element card with an unsent change
- WHEN the console renders the rail and card list
- THEN an Unsent signal shows on the element card and its rail item

### Requirement: One Changes Tab

Every console MUST have exactly one "Changes" [P] tab, the built-in core tab `review`, and
it is the only place where Applied and Not applied changes appear. Its top section MUST
list the unsent changes as kit `DraftList` cards, each with Discard and the existing
"target changed" warning, plus the export control; there is no "clear exported" control.
While at least one unsent change exists, a [P] banner MUST sit at the top of the unsent
list saying that applied changes become part of every console generated from this domain,
so private data or content not meant for everyone must not be included; when the list is
empty the same message MUST appear as a one-line note. Below, an Applied section MUST
render the payload `changes` collection with kit `ChangeHistory`, newest file first,
including the "Not applied" cards. Each section MUST show an empty state when it has
nothing to list. "Go to element" MUST focus the element's card. Revert on an applied
`update_field` MUST add one unsent `update_field` change on the same element and field
whose `base_hash` is the element's current hash, whose previous value is the current value
and whose new value is the reverted change's `from`, or the empty value (a clear) when
`from` is absent. The tab MUST NOT offer filters.

#### Scenario: Two sections
- GIVEN one unsent change and a payload with one applied changeset
- WHEN the Changes tab opens
- THEN the Unsent section is above the Applied section and each lists one card

#### Scenario: Publication banner
- GIVEN one unsent change
- WHEN the Changes tab opens
- THEN the [P] publication banner is the first item of the Unsent section

#### Scenario: Publication note when empty
- GIVEN no unsent change
- WHEN the Changes tab opens
- THEN the Unsent empty state includes the [P] publication message as one line

#### Scenario: Revert creates an unsent inverse
- GIVEN an applied block `update_field` `goal-1&owner` with `from:: Ana`, `to:: Bea`, and the element now holds `Bea`
- WHEN Revert is activated
- THEN one unsent change appears with previous value `Bea`, new value `Ana` and the element's current hash

#### Scenario: Revert of a field that was added
- GIVEN an applied `update_field` block with no `from`
- WHEN Revert is activated
- THEN the unsent change's new value is empty, so it exports as a clear

#### Scenario: Discard
- GIVEN an unsent change
- WHEN Discard is activated
- THEN the change leaves the store and the Unsent section

