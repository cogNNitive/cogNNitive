# Delta for video-blueprint

Scope: the blueprint moves to `V_0-14-0`, its Concept list swaps `Template` for `Preset`, and the renamed Fields (`avatar_model`, `background_audio`, `background_audio_volume`, `presets`) replace the retired ones. Design decision ids refer to `design.md` of change `2026-11-01-video-presets`.

## ADDED Requirements

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

## RENAMED Requirements

- FROM: `### Requirement: Per-Scene music volume`
- TO: `### Requirement: Per-Scene background audio volume`

(Reason: `music` and `music_volume` are renamed `background_audio` and `background_audio_volume`.)
(Migration: none. The new names are the only names; a document using the old ones is rejected.)

## MODIFIED Requirements

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

### Requirement: Per-Scene background audio volume

A Scene MUST be able to declare `background_audio_volume:: <0..1>` to set the volume of its `background_audio::` track; when absent, the engine MUST use the cascaded volume, whose blueprint default is `0.2`.
(Previously: `music_volume` and `music::`, with an engine default.)

#### Scenario: Per-Scene volume is applied

- GIVEN a Scene with `background_audio:: …` and `background_audio_volume:: 0.06`
- WHEN the manifest is compiled
- THEN its `bgmusic` track has `volume: 0.06`

## REMOVED Requirements

### Requirement: Video-Level Template Field

(Reason: the `Template` concept is retired; a whole-video default now uses `presets` on the `Video` element.)
(Migration: replaced by "Optional `presets` Field On Cascade Levels" in this capability and by capability `video-presets`. A whole-video default is written as `presets:: [Name]`; a document carrying `template::` is rejected, with no conversion.)
