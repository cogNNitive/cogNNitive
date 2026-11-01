# video-blueprint Specification

## Purpose

The Level 2 `video-script` blueprint is the canonical schema for native video scripts. It defines the `Video`, `Scene`, `Layer`, and `Template` Concepts and Fields using iNNfo `::` syntax and is the schema an L3 script document adopts via `parent_spec`. The retired `video` blueprint and its `@template` definitions no longer exist.
## Requirements
### Requirement: Native L2 Video-Script Blueprint

The Level 2 blueprint `video-script` MUST define the Concepts and Fields for a native video script (`Video`, `Scene`, `Layer`, `Preset`, plus `Video Defaults` and `Series`) using iNNfo `::` field syntax, and MUST be the schema an L3 script document adopts via `parent_spec`. The blueprint MUST NOT define VUS `scene_*` or `layer_*` fields.
(Previously: the Concept list named `Template` in place of `Preset`.)

#### Scenario: Blueprint defines the native concepts

- GIVEN the Level 2 `video-script` blueprint
- WHEN it is inspected
- THEN it defines `Video`, `Scene`, `Layer` and `Preset` Concepts with `::` Fields
- AND it defines no `Template` Concept and no `scene_*` or `layer_*` fields

#### Scenario: An L3 script adopts the blueprint

- GIVEN an L3 script document whose `parent_spec` is the `video-script` blueprint
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

- GIVEN a `video-script` script whose `Video` element declares `presets:: [Lucas, Studio Warm]`
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

The blueprint `validation.conditional_fields` MUST declare `presenter: [asset, prompt, avatar]`, and the engine's default conditional-fields table MUST equal the blueprint's.

#### Scenario: Blueprint declares the rule

- GIVEN the blueprint `spec_NN.md`
- WHEN `validation.conditional_fields.presenter` is read
- THEN it is `[asset, prompt, avatar]`

#### Scenario: Drift test fires on divergence

- GIVEN the engine default table differs from the blueprint table
- WHEN the conditional-fields drift test runs
- THEN it fails

### Requirement: Blueprint Version Bump And Catalog Parity

The change MUST set `blueprint_version` to `V_0-14-0` in `spec_NN.md`, set the package defaults `parent_spec` to the same version, regenerate both `catalog.json` files, and keep every release guard green.

The draft console MUST NOT carry a literal `video-script_V_` version string; `build-draft-html.mjs` substitutes the version when it builds the console, and a test forbids a literal in the template.

#### Scenario: Immutability guard accepts the bump

- GIVEN changes to `spec_NN.md`, `defaults/**` and `skills/**` with `blueprint_version` strictly greater than the merge-base value
- WHEN `guard-template-immutability` runs
- THEN it passes

#### Scenario: Catalog is fresh and in parity

- GIVEN the regenerated `iNNfo/specs/bluepriNNts/catalog.json` and `docs/innfo/blueprints/catalog.json`
- WHEN the freshness and parity checks in `node scripts/verify.js` run
- THEN both pass and both name `video-script` at `V_0-14-0`

#### Scenario: Defaults drift is fixed

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN its `parent_spec` is read
- THEN it names `video-script_V_0-14-0`, not `V_0-13-6`

#### Scenario: Console carries no literal version

- GIVEN `draft-template.html`
- WHEN it is searched for a literal `video-script_V_`
- THEN none is found and the built console carries the injected `V_0-14-0`

### Requirement: Blueprint Declares master_resolution With One Option

The `video-script` blueprint MUST define `master_resolution` as a `select` Field of the `Video Defaults` Concept with the single option `1920x1920`, and the package `defaults/video-defaults_NN.md` MUST declare `master_resolution:: 1920x1920`.

Source: D3, D4, settled default 4.

#### Scenario: Default validates

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is validated against the blueprint
- THEN it validates with no schema errors and `master_resolution` is `1920x1920`

#### Scenario: Other value fails validation

- GIVEN a domain `video-defaults_NN.md` declaring `master_resolution:: 1280x720`
- WHEN it is validated
- THEN validation fails because the value is not an option of the Field

#### Scenario: Not settable on a Video

- GIVEN a `Video` element declaring `master_resolution::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined for `Video`

#### Scenario: Undeclared resolution fields stay undeclared

- GIVEN the blueprint
- WHEN its Field Definitions are listed
- THEN `resolution`, `format` and `fps` are not defined

### Requirement: Blueprint Text Describes A Single Square Master

The `video-script` blueprint `spec_NN.md` MUST describe the Video `master` field as the episode's square master `<slug>_1920x1920.mp4` and the Layer `position` field as an overlay anchor inside the central safe square, and MUST NOT contain the 16:9 `center 12%` wording, a native dual-master (16:9 and 9:16) description or 9:16 position behaviour.

Source: D4.

#### Scenario: Master text is rewritten

- GIVEN `spec_NN.md`
- WHEN the `master` Field Definition description is read
- THEN it names the square master and states that delivery formats are derived by `render-formats` and never modeled

#### Scenario: Position text is rewritten

- GIVEN `spec_NN.md`
- WHEN the `position` Field Definition description is read
- THEN it names the central safe square of 1080x1080 of the master

#### Scenario: Retired wording is gone

- GIVEN `spec_NN.md`
- WHEN it is searched for `center 12%` and `dual`
- THEN no match is found

### Requirement: This Change Bumps The Blueprint To Its Own Version

This change MUST set `blueprint_version` to `V_0-14-1` in `spec_NN.md`, set the package defaults `parent_spec` to the same version, regenerate both `catalog.json` files in the same slice, and bump the skill `version:` once.

Source: D11 release checklist, settled default 11.

#### Scenario: The bump is its own

- GIVEN `origin/main` carries `V_0-14-0` (the presets release)
- WHEN this change edits `spec_NN.md`
- THEN `blueprint_version` is `V_0-14-1`, the package defaults `parent_spec` names `video-script_V_0-14-1`, and both catalogs name `V_0-14-1`

#### Scenario: Catalogs and guards stay green

- GIVEN the regenerated catalogs
- WHEN `node scripts/verify.js` runs
- THEN the field-catalogue, metaschema self-describe, template-immutability and blueprint inventory and catalog guards pass
