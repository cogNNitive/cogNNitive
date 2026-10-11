# Delta for cognnitive-video-engine

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: B-roll overlay rendering

(Previously: b-roll rendered at `fit: cover`, no animation.) The b-roll overlay MUST
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
