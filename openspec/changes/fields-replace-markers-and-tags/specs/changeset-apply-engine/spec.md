# Delta for Changeset Apply Engine

## MODIFIED Requirements

### Requirement: Direct `apply_change` operations are a closed, classified set
The `apply_change` tool MUST accept an operation only if it is a changeset `ChangeOp`, a maintenance operation (`bump_version`, `generate_index`, `freeze_slugs`) or a schema operation (`add_concept`, `add_field`); any other operation, including the removed `set_marker`, MUST fail with `UNKNOWN_OPERATION` and write nothing. Every change to Level-3 content MUST go through a changeset; maintenance and schema operations MAY write the model file directly because they alter no Level-3 content.
(Previously: the schema operations were `add_concept`, `add_field`, `set_marker`.)

#### Scenario: Maintenance operation writes directly
- GIVEN a frozen model `acme`
- WHEN `apply_change` runs `bump_version` on `acme`
- THEN the model file is rewritten and no changeset is written under `changes/`

#### Scenario: Content operation is synthesized as a changeset
- GIVEN a model `acme` with an element `risk-1`
- WHEN `apply_change` runs a content operation (for example `set_field`) with `id` and `args`
- THEN one applied changeset is written under `changes/`

#### Scenario: Unclassified operation is rejected
- GIVEN an operation name that is neither a `ChangeOp` nor in the maintenance or schema lists
- WHEN `apply_change` receives it
- THEN it fails with `UNKNOWN_OPERATION` and no file is changed

#### Scenario: Removed operation is rejected
- GIVEN the operation name `set_marker`
- WHEN `apply_change` receives it
- THEN it fails with `UNKNOWN_OPERATION` and no file is changed

#### Scenario: Partition is exhaustive
- GIVEN the set of operations the engine implements
- WHEN the classification test compares it with `ChangeOp`, the maintenance list and the schema list
- THEN every implemented operation belongs to exactly one list

## ADDED Requirements

### Requirement: Concept-Level Field and Matrix Removal Operations

The `ChangeOp` set MUST gain `update_concept_field {conceptName, fieldName, value}` and `remove_matrix {matrixName}`, both Level-3 content operations applied through a changeset. `update_concept_field` MUST write the concept-level value of a declared Field (validated by the same `validateFieldValue` as element values) and MUST NOT touch element own values. `remove_matrix` MUST delete the named matrix section, including an `item-markers matrix`, and MUST fail naming `matrixName` when it does not exist. Both MUST participate in conflict detection and the `base_hash` precondition like other content ops.

#### Scenario: Concept-level value updated
- GIVEN a model whose concept `Goals` has `tags:: [core]`
- WHEN a changeset applies `update_concept_field` with `fieldName: tags` and `value: [core, ai]`
- THEN the concept section holds `tags:: [core, ai]` and no element gains or loses an own value

#### Scenario: Invalid concept-level value is rejected
- GIVEN a closed Field `scope` with options `[core, edge]`
- WHEN `update_concept_field` sets it to `[other]`
- THEN the change is rejected naming `other` and nothing is written

#### Scenario: Matrix removed
- GIVEN a model with an `item-markers matrix`
- WHEN a changeset applies `remove_matrix` with that matrix name
- THEN the matrix section is absent from the serialized model

#### Scenario: Unknown matrix is rejected
- GIVEN a model without matrix `ghost`
- WHEN `remove_matrix {matrixName: ghost}` is applied
- THEN it fails naming `ghost` and nothing is written

### Requirement: Multi-Valued Field Updates and Pre-Change Hash Preconditions

`set_field`/`update_field` changes on a multi-valued Field MUST accept an array and validate each member under the Field vocabulary rules of `field-value-model`; they MUST write own values only, never inherited ones. A change carrying a `base_hash` computed before the markers-free hash contract MUST fail the existing `base_hash` precondition (a stale hash), never apply silently.

#### Scenario: Array update validated per member
- GIVEN a closed multi-valued Field `scope` with options `[core, edge]`
- WHEN a change sets `scope` to `[core, other]`
- THEN the change is rejected naming `other`

#### Scenario: Own values only
- GIVEN an element inheriting `tags:: [core]` from its concept
- WHEN a change sets `tags` to `[ai]`
- THEN the element's own `tags` is `[ai]` and the concept-level value is unchanged

#### Scenario: Pre-change base_hash is stale
- GIVEN a proposed change whose `base_hash` was computed with the old hash contract
- WHEN it is applied
- THEN it is reported as a precondition failure and the field is not written

#### Scenario: Tag correction applies as update_field
- GIVEN a review correction on field `tags` carrying the full new array
- WHEN it is applied
- THEN it is applied as `update_field` on the element's own `tags`
