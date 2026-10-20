# Delta for console-ui-kit

## ADDED Requirements

### Requirement: Change Card and Applied History

The kit MUST render every change, unsent or applied, with one card anatomy: a
human-language title from the op ("Edit `field` of `element`", "Add element ...",
"Delete ...", "Rename ...", "Comment on ...", matrix "Edit cell") [P]; a `previous -> new`
line (add: the field list; delete: the element name); a context line `author - date -
state`; the note; the evidence `sources` as a clickable citation; and a "Go to element" [P]
control that calls `opts.onGoTo(elementId)`. The state of an unsent card is the `local`
`StatusBadge`; the states Applied and Not applied are card text only and exist nowhere
outside these cards.

`ChangeHistory({ changes, byId }, { onRevert, onGoTo })` MUST render the payload `changes`
collection: a block with status `applied` as a card whose state text is "Applied" [P]
(with the [P] help "Recorded in the domain."); a block with status `conflict` or
`rejected` as a muted card labelled "Not applied" [P] showing the block `resolution`, else
the changeset `resolution`; neither carries a `StatusBadge`. Any other block MUST NOT
render. The footer of an Applied card MUST offer "Revert" [P] only when its op is
`update_field`, calling `opts.onRevert(entry)`. The component holds no state and reads no
storage. All text MUST render as text, never as HTML.

#### Scenario: Applied card anatomy
- GIVEN an applied block `update_field` on `goal-1&owner` with `from:: Ana`, `to:: Bea`, `author:: ana`
- WHEN `ChangeHistory` renders it
- THEN the card title reads "Edit owner of Goal 1", it shows `Ana -> Bea`, the context line names `ana` and reads "Applied"
- AND it contains no `StatusBadge`
- AND a Revert control exists

#### Scenario: Not applied card
- GIVEN a block with `status:: conflict` and `resolution:: PRECONDITION_FAILED: ...`
- WHEN rendered
- THEN a muted card shows "Not applied" and the resolution text, and no status badge

#### Scenario: No Revert for other ops
- GIVEN an applied `rename_element` block
- WHEN rendered
- THEN no Revert control exists

## MODIFIED Requirements

### Requirement: StatusBadge

`InnfoUI.StatusBadge({ status, count?, label?, title? })` MUST accept only `local`, render
`data-innfo-component="status-badge"` with `data-status`, and color it from the unsent
status tokens. Any other value, including `applied`, `proposed` and `conflict`, MUST throw a
`TypeError`. When `count` is provided (and no `label`) the visible text MUST be the count;
when `label` is provided it MUST be the visible text; otherwise the status string is shown.
The default `title` MUST say what the state means and what the reviewer does next [P]:
"Only in your browser. Export it and give it to the agent.". `title` overrides it. Status
MUST also be conveyed by text, never by color alone.
(Previously: four statuses `local`, `proposed`, `applied`, `conflict`, with color-only help.)

#### Scenario: Label shown
- GIVEN `{ status: "local", count: 1, label: "Unsent", title: "1 unsent" }`
- THEN text is "Unsent", `data-status="local"`, `title="1 unsent"`

#### Scenario: Next-step help
- GIVEN `{ status: "local" }`
- THEN `title` tells the reviewer to export the change and give it to the agent

#### Scenario: Retired statuses rejected
- GIVEN `status: "applied"` or `status: "conflict"`
- THEN it throws a `TypeError`

### Requirement: Review Components

The kit MUST provide presentational review components. They MUST hold no review state,
MUST NOT read storage, and MUST emit changes only through callbacks in `opts`.

- `DraftList({ drafts, byId }, { onDelete })`: one card per draft with the anatomy of
  "Change Card and Applied History" and a "Discard" [P] control that calls
  `onDelete(id)`; without `onDelete` (the export-modal preview) no control is rendered. A
  draft whose target hash differs from `byId[element_id].hash`, or whose element is absent,
  MUST show a "target changed" text label using the stale status token. There is no
  "already applied" label: such drafts are removed from the store when the console loads.
  It MUST NOT render any status control.
- `AnnotationPopover({ label, kinds, original? }, { onSave, onCancel })`:
  `div[role=dialog][aria-modal=true]` offering only the given `kinds`; Tab/Shift+Tab wrap
  inside it; Escape calls `onCancel` and nothing else; when `kinds` includes `correction` it
  shows `original` read-only and a `proposed` input.
- `RailProgress({ total, pending })`: shows the literal text `pending/total` and a `title`
  naming unsent changes; `data-total`, `data-pending` attributes.
- `Toast({ title, body }, { onClose })`: `div[data-innfo-component="toast"][role=status]`
  with a title, a body text and a dismiss control; it holds no timer (the caller owns
  dismissal) and emits nothing but `onClose`. Its copy is supplied by the caller.

(Previously: `DraftList` rows showed kind, target and text with a "Delete" control and an
"already applied" label.)

#### Scenario: Draft list cards
- GIVEN two drafts, a matching `byId` and an `onDelete` callback
- THEN two cards render, each with a Discard control and no status selector

#### Scenario: Preview without controls
- GIVEN drafts and no `onDelete`
- THEN the cards render with no Discard control

#### Scenario: Target changed label
- GIVEN a draft with `base_hash: "h1"` and `byId[id].hash === "h2"`
- THEN the card shows the "target changed" label

#### Scenario: Target missing
- GIVEN a draft whose element id is absent from `byId`
- THEN the card shows the "target changed" label

#### Scenario: Popover cancel
- GIVEN an open popover
- WHEN Escape is pressed
- THEN `onCancel` is called once and `onSave` is not

#### Scenario: Popover focus trap
- GIVEN focus on the last control
- WHEN Tab is pressed
- THEN focus moves to the first control

#### Scenario: Popover kinds
- GIVEN `kinds: ["comment", "delete"]`
- THEN no `correction` option or `proposed` input exists

#### Scenario: Rail progress
- GIVEN `{ total: 4, pending: 2 }`
- THEN the text includes `2/4`, `data-pending="2"`, `data-total="4"` and no `data-reviewed`

#### Scenario: Toast dismiss
- GIVEN a visible toast
- WHEN its dismiss control is activated
- THEN `onClose` is called once

#### Scenario: Invalid review input
- GIVEN `RailProgress({ total: "x" })`
- THEN it throws a `TypeError` mentioning `RailProgress`
