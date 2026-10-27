# video-script-model Specification

## Purpose

Defines the native iNNfo modeling of video scripts. A video script IS a Level-3 kNNowledge document governed by the Level-2 `video-script` blueprint; the engine consumes that structured model directly and never re-implements or re-parses the script's markdown grammar. The model is tool-agnostic and declares no timing.
## Requirements
### Requirement: Script Is an iNNfo Level-3 Document

The video script MUST be an iNNfo Level-3 kNNowledge document whose `parent_spec` is the Level-2 `video-script` blueprint. The blueprint MUST define every Concept and Field the script may use. The engine's scene compiler MUST consume a structured iNNfo model and MUST NOT re-parse the script's markdown. The canonical source of that model is innfo-core `read_knowledge`; when an installed, zero-dependency skill cannot reach innfo-core, a thin structural adapter MAY emit the same `read_knowledge` shape — it MUST NOT re-implement the scene grammar and MUST be drift-guarded against innfo-core's model shape.

#### Scenario: Script validates against its blueprint

- GIVEN a script authored against the `video-script` blueprint
- WHEN it is validated as an L3 document
- THEN it validates with no schema errors

#### Scenario: Engine consumes the structured model

- GIVEN a valid L3 script document
- WHEN the engine reads it
- THEN it receives Concepts, Fields, and element order from a structured `read_knowledge`-shaped model
- AND the scene compiler performs no script markdown grammar parsing

### Requirement: Video-Scene-Layer Concept Hierarchy

The blueprint MUST define the root Concept `Video` containing `Scene` elements, each `Scene` containing `Layer` child elements, plus a top-level `Template` Concept. A video script MUST author `Layer` elements as nested `### NN Layer:` headings inside their parent `Scene`, setting `parentSlug` to the enclosing Scene slug. Flat headings SHALL remain supported for backward compatibility. A `Layer` MUST NOT exist at `Video` level.

#### Scenario: Scene owns its layers

- GIVEN a script with one Video and two Scenes
- WHEN the model is inspected
- THEN each Scene owns its own Layer elements
- AND no Layer is a direct child of the Video

#### Scenario: Nested layer establishes syntactic ownership

- GIVEN a script with `### NN Layer:` headings under a `## NN Scene:`
- WHEN parsed
- THEN each Layer element has `parentSlug` set to the Scene slug

### Requirement: One Video Per One Script

The model MUST map exactly one `Video` to exactly one script document. The model MUST NOT provide any versioning mechanism.

#### Scenario: A second Video is rejected

- GIVEN a script document that already declares one Video
- WHEN a second Video is added
- THEN validation fails naming the single-Video constraint

### Requirement: Narration Is the Scene Prose Body

Narration MUST be authored as the free-form prose BODY of the `Scene` element, after its `::` fields. Narration MUST NOT be a Field and MUST NOT be a Concept.

#### Scenario: Scene body is narration

- GIVEN a Scene with `::` fields followed by prose
- WHEN the model is read
- THEN the prose is exposed as the Scene body
- AND it is not represented as a Field or Concept

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

### Requirement: Music Is a Scene Field

Music MUST be declared as a `music::` field on the `Scene`. Music MUST NOT be modeled as a `Layer`.

#### Scenario: Scene music does not become a layer

- GIVEN a Scene with a `music::` field
- WHEN the model is read
- THEN the music value is exposed as the Scene field
- AND no music Layer is emitted

### Requirement: Tool-Agnostic Script

The script model MUST be tool-agnostic: it MUST NOT contain a voice id, a model id, or a resolution. Any such value MUST live in a Template instance, not in the script.

#### Scenario: Tool data is absent from the script

- GIVEN a valid script document
- WHEN it is inspected
- THEN it contains no voice id, model id, or resolution value

### Requirement: Template Concept and `template::` Reference

The blueprint MUST define a `Template` Concept whose instances carry `tool` (`wavespeed` or
`replicate`), `voice` and `tts_model`, and live in an L3 document shipped by a Series. A
`Scene` or the `Video` MAY reference a Template instance through `template::`. A `Video`-level
reference MUST apply to every Scene of that Video unless a Scene overrides it. A Template's
`voice` and `tts_model` MUST enter the cascade at the level of the element that references it.
(Previously: the TTS model Field was `model`; `tool` also allowed `elevenlabs` and `edge-tts`.)

#### Scenario: Scene resolves its template

- GIVEN a Scene with a `template::` reference to a Template instance
- WHEN the reference is resolved
- THEN the Template's `voice` and `tts_model` supply the scene level

#### Scenario: Video-level template applies to all scenes

- GIVEN a Video with a `template::` and a Scene without one
- WHEN the Scene resolves its template
- THEN it inherits the Video-level Template instance

#### Scenario: Scene template overrides the video template

- GIVEN a Video with a `template::` and a Scene with a different `template::`
- WHEN the Scene resolves its template
- THEN the Scene's own Template instance wins

### Requirement: Native Hierarchy and List Order

Scene nesting and ordering MUST use the native iNNfo hierarchy `# NN index` block. Scene order MUST equal list order. The model MUST NOT declare explicit ordering fields.

#### Scenario: Scene order follows the index list

- GIVEN a script with three Scenes in `# NN index` order
- WHEN the engine enumerates Scenes
- THEN they are returned in list order

### Requirement: No Declared Duration or Timing

The model MUST NOT declare duration or timing on any Concept. Duration and timing MUST be derived by the engine from synthesized media.

#### Scenario: Declared duration is rejected

- GIVEN a script declaring a duration or timing field
- WHEN it is validated
- THEN validation fails because the field is not defined by the blueprint

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

### Requirement: Universal Parameter Cascade

Every video parameter that is valid at more than one level MUST resolve through one resolver
with the precedence, most specific first:

```
cli  >  layer  >  scene  >  video  >  series  >  domain  >  blueprint
```

`series` is the episode's `Series` document; `domain` is the domain-root `Video Defaults`
document; `blueprint` is the `Video Defaults` document shipped in the bluepriNNt package. The
parameter MUST carry the same Field name at every level, and a level MUST be overridable only
when that parameter's Field Definition lists the level's Concept. Default values MUST be
blueprint data, never engine code. The resolver MUST report the level that supplied the value.
`cli` applies only to model ids and, when used, MUST be recorded in the plan. List parameters
(`components`, `sounds`) hold `key=name` items and MUST resolve per key.

#### Scenario: Most specific level wins and is named

- GIVEN `music_volume` set in the series document and in the domain Video Defaults
- WHEN the resolver runs for a Scene that does not set it
- THEN it returns the series value with source `series`

#### Scenario: Domain Video Defaults overrides the blueprint

- GIVEN the domain Video Defaults declares `music_volume:: 0.3` and no series sets it
- WHEN a Scene with no `music_volume::` is compiled
- THEN its music volume is `0.3` with source `domain`

#### Scenario: Blueprint default applies

- GIVEN no level above `blueprint` sets `fit` for a b-roll Layer
- WHEN the resolver runs
- THEN it returns the package Video Defaults value with source `blueprint`

#### Scenario: Keyed list resolves per key

- GIVEN the series sets `sounds:: [overlay-enter.title=click]` and the blueprint sets `sounds:: [scene-boundary=whoosh]`
- WHEN `overlay-enter.title` and `scene-boundary` are resolved
- THEN they return `click` (series) and `whoosh` (blueprint)

#### Scenario: One selection path

- GIVEN the engine and draft-tool scripts
- WHEN they are searched for default values of cascade parameters
- THEN none is found

#### Scenario: CLI override is auditable

- GIVEN a run with `--avatar-model X`
- WHEN the plan is produced
- THEN the resolved avatar model is X with source `cli`

### Requirement: Video Defaults Concept

The blueprint MUST define a top-level `Video Defaults` Concept carrying every cascade parameter:
`template`, `voice`, `tts_model`, `image_model`, `avatar_model`, `music`, `music_volume`,
`transition`, `fit`, `frame`, `components`, `sounds`. The bluepriNNt package MUST ship one
instance at `defaults/video-defaults_NN.md` holding every baseline value. A domain MAY hold one
instance at its root, `video-defaults_NN.md`; when absent, the `domain` level is skipped.
Changing the package instance MUST bump `blueprint_version`.

#### Scenario: Missing domain document falls through

- GIVEN a domain with no `video-defaults_NN.md` at its root
- WHEN a parameter set only in the package Video Defaults is resolved
- THEN it returns that value with source `blueprint`

#### Scenario: Editing package defaults requires a bump

- GIVEN a change to `defaults/video-defaults_NN.md` without a `blueprint_version` bump
- WHEN `guard-template-immutability` runs
- THEN it fails naming the owning `spec_NN.md`

### Requirement: Series Concept

The blueprint MUST define a top-level `Series` Concept for real series only, carrying the
cascade parameters of `Video Defaults` plus `title`, `presenter_asset`, `intro_asset`. A series
folder MUST hold at most one `series_NN.md`. The series level MUST come only from a series root
strictly below the domain root; an episode outside a series folder MUST have no series level.

#### Scenario: Series document supplies the series level

- GIVEN `series_NN.md` in the series folder declaring `transition:: fade`
- WHEN a Scene in that series without `transition::` is compiled
- THEN its transition is `fade` with source `series`

#### Scenario: Episode outside a series has no series level

- GIVEN a script directly under the domain root (or in a folder with no series marker below it) and a domain Video Defaults declaring `transition:: fade`
- WHEN a Scene without `transition::` is compiled
- THEN its transition is `fade` with source `domain`, never `series`

### Requirement: Shared Field Definitions

Each cascade parameter MUST have exactly one Field Definition whose `concept::` lists every
Concept where it is settable (see the design's parameter table). `Video` MUST gain `frame`,
`components` and `sounds`; `Scene` MUST gain `frame`.

#### Scenario: One definition reaches every listed Concept

- GIVEN the Field Definition `music_volume` with `concept:: [Scene, Series, Video Defaults]`
- WHEN the blueprint schema is resolved
- THEN `Scene`, `Series` and `Video Defaults` carry `music_volume` and `Layer` does not

### Requirement: Frame Parameter

`frame:: <name>` MUST be a cascade parameter settable at scene, video, series and domain, with
a blueprint default. It names a frame document located at `frames/<name>.md` (see
cognnitive-video-engine "Names Are Parameters, Files Are Found By Walk").

#### Scenario: Scene overrides the series frame

- GIVEN the series sets `frame:: brand` and one Scene sets `frame:: night`
- WHEN that Scene's overlays are mounted
- THEN they receive the tokens of `frames/night.md`

