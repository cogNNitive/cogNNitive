# cogNNitive Video Engine Specification

## Purpose

Defines the programmatic rendering and media synthesis engine (`cognnitive-video-engine`) embedded into cogNNitive. It provides headless Remotion scene compilation, deterministic TTS and media synthesis caching, and command-line video rendering capabilities, eliminating external desktop application dependencies.
## Requirements
### Requirement: Deterministic Media & TTS Asset Synthesis

The system MUST provide an asset synthesis pipeline for TTS voice narration and media asset
retrieval, caching by a SHA-256 hash of the input, and reusing a cached asset on a hit. TTS
synthesis MUST run exactly once per narrated Scene. Voice and model parameters MUST be
resolved from the Template instance referenced by the Scene's `template::` field, NEVER from
the script. The pipeline MUST measure audio duration using `ffprobe`, falling back to a
duration reported by the synthesis provider when `ffprobe` is unavailable, and MUST NOT
depend on any Remotion module.
(Previously: duration was measured with `@remotion/media-parser` and the contract forbade FFmpeg-from-PATH.)

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

### Requirement: Headless Video Rendering CLI

The system MUST provide headless CLI commands that emit a HyperFrames project from the manifest
and invoke the HyperFrames renderer to produce an MP4, reporting the exact total duration and
frame metrics. The renderer MUST render through HyperFrames only; FFmpeg-from-PATH is not the
master compositor; and a mock MP4 MUST NOT masquerade as a render (an explicit `--allow-mock`
opt-in is the only exception, and it is reserved for CI). A HyperFrames failure is a loud,
named, non-zero error.

#### Scenario: Headless CLI renders MP4 master via HyperFrames

- GIVEN a compiled manifest and validated synthesized assets
- WHEN the video render CLI is executed with master output parameters
- THEN it emits the HyperFrames project and renders it to an MP4
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

The system MUST provide an asset cost estimator and provider pricing catalog
(`asset-cost-estimator.mjs`). Prior to asset synthesis, the engine MUST calculate per-scene
character counts, image layer requirements, unit pricing for selected image and voiceover
providers, and present an itemized per-scene and total budget estimation table for user approval.
Every model id the estimator uses MUST come from the single Model Selection Cascade resolver; the
estimator MUST NOT pick a model from a hardcoded default outside that resolver, and MUST report
the scope each resolved model came from.
(Previously: model ids were read from CLI flags with a hardcoded `DEFAULT_MODELS` fallback.)

#### Scenario: Script parsed and estimated by scene

- GIVEN a validated video script
- WHEN `asset-cost-estimator.mjs` is executed
- THEN it outputs an itemized table with per-scene durations, image counts, character counts, unit rates, and grand total in USD ($)
- AND each model id used is reported with the scope that supplied it

#### Scenario: The cascade is the only selector

- GIVEN a script with a video-level `template::`
- WHEN the estimator resolves the TTS/image models
- THEN it uses the cascade and never a bare hardcoded default

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

The TTS cache key MUST depend only on the narration text and the cascaded `voice` and
`tts_model`, and MUST be unchanged by the Field rename from `model` to `tts_model` for an equal
value. Changing a presenter Layer's `avatar_model::` MUST NOT change the TTS cache key.
(Previously: the fields were `model::`; voice/model fallbacks were private to `tts-options.mjs`, with an `elevenlabs` fallback.)

#### Scenario: Avatar model change does not re-bill TTS

- GIVEN a Scene compiled once (TTS cached)
- WHEN the presenter's `avatar_model::` changes and the Scene is recompiled
- THEN the TTS step is a cache hit (zero spend) for an unchanged narration

#### Scenario: Template field rename does not re-bill TTS

- GIVEN a Scene cached with a Template declaring `model:: minimax/speech-2.8-hd`
- WHEN the Template is migrated to `tts_model:: minimax/speech-2.8-hd` and the Scene is recompiled
- THEN the TTS step is a cache hit

### Requirement: Format variants with blur fill

The engine MUST be able to derive, from a square master, vertical and horizontal
variants that show the square WHOLE (contain) over a Gaussian-blurred fill, named by
their dimensions (`<slug>_<W>x<H>.mp4`).

#### Scenario: Vertical and horizontal variants are produced

- GIVEN a square master `<slug>_1080x1080.mp4`
- WHEN the format step runs for `vertical,horizontal`
- THEN it writes `<slug>_1080x1920.mp4` and `<slug>_1920x1080.mp4`
- AND each shows the square entire, centered, with the missing zones blurred

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

The system MUST provide a scene compiler that transforms the structured iNNfo video-script
model into a valid, tool-agnostic Composition Manifest and a renderer that lowers that
manifest into a **HyperFrames project**. The compiler MUST obtain its scene model as a
structured `read_knowledge`-shaped object (canonically from innfo-core `read_knowledge`; a
thin, drift-guarded structural adapter is the permitted fallback for the zero-dependency
installed skill) and MUST NOT re-parse the script's markdown. The compiler MUST resolve
`template::` references from the Series' L3 Template document, MUST derive timing from
measured TTS/media duration, and MUST derive layer sequencing and order from the model's
list order. Each `Scene` MUST map to exactly one scene track preserving order, names, layers
and resolved properties, and to exactly one HyperFrames Sub-composition. Overlay text MUST be
sourced from the Layer's declared text field, never from the layer name. The engine MUST NOT
depend on a React component runtime to render a scene.
(Previously: the compiler lowered the model into a Remotion Composition and a React component
pipeline rendered it; the renderer was Remotion-locked.)

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

