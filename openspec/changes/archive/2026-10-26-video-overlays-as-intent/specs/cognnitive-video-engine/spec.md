# Delta for cognnitive-video-engine

Scope: overlay rendering (b-roll, watermark, title, lower-third, quote, caption) is delegated to
HyperFrames blocks; narration captions become a global renderer feature independent of the Layer
model.

## MODIFIED Requirements

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

## ADDED Requirements

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
