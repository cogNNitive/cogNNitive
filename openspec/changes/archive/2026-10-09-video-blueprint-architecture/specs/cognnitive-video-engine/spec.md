# Delta for cognnitive-video-engine

## MODIFIED Requirements

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
