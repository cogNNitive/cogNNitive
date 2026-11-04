# Delta for model-discovery-predicate

Living spec read: `openspec/specs/model-discovery-predicate/spec.md`. Both existing requirements stay valid: the single contract predicate (`_NN.md` pattern, role `knowledge`, `level: 3` with a resolvable `parent_spec`, not an excluded path) and `list_models` / `list_knowledge` returning only discoverable models. Discovery remains path-agnostic and still skips a subtree that has its own `domaiNN_NN.md` (`scope-chain`). The requirement below adds the classification step.

## ADDED Requirements

### Requirement: Discovered models are classified against declared placements

After discovery, each model MUST be classified as an instance model (its root concept is distributed) or a compact model, using the bluepriNNt declarations. Classification MUST NOT change which files discovery returns, and MUST NOT depend on the folder name. A discovered model that violates its declared placement MUST still be returned, carrying the classification and the placement finding.

#### Scenario: Instance model is classified
- GIVEN `series/villabotijos-today/assets/pepper-mapache/pepper-mapache_video-script_NN.md` with a Video root and `Video` declared distributed
- WHEN discovery and classification run
- THEN the model is returned as an instance model of concept `Video`

#### Scenario: Compact model is classified
- GIVEN `LC_programas_Tutorias_NN.md` whose concepts declare no storage
- WHEN discovery and classification run
- THEN it is returned as a compact model

#### Scenario: Misplaced instance is still returned
- GIVEN a Video instance model under `kNNowledge/`
- WHEN `list_knowledge` runs
- THEN it is listed and carries a placement finding

#### Scenario: Per-instance folder alone does not classify
- GIVEN a model in a folder of its own whose concept declares no storage
- WHEN classification runs
- THEN it is classified compact
