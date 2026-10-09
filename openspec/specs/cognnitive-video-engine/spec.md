# cogNNitive Video Engine Specification

## Purpose

Defines the programmatic rendering and media synthesis engine (`cognnitive-video-engine`) embedded into cogNNitive. It provides headless Remotion scene compilation, deterministic TTS and media synthesis caching, and command-line video rendering capabilities, eliminating external desktop application dependencies.
## Requirements
### Requirement: Programmatic Remotion Scene Compilation

The system MUST provide a scene compiler that transforms VUS / markdown video
scripts into a valid Remotion Composition Manifest. The compiler MUST obtain its
scene model by invoking the vendored VUS parser (`parse()` → `Project`) and
lowering that AST into the manifest; it MUST NOT scan script text with its own
grammar subset. The compiler MUST additionally resolve reusable template
definitions (`@template`, `@caption_template`, `@broll_template`) from a
referenced Level 2 video blueprint when one is declared, and MUST emit one
overlay track per parsed blockquote (`>`) event. The compiler MUST resolve the
parser from the vendored ESM artifact by relative path, with no npm package
import and no `tsx` loader. Each VUS scene MUST map to exactly one
`RemotionSceneTrack`, preserving scene order, names, layers, and resolved
properties (property sets, template chains, per-model TTS overrides). The
compiler MUST generate frame-accurate sequence tracks, transitions, lower-thirds
(`lowerThirds`), kinetic typography titles (`kineticTitles`), and concept
callouts (`conceptCallouts`). Text layers are authored with the canonical VUS
field `layer_text_content`; the compiler MUST source overlay text from
`layer_text_content` and MUST NOT read the legacy `layer_generation_text` field
or a `text` fallback.
(Previously: the compiler lowered only the parser AST and had no external blueprint resolution or blockquote overlay emission.)

#### Scenario: Compile multi-scene VUS script into Remotion composition manifest
- GIVEN a valid VUS script containing narrative scenes and visual cues
- WHEN the scene compiler processes the script
- THEN it produces a structured Remotion composition manifest containing ordered scene sequences, audio track bindings, transition descriptors, and overlay timing intervals

#### Scenario: `@`-declared scenes compile one track per scene
- GIVEN a valid VUS script whose scenes are declared with `@Template Scene Title` headers and `@@Layer` children
- WHEN the scene compiler processes the script
- THEN it produces one `RemotionSceneTrack` per declared scene, in source order
- AND it never collapses the script into a single scene named after a section header

#### Scenario: Compiler scene model matches the vendored parser
- GIVEN a valid VUS script
- WHEN both the scene compiler and the vendored parser's `parse()` process it
- THEN the compiler's scene count, order, and per-scene layer mapping match the parser's `Project`

#### Scenario: Blocking parser issues stop compilation
- GIVEN a script for which the vendored parser reports blocking issues
- WHEN the scene compiler is invoked
- THEN it fails with a named, non-zero error before emitting any manifest
- AND it does not synthesize assets for the malformed input

#### Scenario: Visual overlay components compiled with precise frame timings
- GIVEN a script specifying lower thirds, kinetic titles, and concept callouts
- WHEN the scene compiler compiles the script into the manifest
- THEN every visual overlay element contains calculated start frame, duration in frames, and component configuration matching the script definitions

#### Scenario: Text layer content resolves into overlay props
- GIVEN a text layer authored with `layer_text_content`
- WHEN the scene compiler builds the matching overlay (lowerThird, kineticTitle, or conceptCallout)
- THEN the overlay's title/heading/label equals the `layer_text_content` value, never falling back to the layer name

#### Scenario: Blueprint templates and blockquote overlays reach the manifest
- GIVEN a VUS script that references a video blueprint and contains `>` overlay events
- WHEN the scene compiler lowers the parser AST into the manifest
- THEN the manifest contains template-resolved scene styling
- AND it contains one overlay track per blockquote event

---

### Requirement: Deterministic Media & TTS Asset Synthesis

The system MUST provide an asset synthesis pipeline for TTS voice narration and
media asset retrieval. The pipeline MUST compute a SHA-256 hash of the input
text/parameters and cache synthesized audio and media files. If an asset
corresponding to the SHA-256 hash exists in the cache, the system MUST reuse the
cached asset and skip re-synthesis. TTS synthesis MUST run exactly once per
parsed scene that carries narration, and MUST source voice/model parameters from
the parsed scene's resolved properties (`scene_tts_model` and its per-model
`<model>/voice_id`, `speed`, `emotion`, `pitch`, `intensity` overrides), NOT from
a single generic voice field; voice and model values MUST be resolved from the
vendored VUS spec, never restated as prose. The pipeline MUST measure audio
duration without FFmpeg-from-PATH.

#### Scenario: Cache hit avoids redundant TTS synthesis
- GIVEN an existing cached TTS narration file matching the SHA-256 hash of the scene's text and voice settings
- WHEN asset synthesis is requested for the scene
- THEN the system retrieves the existing cached audio file without invoking the TTS synthesis engine

#### Scenario: New asset synthesized and stored with content-derived hash
- GIVEN scene narration text or parameters not present in the cache
- WHEN asset synthesis is executed
- THEN the system synthesizes the audio, writes the result to the cache keyed by its SHA-256 hash, and links it in the scene composition

#### Scenario: One synthesis call per narrated scene
- GIVEN a multi-scene script in which only some scenes carry narration
- WHEN the compiler synthesizes assets
- THEN exactly one TTS call is made per narrated scene
- AND no synthesis is attempted for a merged multi-scene text blob

#### Scenario: Per-model TTS overrides are honored
- GIVEN a scene whose resolved properties declare `scene_tts_model` and a `<model>/voice_id` override
- WHEN the compiler synthesizes that scene's narration
- THEN the synthesis uses the declared model and override voice, resolved from the vendored spec

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

