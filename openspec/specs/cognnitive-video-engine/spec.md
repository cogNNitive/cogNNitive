# cogNNitive Video Engine Specification

## Purpose

Defines the programmatic rendering and media synthesis engine (`cognnitive-video-engine`) embedded into cogNNitive. It provides headless Remotion scene compilation, deterministic TTS and media synthesis caching, and command-line video rendering capabilities, eliminating external desktop application dependencies.
## Requirements
### Requirement: Programmatic Remotion Scene Compilation

The system MUST provide a scene compiler that transforms the structured iNNfo
video-script model into a valid Remotion Composition Manifest. The compiler MUST
obtain its scene model as a structured `read_knowledge`-shaped object (canonically
from innfo-core `read_knowledge`; a thin, drift-guarded structural adapter is the
permitted fallback for the zero-dependency installed skill) and lower that
structured model into the manifest; it MUST NOT re-implement or re-parse the
script's markdown grammar and MUST NOT invoke the vendored VUS parser.
The compiler MUST resolve `template::` references from the Series' L3 Template
document. It MUST derive timing from measured TTS/media duration and MUST derive
layer sequencing and order from the model's list order. Each `Scene` MUST map to
exactly one `RemotionSceneTrack`, preserving scene order, names, layers, and
resolved properties. The compiler MUST generate frame-accurate sequence tracks,
transitions, lower-thirds, and kinetic typography titles.
Overlay text MUST be sourced from the Layer's declared text field, never from the
layer name.
(Previously: the compiler emitted concept callouts (`conceptCallout`) and lowered the vendored VUS parser AST into the manifest, emitting one overlay track per blockquote.)

#### Scenario: Compile multi-scene script into Remotion composition manifest

- GIVEN a valid L3 video-script document containing narrative scenes and visual cues
- WHEN the scene compiler processes the document
- THEN it produces a structured Remotion composition manifest containing ordered scene sequences, audio track bindings, transition descriptors, and overlay timing intervals

#### Scenario: Scenes compile one track per Scene in list order

- GIVEN an L3 document whose Scenes are declared via the native `# NN index` hierarchy
- WHEN the scene compiler processes the document
- THEN it produces one `RemotionSceneTrack` per Scene, in list order
- AND it never collapses the document into a single scene named after a section header

#### Scenario: Compiler never re-parses markdown

- GIVEN a valid L3 document
- WHEN the scene compiler obtains its scene model
- THEN the model is a structured `read_knowledge`-shaped object (from innfo-core or the drift-guarded adapter)
- AND the scene compiler performs no script markdown grammar parsing

#### Scenario: Invalid L3 document stops compilation

- GIVEN an L3 document that fails blueprint validation
- WHEN the scene compiler is invoked
- THEN it fails with a named, non-zero error before emitting any manifest
- AND it does not synthesize assets for the invalid input

#### Scenario: Visual overlay components compiled with precise frame timings

- GIVEN a document specifying lower thirds and kinetic titles
- WHEN the scene compiler compiles it into the manifest
- THEN every visual overlay element contains a calculated start frame, duration in frames, and component configuration matching the document definitions

#### Scenario: Text layer content resolves into overlay props

- GIVEN a text Layer carrying its declared text field
- WHEN the scene compiler builds the matching overlay
- THEN the overlay's title/heading/label equals that text value, never falling back to the layer name

#### Scenario: Template references reach the manifest

- GIVEN an L3 document whose Scene references a Template instance via `template::`
- WHEN the scene compiler lowers the structured model into the manifest
- THEN the manifest contains the resolved template configuration for that Scene

---

### Requirement: Deterministic Media & TTS Asset Synthesis

The system MUST provide an asset synthesis pipeline for TTS voice narration and
media asset retrieval. The pipeline MUST compute a SHA-256 hash of the input
text/parameters and cache synthesized audio and media files. If an asset
corresponding to the SHA-256 hash exists in the cache, the system MUST reuse the
cached asset and skip re-synthesis. TTS synthesis MUST run exactly once per Scene
that carries narration. Voice and model parameters MUST be resolved from the
Template instance referenced by the Scene's `template::` field, NEVER from the
script (which declares no voice or model). The pipeline MUST measure audio
duration without FFmpeg-from-PATH.
(Previously: voice/model came from parsed VUS `scene_tts_model` and per-model `voice_id` overrides.)

#### Scenario: Cache hit avoids redundant TTS synthesis

- GIVEN an existing cached TTS narration file matching the SHA-256 hash of the scene's text and voice settings
- WHEN asset synthesis is requested for the scene
- THEN the system retrieves the existing cached audio file without invoking the TTS synthesis engine

#### Scenario: New asset synthesized and stored with content-derived hash

- GIVEN scene narration text or parameters not present in the cache
- WHEN asset synthesis is executed
- THEN the system synthesizes the audio, writes the result to the cache keyed by its SHA-256 hash, and links it in the scene composition

#### Scenario: One synthesis call per narrated scene

- GIVEN a multi-scene document in which only some scenes carry narration
- WHEN the compiler synthesizes assets
- THEN exactly one TTS call is made per narrated scene
- AND no synthesis is attempted for a merged multi-scene text blob

#### Scenario: Template-resolved voice and model are honored

- GIVEN a Scene whose `template::` reference resolves to a Template instance declaring a voice and model
- WHEN the compiler synthesizes that scene's narration
- THEN the synthesis uses the Template instance's declared model and voice

#### Scenario: Audio duration measured without FFmpeg

- GIVEN narration audio and no FFmpeg binary on PATH
- WHEN the pipeline needs the audio duration
- THEN it obtains the duration without invoking FFmpeg-from-PATH

### Requirement: Headless Video Rendering CLI

The system MUST provide headless CLI commands that invoke the Remotion bundler and renderer to produce a finalized MP4 video file and calculate the exact total video duration and frame metrics. The renderer MUST render via the Remotion entry point only; FFmpeg-from-PATH is removed, and a mock MP4 MUST NOT masquerade as a render (an explicit `--allow-mock` opt-in is the only exception).

#### Scenario: Headless CLI renders MP4 master video
- GIVEN a compiled Remotion composition manifest and validated synthesized assets
- WHEN the video render CLI is executed with master output parameters
- THEN it compiles the bundle headlessly, renders the full composition to an MP4 video file, and logs total rendered frames and execution time

#### Scenario: Total duration calculation and validation
- GIVEN a completed render job
- WHEN the CLI outputs the render summary
- THEN the reported total duration exactly matches the composition timeline duration derived from the individual scene sequence timings

#### Scenario: Remotion failure is loud, never a silent mock
- GIVEN a render where the Remotion modules are unavailable
- WHEN the render CLI runs without `--allow-mock`
- THEN it fails with a named, non-zero error
- AND it never falls back to FFmpeg-from-PATH or writes a mock MP4 in its place

---

### Requirement: Interactive Provider Consultation and Cost Estimation

The system MUST provide an asset cost estimator and provider pricing catalog (`asset-cost-estimator.mjs`). Prior to asset synthesis, the engine MUST calculate per-scene character counts, image layer requirements, unit pricing for selected image providers (WaveSpeed AI, Replicate, Local) and voiceover providers (ElevenLabs, OpenAI, Windows SAPI / Edge-TTS), and present an itemized per-scene and total budget estimation table for user approval.

#### Scenario: Script parsed and estimated by scene
- GIVEN a validated video script
- WHEN `asset-cost-estimator.mjs` is executed
- THEN it outputs an itemized table with per-scene durations, image counts, character counts, unit rates, and grand total in USD ($)

#### Scenario: Comparison across quality tiers
- GIVEN a script cost estimation
- WHEN the cost plan is generated
- THEN it includes a side-by-side comparison across Budget, Professional Studio, Cinema, and Offline/Free tiers detailing tradeoffs and estimated total costs

---

### Requirement: Composition Renders Every Media Layer Type

The Remotion composition MUST render each media layer type the compiler emits
using the correct Remotion primitive: a `layer_type: image` layer MUST render via
`<Img>`, a `layer_type: video` layer MUST render via `<OffthreadVideo>` (never
`<Img>`, which fails to decode an MP4), and a `layer_type: talking_avatar` layer
MUST render with a distinct framed image treatment. When no layer resolves to a
drawable asset, the composition MUST fall back to a solid color background. The
composition MUST remain presentational: it MUST NOT read the filesystem or resolve
relative paths, consuming only manifest-provided, bundle-relative asset names.

#### Scenario: Video layer renders without an image-decode error
- GIVEN a scene whose layer is `layer_type: video` with an MP4 source
- WHEN the composition renders that scene
- THEN the video is drawn via `<OffthreadVideo>`
- AND no `EncodingError` image-decode failure occurs

#### Scenario: Talking avatar renders with its own treatment
- GIVEN a scene whose layer is `layer_type: talking_avatar` with a still image source
- WHEN the composition renders that scene
- THEN the avatar image is drawn with the distinct framed avatar treatment, not the generic image path

#### Scenario: Image layer renders via the image primitive
- GIVEN a scene whose layer is `layer_type: image`
- WHEN the composition renders that scene
- THEN the image is drawn via `<Img>`

#### Scenario: No drawable layer falls back to color
- GIVEN a scene with no resolvable media layer
- WHEN the composition renders that scene
- THEN the scene background is a solid color fill, not an empty or broken frame

---

### Requirement: In-Dir and Out-of-Dir Asset Resolution

The system MUST resolve every media reference emitted by the compiler —
`layer_asset_source` and audio `assetPath` — against the **script directory**, not
the current working directory, so that both in-directory (`assets/…`) and
out-of-directory (`../shared/…`) sources resolve. Each resolved asset MUST be
staged into a Remotion-served public directory, the manifest MUST be rewritten so
those fields reference the staged, bundle-relative names, and the public directory
MUST be recorded in the manifest so a render from a persisted manifest resolves
the same media. A referenced asset that cannot be resolved MUST fail loudly: the
system MUST NOT silently drop the layer, substitute a mock, or emit a color-only
frame in its place.

#### Scenario: Out-of-directory asset is staged and served
- GIVEN a script whose layer references `../shared/intro_creadores.mp4`, outside the video folder
- WHEN the script is compiled and rendered
- THEN the asset is copied into the Remotion-served public directory
- AND the manifest references it by its staged, bundle-relative name
- AND the render succeeds with no 404 for the asset

#### Scenario: In-directory asset is staged and served
- GIVEN a script whose layer references `assets/avatar_entrevistador_podcast.jpeg`
- WHEN the script is compiled and rendered
- THEN the asset resolves relative to the script directory and is served by the renderer

#### Scenario: Render from a persisted manifest resolves staged media
- GIVEN a previously compiled manifest that records its public directory
- WHEN the manifest alone is rendered (no in-process compile)
- THEN the renderer passes that public directory to the bundler
- AND all staged media resolve

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

The b-roll overlay MUST
honor a per-Layer `fit` (`cover`|`contain`); with `contain` it MUST present the asset
whole, uncropped, inside a margin, and MUST apply a subtle zoom-in over its duration
(disable with `zoomIn:false`).

#### Scenario: Contained b-roll with motion

- GIVEN a b-roll overlay with `fit: contain`
- WHEN it renders
- THEN the whole asset is visible with a margin and a rounded/shadowed card
- AND it zooms in gently across its duration

### Requirement: Watermark overlay rendering

The engine MUST render a `watermark` overlay as a small persistent text notice with a
configurable position and typography scaled by `width/1920`.

#### Scenario: Watermark drawn over the scene

- GIVEN a manifest with a `watermark` overlay
- WHEN the scene renders
- THEN the text notice is drawn for the overlay's duration at the configured position

