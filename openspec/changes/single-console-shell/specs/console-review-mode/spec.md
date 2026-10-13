# Delta for console-review-mode

## MODIFIED Requirements

### Requirement: Review Mode Toggle

The console MUST provide an explicit review mode toggle, off by default and not
persisted across loads. The toggle MUST be offered only when `feedback-export` is
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

Elements with entries in the per-model `meta.models[].feedbackState` MUST show a kit `StatusBadge` per status (`pending`, `applied`, `rejected`, `stale`, with count), in whole-domaiNN and scoped consoles alike. Badges MUST derive only from `meta.models[].feedbackState`, never from local drafts, and MUST be visible with review mode off. Entries whose element no longer exists MUST NOT render. Verdicts MUST NOT be settable from the console.
(Previously: badges derived from the model-level `meta.feedbackState`.)

#### Scenario: Applied badge
- GIVEN a `meta.models` entry whose `feedbackState` has `{id:"fb-001", status:"applied"}` targeting an element
- WHEN rendered
- THEN that element shows an `applied` StatusBadge

#### Scenario: Badge in a scoped console
- GIVEN a console scoped to one model whose entry carries an `applied` item
- WHEN rendered
- THEN the element shows the `applied` StatusBadge

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

#### Scenario: Unqualified element id is qualified by its model
- GIVEN a `meta.models` entry for model `mId` whose `feedbackState` item targets the unqualified `element_id: elId`
- WHEN badges render
- THEN the badge attaches only to element `mId/elId`
- AND an item with the same unqualified `elId` under a different model does not attach to `mId/elId`
