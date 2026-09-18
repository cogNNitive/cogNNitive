# Model Mutation References

## Purpose

Maintain reference consistency across all workspace models when performing version bump mutations.

## Requirements

### Requirement: Cross-Model Reference Cascading on Version Bump

When `bump_version` renames and increments the version of a model, the mutation handler MUST scan all other models and workspace manifest/index files within the workspace for references to the bumped model. Any fields referencing the old model filename or version identifier (such as `derived_from_inputs::`, `business_model::`, `models/...` in `sources::`, and `index.md`) MUST be updated to reference the new versioned filename, or reported as validation diagnostics if automated cascade is disabled.

#### Scenario: Cascading update to dependent model's derived_from_inputs
- GIVEN a model `models/strategy_V_0-1-0_NN.md`
- AND another model `models/execution_V_0-1-0_NN.md` containing `derived_from_inputs:: [strategy_V_0-1-0_NN.md]`
- WHEN `bump_version` is applied to `strategy` with `bump: "minor"`
- THEN `strategy` is renamed to `models/strategy_V_0-2-0_NN.md`
- AND `execution_V_0-1-0_NN.md` is updated so that `derived_from_inputs` references `strategy_V_0-2-0_NN.md`

#### Scenario: Cascading update to cross-model source citation
- GIVEN a model `models/marketing_V_0-1-0_NN.md` containing `sources:: [models/strategy_V_0-1-0_NN.md@## Vision]`
- WHEN `bump_version` is applied to `strategy` with `bump: "patch"`
- THEN `strategy` is renamed to `models/strategy_V_0-1-1_NN.md`
- AND the citation in `marketing_V_0-1-0_NN.md` is updated to `models/strategy_V_0-1-1_NN.md@## Vision`

### Requirement: Pre-Mutation Workspace Reference Validation

Before applying and persisting version bump changes across referencing models, `bump_version` MUST validate the modified content of all affected models against their respective template schemas. If any affected model fails validation after the cascade, the entire mutation operation MUST abort without modifying any files on disk.

#### Scenario: Aborting bump when referencing model validation fails
- GIVEN a referencing model that contains a syntax or schema violation
- WHEN `bump_version` is executed on the target model
- THEN the validation check detects the error prior to writing
- AND the operation returns failure without altering files on disk
