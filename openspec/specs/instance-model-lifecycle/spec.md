# instance-model-lifecycle Specification

## Purpose

Instance models are created, renamed and moved through changes. `add_model` writes at the placement path instead of `kNNowledge/`; a rename or move updates the folder, the stem and the id together and keeps recorded targets resolvable.

Audit facts (nn-mcp `apply-change.ts`): `add_model` rejects a target containing `/` and always writes `kNNowledge/<id>_NN.md`; `rename_element` renames the `assets/<slug>` directory but not the child model's stem. Both are removed by this spec for instance models. How a move or rename is named as an operation and recorded is a design decision.

Out of scope: removing an instance model (no operation is specified here), and reverting an instance model to compact form.

## Requirements

### Requirement: `add_model` creates an instance model at its placement path

For a distributed concept, `add_model` MUST take a hierarchical id as target and MUST write the new model at the path computed from the concept's placement rule, creating folders as needed. The change MUST identify the distributed concept being instantiated (explicitly, or implicitly when the bluepriNNt has exactly one distributed concept). The created model MUST pass whole-file validation including placement, naming and identity.

#### Scenario: Create a Video in a series
- GIVEN series `villabotijos-today` and a sealed `add_model` change with target `villabotijos-today/new-episode`, bluepriNNt `video-script` and concept `Video`
- WHEN `apply_change` runs
- THEN the model exists at `series/villabotijos-today/assets/new-episode/` with a stem satisfying the naming contract
- AND `validate_knowledge` on it returns `valid: true`
- AND the `models` entry for `villabotijos-today/new-episode` carries a `result_version` and no `base_version`

#### Scenario: Not written under `kNNowledge/`
- GIVEN the same change
- WHEN it is applied
- THEN no file is created under `kNNowledge/`

#### Scenario: Container missing
- GIVEN an `add_model` change targeting `no-such-series/intro`
- WHEN it is applied
- THEN the change is rejected naming the missing container `no-such-series`
- AND nothing is written

#### Scenario: Container created earlier in the same changeset
- GIVEN a changeset with `add_model` for Series `new-series` followed by `add_model` for `new-series/intro`
- WHEN it is applied
- THEN both models are created
- AND the order is enforced as for existing `ADD_MODEL_ORDER`

### Requirement: Existing identity is a conflict

An `add_model` whose id already exists, or whose placement path is occupied, MUST be a conflict (`MODEL_EXISTS` or its successor) and MUST NOT overwrite the file. Dependent changes in the same changeset MUST be conflicted as today.

#### Scenario: Id exists
- GIVEN `innteresante/intro` exists
- WHEN `add_model` targets `innteresante/intro`
- THEN the change is a conflict and the file is byte-identical to before

### Requirement: Rename of an instance keeps folder, stem and id in agreement

Renaming an instance (changing its slug) MUST rename its folder, its file stem and its id in one atomic step, and the result MUST satisfy placement and naming validation. If any part cannot be done, nothing MUST change.

#### Scenario: Rename `intro` to `welcome`
- GIVEN Video `innteresante/intro` at `series/innteresante/assets/intro/`
- WHEN it is renamed to `welcome`
- THEN the folder is `series/innteresante/assets/welcome/`, the stem derives from `welcome`, and the id is `innteresante/welcome`
- AND `innteresante/intro` no longer resolves

#### Scenario: Target folder occupied
- GIVEN `series/innteresante/assets/welcome/` already exists
- WHEN the rename is attempted
- THEN it is rejected and the original folder and file are unchanged

### Requirement: Move of an instance to another container changes its id

Moving an instance to another container MUST move its folder under the new container, update the stem if the naming rule requires it, and change the id to the new chain plus its slug, in one atomic step.

#### Scenario: Move `intro` between series
- GIVEN Video `innteresante/intro`
- WHEN it is moved to series `villabotijos-today`
- THEN its folder is under `series/villabotijos-today/assets/`
- AND its id is `villabotijos-today/intro`

#### Scenario: Destination identity exists
- GIVEN `villabotijos-today/intro` already exists
- WHEN `innteresante/intro` is moved to `villabotijos-today`
- THEN the move is rejected for duplicate identity and nothing changes

### Requirement: Recorded targets stay resolvable after rename or move

After a rename or move, targets recorded in earlier changesets for the old id (including `resolved_target` values) MUST still resolve to the renamed or moved instance, and drift detection and strict replay MUST NOT report drift because of the move. Sealed proposals MUST NOT be edited: `proposal_sha` and the proposal immutability rule of `changeset-apply-engine` still hold. The mechanism (a recorded rename, an alias chain) is a design decision.

#### Scenario: History survives a rename
- GIVEN an applied change targeting `innteresante/intro@00-gancho&voice` and the rename to `welcome`
- WHEN `check_domain` runs
- THEN no drift diagnostic is reported for the instance
- AND the earlier changeset bytes are unchanged and its `proposal_sha` still verifies

#### Scenario: Strict replay across a rename
- GIVEN an instance created, edited, then renamed
- WHEN strict provenance checking runs
- THEN replay reproduces the renamed file and reports no drift

### Requirement: Rename and move report broken references

Rename and move MUST follow the rule of `hierarchical-identity` for references to the old id: each is rewritten as part of the recorded operation or reported as broken naming the old id and the referencing location.

#### Scenario: Reference to the old id
- GIVEN a field in another model referencing `innteresante/intro`
- WHEN `innteresante/intro` is moved to `villabotijos-today`
- THEN the field is rewritten to `villabotijos-today/intro`, or validation reports it as broken naming `innteresante/intro`

### Requirement: Result is validated as a whole

Create, rename and move MUST run the whole-file validation of `changeset-apply-engine`, including placement. A result that fails validation MUST reject the apply (`VALIDATION_FAILED`) and write nothing.

#### Scenario: Invalid result writes nothing
- GIVEN a move whose result would violate the naming contract
- WHEN it is applied
- THEN the result is `rejected` with `VALIDATION_FAILED` and no file or folder changes
