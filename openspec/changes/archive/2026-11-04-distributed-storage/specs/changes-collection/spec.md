# Delta for changes-collection

Living spec read: `openspec/specs/changes-collection/spec.md`. No existing requirement is replaced or removed. This delta is conditional on a design decision: the proposal lists `changes-collection` as modified only if design extends `nature.structure` instead of adding a new key for storage. The requirement below holds for either answer: whichever surface carries the storage declaration, the `changes` collection and the `nature` values already declared by the core bluepriNNts keep their meaning. If design introduces a separate key, this delta reduces to the non-regression requirement below and no other change to this capability is needed.

## ADDED Requirements

### Requirement: The `changes` collection is unaffected by the storage declaration

The `changes` bluepriNNt MUST keep `nature: { structure: members, ownership: derived }`. Existing `nature` declarations of `sources`, `artifacts`, `procedures` and `changes` MUST parse and mean what they mean today, whether or not design reuses `nature.structure` for storage. A `Change` unit MUST keep its address and rendering (`<batch>#<change-id>`). The changeset documents under `changes/` MUST NOT be classified as instance models.

#### Scenario: Changes declaration unchanged
- GIVEN the `changes` bluepriNNt after this change
- WHEN its `nature` is parsed
- THEN it is `structure: members`, `ownership: derived` and no diagnostic is emitted

#### Scenario: One unit per change
- GIVEN a domaiNN with two batch documents holding 3 changes in total
- WHEN the console is exported
- THEN exactly 3 `Change` units exist, with ids of the form `<batch>#<change-id>`

#### Scenario: Changeset is not an instance model
- GIVEN a changeset under `changes/`
- WHEN models are classified against declared placements
- THEN it is not an instance model and no placement finding is reported
