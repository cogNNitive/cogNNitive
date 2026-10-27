# Delta for video-script-model

Scope: one universal parameter cascade, a minimal `Series` Concept, `type:: animation`, and the
presenter `model::` renamed `avatar_model::`.

## ADDED Requirements

### Requirement: Universal Parameter Cascade

Every video parameter that is valid at more than one level MUST resolve through one resolver
with the precedence, most specific first:

```
cli  >  layer  >  scene  >  video  >  series  >  domain  >  blueprint
```

The parameter MUST carry the same Field name at every level. A parameter is overridable at a
level only when the blueprint defines a Field Definition of that name for that level's Concept.
Default values MUST be blueprint data (the skill's `defaults/series_NN.md`), never engine code.
The resolver MUST report the level that supplied the value. `cli` applies only to model ids and,
when used, MUST be recorded in the plan. List parameters (`components`, `sounds`) hold
`key=name` items and MUST resolve per key.

#### Scenario: Most specific level wins and is named

- GIVEN `music_volume` set in the series document and in the domain document
- WHEN the resolver runs for a Scene that does not set it
- THEN it returns the series value with source `series`

#### Scenario: Blueprint default applies

- GIVEN no level sets `fit` for a b-roll Layer
- WHEN the resolver runs
- THEN it returns the value from `defaults/series_NN.md` with source `blueprint`

#### Scenario: Keyed list resolves per key

- GIVEN the series sets `sounds:: [overlay-enter.title=click]` and the defaults set `sounds:: [scene-boundary=whoosh]`
- WHEN `overlay-enter.title` and `scene-boundary` are resolved
- THEN they return `click` (series) and `whoosh` (blueprint)

#### Scenario: One selection path

- GIVEN the engine and draft-tool scripts
- WHEN they are searched for default values of cascade parameters
- THEN none is found outside the defaults document

#### Scenario: CLI override is auditable

- GIVEN a run with `--avatar-model X`
- WHEN the plan is produced
- THEN the resolved avatar model is X with source `cli`

### Requirement: Series Concept

The blueprint MUST define a top-level `Series` Concept with only these Fields: `title`,
`template`, `voice`, `tts_model`, `image_model`, `avatar_model`, `music`, `music_volume`,
`transition`, `fit`, `components`, `sounds`, `presenter_asset`, `intro_asset`. A series folder
MUST hold at most one `series_NN.md`; a `series_NN.md` at the domain root MUST act as the
`domain` level. `Video` MUST gain `components` and `sounds`.

#### Scenario: Series document supplies the series level

- GIVEN `series_NN.md` in the series folder declaring `transition:: fade`
- WHEN a Scene in that series without `transition::` is compiled
- THEN its transition is `fade` with source `series`

#### Scenario: Domain document supplies the domain level

- GIVEN `series_NN.md` only at the domain root declaring `music_volume:: 0.3`
- WHEN a Scene with no `music_volume::` is compiled
- THEN its music volume is `0.3` with source `domain`

## MODIFIED Requirements

### Requirement: Layer `type::` Discriminator

Every `Layer` MUST declare a `type::` select field. The blueprint MUST define the allowed values
`presenter`, `background`, `b-roll`, `title`, `lower-third`, `caption`, `brand`, `quote`,
`watermark` and `animation`. Fields MAY differ per `type::` and validation MUST be conditional on
it. A `caption` Layer is **static text** for its own duration; it MUST NOT be interpreted as
word-level narration subtitles (see "Narration Subtitles Are Not A Layer"). An `animation` Layer
MUST declare `asset::` pointing at an authored HyperFrames project and MUST NOT carry overlay
text. A `presenter` Layer's model override MUST be the Field `avatar_model::`.
(Previously: no `animation` value; the presenter override was `model::`.)

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

## REMOVED Requirements

### Requirement: Model Selection Cascade

(Reason: generalized into "Universal Parameter Cascade"; the `workspace guard defaults` level is replaced by the `domain` Series document.)
(Migration: move any model default to `tts_model`/`image_model`/`avatar_model` in a `series_NN.md`.)
