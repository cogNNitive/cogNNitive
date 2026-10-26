# Delta for cognnitive-video-engine

Scope: this change replaces the renderer (Remotion → HyperFrames) and the runtime
provisioner, and makes transitions actually render. The Composition Manifest shape, the
compiler's lowering rules, the cost guard and the overlay vocabulary are unchanged.

## RENAMED Requirements

- FROM: `### Requirement: Programmatic Remotion Scene Compilation`
- TO: `### Requirement: Programmatic HyperFrames Scene Compilation`

## MODIFIED Requirements

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

## ADDED Requirements

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
