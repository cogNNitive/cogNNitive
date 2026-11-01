# cogNNitive Video Engine Specification

## Purpose

Defines the programmatic rendering and media synthesis engine (`cognnitive-video-engine`) embedded into cogNNitive. It provides headless Remotion scene compilation, deterministic TTS and media synthesis caching, and command-line video rendering capabilities, eliminating external desktop application dependencies.
## Requirements
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

### Requirement: Headless Video Rendering CLI

The system MUST provide headless CLI commands that emit a HyperFrames project from the manifest and invoke the HyperFrames renderer to produce the 1920x1920 MP4 master, reporting the exact total duration and frame metrics. The renderer MUST render through HyperFrames only; FFmpeg-from-PATH is not the master compositor (it only derives delivery formats from the master); and a mock MP4 MUST NOT masquerade as a render (an explicit `--allow-mock` opt-in is the only exception, and it is reserved for CI). A HyperFrames failure is a loud, named, non-zero error.
(Previously: the render took "master output parameters" and FFmpeg was not allowed any compositing role; the CLI accepted `--format`, `--width`, `--height` and `--output`.)

Source: D2, D3.

#### Scenario: Headless CLI renders MP4 master via HyperFrames

- GIVEN an approved script and synthesized assets
- WHEN `render <script>` is executed
- THEN it emits the HyperFrames project and renders it to `<slug>_1920x1920.mp4`
- AND it logs total rendered frames and execution time

#### Scenario: Total duration calculation and validation

- GIVEN a completed render job
- WHEN the CLI outputs the render summary
- THEN the reported total duration matches the root `data-duration` derived from the scene sequence timings

#### Scenario: HyperFrames failure is loud, never a silent mock

- GIVEN a render where the HyperFrames CLI is unavailable
- WHEN the render CLI runs without `--allow-mock`
- THEN it fails with a named, non-zero error
- AND it never writes a mock MP4 in its place

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

### Requirement: Composition Renders Every Media Layer Type

The HyperFrames composition MUST render each media layer type the compiler emits using the
correct primitive: a `layer_type: video` layer MUST render as a timed video element (never an
image), a `layer_type: image` layer MUST render as an image element, and a
`layer_type: talking_avatar` layer MUST render with a distinct framed treatment. When no layer
resolves to a drawable asset, the composition MUST fall back to a solid color. The composition
MUST remain presentational: it MUST NOT read the filesystem or resolve relative paths, consuming
only project-relative, staged asset names (`assets/...`).

#### Scenario: Video layer renders without an image-decode error

- GIVEN a scene whose layer is `layer_type: video` with an MP4 source
- WHEN the composition renders that scene
- THEN the video is drawn as a timed video element
- AND no image-decode failure occurs

#### Scenario: Talking avatar renders with its own treatment

- GIVEN a scene whose layer is `layer_type: talking_avatar` with a still image source
- WHEN the composition renders that scene
- THEN the avatar image is drawn with the distinct framed avatar treatment, not the generic image path

#### Scenario: No drawable layer falls back to color

- GIVEN a scene with no resolvable media layer
- WHEN the composition renders that scene
- THEN the scene background is a solid color fill, not an empty or broken frame

### Requirement: In-Dir and Out-of-Dir Asset Resolution

The system MUST resolve every media reference emitted by the compiler — `layer_asset_source`
and audio `assetPath` — against the **script directory**, not the current working directory, so
that both in-directory (`assets/…`) and out-of-directory (`../shared/…`) sources resolve. Each
resolved asset MUST be staged into the emitted HyperFrames project's `assets/` directory, and
the project MUST reference it by its root-relative staged name. A referenced asset that cannot
be resolved MUST fail loudly: the system MUST NOT silently drop the layer, substitute a mock, or
emit a color-only frame in its place.

#### Scenario: Out-of-directory asset is staged and served

- GIVEN a script whose layer references `../shared/intro_creadores.mp4`, outside the video folder
- WHEN the script is compiled and rendered
- THEN the asset is copied into the project `assets/` directory
- AND the project references it by its root-relative staged name
- AND the render succeeds with no 404 for the asset

#### Scenario: Missing asset fails loudly

- GIVEN a script whose layer references an asset that does not exist on disk
- WHEN the script is rendered without `--allow-mock`
- THEN the system fails with a named, non-zero error
- AND it never emits a mock MP4 or a silently color-only frame in the asset's place

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

### Requirement: B-roll overlay rendering

The `b-roll` overlay MUST render by mounting the resolved `b-roll` slot component, which MUST
honor the cascaded `fit` (`cover`|`contain`); with `contain` the fallback MUST present the asset
whole, uncropped, inside a margin. The engine MUST NOT add motion; any motion is the series
component's choice.
(Previously: a HyperFrames media-clip block that MUST apply a subtle zoom-in, disabled with `zoomIn:false`. The zoom-in was Remotion-era legacy (50633fac) and was never implemented after the HyperFrames migration.)

#### Scenario: Contained b-roll

- GIVEN a b-roll overlay with `fit: contain` using the fallback component
- WHEN it renders
- THEN the whole asset is visible with a margin and a rounded/shadowed card
- AND it does not move

### Requirement: Watermark overlay rendering

The engine MUST render a `watermark` overlay as a small persistent text notice with a
configurable position, by mounting the resolved `watermark` slot component, scaled so it stays
inside the safe area at any output size.
(Previously: rendered using a HyperFrames block.)

#### Scenario: Watermark drawn over the scene

- GIVEN a manifest with a `watermark` overlay
- WHEN the scene renders
- THEN the text notice is drawn for the overlay's duration at the configured position
- AND it stays inside the action-safe area

### Requirement: Spend Guard Is Gate-Only

The spend guard (`video-guard.json` + `SpendGuard`) MUST gate spend: it decides whether a resolved
model is allowed and whether the run fits the budget and daily cap. It MUST NOT select a model id
and MUST NOT supply any cascade level.
(Previously: an optional `defaults` block MAY supply the `workspace` scope, with scenario "Workspace default participates in the cascade"; never implemented. Migration: move such values to the domain-root `video-defaults_NN.md`.)

#### Scenario: Blocked resolved model is refused before spend

- GIVEN a resolved model whose id is not in `allowedModels`
- WHEN `compile` runs
- THEN the whole run is refused before the first charge with a named error

#### Scenario: Guard never selects

- GIVEN the guard module
- WHEN it is inspected
- THEN it returns only allow/deny and budget verdicts, never a model id

### Requirement: Global Narration Captions Feature

The engine MUST support narration subtitles as a **video-level** feature, independent of the
Layer model: when enabled, it emits a single root-level captions host
(`data-track-kind="captions"`) whose words are placed from the narration prose and measured
timings; when disabled (the default), it emits no captions host. Enabling it MUST NOT require any
script change.

#### Scenario: Enabled emits one captions host

- GIVEN a video with narration captions enabled
- WHEN the project is emitted
- THEN exactly one root captions host is present
- AND no Sub-composition nests its own caption track

#### Scenario: Disabled emits none

- GIVEN a video with narration captions disabled (default)
- WHEN the project is emitted
- THEN no captions host is present
- AND a `caption` Layer, if any, still renders as static text

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

### Requirement: Manifest to HyperFrames Project Emission

The renderer MUST lower the Composition Manifest into a HyperFrames project deterministically:
emitting the same manifest twice MUST produce byte-identical files. The project MUST contain a
root `index.html` that mounts exactly one scene host per Scene (with `data-start` and
`data-duration` derived from frames/fps), one Sub-composition per Scene under `compositions/`,
and a `hyperframes.json`. Overlay and animation hosts MUST be root elements with global times.
Narration, music and sound-effect audio MUST be root `<audio>` elements with global times and
unique ids. The only exception is the audio of an authored `animation` sub-composition, which
plays from its own mount. The root `data-duration` MUST equal the manifest's
`totalDurationInSeconds`.
(Previously: all audio was root-level, with no sound effects, overlay hosts or authored-animation exception.)

#### Scenario: Deterministic emission

- GIVEN a manifest
- WHEN the project is emitted twice
- THEN the emitted trees are byte-identical

#### Scenario: Audio lives at the root

- GIVEN a manifest with per-scene narration, looping music and resolved sound effects
- WHEN the project is emitted
- THEN every such `<audio>` element is a root element with a global `data-start` and a unique `id`
- AND no Sub-composition nests audible media with a non-zero start, except an authored animation's own audio

#### Scenario: Project validates

- GIVEN an emitted project
- WHEN `hyperframes check --json` runs
- THEN it reports zero errors

### Requirement: Rendered Scene Transitions

The renderer MUST render each Scene's declared `transition::` (`fade`, `slide-left`,
`slide-right`, `wipe`, `none`) as a motion on a **child wrapper** inside the scene's timed host,
never on the timed host element itself (a HyperFrames `.clip` MUST NOT be tweened on
`display`/`visibility`/`autoAlpha`). `none` MUST emit no tween. A transition declared in the
manifest MUST be observable in the emitted project.

#### Scenario: A declared transition renders

- GIVEN a Scene with `transition:: fade`
- WHEN the project is emitted
- THEN the scene's inner wrapper carries an opacity tween of the declared duration
- AND the scene's `.clip` host itself carries no `display`/`visibility`/`autoAlpha` tween

#### Scenario: No transition emits no motion

- GIVEN a Scene with `transition:: none`
- WHEN the project is emitted
- THEN no transition tween is emitted for that scene

### Requirement: HyperFrames Runtime Provisioning

The engine MUST provide an idempotent, consent-gated provisioner that verifies the pinned
HyperFrames CLI resolves and its agent skills are present. It MUST report the download size and
the pin before installing, MUST support a `--check` mode that reports readiness without
changing anything, and MUST NOT install, require, or reference any Remotion package.

#### Scenario: Check reports readiness without installing

- GIVEN a host without the pinned HyperFrames CLI
- WHEN the provisioner runs with `--check`
- THEN it reports the missing dependency and exits non-zero without installing anything

#### Scenario: No Remotion dependency remains

- GIVEN the provisioner and the skill frontmatter
- WHEN they are inspected for a Remotion install path
- THEN none exists

### Requirement: Names Are Parameters, Files Are Found By Walk

Which component mounts for a slot, which sound plays for an event and which frame applies MUST
be a cascade value (a name; see video-script-model "Universal Parameter Cascade"). The engine
MUST locate the file for a name as `components/<name>.html`, `sounds/<name>.*` or
`frames/<name>.md` by one nearest-folder walk from the script's folder up to the domain root
(episode, then series, then domain), then the skill's `components/` or `frames/` fallback. There
MUST be no other frame discovery (no nearest `frame.md`). When no file is found for a
component, sound or frame name, the outcome MUST depend on the cascade level that supplied the
name. A name set at any user level (layer, scene, video, series, domain Video Defaults) MUST
fail before any render or spend (pre-compile) with a named `MissingAssetError` giving the name,
the level and every path searched. A name supplied only by the blueprint Video Defaults MUST be
skipped with one warning naming it, so a fresh install still renders. An event with no resolved
name MUST be silent without warning.

#### Scenario: Nearest component file wins

- GIVEN the `quote` slot resolves to `quote` and `components/quote.html` exists in the episode and series folders
- WHEN the project is emitted
- THEN the mounted component is the episode file

#### Scenario: Frame resolved by name

- GIVEN the series sets `frame:: brand` and `frames/brand.md` exists only at the domain root
- WHEN the project is emitted
- THEN overlays receive the tokens of the domain `frames/brand.md`
- AND a `frame.md` in the series folder is ignored

#### Scenario: Dry run names the resolved frame

- GIVEN a script whose frame resolves to `frames/brand.md` from the series level
- WHEN `compile --dry-run` runs
- THEN it prints the frame name, its path and source `series`

#### Scenario: Blueprint default sound with a series file

- GIVEN the blueprint Video Defaults declares `scene-boundary=whoosh` and the series folder holds `sounds/whoosh.mp3`
- WHEN a scene boundary occurs
- THEN that file plays and engine code contains no `whoosh` literal

#### Scenario: Blueprint-only name with no file warns and is skipped

- GIVEN `scene-boundary` resolves to `whoosh` with source `blueprint` and no `sounds/whoosh.*` exists at any level
- WHEN `compile` runs
- THEN no sound is emitted, one warning names `whoosh`, and rendering succeeds

#### Scenario: User-level name with no file fails before spend

- GIVEN the series sets `sounds:: [overlay-enter.title=click]` and no `sounds/click.*` exists at any level
- WHEN `compile` runs
- THEN it fails before any synthesis or render with `MissingAssetError` naming `click`, level `series` and every path searched
- AND nothing is spent

#### Scenario: Unknown frame name set by the user fails

- GIVEN a scene sets `frame:: night` and no `frames/night.md` exists at any level
- WHEN `compile` runs
- THEN it fails pre-compile naming `night`, level `scene` and every path searched

### Requirement: Slot Contract

The engine MUST pass the resolved frame's `font` and `accent` tokens and the overlay's
`text`/`src`/`position`/`enter`/`exit` (plus `fit` for `b-roll`) as variable values. A resolved
component that does not declare every variable of its slot's fallback MUST fail emission with
`SlotContractError` naming the slot and the missing variables.

#### Scenario: Frame tokens reach the component

- GIVEN the resolved frame document declares a body font and a primary color
- WHEN an overlay is mounted
- THEN the component receives them as the `font` and `accent` variable values

### Requirement: Blueprint Defaults Are Read From The Package

The engine MUST read the `blueprint` cascade level from the installed bluepriNNt package's
`defaults/video-defaults_NN.md`, located from the skill's own folder for the repository,
global and workspace install layouts. When no package is found the engine MUST fail with a
named error listing every path tried. It MUST NOT write any Video Defaults document.

#### Scenario: Package not found

- GIVEN a skill copy with no `video-script` package at any known location
- WHEN `compile` runs
- THEN it fails before any spend with an error listing the paths tried

### Requirement: Sound Effects Bound To Engine Events

The engine MUST support exactly these sound keys, each timed from the manifest: `video-start`
(frame 0), `video-end` (ends at the video's end), `scene-boundary` (start of every scene after
the first), `overlay-enter.<slot>` and `overlay-exit.<slot>` for `title`, `lower-third`,
`caption`, `quote`, `watermark` (overlay start and end), and `layer-enter.<type>` for `b-roll`,
`animation`, `presenter` (layer start). Sounds MUST be root audio without a `data-duration`. No
caption or word event MUST exist.

#### Scenario: Per-slot key

- GIVEN the series sets `sounds:: [overlay-enter.title=click]`
- WHEN a `title` overlay enters and a `lower-third` overlay enters
- THEN `click` plays for the title only

#### Scenario: First scene has no boundary sound

- GIVEN a three-scene video with `scene-boundary` resolved
- WHEN the project is emitted
- THEN exactly two boundary sounds are emitted

### Requirement: Animation Layer Mounts As A Sub-Composition

For a Layer with `type:: animation`, the engine MUST copy the authored HyperFrames project at
`asset::` into `authored/<slug>/` and mount it as a sub-composition that plays its own audio at
its authored level, with no playback-rate retime and no ducking. The scene duration MUST be
`max(narration, animation)`; a shorter animation MUST hold its last frame. An unresolvable
`asset::` MUST fail loudly with a named, non-zero error.

#### Scenario: Animation is mounted with its own audio

- GIVEN a Scene with an `animation` Layer whose project has an audio track
- WHEN the project is emitted
- THEN the project is copied to `authored/<slug>/` and mounted as a sub-composition
- AND the layer is not muted and carries no playback-rate attribute

#### Scenario: Animation longer than narration extends the scene

- GIVEN narration of 4 s and an animation of 6 s
- WHEN the scene duration is computed
- THEN the scene lasts 6 s

#### Scenario: Shorter animation holds its last frame

- GIVEN narration of 6 s and an animation of 4 s
- WHEN the scene renders
- THEN the scene lasts 6 s and the animation shows its last frame from 4 s to 6 s

#### Scenario: Missing animation project fails loudly

- GIVEN an `animation` Layer whose `asset::` does not exist
- WHEN the project is emitted
- THEN the system fails with a named non-zero error

### Requirement: Scene Target Duration Is Exposed

An animation's intended length is its scene's length. `compile --dry-run` MUST print each
scene's target duration and whether it is `estimated` (no narration audio yet) or `measured`;
the compiled manifest MUST keep each scene's duration. When a mounted animation's duration
differs from its scene's narration duration by more than one frame, the engine MUST warn naming
the scene and both durations.

#### Scenario: Dry run lists target durations

- GIVEN a script whose narration is not yet synthesized
- WHEN `compile --dry-run` runs
- THEN every scene is listed with a duration marked `estimated`

#### Scenario: Mismatch warns

- GIVEN narration of 6 s and an animation of 4 s
- WHEN the project is emitted
- THEN a warning names the scene, 4 s and 6 s, and emission succeeds

### Requirement: Regeneration Guard

When writing the emitted project, the engine MUST record a content hash of every file it
writes. On regeneration it MUST compare each existing file's hash with the recorded one; if any
differ, it MUST refuse, write nothing, and list every edited file. A recorded file that no
longer exists MUST be regenerated. There MUST be no `--force` option. Files with no recorded
hash MUST be written normally.

#### Scenario: Edited file blocks regeneration

- GIVEN a previously emitted project in which the user edited one generated file
- WHEN the project is regenerated
- THEN the engine refuses with a named non-zero error listing that file
- AND no file is overwritten

#### Scenario: Deleting the file accepts regeneration

- GIVEN an edited generated file that the user then deletes
- WHEN the project is regenerated
- THEN the file is regenerated and the run succeeds

#### Scenario: Untouched project regenerates

- GIVEN an emitted project with no hand edits
- WHEN it is regenerated
- THEN every file is rewritten and the run succeeds

#### Scenario: No force flag

- GIVEN the emit CLI
- WHEN `--force` is passed
- THEN it is not recognised as a way to bypass the guard

### Requirement: Only Implemented Providers Exist

The engine MUST name only providers it has a request path for (WaveSpeed and Replicate) plus
the offline `local`/`mock` modes. `elevenlabs`, `edge-tts` and `ELEVENLABS_API_KEY` MUST NOT
appear in the skill's scripts, tests or docs.

#### Scenario: No phantom provider

- GIVEN the skill tree
- WHEN it is searched for `elevenlabs`, `edge-tts` or `ELEVENLABS_API_KEY` (case-insensitive)
- THEN nothing is found

### Requirement: Provider Clips Are Cached As Delivered

The engine MUST cache a provider video clip exactly as delivered, with no `+faststart` remux and
no `.needs-faststart` marker: a raw clip whose `moov` atom follows `mdat` renders through the
pinned HyperFrames CLI unchanged. Final deliverables MAY still be remuxed by `render-formats.mjs`.

#### Scenario: Avatar clip is not remuxed

- GIVEN a synthesized avatar clip
- WHEN it is cached and later compiled
- THEN no ffmpeg remux runs and no `.needs-faststart` file exists

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

### Requirement: Single Square Master Declared By master_resolution

The compiler MUST take the master pixel size from the cascaded `master_resolution` value parsed as `^(\d+)x(\d+)$`, MUST emit a manifest whose width and height are that size, and MUST fail before any spend with `unsupported-master-resolution` when the value does not match; `scene-compiler.mjs` and `scene-project.mjs` MUST NOT default a width, height or orientation, and `isHorizontal` and the `center 12%` headroom MUST NOT exist.

Source: D3, D5, settled default 4.

#### Scenario: Manifest takes the declared size

- GIVEN the package default `master_resolution:: 1920x1920`
- WHEN a script is compiled
- THEN the manifest width and height are 1920 and 1920

#### Scenario: Unsupported value stops before spend

- GIVEN a domain Video Defaults declaring `master_resolution:: wide`
- WHEN `compile` runs
- THEN it fails with `unsupported-master-resolution`
- AND no provider request is made and no ledger entry is written

#### Scenario: Project emission requires the size

- GIVEN a manifest without width or height
- WHEN the project is emitted
- THEN emission fails with a named error and does not assume 1920x1080

### Requirement: Format Flags Are Removed From The Engine CLI

The engine CLI MUST NOT accept `--format`, `--width` or `--height`, and `FORMAT_PRESETS`, `resolveFormatSize` and the 9:16 recompile route MUST NOT exist.

Source: D3.

#### Scenario: Removed flag is a usage error

- GIVEN the engine CLI
- WHEN `render` or `compile` is run with `--format 9:16`
- THEN it exits non-zero with a usage that does not list the flag
- AND nothing is compiled or spent

### Requirement: Delivery Formats Are Derived From The Master By Crop

The format step MUST derive every delivery format as a pure function of the master file `<slug>_1920x1920.mp4` with the common arguments `-map 0:v:0 -map 0:a? -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart -map_metadata -1 -fflags +bitexact`, using `-vf crop=1080:1920:420:0` for `<slug>_1080x1920.mp4`, `-vf crop=1920:1080:0:420` for `<slug>_1920x1080.mp4` and `-vf scale=1080:1080:flags=lanczos` for `<slug>_1080x1080.mp4`.

Source: D5, settled default 2, invariant 12.

The square MUST be a real scale and MUST NOT be a stream copy.

#### Scenario: Vertical is the central columns

- GIVEN a 1920x1920 master
- WHEN the vertical format is derived
- THEN the ffmpeg arguments contain `crop=1080:1920:420:0`
- AND ffprobe reports 1080x1920 for `<slug>_1080x1920.mp4`

#### Scenario: Horizontal is the central rows

- GIVEN a 1920x1920 master
- WHEN the horizontal format is derived
- THEN the ffmpeg arguments contain `crop=1920:1080:0:420`
- AND ffprobe reports 1920x1080

#### Scenario: Square is a real scale

- GIVEN a 1920x1920 master
- WHEN the square format is derived
- THEN the ffmpeg arguments contain `scale=1080:1080:flags=lanczos` and not `-c copy`
- AND ffprobe reports 1080x1080

#### Scenario: Every output equals its name

- GIVEN all three derived outputs
- WHEN ffprobe measures each
- THEN its `<W>x<H>` equals the dimensions in its file name

### Requirement: Blur Fill Is Opt-In And Suffixed

Blur-filled variants MUST be produced only when `--fill blur` is passed, MUST use the existing blur-fill filter graph (`buildBlurFillFilter`), MUST apply only to the vertical and horizontal formats, and MUST be named `<slug>_<W>x<H>_blur.mp4`; the default fill MUST be `crop`.

Source: D5, settled default 2.

#### Scenario: Default does not blur

- GIVEN a derivation run without `--fill`
- WHEN the outputs are listed
- THEN no file name ends in `_blur.mp4`

#### Scenario: Blur variant coexists with the crop

- GIVEN `<slug>_1080x1920.mp4` already published
- WHEN the vertical format is derived with `--fill blur`
- THEN `<slug>_1080x1920_blur.mp4` is written and the crop file is unchanged

#### Scenario: Square ignores blur

- GIVEN `--fill blur` with the square format
- WHEN the outputs are derived
- THEN `<slug>_1080x1080.mp4` is written by the lanczos scale and no `_blur` square exists

### Requirement: Derivation Guards Its Input And Its Outputs

The format step MUST refuse a master that ffprobe does not report as 1920x1920, MUST read the slug from the master file name `<slug>_1920x1920.mp4`, and MUST skip an existing output unless `--force` is passed.

Source: D5.

#### Scenario: Non-square master is refused

- GIVEN a master that ffprobe reports as 1920x1080
- WHEN the format step runs
- THEN it fails with a named error and writes no output

#### Scenario: Existing output is kept

- GIVEN `<slug>_1080x1920.mp4` already exists
- WHEN the format step runs without `--force`
- THEN the file is not modified and the run reports it as skipped
- AND with `--force` the file is rewritten

#### Scenario: Derivation is deterministic

- GIVEN the same master derived twice on one machine
- WHEN the two vertical outputs are compared
- THEN they are identical files

### Requirement: Overlay Components Respect The Central Safe Square

The overlay components `lower-third`, `caption`, `title`, `quote`, `watermark` and `b-roll` MUST set `#root { inset: 21.875%; overflow: visible }` and MUST keep their own percentages relative to that inset square, so that every overlay stays inside the central 1080x1080 of the master that survives every derivation.

Source: D5.

#### Scenario: Inset is declared

- GIVEN the six shipped overlay components
- WHEN each is inspected
- THEN each declares `inset: 21.875%` on `#root`

#### Scenario: Lower third survives both crops

- GIVEN `lower-third` with `bottom: 12%`, `left: 5%` and `max-width: 70%` inside the inset square
- WHEN it is placed on the 1920x1920 master
- THEN its box sits 549.6 px above the master bottom, 474 px from the left and at most 756 px wide
- AND in the horizontal crop it sits 129.6 px above the bottom and in the vertical crop 54 px from the left

#### Scenario: Caption survives both crops

- GIVEN `caption` with `bottom: 10%`, `right: 5%` and `max-width: 60%` inside the inset square
- WHEN it is placed on the master
- THEN its box sits 528 px above the master bottom, 474 px from the right and at most 648 px wide
- AND in the horizontal crop it sits 108 px above the bottom and in the vertical crop 54 px from the right

### Requirement: Engine Output Is Written Only Under build/

The engine MUST write its manifest to `E/build/manifest.json` on every compile (the `--output` and `--out` options MUST NOT exist), MUST stage every asset only into `E/build/hyperframes/assets/` as the single staging layer with the content-addressed names `<base>_<sha12>`, MUST emit the project at `E/build/hyperframes/`, MUST create `E/build/.nn-build`, and MUST NOT create `E/public/`, `E/hyperframes/` or an `E/audio/` handoff.

Source: D2, invariant 9.

The renderer MUST NOT copy the staging folder onto itself when the staging folder and the project assets folder are the same, and `projectDir` MUST be required. Manifest absolute paths (`scriptSource`, `publicDir`, `frame.path`, `components[].path`) MUST stay absolute.

#### Scenario: Compile stages once

- GIVEN a script with one image and one narration
- WHEN `compile` completes
- THEN each staged file exists once, under `E/build/hyperframes/assets/`, named `<base>_<sha12>.<ext>`

#### Scenario: Output option is refused

- GIVEN the engine CLI
- WHEN `compile` is run with `--output out.json`
- THEN it exits non-zero with a usage that does not list the option

#### Scenario: Renderer does not copy onto itself

- GIVEN a manifest whose `publicDir` equals the project assets folder
- WHEN the project is rendered
- THEN no copy is attempted and the render proceeds

### Requirement: Render Compiles Every Time And Writes The Master In Place

The `render` command MUST accept only a script (`render <manifest.json>` MUST NOT exist), MUST compile on every run, MUST render to `E/build/render.tmp.mp4` and MUST then rename it on the same volume to `E/<slug>_1920x1920.mp4`.

Source: D2.

A rename that fails because the target is open MUST end in an error message that explains the open file.

#### Scenario: Stale manifest cannot be rendered

- GIVEN a `build/manifest.json` from before a script edit
- WHEN `render <script>` runs
- THEN the manifest is regenerated from the current script before rendering

#### Scenario: Master appears atomically

- GIVEN a render in progress
- WHEN the final file is observed before completion
- THEN `E/<slug>_1920x1920.mp4` is either absent or the previous complete master, never a partial file

#### Scenario: Manifest argument is refused

- GIVEN a path to `manifest.json`
- WHEN `render` is run with it
- THEN it exits non-zero with a usage showing a script argument

### Requirement: Render Refuses Missing Avatar Clips

The `render` command MUST refuse to render when a presenter Layer has no cached avatar clip, with a named non-zero error that states the avatar synthesis command. There is no override flag: the way forward is to synthesize the avatars first.

Source: D8.

#### Scenario: Missing clip stops the render

- GIVEN a presenter Layer whose avatar clip is not in the cache
- WHEN `render <script>` runs
- THEN it fails before rendering, states the avatar synthesis command, and writes no master

### Requirement: Avatar Synthesis Reads The TTS Cache Directly

`synthesize-avatar` MUST obtain a scene's audio from the TTS cache entry through `ttsCachePathFor(scene, {cacheManager, config, models, bags})`, MUST keep the explicit `audio_asset_source` or `voiceover` branch for scenes without narration, and on a cache miss MUST fail naming "run compile first"; compile MUST NOT write `audio/<sceneId>_voiceover.mp3`.

Source: D7.

#### Scenario: Audio comes from the cache

- GIVEN a narrated scene whose TTS cache entry exists
- WHEN `synthesize-avatar` builds the job
- THEN the audio bytes are those of the cache entry and no `audio/` file is read

#### Scenario: Cache miss names the fix

- GIVEN a narrated scene with no TTS cache entry
- WHEN `synthesize-avatar` runs
- THEN it fails with a message containing "run compile first"

#### Scenario: Compile writes no handoff

- GIVEN a compile of a narrated script
- WHEN `E/` is listed
- THEN no `audio/<sceneId>_voiceover.mp3` was created by the engine

### Requirement: Named Sounds Are Found Only In sounds/

Sound file lookup MUST search only `sounds/<name>.*` through the nearest-folder walk, MUST NOT search `shared/audio` or `audio`, and a name set at a user level whose file exists only under `shared/audio` MUST fail before any spend with `MissingAssetError` listing every directory searched.

Source: D9, settled default 7 (issue #425).

#### Scenario: shared/audio is not searched

- GIVEN `sounds:: [overlay-enter.title=click]` at the series level and `series/s/shared/audio/click.mp3` only
- WHEN `compile` runs
- THEN it fails before spend with `MissingAssetError` naming `click`, level `series` and the searched `sounds/` directories
- AND `shared/audio` is not among them

#### Scenario: sounds/ file is used

- GIVEN `series/s/sounds/click.mp3`
- WHEN the name `click` is resolved
- THEN that file is used

### Requirement: Estimate Reflects What The Run Will Charge

The cost estimator MUST price a cached item at $0, MUST quote an image only when compile would generate it (prompt present), and MUST make `total_usd` equal the amount the run will charge, so the 1.25x cap compares against real spend.

Source: D10.

#### Scenario: Cached narration costs nothing

- GIVEN a full TTS cache for a script
- WHEN the estimator runs
- THEN every cached item is priced $0 and `total_usd` is the sum of uncached items only

#### Scenario: Image without a prompt is not quoted

- GIVEN a Layer with an `asset` and no `prompt`
- WHEN the estimator runs
- THEN no image price is quoted for it

#### Scenario: Cache emptied after the estimate

- GIVEN an approved all-cached estimate whose cache is then emptied
- WHEN compile runs
- THEN compile refuses rather than spending past the approved total

### Requirement: Plan Boilerplate Is Truthful

`asset_plan.md` MUST show the in-chat approval phrase `approve the plan <hash8>` instead of an `approve-plan.mjs <this file>` command, MUST list the stamped resolved model ids instead of a `- [ ]` checklist, and MUST NOT contain a hard-coded "Recommended" tier or "Speech 2.5 HD"; the `checkApproval` hint MUST use the same phrase.

Source: D10.

#### Scenario: Plan states the phrase

- GIVEN a generated `asset_plan.md`
- WHEN it is read
- THEN it contains `approve the plan` followed by the 8-character hash and no `approve-plan.mjs <this file>` line

#### Scenario: Plan lists resolved models

- GIVEN a script whose TTS model resolves to `minimax/speech-2.8-hd`
- WHEN the plan is generated
- THEN it lists that id and contains neither "Speech 2.5 HD" nor "Recommended"

#### Scenario: Approval hint matches

- GIVEN a missing approval
- WHEN `checkApproval` fails
- THEN its hint contains the same in-chat phrase

### Requirement: Cache Identity Is Layout-Independent

No cache key (TTS, image or avatar) MUST contain a path, folder name, output name or pixel dimension, so that moving an episode, renaming an output or changing the master size declaration never changes a key.

Source: D1, cache-key audit, invariants 1 to 12.

#### Scenario: Keys survive a layout change

- GIVEN TTS, image and avatar identities computed on a fixture
- WHEN the fixture is moved to the canonical layout and the identities are recomputed
- THEN every identity is equal

#### Scenario: Output name is not an input

- GIVEN two compiles of one scene whose episode folder names differ
- WHEN the keys are compared
- THEN they are equal

### Requirement: Cache Identity Image Options Never Gain Size

The image `mediaOptions` MUST NOT include a `size` key or any key derived from the master resolution, and the image key MUST remain computed from the prompt and the options `{provider, model, title: "<scene.name> — <layer.name>", accentColor, modelOverride?}`.

Source: D3, cache-key audit.

#### Scenario: Square master adds nothing to the image key

- GIVEN the committed golden image key for a scene
- WHEN the scene is compiled with the 1920x1920 master
- THEN the image key equals the golden

#### Scenario: Display names are not renamed

- GIVEN scene and layer display names
- WHEN the engine change is applied
- THEN no heading is renamed and the title string in the key is unchanged

### Requirement: Cache Identity Avatar Audio Comes From The TTS Cache

The avatar key MUST remain the hash of the image bytes, the audio bytes and `{model, resolution}`, and the audio bytes MUST be those of the TTS cache entry, so the key equals the key computed from the former `audio/` copy.

Source: D7, invariant 5.

#### Scenario: Key equals the key from the audio copy

- GIVEN a narrated scene with a TTS cache entry and an `audio/` copy of the same bytes
- WHEN the avatar key is computed from each
- THEN the two keys are equal

#### Scenario: Temp clips are kept

- GIVEN avatar clips in `.cognnitive/cache/video/temp/`
- WHEN compile, avatar synthesis, render or finalize runs
- THEN no `temp/*.mp4` file is deleted

### Requirement: Cache Identity Keyless Placeholders Are Stored Offline

Without a provider key, the synthesizer MUST store the placeholder TTS audio and the placeholder image under `<key>-offline` and MUST NOT store them under the real key, and the offline placeholder image MUST be 1920x1920 and MUST NOT be part of any key.

Source: D10, settled default 8.

#### Scenario: Keyless TTS does not poison the real key

- GIVEN a run without `WAVESPEED_API_KEY`
- WHEN a narrated scene is synthesized
- THEN the placeholder is stored as `<key>-offline` and no file exists under the real key

#### Scenario: Later keyed run bills

- GIVEN a prior keyless run
- WHEN a keyed run synthesizes the same scene
- THEN the real key is a miss, the provider is called once and the real entry is stored

#### Scenario: Keyless image does not poison the real key

- GIVEN a keyless run that generates a local SVG placeholder for an image Layer
- WHEN the cache is listed
- THEN the placeholder is under `<key>-offline` and the 1920x1920 SVG is not under the real image key

### Requirement: Cache Identity Location And Domain Root Are Unchanged

The cache MUST stay at `<findDomainRoot>/.cognnitive/cache/video/{tts,images,temp}` where the domain root is the nearest `domaiNN_NN.md`, `build/` MUST NOT change the domain root, and the ledger, `pending-predictions.jsonl`, `locks/` and `video-guard.json` MUST stay at the domain root.

Source: D2, cache-key audit, invariants 1 and 10.

#### Scenario: Build folder does not relocate the cache

- GIVEN an episode with a `build/` folder
- WHEN the cache directory is resolved from the script
- THEN it is `<domain root>/.cognnitive/cache/video`

#### Scenario: Domain root detection is unchanged

- GIVEN `domaiNN_NN.md` two levels above an episode that has `build/`
- WHEN the domain root is resolved from the script and from `E/build/`
- THEN both resolve to the folder holding `domaiNN_NN.md`
- AND the ledger, locks and `video-guard.json` are read from there
