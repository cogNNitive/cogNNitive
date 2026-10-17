# Delta for Console Review Mode

## MODIFIED Requirements

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

## ADDED Requirements

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
