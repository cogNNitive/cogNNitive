# change-addressing-for-instance-models Specification

## Purpose

Changes address instance models through hierarchical ids, so targets recorded in changesets stay valid when unrelated files appear, drift detection and strict replay cover instance models, and a model touched by a change is never skipped silently.

Code audited for this change (nn-core `changelog/drift.ts`, nn-mcp `provenance-strict.ts`): `checkProvenance` collects the models touched by applied changes, then iterates only over the models it was given; a touched model with no entry produces no diagnostic. Strict replay rebuilds a model from its applied `add_model` change and does not check a model that has none. Both behaviours are confirmed by reading the code.

This spec builds on `lineage-as-changes` (`resolved_target`, drift); it owns addressing, not lineage semantics.

## Requirements

### Requirement: Change targets address instance models by hierarchical id

The `target` of every operation that addresses a model MUST use the unified grammar with the model's hierarchical id. The engine MUST locate the file from the id and the declared placement, not by scanning a fixed folder. The `resolved_target` stamped on an applied change MUST be the hierarchical address.

#### Scenario: Update a Scene field of an instance model
- GIVEN Video `villabotijos-today/pepper-mapache` with Scene `00-gancho`
- WHEN an `update_field` change targets `villabotijos-today/pepper-mapache@00-gancho&voice` and is applied
- THEN the file at the instance's placement path is updated
- AND the stamped `resolved_target` is `villabotijos-today/pepper-mapache@00-gancho&voice`

#### Scenario: Unknown model id
- GIVEN no instance `villabotijos-today/missing`
- WHEN a change targets `villabotijos-today/missing@00-gancho&voice`
- THEN the change is a conflict naming the unresolved id
- AND no file is written

### Requirement: Recorded targets survive unrelated additions

A target recorded in an applied changeset MUST keep resolving to the same instance when other models are added, renamed or removed elsewhere. The recorded id of an instance MUST NOT switch form.

#### Scenario: A later model with the same slug
- GIVEN an applied change targeting `innteresante/intro@00-gancho&voice`
- WHEN Video `intro` is added in series `villabotijos-today`
- THEN the recorded target still resolves to `innteresante/intro`
- AND drift detection reports nothing for it

### Requirement: A touched model with no file entry is reported

`checkProvenance` MUST NOT skip silently a model touched by an applied change that has no file entry. It MUST emit a diagnostic naming the model id and the change that touched it.

#### Scenario: Touched model missing from disk
- GIVEN an applied change on `villabotijos-today/intro` and no instance model with that id
- WHEN `check_domain` runs
- THEN a diagnostic names `villabotijos-today/intro` and the change

#### Scenario: Touched model present
- GIVEN the same change and the instance model present
- WHEN `check_domain` runs
- THEN the model is checked and no missing-model diagnostic appears

### Requirement: Strict replay reproduces instance models

Strict replay MUST rebuild an instance model from its recorded creation (`add_model` at the placement path, see `instance-model-lifecycle`) and replay its applied changes, and MUST compare the result with the file at the instance's placement path. An instance model with a recorded creation MUST NOT be skipped.

#### Scenario: Replay of a created instance
- GIVEN `villabotijos-today/new-episode` created by `add_model` and edited by two `update_field` changes
- WHEN strict provenance checking runs
- THEN the model is rebuilt and compared
- AND an unrecorded hand edit of one byte of its body is reported as drift

#### Scenario: Model without a recorded creation
- GIVEN an instance model whose creation was not recorded
- WHEN strict provenance checking runs
- THEN it is reported as not strictly checkable, naming the id

### Requirement: Multi-instance changesets are atomic

A changeset touching several instance models (for example setting `voice` on Scene `00-gancho` in three Videos) MUST apply all or nothing: one in-memory pass, validation of every touched model, atomic persistence, and rollback of every model on failure. The `models` map of the changeset MUST hold one entry per instance, keyed by hierarchical id, with the base and result version of that file.

#### Scenario: Three videos, one invalid
- GIVEN a changeset updating `00-gancho` in `villabotijos-today/pepper-mapache`, `villabotijos-today/intro` and `innteresante/intro`, where the third produces an invalid model
- WHEN `apply_change` runs
- THEN the result is `rejected` with `VALIDATION_FAILED`
- AND none of the three files is written

#### Scenario: Per-file versions
- GIVEN the same changeset with all three valid
- WHEN it is applied
- THEN the `models` map has three entries keyed `villabotijos-today/pepper-mapache`, `villabotijos-today/intro`, `innteresante/intro`
- AND each records its own `base_version` and `result_version`

### Requirement: Unresolvable and ambiguous targets are never guessed

A target whose model part does not resolve to exactly one model MUST be reported as unresolved with the candidate ids that share its last segment (see `unified-reference-grammar`). The engine MUST NOT choose a candidate.

#### Scenario: Bare slug target
- GIVEN `villabotijos-today/intro` and `innteresante/intro`
- WHEN a change targets `intro@00-gancho&voice`
- THEN the change is a conflict listing both candidates
- AND no file is written
