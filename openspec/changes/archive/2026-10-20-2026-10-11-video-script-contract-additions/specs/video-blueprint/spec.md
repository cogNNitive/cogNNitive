# Delta for video-blueprint

## ADDED Requirements

### Requirement: Layer `watermark` type

The Layer `type::` select MUST accept `watermark`, and a `watermark` Layer MUST
require a `text` field. The engine MUST render it as a small persistent text notice.

#### Scenario: A watermark Layer validates and renders

- GIVEN a Layer `type:: watermark` with `text:: generado con IA`
- WHEN the document is validated and compiled
- THEN it passes the pre-compile guard
- AND the manifest carries a `watermark` overlay with that text

#### Scenario: A watermark Layer without text is rejected

- GIVEN a Layer `type:: watermark` with no `text`
- WHEN the document is validated
- THEN the pre-compile guard rejects it with `missing-conditional-field`

### Requirement: Per-Layer presenter model

A `presenter` Layer MUST be able to declare `model:: <id>` to override the avatar/lip-sync
model for that Layer; when absent, the engine MUST use its default avatar model. Other
Layer types MUST ignore `model`.

#### Scenario: The override is honored per Layer

- GIVEN two `presenter` Layers, one with `model:: wavespeed-ai/infinitetalk` and one without
- WHEN the avatars are priced, synthesized and rendered
- THEN the first uses the declared model and the second uses the default

### Requirement: Per-Layer media fit

A media Layer (`background`, `b-roll`) MUST be able to declare `fit:: cover|contain`;
`contain` MUST show the whole asset with a margin, and the default MUST remain `cover`.

#### Scenario: contain shows the whole asset

- GIVEN a `b-roll` Layer with `fit:: contain`
- WHEN the overlay is compiled and rendered
- THEN the manifest carries `fit: contain`
- AND the asset is shown whole, uncropped, with a margin

### Requirement: Per-Scene music volume

A Scene MUST be able to declare `music_volume:: <0..1>` to set the volume of its
`music::` track; when absent, the engine MUST use its default volume.

#### Scenario: Per-Scene volume is applied

- GIVEN a Scene with `music:: …` and `music_volume:: 0.06`
- WHEN the manifest is compiled
- THEN its `bgmusic` track has `volume: 0.06`
