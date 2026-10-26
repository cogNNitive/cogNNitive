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

The TTS cache key MUST depend only on the narration text, the resolved voice and the
TTS model. Changing a Layer's avatar `model` MUST NOT change the TTS cache key.

#### Scenario: Avatar model change does not re-bill TTS

- GIVEN a Scene compiled once (TTS cached)
- WHEN the presenter's `model::` changes and the Scene is recompiled
- THEN the TTS step is a cache hit (zero spend) for an unchanged narration

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

The b-roll overlay MUST be rendered by a HyperFrames media-clip block that honors a per-Layer
`fit` (`cover`|`contain`); with `contain` it MUST present the asset whole, uncropped, inside a
margin, and MUST apply a subtle zoom-in over its duration (disable with `zoomIn:false`).
(Previously: rendered by the engine's Remotion `Broll` component.)

#### Scenario: Contained b-roll with motion

- GIVEN a b-roll overlay with `fit: contain`
- WHEN it renders
- THEN the whole asset is visible with a margin and a rounded/shadowed card
- AND it zooms in gently across its duration

### Requirement: Watermark overlay rendering

The engine MUST render a `watermark` overlay as a small persistent text notice with a
configurable position, using a HyperFrames block, scaled so it stays inside the safe area at any
output size.
(Previously: rendered by the engine's Remotion `Watermark` component, scaled by `width/1920`.)

#### Scenario: Watermark drawn over the scene

- GIVEN a manifest with a `watermark` overlay
- WHEN the scene renders
- THEN the text notice is drawn for the overlay's duration at the configured position
- AND it stays inside the action-safe area

### Requirement: Spend Guard Is Gate-Only

The spend guard (`video-guard.json` + `SpendGuard`) MUST gate spend: it decides whether a resolved
model is allowed and whether the run fits the budget and daily cap. It MUST NOT select a model id.
An optional `defaults` block in `video-guard.json` MAY supply the `workspace` scope of the cascade.

#### Scenario: Blocked resolved model is refused before spend

- GIVEN a resolved model whose id is not in `allowedModels`
- WHEN `compile` runs
- THEN the whole run is refused before the first charge with a named error

#### Scenario: Guard never selects

- GIVEN the guard module
- WHEN it is inspected
- THEN it returns only allow/deny and budget verdicts, never a model id

#### Scenario: Workspace default participates in the cascade

- GIVEN `video-guard.json` declaring `defaults.tts`
- WHEN no more specific scope sets a TTS model
- THEN the engine uses the workspace default

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
and a `hyperframes.json`. Narration and music audio MUST be placed as root `<audio>` elements
with global times and unique ids (nested media with a non-zero start basis inside a
Sub-composition has ambiguous timing). The root `data-duration` MUST equal the manifest's
`totalDurationInSeconds`.

#### Scenario: Deterministic emission

- GIVEN a manifest
- WHEN the project is emitted twice
- THEN the emitted trees are byte-identical

#### Scenario: Audio lives at the root

- GIVEN a manifest with per-scene narration and looping music
- WHEN the project is emitted
- THEN every `<audio>` element is a root element with a global `data-start`/`data-duration` and a unique `id`
- AND no Sub-composition nests audible media with a non-zero start

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

