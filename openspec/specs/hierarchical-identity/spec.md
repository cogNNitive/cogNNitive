# hierarchical-identity Specification

## Purpose

A model id carries its container, so identity never depends on which other files exist. Two instances with the same slug in different containers have different ids; moving an instance to another container changes its id. This replaces today's identity (filename stem, switching to a domain-relative path for both files when two stems collide).

Terms: the hierarchical id is a sequence of segments; the last segment is the instance's own slug and the preceding segments identify its container chain. The examples use `/` as the separator; the separator, the exact grammar, the relation to today's domain-relative path form, and the id of a compact model are design decisions. Every requirement below holds for any choice that satisfies it.

## Requirements

### Requirement: Identity is container plus slug

The id of an instance model MUST be derived only from its container chain and its own slug. It MUST NOT depend on the stem of any other file, on the set of files in the domaiNN, or on the order in which files are discovered.

#### Scenario: Same slug, different containers
- GIVEN Video `intro` in series `villabotijos-today` and Video `intro` in series `innteresante`
- WHEN their ids are computed
- THEN they are `villabotijos-today/intro` and `innteresante/intro`
- AND the two ids differ

#### Scenario: Adding a file never changes another id
- GIVEN `villabotijos-today/pepper-mapache` with id `villabotijos-today/pepper-mapache`
- WHEN a model with the same filename stem is added in another series
- THEN the id of `villabotijos-today/pepper-mapache` is unchanged
- AND no id switches to a path form

#### Scenario: Id is independent of discovery order
- GIVEN a domaiNN with three instance models
- WHEN discovery lists them in two different orders
- THEN each model has the same id in both runs

### Requirement: Ids are unique within a domaiNN

Two models MUST NOT resolve to the same id. A violation is reported by placement validation (see `placement-validation`, "Identity is unique"); no tool MAY pick one of the two silently.

#### Scenario: Collision is reported, not resolved
- GIVEN two instance models that both resolve to `innteresante/intro`
- WHEN the domaiNN is validated
- THEN a duplicate-identity error names both files
- AND no lookup of `innteresante/intro` returns either file

### Requirement: Moving an instance changes its id

When an instance model moves to another container, its id MUST change to the id of the new container chain plus its slug. The old id MUST NOT resolve afterwards. Element slugs inside the model MUST NOT change.

#### Scenario: Move between series
- GIVEN Video `innteresante/intro` with element `00-gancho`
- WHEN it is moved to series `villabotijos-today`
- THEN its id is `villabotijos-today/intro`
- AND its element address is `villabotijos-today/intro@00-gancho`
- AND `innteresante/intro` no longer resolves

#### Scenario: Stale reference after a move
- GIVEN a field in another model referencing `innteresante/intro@00-gancho` and the move above
- WHEN the domaiNN is validated
- THEN the reference is reported as dangling, naming the referencing location and the old id
- AND the old id is not resolved by guess or by slug

### Requirement: Stale references after a move are rewritten or reported, never guessed

Whether a move rewrites referencing fields or leaves them to be fixed through changes is decided by design. Under either choice, after a move no reference to the old id MAY resolve silently. Each such reference MUST be either rewritten to the new id as part of the recorded move, or reported as a broken reference naming the old id and the referencing location.

#### Scenario: Reported until fixed
- GIVEN a design in which a move does not rewrite references and a reference to the old id
- WHEN the move is applied and the domaiNN is validated
- THEN the reference is reported as broken

#### Scenario: Rewritten by the move
- GIVEN a design in which a move rewrites references and a reference to the old id
- WHEN the move is applied
- THEN the reference holds the new id
- AND validation reports no broken reference

### Requirement: The filename stem is not an id

The stem of an `_NN.md` file MUST NOT be accepted as a model id. The rule "when two stems collide both ids switch to the domain-relative path" and the `AMBIGUOUS_MODEL_ID` outcome of bare-stem lookup are removed: collisions cannot arise by construction, and a stem is not an addressing form.

#### Scenario: Equal stems in different folders keep stable ids
- GIVEN `series/villabotijos-today/assets/intro/intro_video-script_NN.md` and `series/innteresante/assets/intro/intro_video-script_NN.md`
- WHEN ids are computed
- THEN they are `villabotijos-today/intro` and `innteresante/intro`
- AND neither id is a path

#### Scenario: Bare stem does not resolve
- GIVEN the same two models
- WHEN `intro_video-script` is used as a model id
- THEN it does not resolve and no `AMBIGUOUS_MODEL_ID` outcome exists

### Requirement: Element identity is scoped by the model id

An element is addressed by its model id plus its slug. Element slugs MUST be unique within a model and MAY repeat across models. Renaming an element MUST NOT change its slug (unchanged from `stable-element-identity`).

#### Scenario: Same element slug in two videos
- GIVEN Videos `villabotijos-today/pepper-mapache` and `villabotijos-today/intro`, each with a Scene slug `00-gancho`
- WHEN the two element addresses are built
- THEN they are `villabotijos-today/pepper-mapache@00-gancho` and `villabotijos-today/intro@00-gancho`
- AND neither is reported as a duplicate slug

### Requirement: Compact models have stable ids too

A compact model MUST have an id that satisfies the same invariants: it is derived only from its own location and slug, it does not change when other files are added, and it is unique within the domaiNN. The exact form is a design decision.

#### Scenario: Compact id is stable
- GIVEN a compact model `Tutorias` and a later added model with the same stem elsewhere
- WHEN ids are recomputed
- THEN the id of `Tutorias` is unchanged
