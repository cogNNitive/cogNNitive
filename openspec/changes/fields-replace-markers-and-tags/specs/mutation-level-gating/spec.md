# Delta for Mutation Level Gating

## MODIFIED Requirements

### Requirement: Template-Authoring Ops Are Level-2 Only

`add_concept` and `add_field` MUST be admissible only when the
target model's `frontmatter.level === 2`. `applyChange`/`runMutation` MUST
check this BEFORE performing the mutation, and MUST reject with an explicit,
level-naming error when the target model's level is not 2. No other mutation
handler is affected by this gate. `add_field` MUST accept a multi-concept target (`*` or a list), the `multiple` property (select only), `widget` and `widget_config`, and the `number` and `boolean` types, for a level-2 target, validating them under the metaschema rules of `field-value-model`. `update_concept_field` and `remove_matrix` are Level-3 content operations and are not gated by this requirement.
(Previously: `set_marker` was a third gated operation; it no longer exists. `add_field` took a single concept.)

#### Scenario: Level-2 model accepts the mutation

- GIVEN a model with `frontmatter.level: 2`
- WHEN `add_concept` or `add_field` is applied
- THEN the mutation proceeds and is persisted as before

#### Scenario: Level-3 model rejects add_concept early

- GIVEN a model with `frontmatter.level: 3`
- WHEN `apply_change add_concept` is called
- THEN the call fails before any mutation is attempted
- AND the error explicitly states the operation requires `level: 2`

#### Scenario: Rejection message is not a downstream schema error

- GIVEN a model with `frontmatter.level` other than 2
- WHEN either gated op is called
- THEN the returned error names the level mismatch directly
- AND it is NOT the generic `checkElementGroups()` "not defined in template" error

#### Scenario: Rollback leaves nothing written

- GIVEN a model with `frontmatter.level` other than 2
- WHEN a gated op is rejected
- THEN the model file on disk is unchanged

#### Scenario: Other mutation handlers are unaffected

- GIVEN a model at any level
- WHEN a mutation handler other than `add_concept`/`add_field` is applied
- THEN the level gate does not apply and the handler behaves as before

#### Scenario: Multi-concept add_field

- GIVEN a level-2 model
- WHEN `add_field` is applied with `concept` set to `*`
- THEN the Field is persisted with the star target and resolves for every concept

#### Scenario: set_marker no longer gated or accepted

- GIVEN any model
- WHEN `set_marker` is called
- THEN it fails as `UNKNOWN_OPERATION` rather than with a level error
