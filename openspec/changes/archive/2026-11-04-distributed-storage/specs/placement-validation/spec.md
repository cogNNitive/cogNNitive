# placement-validation Specification

## Purpose

Discovery stays path-agnostic: any `_NN.md` file that satisfies the model predicate is a model. Placement validation then compares each found model with the declarations of `concept-storage-declaration`. It checks four things for instances of distributed concepts: the file sits where the placement rule says, its name satisfies the naming contract, its identity is unique, and the instance is not also stored in a compact registry. It runs wherever model validation runs (`validate_knowledge`, `check_domain`) and reports through stable diagnostic codes named by design.

Examples use an illustrative placement rule: Video instance models live under `series/<series>/assets/<video>/`. The rule syntax is a design decision.

## Requirements

### Requirement: An instance sits where its placement rule says

For a model whose root concept is distributed, validation MUST compute the expected location from the placement rule and the model's container and slug. A model found elsewhere MUST produce an error naming the model, its path and the expected location.

#### Scenario: Instance at its placement path
- GIVEN Video `pepper-mapache` at `series/villabotijos-today/assets/pepper-mapache/pepper-mapache_video-script_NN.md` in series `villabotijos-today`
- WHEN `validate_knowledge` runs on it
- THEN no placement diagnostic is emitted

#### Scenario: Instance outside its placement
- GIVEN the same file at `kNNowledge/pepper-mapache_video-script_NN.md`
- WHEN `validate_knowledge` runs on it
- THEN a placement error names the path found and the expected `series/villabotijos-today/assets/pepper-mapache/`

#### Scenario: Container does not exist
- GIVEN a Video instance under `series/no-such-series/assets/intro/`
- WHEN validation runs
- THEN an error reports that the container `no-such-series` is not an instance of `Series`

### Requirement: Discovery stays path-agnostic

Model discovery (`isModelCandidate`, `collectModels`) MUST NOT consult placement rules. Placement validation MUST run on the models discovery returns, and a model that violates placement MUST still be discovered and listed.

#### Scenario: Misplaced instance is still discovered
- GIVEN a misplaced Video instance model
- WHEN `list_knowledge` runs
- THEN the model is listed
- AND `check_domain` reports its placement error

### Requirement: Instance naming satisfies the naming contract

The file name of an instance model MUST satisfy the naming contract for instance models (see `nn-naming-contract`: stem derived from the folder slug, bluepriNNt suffix rule). A violation MUST be reported with the file, the expected stem and the rule. The existing `NN_NAME_INVARIANT` diagnostic stays in force.

#### Scenario: Stem not derived from the folder slug
- GIVEN the instance folder `.../assets/pepper-mapache/` holding a model whose stem names another slug
- WHEN validation runs
- THEN a naming diagnostic names the file and the expected stem

### Requirement: Identity is unique

Two models resolving to the same id MUST produce an error that names both files. Neither MAY be dropped, merged or preferred.

#### Scenario: Two instance models in one instance folder
- GIVEN two Video instance models in `series/innteresante/assets/intro/`
- WHEN the domaiNN is validated
- THEN a duplicate-identity error names both paths and the id `innteresante/intro`

#### Scenario: Equal slugs in different containers are accepted
- GIVEN `villabotijos-today/intro` and `innteresante/intro`
- WHEN the domaiNN is validated
- THEN no duplicate-identity error is emitted

### Requirement: No double storage

An instance of a distributed concept MUST be stored only as its instance model. When it also appears as an element of any other model (for example a compact registry), validation MUST report an error naming both locations. An instance of a distributed concept that appears only as an element of a compact model MUST be reported as a placement error (wrong storage form).

#### Scenario: Video in a registry and as an instance model
- GIVEN Video `pepper-mapache` as an instance model and as `## NN Video: El mapache fuera de la ley` with `slug:: pepper-mapache` in a compact registry `VillabotijosToday_video_NN.md`
- WHEN `check_domain` runs
- THEN a double-storage error names the instance model path and the registry path

#### Scenario: Video only in a registry
- GIVEN Video `intro` only as an element of a compact registry and `Video` declared distributed
- WHEN `check_domain` runs
- THEN a placement error reports that `Video` instances must be instance models

### Requirement: Diagnostics are available where validation runs

Placement, naming, identity and double-storage findings MUST be reported by `check_domain`. Findings that depend only on one file (placement of that file, its naming, its cardinality) MUST also be reported by `validate_knowledge` on that file. Every finding MUST carry a stable code and the paths involved.

#### Scenario: Single-file validation reports file-local findings
- GIVEN a misplaced instance model
- WHEN `validate_knowledge` runs on only that file
- THEN the placement error is reported

#### Scenario: Cross-file findings need the domaiNN
- GIVEN a duplicate identity across two files
- WHEN `validate_knowledge` runs on one of them alone
- THEN the duplicate is reported only by `check_domain`

### Requirement: Existing domaiNNs may fail until migrated

Domains that keep per-instance folders, double storage or mixed storage in the old convention (`video_NN`, `LC_programas`) are not migrated by this change. Placement rules apply to a model only through the storage declaration of the bluepriNNt it pins, so such a domaiNN fails the checks above as soon as its models pin a bluepriNNt version that declares the storage; no compatibility mode or downgrade of severity exists for them. Migration is a separate change.

#### Scenario: Unmigrated domaiNN fails once it pins a declaring version
- GIVEN a domaiNN whose 24 episode models and compact Video registries pin the new `video-script` version, and which stores each episode twice
- WHEN `check_domain` runs
- THEN double-storage errors are reported
- AND no flag silences them

#### Scenario: Models pinning a non-declaring bluepriNNt are not checked
- GIVEN an episode pinning a per-series local spec that declares no storage
- WHEN `check_domain` runs
- THEN no placement finding is reported for it
