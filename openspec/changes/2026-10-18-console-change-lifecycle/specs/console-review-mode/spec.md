# Delta for console-review-mode

## ADDED Requirements

### Requirement: One Change-State Signal Per Row

Each element row MUST show at most ONE change-state signal: a single kit
`StatusBadge` whose status is the element's change state and whose text is that
state's label (`Unsent`, `Proposed`, `Applied` or `Conflict`). The per-state
counts MUST live in the badge `title`, never as extra on-screen badges. The
badge derives `applied` / `conflict` from `element.history`, `proposed` from the
payload `changes` collection, and `local` (labelled `Unsent`) from the element's
local drafts; when several apply the signal resolves by precedence
`conflict > local > proposed > applied`. Rows with no change show no signal.
Statuses MUST NOT be settable from the console.

#### Scenario: One badge per row
- GIVEN an element with one applied change, one proposed change and one local draft
- WHEN the row renders
- THEN it shows exactly one change-state badge, status `local`, text `Unsent`
- AND its tooltip lists every count

#### Scenario: Conflict wins
- GIVEN an element with a conflict in its history and a local draft
- WHEN the row renders
- THEN its single change-state badge is `conflict`

#### Scenario: Local change reads as Unsent
- GIVEN a local draft and no changeset targeting the element
- WHEN rendered
- THEN the row shows a `local` change-state badge labelled `Unsent`

### Requirement: Change Recorded Toast

Every action that creates or modifies a change MUST show a transient,
dismissable toast (bottom-right) with the fixed copy: title `Change recorded`,
body `It lives only in this console until you export it. Then apply it from cogNNitive to write it into the domain.`
It MUST appear on saving an edit and on adding or removing a tag or relation,
MUST NOT mention "draft" or where the change is kept, and MUST be dismissable
and self-expiring. At most one toast is shown at a time.

#### Scenario: Saving an edit shows the toast
- GIVEN a proposable domain
- WHEN the reviewer saves an edit
- THEN a toast appears with the title `Change recorded` and the fixed body

#### Scenario: Dismiss
- GIVEN the toast is visible
- WHEN its close control is activated
- THEN the toast is removed

## MODIFIED Requirements

### Requirement: No Review Mode — Always-On Proposals

There is NO review mode and no toggle. An edit only ever creates a local change,
never a direct write, so the edit affordance is always emitted and always live.
The console has ONE concept — the change — with three states: **Unsent** (local,
in the browser), **Proposed** (submitted; the engine can apply it) and **Applied**
(written into the model), plus the terminal `conflict`. "draft" and "changeset"
are NOT user-facing vocabulary, and there is no reviewed mark.

The capability split is unchanged: `canPropose` gates the edit ANCHORS;
`canReview` (= `canPropose` AND the export surface declared) gates the export
surface. State decoration (the single change-state badge, the change pips and
the rail progress) is capability-free and always runs.

#### Scenario: No toggle, no mode attribute
- GIVEN a freshly loaded console
- WHEN it renders
- THEN no review-mode toggle exists, no reviewed mark exists and `html[data-innfo-review]` is absent

### Requirement: Rail Progress Over Unsent Changes

The rail MUST show, per concept, the number of elements that carry an unsent
local change over the concept's total element count, via
`RailProgress({ total, pending })`. Totals come from the payload, independent of
filters. The reviewed marks, `RailProgress({ reviewed, … })`, and the
changed-since-last-review filter MUST NOT exist.

#### Scenario: Progress reads pending
- GIVEN a concept with 4 elements and 2 local drafts
- WHEN the rail renders
- THEN that concept's RailProgress reads `2/4` with `data-pending="2"`

#### Scenario: No reviewed mark exists
- GIVEN any rendered console
- THEN no `[data-innfo-component="reviewed-toggle"]` and no `[data-innfo="changed-filter"]` exists

## REMOVED Requirements

### Requirement: Reviewed Marks and Rail Progress

Reason: a reviewed mark was local state with no effect on the domain; it is
replaced by the change-state signal (above).

### Requirement: Verdict Badges

Reason: superseded by **One Change-State Signal Per Row**.

### Requirement: Changed-Since-Last-Review Filter

Reason: it depended entirely on reviewed marks, which no longer exist.
