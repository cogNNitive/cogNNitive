# Delta for video-script-model

Scope: `Layer` gains the `type:: animation` kind.

## MODIFIED Requirements

### Requirement: Layer `type::` Discriminator

Every `Layer` MUST declare a `type::` select field. The blueprint MUST define the allowed values
`presenter`, `background`, `b-roll`, `title`, `lower-third`, `caption`, `brand`, `quote`, and
`animation`. Fields MAY differ per `type::` and validation MUST be conditional on it. A `caption`
Layer is **static text** for its own duration (e.g. a source credit); it MUST NOT be interpreted
as word-level narration subtitles (see "Narration Subtitles Are Not A Layer"). An `animation`
Layer MUST declare `asset::` pointing at an authored HyperFrames project, and MUST NOT carry
overlay text.
(Previously: `animation` was not an allowed value.)

#### Scenario: Unknown layer type is rejected

- GIVEN a Layer whose `type::` value is not one of the allowed values
- WHEN the script is validated
- THEN validation fails naming the invalid `type::`

#### Scenario: Conditional fields are enforced

- GIVEN a Layer of `type::` `lower-third`
- WHEN it omits a field required for that type
- THEN validation fails for the missing field

#### Scenario: Caption is static text, not narration

- GIVEN a `caption` Layer declaring `text:: Fuente: The Guardian, 2026-10-24`
- WHEN the scene compiles
- THEN the overlay carries that static text for the Layer's duration
- AND it is never replaced by the Scene's narration body

#### Scenario: Animation layer is valid with an asset

- GIVEN a Layer with `type:: animation` and an `asset::` value
- WHEN the script is validated
- THEN validation passes

#### Scenario: Animation layer without an asset is rejected

- GIVEN a Layer with `type:: animation` and no `asset::`
- WHEN the script is validated
- THEN validation fails for the missing `asset::`
