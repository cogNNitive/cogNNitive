# console-review-mode Specification

## Purpose

Human review flow inside generated consoles, rendered by `InnfoConsole`: always-on proposals (no review mode), inline annotation, reviewed progress, verdict badges, change awareness, keyboard access. Consumes the kit (`InnfoUI`: `AnnotationPopover`, `ReviewedToggle`, `RailProgress`, `DraftList`, `StatusBadge`, `ElementCard`, `FieldRow`, `TOKEN_VALUES`; change `2026-10-01-console-ui-kit`) and the payload fields `meta.modelId`, per-element `hash`, `meta.feedbackState` (change `2026-10-01-console-feedback-roundtrip-completion`). Controller: `console/review.js` (`InnfoReview`).
## Requirements
### Requirement: No Review Mode — Always-On Proposals

There is NO review mode and no toggle. An edit only ever creates a DRAFT, never a direct write, so the edit affordance is always emitted and always live: the console MUST NOT set `html[data-innfo-review]`, MUST NOT render a review-mode toggle, and MUST NOT gate the edit pencil behind CSS.

The capability is split by what each condition protects:
- `canPropose` (`meta.modelId` present AND every element carries a `hash`) gates the edit ANCHORS. It deliberately does NOT require the export surface: a draft is local, and applying it lives outside the console (the MCP owns `propose_changeset` / `apply_change`).
- `canReview` (= `canPropose` AND `changeset-export` declared) gates the EXPORT surface: the "changed" filter, "+ New element", and the changeset bar's export. The controller MUST be created when either holds.

The changeset bar (`#innfo-review-dock`) MUST be STATE-driven: it shows only while the draft store holds at least one draft and hides at zero. It is not a mode and MUST NOT offer a mode exit; its controls are the reviewer identity, the draft count, the jump to the Changes tab, the export, and a "Hide" that only hides the bar.

A proposal that could not be APPLIED MUST warn inside the edit modal instead of hiding the affordance: an element without a `hash` renders a `role="alert"` banner stating that the apply engine cannot verify the `base_hash` precondition.

Every proposal MUST show who is proposing (`Proposing as <name>`) in the edit modal, using the remembered identity (`localStorage`), and MUST flag the shared default pseudonym (`reviewer`) so several reviewers do not collapse into a single author.

Badge and mark decoration is capability-free and always runs: the verdict badges, the change pips, the reviewed toggle and the rail progress reflect state (changesets, local drafts, reviewed marks), not proposals, so they MUST decorate however the console boots. The proposal ANCHORS (the tag/relation controls on a card and the matrix-cell anchors) decorate only when `canPropose` holds. The element-card contract therefore has two layers: the card renders unconditionally, while its proposal anchors are capability-gated.

(Previously: an explicit review-mode toggle in the dock, off by default and withheld unless `changeset-export` + `meta.modelId` + every element hashed; edit controls hidden via `html:not([data-innfo-review=on])` and refused by the delegated listener.)

#### Scenario: No toggle, no mode attribute
- GIVEN a freshly loaded console
- WHEN it renders
- THEN no review-mode toggle exists and `html[data-innfo-review]` is absent

#### Scenario: The pencil is live
- GIVEN a proposable domain
- WHEN the edit pencil of an editable unit is activated
- THEN the shared edit modal opens, and nothing is written (a draft is proposed)

#### Scenario: The bar is state-driven
- GIVEN a console with no drafts
- WHEN it renders
- THEN `#innfo-review-dock` is hidden
- AND WHEN a draft is saved
- THEN the bar is visible with its count
- AND WHEN the drafts are cleared
- THEN the bar hides again

#### Scenario: Who is proposing
- GIVEN the default reviewer pseudonym is in effect
- WHEN the edit modal opens
- THEN it shows `Proposing as "reviewer" (default)` and the reviewer chip is flagged

#### Scenario: Unapplicable proposal warns
- GIVEN an element whose `hash` is missing
- WHEN its edit pencil is activated
- THEN the modal carries a `role="alert"` banner about the `base_hash` precondition

---

### Requirement: Inline Annotation Popover

Annotating MUST open the kit `AnnotationPopover` anchored to the card or field row, replacing `window.prompt` (which MUST NOT remain). A card anchor offers `comment` and `delete`; a field-row anchor offers `comment` and `correction`. A field-row anchor MUST set `target.field`; a card anchor MUST omit it. `correction` MUST prefill `original` from the payload element's field value (not DOM text) and capture `proposed`. Escape or cancel MUST close the popover, return focus to the anchor, and save nothing. Each saved draft MUST record the element's current `hash` as `base_hash`.

#### Scenario: Field correction
- GIVEN a field row `owner` with payload value `A`
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

Each element MUST have a reviewed toggle (`ReviewedToggle`) persisted in the draft store with the element hash recorded at marking. A mark counts as reviewed only while the recorded hash equals the current `hash`; otherwise it shows `changed` and does not count. The rail MUST show `reviewed/total` and the pending-draft count per concept via `RailProgress`; totals come from the payload (the scoped payload for a scoped console), independent of filters. Reviewed controls are always shown (there is no mode).
(Previously: "in BOTH renderers".)

#### Scenario: Progress updates
- GIVEN a concept with 4 elements, 1 reviewed, 2 drafts
- WHEN the reviewer marks another reviewed
- THEN the rail shows `2/4` and pending `2` for that concept

#### Scenario: Survives reload
- GIVEN an element marked reviewed
- WHEN the console reloads
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

Elements targeted by changeset changes MUST show a kit `StatusBadge` per change status, with count: `applied` and `conflict` derived from `element.history` (applied and partially applied changesets), and `proposed` derived from the proposed changesets of the domain payload's `changes` collection. Badges MUST derive only from changesets, never from local drafts, and MUST always be visible. Entries whose element no longer exists MUST NOT render. Statuses MUST NOT be settable from the console. No other verdict state exists: `pending`, `rejected` and `stale` reviewer verdicts are retired with the verdict ledger, and per-draft staleness is shown on the draft ("target changed"), not as a badge. (Previously: badges were derived from `meta.feedbackState`, read from the verdict ledger.)

#### Scenario: Applied badge
- GIVEN `element.history` lists one applied change targeting an element
- WHEN rendered
- THEN that element shows an `applied` StatusBadge with count 1

#### Scenario: Proposed badge
- GIVEN a proposed changeset in the payload `changes` collection with a change targeting an element
- WHEN rendered
- THEN that element shows a `proposed` StatusBadge

#### Scenario: Draft is not a status
- GIVEN a local draft and no changeset targeting the element
- WHEN rendered
- THEN no status badge appears

#### Scenario: Orphan entry
- GIVEN a change targeting a missing element
- WHEN rendered
- THEN nothing is rendered for it and no error is thrown

#### Scenario: Badges in a scoped console
- GIVEN an applied change targeting an element, rendered in a whole-domaiNN console and in a console scoped to its model
- WHEN badges render
- THEN both consoles show the same `applied` StatusBadge for that element

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

`j`/`k` MUST move focus to the next/previous element card — resolving the card by containment, so focus on a control INSIDE a card counts as that card — and `c` MUST open the shared modal for the focused element; shortcuts MUST be ignored while typing in an input, textarea or select. The popover MUST trap focus. The draft counter MUST live in an `aria-live="polite"` region and update on every add or delete. Focus MUST return to the triggering control after save or cancel. Controls MUST meet the kit contrast floor in light and dark themes, and the layout MUST remain usable at narrow viewports.

#### Scenario: Keyboard-only annotation
- GIVEN focus on an element
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
- WHEN a draft is saved
- THEN no network request is issued and the bundle contains neither `fetch(` nor `type=module`

### Requirement: Unit Info And Edit Entry Points

Every knowledge-unit badge MUST expose an **info** action (`[data-ku-action="info"]`, in a sibling `span.innfo-ku-actions` cluster outside the badge root, always present) opening `KuInfoPanel`.

An **edit** pencil affordance (`[data-ku-action="edit"]`) MUST be emitted for units whose editability is not `none`:
- Sources (`home === 'source'`) and containers (`nature === 'container'`: domain, document, section) MUST NEVER display an edit pencil.
- Structure units (`nature === 'structure'`: concept definition, field definition, matrix definition) MUST display the pencil like any other editable unit; there is no switch. Activating it opens `EditModal` in comment-only mode and carries the structure warning banner.
- Inherited concept-level values displayed on element cards MUST NOT display an edit pencil (info-only). The pencil for an inherited value appears ONLY on its concept section badge, emitting `update_concept_field` with a scope notification ("applies to every element of concept X").
- Content units (`element`, own `value`, matrix cell) open `EditModal` for field/element mutation.

The badge's `+` flyout is the ONLY edit entry point: an element card MUST NOT carry permanent name/description pencils and a field row MUST NOT carry a permanent pencil. The retired `name-anchor`, `desc-anchor` and `field-anchor` controls MUST NOT exist in the runtime or the kit.

(Previously: edit affordances were element-only and opened the modal Edit tab directly.)

#### Scenario: Info action opens KuInfoPanel
- GIVEN any rendered console
- WHEN the info action on any unit is clicked
- THEN `KuInfoPanel` opens for that unit

#### Scenario: Sources never show edit pencil
- GIVEN a Source badge rendered in the console
- WHEN the console renders
- THEN no edit pencil is rendered or visible for that Source

#### Scenario: Inherited value edited only on section badge
- GIVEN concept-level tags on concept `"Threat"`
- WHEN viewing an element card of concept `"Threat"`
- THEN the tags badge displays `"inherited from Threat"` and has no edit pencil
- AND WHEN viewing the `"Threat"` concept section badge
- THEN an edit pencil is present, and activating it opens the modal emitting `update_concept_field`

---

### Requirement: Pending-Change Indicator

A unit badge whose canonical address (`data-ku-address`) has one or more local drafts MUST show a count pip (`button[data-innfo-component="ku-change-pip"]`) and set `data-ku-changes="<n>"`.

The pip count is the number of drafts targeting that unit's canonical address. The badge border MUST reflect the aggregate draft status using status tokens. Activating the pip MUST open the shared modal on the Changes/History tab. The indicator MUST be visible in both review modes and MUST update whenever drafts are added or removed.

(Previously: pips were attached only to elements and fields, not addressing matrix cells or section values.)

#### Scenario: Draft adds pip to matrix cell
- GIVEN a matrix cell with address `"swot@matrix&r1&c1"`
- WHEN a draft targeting that exact address is saved
- THEN the cell badge displays a change pip with text `"1"` and `data-ku-changes="1"`

#### Scenario: Deleting draft removes pip
- GIVEN a unit with one draft
- WHEN that draft is deleted
- THEN the pip is removed and `data-ku-changes` is cleared

### Requirement: Multi-tab-safe, durable draft store

The draft store MUST be keyed by the console's stable store key only (the domain id for a domain console, `::view:<id>` for a standalone view export) and MUST NOT record a model or domain version. The store MUST re-read persisted state before every write (or reconcile on the `storage` event) so two tabs never overwrite each other's drafts. A failed write MUST be surfaced to the user, not swallowed. After a successful export the user MUST be offered to clear the exported drafts. Staleness MUST be per draft (`base_hash` against the current element hash); there is no store-level staleness, rebase or refresh. A store persisted with an earlier `STORE_VERSION` MUST read as empty; it is neither migrated nor partially read. (Previously: the store recorded a sticky model version while drafts existed.)

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

#### Scenario: Old store discarded
- GIVEN a store persisted with the previous `STORE_VERSION` and drafts keyed by old ids
- WHEN the console loads
- THEN the store reads as empty and no draft is migrated

### Requirement: New element draft

A model view MUST offer a "New element" action that opens the shared modal with a
concept picker (the concepts of the embedded schema), a name input, and one input per
field the schema declares on the chosen concept. Submitting MUST store a draft with
`kind: "new"`, `knowledge_id`, `concept`, `element` (the name) and `proposed` (a map of the
filled fields). The draft store MUST accept a `kind: "new"` draft without `element_id`
and `base_hash`, and MUST reject it when `knowledge_id`, `concept` or `element` is missing;
every other kind keeps requiring `element_id` and `base_hash`. The changeset export MUST
map the draft to `op:: add_element` with `concept`, `name` and `fields`. The action
MUST NOT create models and MUST work offline.

#### Scenario: New element exports as add_element
- GIVEN the console of model `strategy` with concept `Goal` in its schema
- WHEN the user adds a new element `Grow revenue` of concept `Goal` with field `owner` set to `CFO`
- THEN the exported changeset contains `op:: add_element`, `target:: strategy@Goal`, `concept:: Goal`, `name:: Grow revenue` and `fields::` with `owner`

#### Scenario: Store accepts a new draft without base_hash
- GIVEN a draft with `kind: "new"`, `knowledge_id`, `concept` and `element` and no `element_id` or `base_hash`
- WHEN `addDraft` is called
- THEN the draft is stored

#### Scenario: Incomplete new draft rejected
- GIVEN a draft with `kind: "new"` and no `concept`
- WHEN `addDraft` is called
- THEN it throws naming the missing key

#### Scenario: Correction still requires base_hash
- GIVEN a draft with `kind: "correction"` and no `base_hash`
- WHEN `addDraft` is called
- THEN it throws as before

### Requirement: Reference Edit Filtered by Target Concepts

The edit modal for a field declared `reference` (and the relation retarget anchor) MUST offer as candidates only the elements of the same model whose concept is listed in the field's declared `target_concepts` (compared case-insensitively); when the field declares no `target_concepts`, every element of the same model is a candidate. Each candidate MUST be labelled with its display name, and choosing one MUST propose the value `[[<Display Name>]]`, the exact reference grammar the engine resolves (no slug-only or cross-model form). (S3b P1-8.)

#### Scenario: Candidates follow target_concepts
- GIVEN (`Initiative`, `owner`) declared `reference` with `target_concepts: [Person]`, and the model has `Person` elements `Ana`, `Ben` and a `Team` element `Core`
- WHEN the reviewer opens the edit modal on an initiative's `owner`
- THEN the candidate list holds `Ana` and `Ben` and not `Core` (today every element of every model is offered)

#### Scenario: Proposal uses the reference grammar
- GIVEN that modal
- WHEN `Ben` is chosen and saved
- THEN `proposed` is `[[Ben]]`

#### Scenario: Undeclared targets offer the model
- GIVEN a reference field with no `target_concepts`
- WHEN its modal opens
- THEN every element of the same model, and no element of another model, is a candidate

### Requirement: Constrained Matrix Cell Editor

When a matrix cell's governing definition declares a `widget` and `values` (the matrix definition of a free matrix), the cell edit modal MUST constrain the proposal to that definition: `set`, `scale` and `cycle` MUST offer a select over `values` plus the blank option and the preserved current value of `console-ui-kit` "Edit Modal Value Type Safety"; `boolean` MUST offer a checkbox proposing `true` or `false`; `text` or no declared widget keeps the string input. The domain `innfo-schema` slot MUST carry the matrix definitions (`widgetType`, `values`) this needs. Whether the engine additionally rejects an out-of-`values` cell on apply is decided by the S3b matrix spike and recorded in `design.md`; the console constraint MUST NOT depend on it. (S3b P1-11.)
(Previously: the governing definition could also be the column Marker of the reserved `item-markers matrix`, which no longer exists.)

#### Scenario: Set widget offers only its values
- GIVEN a free matrix declared with `widget: set` and `values: [Max, High, Low]`
- WHEN the reviewer edits one of its cells
- THEN the widget is a `select` offering `""`, `Max`, `High`, `Low` (today a free-text input is offered)

#### Scenario: Boolean widget cell
- GIVEN a free matrix declared with `widget: boolean`
- WHEN a cell is edited and checked
- THEN `proposed` is `true`

#### Scenario: Undeclared widget keeps text
- GIVEN a matrix with no declared `widget`
- WHEN a cell is edited
- THEN the widget is a text input

#### Scenario: Definitions reach the domain console (regression)
- GIVEN a fixture domaiNN whose bluepriNNt declares a matrix with `widget: set` and `values`
- WHEN it is exported with `export-console.mjs --domain`
- THEN the `innfo-schema` slot carries that definition's `widgetType` and `values` (today the domain slot carries only `concepts`, `fields` and `procedures`)

### Requirement: Widget-Aware Field Editor

The field edit modal MUST honor the declared Field: `boolean` offers a checkbox, `scale` a bounded numeric control using `widget_config`, `cycle` and `set` a select over the Field options, `text` a text input; a closed `select` offers exactly its options plus the blank option and the preserved current value. A multi-valued Field MUST offer a multi-select (closed vocabulary) or a free-entry chip input (open vocabulary) and MUST propose an array. A proposed tag add or remove MUST be recorded as a `correction` draft on field `tags` carrying the full new array, which applies as `update_field`, not as a comment draft with `field: 'tags'`. Concept-level values are rendered read-only; editing them belongs to the `unified-knowledge-unit-badges` change. Undeclared Fields keep shape-based inference.

#### Scenario: Closed multi-select
- GIVEN a multi-valued closed Field with options `[core, edge]` and current value `[core]`
- WHEN its modal opens
- THEN a multi-select offers `core` and `edge` with `core` selected
- AND selecting `edge` proposes `[core, edge]`

#### Scenario: Open tags accept a new value
- GIVEN the open multi-valued `tags` Field
- WHEN the reviewer enters `new-tag`
- THEN the proposal contains `new-tag` and the draft updates the `tags` Field

#### Scenario: Scale control is bounded
- GIVEN a Field with `widget: scale` and config min 0, max 100, step 5
- WHEN its modal opens
- THEN the control enforces 0..100 in steps of 5

#### Scenario: Tag draft is not a comment
- GIVEN a tag added from an element card
- WHEN the draft is stored
- THEN it targets the `tags` Field with the resulting array and is not a comment draft

### Requirement: Structure-Change Warning

There MUST be no "Edit structure" switch and no `html[data-innfo-structure]` attribute. The edit pencil for a structure unit (concept definition, field definition, matrix definition) MUST be emitted like any other editable unit; activating it opens `EditModal` in comment-only mode (blueprint writes are not supported yet), producing an `op: "comment"` draft.

Because that is a different KIND of act, the modal MUST carry a `role="alert"` banner at the top stating that the change targets the STRUCTURE of the domain (the bluepriNNt), that it affects every element that uses the definition, and that it is filed as a comment for the blueprint maintainer and will not be applied automatically.

(Previously: an "Edit structure" switch in the review dock, off by default, gating the structure pencils via `html:not([data-innfo-structure=on])` and resetting on exit.)

#### Scenario: No switch, no attribute
- GIVEN a rendered console
- THEN no `[data-innfo="structure-switch"]` exists and `html[data-innfo-structure]` is absent

#### Scenario: Structure pencil warns instead of hiding
- GIVEN a structure unit badge
- WHEN its edit pencil is activated
- THEN the modal opens with the structure warning banner and the comment-only Propose label

---

### Requirement: Derived Unit Editability

Editability of any knowledge unit MUST be derived as a pure function `describeUnitEditability(unit)` without caller overrides:
1. `home === 'source'` → `editability: 'none'`
2. `nature === 'container'` → `editability: 'none'`
3. `nature === 'structure'` → `editability: 'structure'`
4. `kind === 'value'` and `isInherited === true` and context is an element card → `editability: 'none'`
5. `kind === 'value'` and context is a concept section badge → `editability: 'review'` (emits `update_concept_field`)
6. `kind === 'element'` or own `kind === 'value'` or matrix cell → `editability: 'review'`

The kit and runtime MUST NOT permit callers to pass arbitrary `editable: true` flags bypassing this derivation.

#### Scenario: Container is never editable
- GIVEN a document or domain unit
- WHEN its descriptor is generated
- THEN `editability` is `'none'`

#### Scenario: Element own field is review editable
- GIVEN an element's own field value
- WHEN its descriptor is generated
- THEN `editability` is `'review'`

## Deferred

- Print/PDF view.
- Threaded replies.
- Multi-reviewer merge.
- Reviewer-chosen `layer`/`severity`, stable non-name element ids, draft sync beyond `localStorage`.
- The reviewer status `<select>` removal is NOT in this change (it belongs to change A); C only asserts its absence.
