# Mutation Level Gating Specification

## Purpose

Template-authoring mutation operations write level-2 primitives (concept and
field/marker definitions). They are only meaningful against a level-2
document; running them against any other level structurally succeeds but
produces an incoherent document that a later validation pass rejects with a
confusing, unrelated schema error. This spec pins an explicit, early gate.

## Requirements

### Requirement: Template-Authoring Ops Are Level-2 Only

`add_concept`, `add_field`, and `set_marker` MUST be admissible only when the
target model's `frontmatter.level === 2`. `applyChange`/`runMutation` MUST
check this BEFORE performing the mutation, and MUST reject with an explicit,
level-naming error when the target model's level is not 2. No other mutation
handler is affected by this gate.

#### Scenario: Level-2 model accepts the mutation

- GIVEN a model with `frontmatter.level: 2`
- WHEN `add_concept`, `add_field`, or `set_marker` is applied
- THEN the mutation proceeds and is persisted as before

#### Scenario: Level-3 model rejects add_concept early

- GIVEN a model with `frontmatter.level: 3`
- WHEN `apply_change add_concept` is called
- THEN the call fails before any mutation is attempted
- AND the error explicitly states the operation requires `level: 2`

#### Scenario: Rejection message is not a downstream schema error

- GIVEN a model with `frontmatter.level` other than 2
- WHEN any of the three gated ops is called
- THEN the returned error names the level mismatch directly
- AND it is NOT the generic `checkElementGroups()` "not defined in template" error

#### Scenario: Rollback leaves nothing written

- GIVEN a model with `frontmatter.level` other than 2
- WHEN a gated op is rejected
- THEN the model file on disk is unchanged

#### Scenario: Other mutation handlers are unaffected

- GIVEN a model at any level
- WHEN a mutation handler other than `add_concept`/`add_field`/`set_marker` is applied
- THEN the level gate does not apply and the handler behaves as before
