# Delta for cognnitive-video-engine

Scope: voice parameters resolve through the cascade with preset expansion instead of the `template::` mechanism; the TTS cache identity is unchanged for unchanged inputs; the precedence bug is fixed; the pre-compile guard evaluates cascaded values. Design decision ids refer to `design.md` of change `2026-11-01-video-presets`.

## ADDED Requirements

### Requirement: Voice Parameters Resolve Through The Cascade

The engine MUST resolve `voice_model`, `voice`, `voice_speed`, `voice_emotion` and `voice_tone` for each Scene from the same cascade as every other parameter, with presets expanded, and MUST NOT inject Preset values into the Scene's own fields (D4).

An explicit Scene `voice` or `voice_model` MUST beat any Preset. A Video-level Preset MUST sit beneath explicit Video fields and above Series values, and MUST NOT enter at Scene precedence.

#### Scenario: Scene explicit voice beats a Video preset

- GIVEN a Video with `presets:: [A]` where A sets `voice:: from-a`, and a Scene with `voice:: own`
- WHEN the Scene is compiled
- THEN the TTS voice is `own`

#### Scenario: Video explicit beats a Video preset

- GIVEN a Video with `voice_model:: video-model` and `presets:: [A]` where A sets `voice_model:: from-a`
- WHEN a Scene that sets neither is compiled
- THEN the TTS model is `video-model`

#### Scenario: Video preset sits above Series

- GIVEN a Series with `voice:: series-voice` and a Video with `presets:: [A]` where A sets `voice:: from-a`
- WHEN a Scene that sets no voice is compiled
- THEN the TTS voice is `from-a`

### Requirement: Voice Tone Is Authoring Guidance Only

`voice_tone` MUST cascade, MAY be preset and MUST be shown to authors, but the engine MUST NOT read it into the TTS options, the TTS cache key or the provider payload (D6).

#### Scenario: Tone does not change the cache key

- GIVEN two compiles of one narrated Scene that differ only in `voice_tone`
- WHEN the TTS cache hash is computed for each
- THEN the hashes are equal and the second compile is a cache hit

#### Scenario: Tone is absent from the payload

- GIVEN a Scene with `voice_tone:: warm`
- WHEN the synthesis request is built
- THEN the request carries no tone value

### Requirement: Pre-Compile Guard Evaluates Cascaded Values

The pre-compile guard `checkScript` MUST evaluate each name of a Layer's conditional-fields rule against the Layer's explicit fields first and, for a cascade parameter missing there, against its value resolved through the expanded chain for the owning Scene, and MUST do so offline and before any spend (D7).

For a `presenter` Layer the source of the lowered image MUST be `asset` when present, otherwise the resolved `avatar`.

#### Scenario: Cascaded avatar satisfies the guard

- GIVEN a `presenter` Layer with neither `asset` nor `prompt` and a Series declaring `avatar:: lucas.png`
- WHEN `checkScript` runs
- THEN no `missing-conditional-field` error is reported

#### Scenario: Presenter without any source fails

- GIVEN a `presenter` Layer with no `asset`, no `prompt` and no `avatar` at any level
- WHEN `checkScript` runs
- THEN it fails with `missing-conditional-field` before any spend

#### Scenario: Lowered source prefers the explicit asset

- GIVEN a `presenter` Layer with `asset:: own.png` in a Scene whose resolved `avatar` is `lucas.png`
- WHEN the Layer is lowered
- THEN the layer asset source is `own.png`

#### Scenario: Preset errors are aggregated by the guard

- GIVEN a script with an `unknown-preset` error and a `missing-conditional-field` error
- WHEN `checkScript` runs
- THEN both are reported in one failure

### Requirement: Template Mechanism Is Removed From The Engine

The engine MUST NOT contain the Template loading mechanism: no flat global name map scanned from `templates_*_NN.md` files, no `templates` option on the CLI, no `tool` handling and no `model` alias for the TTS or avatar model (D4).

#### Scenario: Templates option is refused

- GIVEN the engine CLI
- WHEN it is run with the retired `templates` option
- THEN it exits non-zero with a usage that does not list it

#### Scenario: Legacy model alias is not read

- GIVEN a Layer or Scene declaring `model::`
- WHEN the script is checked
- THEN the Field is rejected and no model value is taken from it

### Requirement: Layer Stacking Uses z_index

The scene compiler MUST read a Layer's stacking value from `z_index::` with the ordering semantics previously attached to `level::`, and MUST NOT read `level` from Layer fields.

#### Scenario: Paint order follows z_index

- GIVEN two Layers in one Scene with `z_index:: 1` and `z_index:: 3`
- WHEN the scene is compiled
- THEN the Layer with `z_index:: 3` is painted above the other

## MODIFIED Requirements

### Requirement: Deterministic Media & TTS Asset Synthesis

The system MUST provide an asset synthesis pipeline for TTS voice narration and media asset retrieval, caching by a SHA-256 hash of the input, and reusing a cached asset on a hit. TTS synthesis MUST run exactly once per narrated Scene. Voice and model parameters MUST be resolved through the Universal Parameter Cascade with Presets expanded, and MUST NOT come from an engine default or a `template::` field. The pipeline MUST measure audio duration using `ffprobe`, falling back to a duration reported by the synthesis provider when `ffprobe` is unavailable, and MUST NOT depend on any Remotion module.
(Previously: voice and model were resolved from the Template instance referenced by the Scene's `template::` field.)

#### Scenario: Cache hit avoids redundant TTS synthesis

- GIVEN an existing cached TTS narration file matching the SHA-256 hash of the scene's text and voice settings
- WHEN asset synthesis is requested for the scene
- THEN the system retrieves the existing cached audio file without invoking the TTS synthesis engine

#### Scenario: Audio duration measured with ffprobe

- GIVEN narration audio and `ffprobe` on PATH
- WHEN the pipeline needs the audio duration
- THEN it obtains the duration via `ffprobe`, with no `@remotion` module imported

#### Scenario: Duration falls back to the provider

- GIVEN narration audio and no `ffprobe` on PATH but a provider-reported duration
- WHEN the pipeline needs the audio duration
- THEN it uses the provider-reported duration
- AND it never throws on an unmeasurable asset

#### Scenario: Voice comes from a preset

- GIVEN a Scene with `presets:: [Lucas]` where `Lucas` sets `voice` and `voice_model` and nothing nearer sets them
- WHEN asset synthesis is requested
- THEN the request uses `Lucas`'s voice and model

### Requirement: Interactive Provider Consultation and Cost Estimation

The system MUST provide an asset cost estimator and provider pricing catalog (`asset-cost-estimator.mjs`). Prior to asset synthesis, the engine MUST calculate per-scene character counts, image layer requirements, unit pricing for selected image and voiceover providers, and present an itemized per-scene and total budget estimation table for user approval. Every model id the estimator uses MUST come from the single Model Selection Cascade resolver, with Presets expanded; the estimator MUST NOT pick a model from a hardcoded default outside that resolver, and MUST report the scope each resolved model came from.
(Previously: the cascade scenario was phrased for a video-level `template::`.)

#### Scenario: Script parsed and estimated by scene

- GIVEN a validated video script
- WHEN `asset-cost-estimator.mjs` is executed
- THEN it outputs an itemized table with per-scene durations, image counts, character counts, unit rates, and grand total in USD ($)
- AND each model id used is reported with the scope that supplied it

#### Scenario: The cascade is the only selector

- GIVEN a script with a video-level `presets::` list whose Preset sets `voice_model`
- WHEN the estimator resolves the TTS/image models
- THEN it uses the cascade and never a bare hardcoded default
- AND the reported scope is `video:preset:<Name>`

### Requirement: Stable TTS cache key

The TTS cache key MUST depend only on the narration text and the resolved `voice`, `voice_model`, `voice_speed` (when declared), `voice_emotion` (when declared) and model override, and MUST be unchanged by the public renames for an equal input. The internal TTS option keys MUST remain `model`, `voice`, `speed`, `emotion` and `modelOverride` (D5). Changing a presenter Layer's `avatar_model::` MUST NOT change the TTS cache key.
(Previously: the key depended on `voice` and `tts_model`; the Template-field rename scenario used `model` to `tts_model`.)

#### Scenario: Avatar model change does not re-bill TTS

- GIVEN a Scene compiled once (TTS cached)
- WHEN the presenter's `avatar_model::` changes and the Scene is recompiled
- THEN the TTS step is a cache hit (zero spend) for an unchanged narration

#### Scenario: Same effective inputs keep the same cache key under the new names

- GIVEN a Scene whose narration resolves voice `v`, model `m`, speed `1.1` and emotion `calm`, expressed once with the retired names and once with `voice_model`, `voice_speed` and `voice_emotion`
- WHEN the TTS options and the hash are computed for each
- THEN the two hashes are equal

#### Scenario: Speed keeps its numeric form

- GIVEN a Preset with `voice_speed:: 1.1`
- WHEN the TTS options are built
- THEN `speed` is the number `1.1`, not the string `"1.1"`
- AND an undeclared or non-finite speed leaves `speed` absent

#### Scenario: Undeclared delivery values add nothing to the key

- GIVEN a Scene resolving no `voice_speed` and no `voice_emotion`
- WHEN the TTS options are built
- THEN the options contain no `speed` or `emotion` key and the hash equals the hash of the same Scene before the change

#### Scenario: Emotion keeps its trimmed form

- GIVEN a Preset with `voice_emotion:: " calm "`
- WHEN the TTS options are built
- THEN `emotion` is `calm`

### Requirement: Programmatic HyperFrames Scene Compilation

The system MUST provide a scene compiler that transforms the structured iNNfo video-script model into a valid, tool-agnostic Composition Manifest and a renderer that lowers that manifest into a **HyperFrames project**. The compiler MUST obtain its scene model as a structured `read_knowledge`-shaped object (canonically from innfo-core `read_knowledge`; a thin, drift-guarded structural adapter is the permitted fallback for the zero-dependency installed skill) and MUST NOT re-parse the script's markdown. The compiler MUST resolve `presets` references through the Preset lookup order and expand them into the parameter cascade, MUST derive timing from measured TTS/media duration, and MUST derive layer sequencing and order from the model's list order. Each `Scene` MUST map to exactly one scene track preserving order, names, layers and resolved properties, and to exactly one HyperFrames Sub-composition. Overlay text MUST be sourced from the Layer's declared text field, never from the layer name. The engine MUST NOT depend on a React component runtime to render a scene.
(Previously: the compiler resolved `template::` references from the Series' L3 Template document; before that it lowered the model into a Remotion Composition.)

#### Scenario: Compile multi-scene script into a manifest and a HyperFrames project

- GIVEN a valid L3 video-script document containing narrative scenes and visual cues
- WHEN the scene compiler processes the document
- THEN it produces a manifest with ordered scenes, audio bindings, transition descriptors and overlay intervals
- AND the renderer emits a HyperFrames project with one Sub-composition per Scene and the project passes `hyperframes check` with no errors

#### Scenario: Compiler never re-parses markdown

- GIVEN a valid L3 document
- WHEN the scene compiler obtains its scene model
- THEN the model is a structured `read_knowledge`-shaped object
- AND the scene compiler performs no script markdown grammar parsing

#### Scenario: Invalid L3 document stops compilation

- GIVEN an L3 document that fails blueprint validation
- WHEN the scene compiler is invoked
- THEN it fails with a named, non-zero error before emitting any manifest
- AND it does not synthesize assets for the invalid input

#### Scenario: Presets reach the manifest

- GIVEN a Scene with `presets:: [Lucas]` where `Lucas` sets `transition:: fade`
- WHEN the scene compiler processes the document
- THEN the manifest scene carries `transition: fade`
