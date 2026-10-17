# Delta for Changeset Apply Engine

Base text: the living requirement as rewritten by `session/ku-lifecycle-fixes` (changeset lifecycle: `freeze_slugs` and `bump_version` are Level-3 changeset operations, `generate_index` is the only direct maintenance operation). That branch lands before this change; this delta changes only the schema-operation list and adds the two new content operations.

## MODIFIED Requirements

### Requirement: Direct `apply_change` operations are a closed, classified set
The `apply_change` tool MUST accept an operation only if it is a changeset `ChangeOp` (including `freeze_slugs`, `bump_version`, `update_concept_field` and `remove_matrix`), the direct maintenance operation `generate_index` or a direct schema operation (`add_concept`, `add_field`). Any other operation, including the removed `set_marker`, MUST fail with `UNKNOWN_OPERATION` and write nothing.

Rule: anything that mutates a Level-3 kNNowledge model is a changeset operation, so that it is sealed, recorded, versioned and citable. A bare call of a changeset operation is synthesized into a one-change changeset and applied through the normal path. Only operations that cannot touch Level-3 content stay direct:
- `generate_index` writes the derived index of a Level-2 bluepriNNt and refuses a Level-3 model.
- `add_concept` and `add_field` author Level-2 bluepriNNt primitives (traced by git and the bluepriNNt version). On a Level-3 model they have no meaning and MUST fail with `SCHEMA_OP_ON_LEVEL3`, writing nothing.
- `bump_version` on a Level-2 bluepriNNt sets `blueprint_version` in place (`{ bump }` or `{ version }`) after the bluepriNNt validates (`validate_blueprint`). A bluepriNNt that does not validate is refused and not written, and the live filename never changes.
- `freeze_slugs` on a model whose elements all carry explicit slugs is an applied no-op: the change is annotated `Slugs already frozen; nothing to do`, the model is not touched and its version is not bumped.
- `bump_version` on a model created by `add_model` in the same changeset is refused with `BUMP_ON_CREATED_MODEL` (set the initial `knowledge_version` on `add_model`). A base version that cannot be bumped is refused with `INVALID_VERSION`. A bump is never reported applied and then skipped.
- `freeze_slugs` and `bump_version` on a Level-3 model are changeset operations. `freeze_slugs` writes `slug::` lines into kNNowledge content. `bump_version` carries its level (`patch`, `minor` or `major`, default `patch`) in `to`. An explicit `version` is refused with `INVALID_BUMP_LEVEL`, the unversioned lineage record is refused with `RECORD_UNVERSIONED`, and a non-Level-3 target of either op is refused with `LEVEL3_ONLY`.

The apply engine MUST bump a touched model exactly once. A `bump_version` change replaces the default patch bump for its model; when several are present, the highest requested level wins. It MUST NOT add a bump on top. A higher level resets the lower ones (`V_0-1-3` minor gives `V_0-2-0`). The legacy rename of the model file to a `_V_x-y-z_` name and the cascade of renamed references are removed: live filenames are invariant.
(Previously: the direct schema operations were `add_concept`, `add_field` and `set_marker`.)

#### Scenario: Level-3 maintenance operation is a changeset
- GIVEN a Level-3 model `acme` at `knowledge_version: "V_0-1-0"`
- WHEN `apply_change` runs `bump_version` with `{ bump: "minor" }` on `acme`
- THEN one applied changeset with a `bump_version` change is written under `changes/`
- AND `kNNowledge/acme_NN.md` has `knowledge_version: "V_0-2-0"` (not `V_0-2-1`)
- AND replaying the changeset changes nothing

#### Scenario: freeze_slugs on a Level-3 model is a changeset
- GIVEN a Level-3 model whose elements have no explicit slugs
- WHEN `apply_change` runs `freeze_slugs` on it
- THEN a changeset is recorded, the slugs are written, and the version is bumped once by patch

#### Scenario: Schema authoring is refused on a Level-3 model
- GIVEN a Level-3 model `acme`
- WHEN `apply_change` runs `add_concept`
- THEN it fails with `SCHEMA_OP_ON_LEVEL3`, no changeset is written and the model is byte-identical

#### Scenario: Level-2 bump stays direct
- GIVEN a Level-2 bluepriNNt document `tpl`
- WHEN `apply_change` runs `bump_version` with `{ bump: "minor" }` on `tpl`
- THEN its `blueprint_version` is raised in place and no changeset is written under `changes/`

#### Scenario: Content operation is synthesized as a changeset
- GIVEN a model `acme` with an element `risk-1`
- WHEN `apply_change` runs a content operation (for example `update_field`) with `id` and `args`
- THEN one applied changeset is written under `changes/`

#### Scenario: Unclassified operation is rejected
- GIVEN an operation name that is neither a `ChangeOp` nor in the maintenance or schema lists
- WHEN `apply_change` receives it
- THEN it fails with `UNKNOWN_OPERATION` and no file is changed

#### Scenario: Removed operation is rejected
- GIVEN the operation name `set_marker`
- WHEN `apply_change` receives it, on a Level-2 or a Level-3 target
- THEN it fails with `UNKNOWN_OPERATION` (not `SCHEMA_OP_ON_LEVEL3`) and no file is changed

#### Scenario: Partition is exhaustive
- GIVEN the set of operations the engine implements
- WHEN the classification test compares it with `ChangeOp`, the maintenance list and the schema list
- THEN every implemented operation belongs to exactly one list

## ADDED Requirements

### Requirement: Concept-Level Field and Matrix Removal Operations

The `ChangeOp` set MUST gain `update_concept_field {conceptName, fieldName, value}` and `remove_matrix {matrixName}`. Both are Level-3 content operations applied through a changeset, and both MUST be listed in the closed `op` options of the `changes` bluepriNNt, so that a changeset using them validates. `update_concept_field` MUST write the concept-level value of a declared Field, validated by the same `validateFieldValue` as element values, and MUST NOT touch element own values or the concept text. `remove_matrix` MUST delete the named matrix section, including an `item-markers matrix`, and MUST fail naming `matrixName` when that matrix does not exist. Preconditions: `update_concept_field` MUST carry `from`, the current concept-level value in canonical form (empty when none is set), and MUST fail with `PRECONDITION_FAILED` and write nothing when it does not match. `remove_matrix` carries no precondition. Neither operation uses `base_hash`, which is element-scoped. Two changes in one changeset that target the same concept field, or the same matrix, MUST be reported as a conflict.

#### Scenario: Concept-level value updated
- GIVEN a model whose concept `Goals` has `tags:: [core]`
- WHEN a changeset applies `update_concept_field` with `fieldName: tags`, `from: [core]` and `value: [core, ai]`
- THEN the concept section holds `tags:: [core, ai]` and no element gains or loses an own value

#### Scenario: Stale concept-level precondition
- GIVEN concept `Goals` with `tags:: [core, ai]`
- WHEN `update_concept_field` arrives with `from: [core]`
- THEN it fails with `PRECONDITION_FAILED` and nothing is written

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

#### Scenario: Changeset with the new ops validates
- GIVEN a changeset document holding one `update_concept_field` and one `remove_matrix` change
- WHEN it is validated against the `changes` bluepriNNt
- THEN no invalid-`op` diagnostic is reported

### Requirement: Multi-Valued Field Updates and Pre-Change Hash Preconditions

`update_field` changes on a multi-valued Field MUST accept an array and validate each member under the Field vocabulary rules of `field-value-model`. They MUST write own values only, never inherited ones. A change carrying a `base_hash` computed before the markers-free hash contract MUST fail the existing `base_hash` precondition as a stale hash, and MUST never apply silently.

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
