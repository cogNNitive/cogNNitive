# conntent-blueprint Specification

## Purpose

The Level 2 `coNNtent` blueprint is the canonical schema for native video scripts. It defines the `Video`, `Scene`, `Layer`, and `Template` Concepts and Fields using iNNfo `::` syntax and is the schema an L3 script document adopts via `parent_spec`. The retired `video` blueprint and its `@template` definitions no longer exist.
## Requirements
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

### Requirement: Layer `watermark` type

The Layer `type::` select MUST accept `watermark`, and a `watermark` Layer MUST
require a `text` field. The engine MUST render it as a small persistent text notice.

#### Scenario: A watermark Layer validates and renders

- GIVEN a Layer `type:: watermark` with `text:: generado con IA`
- WHEN the document is validated and compiled
- THEN it passes the pre-compile guard
- AND the manifest carries a `watermark` overlay with that text

#### Scenario: A watermark Layer without text is rejected

- GIVEN a Layer `type:: watermark` with no `text`
- WHEN the document is validated
- THEN the pre-compile guard rejects it with `missing-conditional-field`

### Requirement: Per-Layer presenter model

A `presenter` Layer MUST be able to declare `avatar_model:: <id>` to override the avatar/lip-sync model for that Layer; when absent, the engine MUST use the cascaded `avatar_model`. Other Layer types MUST ignore `avatar_model`, and the retired Layer field `model` MUST NOT be accepted.
(Previously: the override was `model:: <id>`, falling back to an engine default.)

#### Scenario: The override is honored per Layer

- GIVEN two `presenter` Layers, one with `avatar_model:: wavespeed-ai/infinitetalk` and one without
- WHEN the avatars are priced, synthesized and rendered
- THEN the first uses the declared model and the second uses the cascaded `avatar_model`

#### Scenario: Cascaded model applies when a Preset supplies it

- GIVEN a Scene with `presets:: [A]` where A sets `avatar_model:: m-a` and a presenter Layer without `avatar_model`
- WHEN the avatar is priced
- THEN the model is `m-a`

#### Scenario: Legacy model field is rejected

- GIVEN a `presenter` Layer declaring `model:: wavespeed-ai/infinitetalk`
- WHEN the script is validated
- THEN validation fails because the Field is not defined for `Layer`

### Requirement: Per-Layer media fit

A media Layer (`background`, `b-roll`) MUST be able to declare `fit:: cover|contain`;
`contain` MUST show the whole asset with a margin, and the default MUST remain `cover`.

#### Scenario: contain shows the whole asset

- GIVEN a `b-roll` Layer with `fit:: contain`
- WHEN the overlay is compiled and rendered
- THEN the manifest carries `fit: contain`
- AND the asset is shown whole, uncropped, with a margin

### Requirement: Per-Scene background audio volume

A Scene MUST be able to declare `background_audio_volume:: <0..1>` to set the volume of its `background_audio::` track; when absent, the engine MUST use the cascaded volume, whose blueprint default is `0.2`.
(Previously: `music_volume` and `music::`, with an engine default.)

#### Scenario: Per-Scene volume is applied

- GIVEN a Scene with `background_audio:: …` and `background_audio_volume:: 0.06`
- WHEN the manifest is compiled
- THEN its `bgmusic` track has `volume: 0.06`

### Requirement: Optional `presets` Field On Cascade Levels

The blueprint MUST define an optional `presets` Field (`type:: select`, `multiple:: true`, no declared options) on `Video`, `Scene`, `Series` and `Video Defaults`, and a script that omits it MUST still validate; the Field MUST NOT be a `reference` type (D1).

#### Scenario: Video declares presets

- GIVEN a `coNNtent` script whose `Video` element declares `presets:: [Lucas, Studio Warm]`
- WHEN the script is validated
- THEN it validates with no schema errors and no unresolved-reference diagnostic

#### Scenario: Absent presets still validates

- GIVEN a script whose `Video` and `Scene` elements omit `presets::`
- WHEN the script is validated
- THEN it validates with no schema errors

#### Scenario: Blueprint stays metaschema-valid

- GIVEN the blueprint `spec_NN.md`
- WHEN the metaschema self-describe test runs
- THEN it passes and no Field combines `type:: reference` with `multiple:: true`

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

### Requirement: The video-script bluepriNNt declares its storage

The `video-script` bluepriNNt MUST declare `Video` as a distributed concept whose instances are episode models, with a placement rule equal to the episode folder of `video-folder-contract` (`series/<series>/assets/<video>/`) and `Series` as its container. `Scene` and `Layer` MUST be elements of the Video instance model (unchanged heading nesting). `Series` MUST be declared distributed, with the domaiNN root as its container, when design confirms that a Series scope document is its instance model (assumption: see risks). The storage of `Preset` and `Video Defaults` is a design decision.

#### Scenario: Declared concepts
- GIVEN the new `video-script` version
- WHEN its storage declarations are read
- THEN `Video` is distributed with container `Series`
- AND `Scene` and `Layer` are elements of the Video instance model

#### Scenario: An episode validates at its placement
- GIVEN `series/villabotijos-today/assets/pepper-mapache/` holding the episode model
- WHEN `validate_knowledge` runs on it
- THEN it validates with no placement finding

#### Scenario: Scene and Layer are not models
- GIVEN a Scene `00-gancho` and a Layer `00-gancho-presenter`
- WHEN the domaiNN is discovered
- THEN neither is a model; each is addressed as `villabotijos-today/pepper-mapache@00-gancho` and `villabotijos-today/pepper-mapache@00-gancho-presenter`

### Requirement: The storage declaration ships as a new blueprint version

The change that adds the storage declaration MUST set `blueprint_version` above `V_0-14-1` in `spec_NN.md`, set the package defaults `parent_spec` to the same version, regenerate both `catalog.json` files, bump the skill `version:` once, and be released with a `templates-v*` tag and re-pin. Published versions MUST NOT be edited.

#### Scenario: Immutability guard accepts the bump
- GIVEN changes to `spec_NN.md`, `defaults/**` and `skills/**` with `blueprint_version` strictly greater than the merge-base value
- WHEN `guard-template-immutability` runs
- THEN it passes

#### Scenario: Catalog and parity
- GIVEN the regenerated catalogs
- WHEN `node scripts/verify.js` runs
- THEN both catalogs name `video-script` at the new version and the freshness and parity checks pass

#### Scenario: Release rehearsal
- GIVEN the templates re-pin
- WHEN `node scripts/verify.js --release` runs in a rehearsal worktree
- THEN it is green

### Requirement: Existing episodes pinning older versions are reported

Episodes pinning an older `video-script` version, a bare `video-script` name or a local url are not upgraded by this change. They MUST be reported as version skew or incomparable pins (`version-uniformity-check`) until the migration change upgrades them. Episodes pinning a different bluepriNNt (a per-series local spec) are outside this declaration: the rules of this change apply to a model only through the storage declaration of the bluepriNNt it pins, so such episodes are treated as compact models until they are migrated to `video-script`. Whether a diagnostic should flag them is a design decision (see risks).

#### Scenario: Old video-script pin reported
- GIVEN an episode pinning `video-script_V_0-14-1` while others pin the new version
- WHEN `check_domain` runs with the new release
- THEN the skew is reported, and the file is not modified

#### Scenario: Per-series local spec is outside the declaration
- GIVEN an episode pinning `villabotijos-today_V_0-1-0`
- WHEN `check_domain` runs with the new release
- THEN no placement finding is reported for it
- AND the file is not modified

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

