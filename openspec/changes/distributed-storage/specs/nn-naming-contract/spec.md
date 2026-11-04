# Delta for nn-naming-contract

Living spec read: `openspec/specs/nn-naming-contract/spec.md`. No existing requirement is replaced or removed. The universal `_NN` invariant, the role function (a pure function of name, `parent_spec` and sidecar presence), and the structural exceptions are unchanged. The two requirements below add the stem rules for instance models. Their final stem form is a design decision; the requirements fix only the properties.

## ADDED Requirements

### Requirement: Instance model stem is derived from the folder slug

The stem of an instance model MUST be derived by the contract module from the slug of the folder that holds it, and MUST still satisfy the universal `_NN` invariant (ends with `_<bp>` or equals `<bp>`). The stem MUST NOT be required to carry the parent's name to be unique: stems need not be unique across the domaiNN, because model identity is hierarchical (`hierarchical-identity`). The derivation MUST live in the contract module only.

#### Scenario: Stem from the folder slug
- GIVEN the instance folder `series/villabotijos-today/assets/pepper-mapache/` and the bluepriNNt `video-script`
- WHEN the expected stem is computed
- THEN it is derived from `pepper-mapache` and ends with `_video-script`
- AND it does not contain `villabotijos-today`

#### Scenario: Equal stems in different folders are legal
- GIVEN `series/villabotijos-today/assets/intro/` and `series/innteresante/assets/intro/` both holding a model with the same expected stem
- WHEN the naming check runs
- THEN neither is reported as a violation

#### Scenario: Stem not derived from the folder slug
- GIVEN a model in `.../assets/pepper-mapache/` whose stem is derived from another slug
- WHEN the naming check runs
- THEN a violation names the file and the expected stem

### Requirement: A bluepriNNt suffix distinguishes several distributed concepts

When one bluepriNNt declares more than one distributed concept, the stem of an instance model MUST carry `_<blueprint>` so the invariant holds, and MUST additionally disambiguate the concept when two concepts may share a folder slug. When a bluepriNNt declares one distributed concept, the plain `_<blueprint>` suffix MUST suffice. The exact disambiguation is a design decision.

#### Scenario: One distributed concept
- GIVEN a bluepriNNt with a single distributed concept `Programa`
- WHEN the stem of an instance with slug `alpha` is computed
- THEN it ends with `_<blueprint>` and needs no further disambiguation

#### Scenario: Two distributed concepts in one bluepriNNt
- GIVEN `video-script` declaring `Series` and `Video` distributed, and a Series and a Video both slugged `intro`
- WHEN their stems are computed
- THEN the two stems differ
- AND both satisfy the universal `_NN` invariant

### Requirement: Placement is checked separately from role

The role function MUST keep reading no folder. Folder-dependent checks (placement) MUST live in placement validation (`placement-validation`), not in `roleOf`.

#### Scenario: Role unchanged by location
- GIVEN the same instance model bytes at two paths
- WHEN `roleOf` runs on each
- THEN both return `knowledge`
- AND only placement validation distinguishes them
