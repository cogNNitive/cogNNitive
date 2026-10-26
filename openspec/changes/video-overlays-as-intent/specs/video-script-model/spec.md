# Delta for video-script-model

Scope: the `caption` `type::` is clarified as a static text overlay; narration subtitles are
explicitly excluded from the Layer model. No other Layer type changes.

## MODIFIED Requirements

### Requirement: Layer `type::` Discriminator

Every `Layer` MUST declare a `type::` select field. The blueprint MUST define the allowed values
`presenter`, `background`, `b-roll`, `title`, `lower-third`, `caption`, `brand`, and `quote`.
Fields MAY differ per `type::` and validation MUST be conditional on it. A `caption` Layer is
**static text** for its own duration (e.g. a source credit); it MUST NOT be interpreted as
word-level narration subtitles (see "Narration Subtitles Are Not A Layer").
(Previously: `caption` defaulted to the owning Scene's narration body at the guard's discretion,
blurring static captions and narration subtitles.)

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

## ADDED Requirements

### Requirement: Narration Subtitles Are Not A Layer

Word-level narration subtitles MUST NOT be modelled as a `Layer` or any script element: they are
**derived** from the narration prose and the measured timings. If a video enables narration
captions, that is a video-level renderer feature, not script content. The blueprint MUST NOT
define a `type::` value whose semantics are narration subtitles, and validation MUST NOT require a
Layer for them.

#### Scenario: No Layer produces narration subtitles

- GIVEN a script whose video is configured with narration captions
- WHEN the model is inspected
- THEN no `Layer` is present for the subtitles

#### Scenario: Caption layer does not imply subtitles

- GIVEN a Scene with a `caption` Layer
- WHEN narration captions are disabled
- THEN the `caption` Layer renders as static text and no subtitles are emitted
