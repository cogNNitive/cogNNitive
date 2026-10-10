# Delta for cognnitive-video-engine

## MODIFIED Requirements

### Requirement: Programmatic Remotion Scene Compilation

The system MUST provide a scene compiler that transforms the structured iNNfo
video-script model into a valid Remotion Composition Manifest. The compiler MUST
obtain its scene model by reading the L3 document through innfo-core
(`read_knowledge`) and lowering that structured model into the manifest; it MUST
NOT re-parse the script's markdown and MUST NOT invoke the vendored VUS parser.
The compiler MUST resolve `template::` references from the Series' L3 Template
document. It MUST derive timing from measured TTS/media duration and MUST derive
layer sequencing and order from the model's list order. Each `Scene` MUST map to
exactly one `RemotionSceneTrack`, preserving scene order, names, layers, and
resolved properties. The compiler MUST generate frame-accurate sequence tracks,
transitions, lower-thirds, kinetic typography titles, and concept callouts.
Overlay text MUST be sourced from the Layer's declared text field, never from the
layer name.
(Previously: the compiler lowered the vendored VUS parser AST into the manifest and emitted one overlay track per blockquote.)

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
- THEN the model comes from innfo-core structured input
- AND the compiler performs no markdown grammar parsing

#### Scenario: Invalid L3 document stops compilation

- GIVEN an L3 document that fails blueprint validation
- WHEN the scene compiler is invoked
- THEN it fails with a named, non-zero error before emitting any manifest
- AND it does not synthesize assets for the invalid input

#### Scenario: Visual overlay components compiled with precise frame timings

- GIVEN a document specifying lower thirds, kinetic titles, and concept callouts
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
