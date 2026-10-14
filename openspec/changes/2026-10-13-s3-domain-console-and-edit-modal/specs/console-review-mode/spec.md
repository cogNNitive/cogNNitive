# Delta for console-review-mode

## ADDED Requirements

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

When a matrix cell's governing definition declares a `widget` and `values` (the matrix definition of a free matrix, or the column Marker of the reserved `item-markers matrix`), the cell edit modal MUST constrain the proposal to that definition: `set`, `scale` and `cycle` MUST offer a select over `values` plus the blank option and the preserved current value of `console-ui-kit` "Edit Modal Value Type Safety"; `boolean` MUST offer a checkbox proposing `true` or `false`; `text` or no declared widget keeps the string input. The domain `innfo-schema` slot MUST carry the marker and matrix definitions (`widgetType`, `values`) this needs. Whether the engine additionally rejects an out-of-`values` cell on apply is decided by the S3b matrix spike and recorded in `design.md`; the console constraint MUST NOT depend on it. (S3b P1-11.)

#### Scenario: Set widget offers only its values
- GIVEN a free matrix declared with `widget: set` and `values: [Max, High, Low]`
- WHEN the reviewer edits one of its cells
- THEN the widget is a `select` offering `""`, `Max`, `High`, `Low` (today a free-text input is offered)

#### Scenario: Boolean marker column
- GIVEN an `item-markers matrix` column whose Marker declares `widget: boolean`
- WHEN a cell in that column is edited and checked
- THEN `proposed` is `true`

#### Scenario: Undeclared widget keeps text
- GIVEN a matrix with no declared `widget`
- WHEN a cell is edited
- THEN the widget is a text input

#### Scenario: Definitions reach the domain console (regression)
- GIVEN a fixture domaiNN whose bluepriNNt declares a matrix with `widget: set` and `values`
- WHEN it is exported with `export-console.mjs --domain`
- THEN the `innfo-schema` slot carries that definition's `widgetType` and `values` (today the domain slot carries only `concepts`, `fields` and `procedures`)
