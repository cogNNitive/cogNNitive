# Delta for console-review-mode

## MODIFIED Requirements

### Requirement: Review Mode Toggle

The console MUST provide an explicit review mode toggle in `#innfo-review-dock`, off by default and not persisted across loads. The toggle MUST be offered only when `changeset-export` is declared, `meta.modelId` is present, and EVERY element carries a `hash`; otherwise it MUST NOT render (no fallback).

With review mode off, edit controls emitted in the DOM for editable units MUST be hidden via CSS (`html:not([data-innfo-review=on]) [data-ku-action="edit"] { display: none; }`), removing them from visual rendering, keyboard focus order, and the accessibility tree. As defense in depth, the delegated action listener MUST refuse `edit` actions when `html[data-innfo-review=on]` is absent, and `controller.openEdit` MUST return `false` when review mode is disabled.

With review mode on, `html[data-innfo-review=on]` is set, revealing the edit pencil for content units. The toggle MUST expose its state via `aria-pressed`.

(Previously: the requirement strictly stated "no edit, annotation, or reviewed control exists in the DOM" with review mode off; this is relaxed to Decision A1 CSS gating and behavioural refusal.)

#### Scenario: Off by default
- GIVEN a freshly loaded console with `modelId` and all hashes
- WHEN it renders
- THEN review mode is off
- AND edit controls are not rendered, not focusable, absent from the accessibility tree, and inert

#### Scenario: Toggle on reveals edit controls
- GIVEN review mode is off
- WHEN the reviewer activates the toggle
- THEN `html[data-innfo-review=on]` is present
- AND content unit edit controls are rendered, visible, and interactive
- AND the toggle reports `aria-pressed="true"`

#### Scenario: Toggle withheld
- GIVEN a payload with no `meta.modelId`, or one element without `hash`
- WHEN the console renders
- THEN no toggle exists and no edit control is interactive

#### Scenario: Not persisted across reloads
- GIVEN review mode on, then a reload
- WHEN the console renders
- THEN review mode is off

---

### Requirement: Unit Info And Edit Entry Points

Every knowledge-unit badge MUST expose an **info** action (`[data-ku-action="info"]`, in a sibling `span.innfo-ku-actions` cluster outside the badge root, always present) opening `KuInfoPanel`.

An **edit** pencil affordance (`[data-ku-action="edit"]`) MUST be emitted for units whose editability is not `none`:
- Sources (`home === 'source'`) and containers (`nature === 'container'`: domain, document, section) MUST NEVER display an edit pencil.
- Structure units (`nature === 'structure'`: concept definition, field definition, matrix definition) MUST display an edit pencil only when the Edit structure switch is ON. Activating it opens `EditModal` in comment-only mode.
- Inherited concept-level values displayed on element cards MUST NOT display an edit pencil (info-only). The pencil for an inherited value appears ONLY on its concept section badge, emitting `update_concept_field` with a scope notification ("applies to every element of concept X").
- Content units (`element`, own `value`, matrix cell) open `EditModal` for field/element mutation.

(Previously: edit affordances were element-only and opened the modal Edit tab directly.)

#### Scenario: Info action opens KuInfoPanel
- GIVEN review mode off or on
- WHEN the info action on any unit is clicked
- THEN `KuInfoPanel` opens for that unit

#### Scenario: Sources never show edit pencil
- GIVEN a Source badge rendered in the console
- WHEN review mode is enabled
- THEN no edit pencil is rendered or visible for that Source

#### Scenario: Inherited value edited only on section badge
- GIVEN concept-level tags on concept `"Threat"`
- WHEN viewing an element card of concept `"Threat"` in review mode
- THEN the tags badge displays `"inherited from Threat"` and has no edit pencil
- AND WHEN viewing the `"Threat"` concept section badge in review mode
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

## ADDED Requirements

### Requirement: Edit Structure Switch

The review dock (`#innfo-review-dock`) MUST provide an "Edit structure" switch (`button[role="switch"]`) offered in review mode:
- Off by default (`aria-checked="false"`).
- Activating the switch toggles `html[data-innfo-structure=on]` and sets `aria-checked="true"`.
- Exiting review mode MUST reset the switch to off and remove `html[data-innfo-structure=on]`.
- While the switch is ON, structure unit badges (concept definitions, field definitions, matrix definitions) expose an edit pencil.
- Activating a structure pencil opens `EditModal` in comment-only mode with the Propose button labelled to propose a structural change to the blueprint maintainer, producing an `op: "comment"` draft.

#### Scenario: Switch toggles structure pencils
- GIVEN review mode is ON and the Edit structure switch is OFF
- WHEN a field definition badge is inspected
- THEN its edit pencil is hidden by CSS (`html:not([data-innfo-structure=on])`)
- AND WHEN the reviewer activates the Edit structure switch
- THEN `html[data-innfo-structure=on]` is set and the pencil becomes visible

#### Scenario: Structure edit produces comment draft
- GIVEN Edit structure is ON
- WHEN the reviewer clicks the pencil on a field definition and submits notes
- THEN an `op: "comment"` draft targeting that field definition is saved

#### Scenario: Switch resets on exit
- GIVEN Edit structure is ON
- WHEN review mode is turned OFF
- THEN the switch resets to OFF and `html[data-innfo-structure=on]` is removed

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
