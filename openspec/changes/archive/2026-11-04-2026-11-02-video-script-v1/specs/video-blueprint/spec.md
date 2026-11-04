# Delta for video-blueprint

Change `2026-11-02-video-script-v1`. The blueprint is bumped to the breaking version V_0-15-0 (no in-place migration, no aliases).

## ADDED Requirements

### Requirement: Blueprint Is V_0-15-0 And Episodes Pin It

This change MUST set `blueprint_version` to `V_0-15-0` in `spec_NN.md`, set the package defaults `parent_spec` to the same version, regenerate both `catalog.json` files in the same slice, regenerate the field registry, and bump the skill `version:` once. A V_0-15-0 episode MUST pin the version in its frontmatter `blueprint_version: V_0-15-0`, and `produce` MUST refuse any other value.

Source: D7, proposal Scope.

#### Scenario: Version is bumped consistently

- GIVEN `origin/main` carries the last V_0-14-x blueprint
- WHEN this change edits `spec_NN.md`
- THEN `blueprint_version` is `V_0-15-0`, the package defaults `parent_spec` names `coNNtent_V_0-15-0`, and both catalogs name `coNNtent` at `V_0-15-0`

#### Scenario: Guards stay green

- GIVEN the regenerated catalogs and registry
- WHEN `node scripts/verify.js` runs
- THEN the field-catalogue, metaschema self-describe, template-immutability, blueprint inventory and catalog, and registry `--check` guards pass

#### Scenario: Episode carries the pin

- GIVEN a new episode document
- WHEN its frontmatter is read
- THEN `blueprint_version` is `V_0-15-0`

### Requirement: Blueprint Text Describes The Declared Master

The `coNNtent` blueprint `spec_NN.md` MUST describe the Video `master` field as the episode's master sized by the first entry of `output_formats`, and the Layer `position` field as an overlay anchor inside the central safe square, and MUST NOT contain the 16:9 `center 12%` wording, a native dual-master description or the literal file name `<slug>_1920x1920.mp4` as a fixed rule.

Source: D4.

#### Scenario: Master text is rewritten

- GIVEN `spec_NN.md`
- WHEN the `master` Field Definition description is read
- THEN it names `output_formats` as the source of the size and states that delivery formats are derived and never modeled

#### Scenario: Retired wording is gone

- GIVEN `spec_NN.md`
- WHEN it is searched for `center 12%`, `dual` and `master_resolution`
- THEN no match is found

### Requirement: Blueprint Ships The Catalog, Scene Kind And Chrome Concepts

The blueprint MUST define the Concepts `Scene Kind` and `Chrome` (see capability `video-scene-kinds`), and the catalog Concepts `Provider`, `Model` and `Voice` (see `video-model-catalog`), and the package MUST ship the reference catalog document.

#### Scenario: Concepts are defined

- GIVEN the blueprint
- WHEN its Concepts are listed
- THEN `Scene Kind`, `Chrome`, `Provider`, `Model` and `Voice` are present

#### Scenario: Catalog document ships

- GIVEN the installed package
- WHEN its files are listed
- THEN the reference catalog document exists and validates against the blueprint

## MODIFIED Requirements

### Requirement: Native L2 Video-Script Blueprint

The Level 2 blueprint `coNNtent` MUST define the Concepts and Fields for a native video script (`Video`, `Scene`, `Layer`, `Preset`, plus `Video Defaults`, `Series`, `Scene Kind`, `Chrome`, `Provider`, `Model` and `Voice`) using iNNfo `::` field syntax, and MUST be the schema an L3 script document adopts via `parent_spec`. The blueprint MUST NOT define VUS `scene_*` or `layer_*` fields.
(Previously: the Concept list had no `Scene Kind`, `Chrome`, `Provider`, `Model` or `Voice`; the blueprint was named `coNNtent`.)

#### Scenario: Blueprint defines the native concepts

- GIVEN the Level 2 `coNNtent` blueprint
- WHEN it is inspected
- THEN it defines `Video`, `Scene`, `Layer`, `Preset`, `Scene Kind`, `Chrome`, `Provider`, `Model` and `Voice` Concepts with `::` Fields
- AND it defines no `Template` Concept and no `scene_*` or `layer_*` fields

#### Scenario: An L3 script adopts the blueprint

- GIVEN an L3 script document whose `parent_spec` is the `coNNtent` blueprint
- WHEN the document is validated
- THEN its Concepts and Fields are checked against the blueprint

### Requirement: Presenter Conditional Fields Include Avatar

The blueprint `validation.conditional_fields` MUST key its rules by the four Layer behaviour types (`avatar`, `media`, `text`, `animation`) and MUST declare that an `avatar` Layer carries `asset`, `prompt` or `avatar_model`, and that a `media` Layer carries `asset` or `prompt`. The engine MUST read its conditional-fields table from the generated field registry rather than from a hand-copied default.
(Previously: the table was keyed by the retired type name `presenter`, now `avatar`, and the engine kept a default table that a drift test compared with the blueprint.)

#### Scenario: Blueprint declares the rule

- GIVEN the blueprint `spec_NN.md`
- WHEN `validation.conditional_fields.avatar` is read
- THEN it is `[asset, prompt, avatar_model]`

#### Scenario: Engine reads the registry

- GIVEN a changed conditional-fields rule in the blueprint and a regenerated registry
- WHEN the engine checks a script
- THEN the new rule applies with no engine code change

#### Scenario: Retired type key is rejected

- GIVEN a blueprint whose `validation.conditional_fields` still keys a rule by `presenter`
- WHEN the blueprint is validated
- THEN validation fails naming the retired type and the replacement `avatar`

## REMOVED Requirements

### Requirement: Blueprint Declares master_resolution With One Option

(Reason: `master_resolution` is retired; the master size is the `master` entry of `output_formats`.)
(Migration: see video-script-model "Shared Field Definitions".)

### Requirement: Blueprint Text Describes A Single Square Master

(Reason: the master size is declared, not fixed; replaced by "Blueprint Text Describes The Declared Master".)
(Migration: None.)

### Requirement: Blueprint Version Bump And Catalog Parity

(Reason: pinned to the superseded version V_0-14-0 and to the standalone console (`draft-template.html`) that this change deletes; replaced by "Blueprint Is V_0-15-0 And Episodes Pin It".)
(Migration: None.)

### Requirement: This Change Bumps The Blueprint To Its Own Version

(Reason: pinned to V_0-14-1; replaced by "Blueprint Is V_0-15-0 And Episodes Pin It".)
(Migration: None.)
