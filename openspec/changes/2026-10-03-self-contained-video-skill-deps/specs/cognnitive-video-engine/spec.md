# Delta for cognnitive-video-engine

## MODIFIED Requirements

### Requirement: Programmatic Remotion Scene Compilation

The system MUST provide a scene compiler that transforms VUS / markdown video
scripts into a valid Remotion Composition Manifest. The compiler MUST obtain its
scene model by invoking the vendored VUS parser (`parse()` → `Project`) and
lowering that AST into the manifest; it MUST NOT scan script text with its own
grammar subset. The compiler MUST resolve the parser from the vendored ESM
artifact by relative path, with no npm package import and no `tsx` loader. Each
VUS scene MUST map to exactly one `RemotionSceneTrack`, preserving scene order,
names, layers, and resolved properties (property sets, template chains, per-model
TTS overrides). The compiler MUST generate frame-accurate sequence tracks,
transitions, lower-thirds (`lowerThirds`), kinetic typography titles
(`kineticTitles`), and concept callouts (`conceptCallouts`). Text layers are
authored with the canonical VUS field `layer_text_content`; the compiler MUST
source overlay text from `layer_text_content` and MUST NOT read the legacy
`layer_generation_text` field or a `text` fallback.

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
