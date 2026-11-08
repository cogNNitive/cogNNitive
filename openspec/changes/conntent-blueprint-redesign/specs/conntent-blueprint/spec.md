# conntent-blueprint Delta Spec

Source decisions: D1, D17, D18, D19, F5 (Slices 1 and 2).

## MODIFIED Requirements

### Requirement: Native L2 Video-Script Blueprint

The Level 2 blueprint `coNNtent` MUST define the Concepts and Fields for a native video script (`Video`, `Scene`, `Layer`, `Preset`, plus `Video Defaults`, `Series`, `Scene Kind`, `Chrome`, `Provider`, `Model` and `Voice`) using iNNfo `::` field syntax, and MUST be the schema an L3 script document adopts via `parent_spec`. The blueprint MUST NOT define VUS `scene_*` or `layer_*` fields and MUST NOT define a `Template` or `Subject` Concept. The blueprint MUST also name the three library item formats `Character`, `Frame` and `Component`: documented folder formats with a markdown file with frontmatter (`CHARACTER.md`, `FRAME.md`, `COMPONENT.md`), validated by the engine under capabilities `conntent-character`, `conntent-frame` and `conntent-component-portfolio`. They are not Level 3 documents and define no `::` Fields. The Purpose text of the blueprint specification and the blueprint `spec_NN.md` MUST NOT list `Template` among the Concepts.
(Previously: no Character, Frame or Component formats were named; the Purpose text still listed a `Template` Concept.)

#### Scenario: Blueprint defines the native concepts
- GIVEN the Level 2 `coNNtent` blueprint
- WHEN it is inspected
- THEN it defines `Video`, `Scene`, `Layer`, `Preset`, `Scene Kind`, `Chrome`, `Provider`, `Model` and `Voice` Concepts with `::` Fields
- AND it defines no `Template` Concept, no `Subject` Concept and no `scene_*` or `layer_*` fields

#### Scenario: Library item formats are named
- GIVEN the Level 2 `coNNtent` blueprint
- WHEN its vocabulary is inspected
- THEN it names `Character`, `Frame` and `Component` as library item formats with their file names `CHARACTER.md`, `FRAME.md` and `COMPONENT.md`
- AND none of them defines `::` Fields

#### Scenario: Stale Template mention is gone
- GIVEN the blueprint `spec_NN.md` and the `conntent-blueprint` Purpose text
- WHEN they are searched for the Concept `Template`
- THEN no match is found outside a sentence that states it is retired

#### Scenario: An L3 script adopts the blueprint
- GIVEN an L3 script document whose `parent_spec` is the `coNNtent` blueprint
- WHEN the document is validated
- THEN its Concepts and Fields are checked against the blueprint

### Requirement: The video-script bluepriNNt declares its storage

The `coNNtent` bluepriNNt (`spec_NN.md`; the requirement keeps its historical title) MUST declare `Video` as a distributed concept whose instances are episode models, with the placement rule `placement:: "{container}/episodes/{slug}/"`, equal to the episode folder of `conntent-folder-contract` (`series/<series>/episodes/<video>/`), and `Series` as its container. Instance documents are named `<slug>_coNNtent_NN.md` by the nn-core instance rule. `Scene` and `Layer` MUST be elements of the Video instance model (unchanged heading nesting). `Series` MUST be declared distributed, with the domaiNN root as its container, when design confirms that a Series scope document is its instance model (assumption: see risks). The storage of `Preset` and `Video Defaults` is a design decision.
(Previously: the placement rule was `"{container}/assets/{slug}/"` and the text named the `video-script` bluepriNNt.)

#### Scenario: Declared concepts
- GIVEN the new `coNNtent` version
- WHEN its storage declarations are read
- THEN `Video` is distributed with container `Series`
- AND `Scene` and `Layer` are elements of the Video instance model

#### Scenario: An episode validates at its placement
- GIVEN `series/villabotijos-today/episodes/pepper-mapache/` holding the episode model
- WHEN `validate_knowledge` runs on it
- THEN it validates with no placement finding

#### Scenario: An episode at the retired placement
- GIVEN `series/villabotijos-today/assets/pepper-mapache/` holding the episode model
- WHEN `validate_knowledge` runs on it
- THEN a placement finding names `series/villabotijos-today/episodes/pepper-mapache/` as the expected location

#### Scenario: Scene and Layer are not models
- GIVEN a Scene `00-gancho` and a Layer `00-gancho-avatar`
- WHEN the domaiNN is discovered
- THEN neither is a model; each is addressed as `villabotijos-today/pepper-mapache@00-gancho` and `villabotijos-today/pepper-mapache@00-gancho-avatar`

#### Scenario: add_model places a new episode
- GIVEN the Series `villabotijos-today` and `add_model` for episode `pepper-mapache`
- WHEN nn-core creates the model
- THEN it writes `series/villabotijos-today/episodes/pepper-mapache/pepper-mapache_coNNtent_NN.md`

## REMOVED Requirements

### Requirement: Blueprint Is V_0-15-0 And Episodes Pin It

(Reason: the requirement names a fixed version that this change supersedes. It is replaced by "Blueprint Version Is Bumped By Each Slice And Episodes Pin It" below, which holds for any version.)

## ADDED Requirements

### Requirement: Blueprint Version Is Bumped By Each Slice And Episodes Pin It

Each slice of this change that edits the blueprint `spec_NN.md`, the package `defaults/**`, the catalog or the packaged library MUST set `blueprint_version` strictly above the value at the merge base (the last published value is `V_0-15-1`), set the package defaults `parent_spec` to the same version, regenerate both `catalog.json` files and the field registry in the same slice, and bump the skill `version:` once. Published versions MUST NOT be edited. A new episode MUST pin the current version in its frontmatter `blueprint_version`, and `produce` MUST refuse any other value with a message naming the pinned and the expected version; there is no compatibility with earlier pins.

#### Scenario: Version is bumped consistently
- GIVEN `origin/main` carries `V_0-15-1`
- WHEN Slice 1 edits `spec_NN.md`
- THEN `blueprint_version` is greater than `V_0-15-1`, the package defaults `parent_spec` names the same version, and both catalogs name `coNNtent` at that version

#### Scenario: Guards stay green
- GIVEN the regenerated catalogs and registry
- WHEN `node scripts/verify.js` runs
- THEN the field-catalogue, metaschema self-describe, template-immutability, blueprint inventory and catalog, and registry `--check` guards pass

#### Scenario: Episode carries the pin
- GIVEN a new episode document
- WHEN its frontmatter is read
- THEN `blueprint_version` equals the current blueprint version

#### Scenario: Older pin is refused
- GIVEN an episode pinning `V_0-15-1` while the blueprint is at a later version
- WHEN `produce` runs
- THEN it fails naming `V_0-15-1` and the expected version and nothing is spent
