# cogNNitive Video Engine (delta)

## MODIFIED Requirements

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

#### Scenario: Visual overlay components compiled with precise frame timings

- GIVEN a document specifying lower thirds and kinetic titles
- WHEN the scene compiler compiles it into the manifest
- THEN every visual overlay element contains a calculated start frame, duration in frames, and component configuration matching the document definitions
