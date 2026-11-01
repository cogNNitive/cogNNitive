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

The blueprint MUST define the root Concept `Video` containing `Scene` elements, each `Scene` containing `Layer` child elements, plus a top-level `Preset` Concept. A video script MUST author `Layer` elements as nested `### NN Layer:` headings inside their parent `Scene`, setting `parentSlug` to the enclosing Scene slug. Flat headings SHALL remain supported for backward compatibility. A `Layer` MUST NOT exist at `Video` level.
(Previously: the top-level Concept was `Template`.)

#### Scenario: Scene owns its layers

- GIVEN a script with one Video and two Scenes
- WHEN the model is inspected
- THEN each Scene owns its own Layer elements
- AND no Layer is a direct child of the Video

#### Scenario: Nested layer establishes syntactic ownership

- GIVEN a script with `### NN Layer:` headings under a `## NN Scene:`
- WHEN parsed
- THEN each Layer element has `parentSlug` set to the Scene slug

#### Scenario: Preset is a top-level Concept

- GIVEN the blueprint
- WHEN its Concepts are listed
- THEN `Preset` is present and `Template` is absent

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

### Requirement: Background Audio Is a Field, Not a Layer

Background audio MUST be declared as the `background_audio::` cascade field, settable on `Video`, `Scene`, `Preset`, `Series` and `Video Defaults`, and MUST NOT be modeled as a `Layer`.
(Previously: `music::` on the `Scene` only.)

#### Scenario: Scene background audio does not become a layer

- GIVEN a Scene with a `background_audio::` field
- WHEN the model is read
- THEN the value is exposed as the Scene field
- AND no audio Layer is emitted

#### Scenario: Video-level background audio applies to scenes

- GIVEN a Video with `background_audio:: bed.mp3` and a Scene that sets none
- WHEN the Scene's background audio is resolved
- THEN the value is `bed.mp3` with source `video`

### Requirement: Tool-Agnostic Script

The script model MUST be tool-agnostic by guidance: voice ids, model ids and resolutions SHOULD live in Presets or scope documents rather than in the script, and the script MAY override them with explicit fields of the cascade.
(Previously: the script MUST NOT contain a voice id, a model id or a resolution; any such value MUST live in a Template instance.)

#### Scenario: Values supplied by a preset

- GIVEN a Scene with `presets:: [Lucas]` where `Lucas` sets `voice` and `voice_model`
- WHEN the script is inspected
- THEN the Scene itself carries no voice id or model id

#### Scenario: Script may override explicitly

- GIVEN a Scene that declares `voice_model::` and a Preset that also sets it
- WHEN the model is resolved
- THEN the explicit Scene value wins and the script validates

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

Every video parameter that is valid at more than one level MUST resolve through one resolver with the precedence, most specific first:

```
cli > layer > scene > video > series > domain > blueprint
```

`series` is the episode's `Series` document; `domain` is the domain-root `Video Defaults` document; `blueprint` is the `Video Defaults` document shipped in the bluepriNNt package. The parameter MUST carry the same Field name at every level, and a level MUST be overridable only when that parameter's Field Definition lists the level's Concept. Default values MUST be blueprint data, never engine code. The resolver MUST report the level that supplied the value. `cli` applies only to model ids and, when used, MUST be recorded in the plan. List parameters (`components`, `sounds`) hold `key=name` items and MUST resolve per key. Each of `domain`, `series`, `video` and `scene` MAY list `presets`, which expand directly beneath that level's explicit fields as specified by video-presets "Per-Level Additive Expansion Order".
(Previously: the cascade had no preset expansion; the examples used `music_volume`.)

#### Scenario: Most specific level wins and is named

- GIVEN `background_audio_volume` set in the series document and in the domain Video Defaults
- WHEN the resolver runs for a Scene that does not set it
- THEN it returns the series value with source `series`

#### Scenario: Domain Video Defaults overrides the blueprint

- GIVEN the domain Video Defaults declares `background_audio_volume:: 0.3` and no series sets it
- WHEN a Scene with no `background_audio_volume::` is compiled
- THEN its background audio volume is `0.3` with source `domain`

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

#### Scenario: Preset value is named by its source

- GIVEN a Series with `presets:: [Lucas]` where `Lucas` sets `voice_speed:: 1.1`
- WHEN a Scene without `voice_speed` is resolved
- THEN the value is `1.1` with source `series:preset:Lucas`

### Requirement: Video Defaults Concept

The blueprint MUST define a top-level `Video Defaults` Concept carrying every cascade parameter: `presets`, `voice`, `voice_model`, `voice_speed`, `voice_emotion`, `voice_tone`, `avatar`, `avatar_model`, `intro`, `image_model`, `background_audio`, `background_audio_volume`, `transition`, `fit`, `frame`, `components`, `sounds`, together with the declaration `master_resolution`. The bluepriNNt package MUST ship one instance at `defaults/video-defaults_NN.md` holding every baseline value, and that instance MUST NOT declare `presets`, `voice_speed`, `voice_emotion` or `voice_tone`, and MUST NOT contain a Preset. A domain MAY hold one instance at its root, `video-defaults_NN.md`; when absent, the `domain` level is skipped. Changing the package instance MUST bump `blueprint_version`.
(Previously: the carried set did not include `master_resolution`.)

Source: D4.

#### Scenario: Missing domain document falls through

- GIVEN a domain with no `video-defaults_NN.md` at its root
- WHEN a parameter set only in the package Video Defaults is resolved
- THEN it returns that value with source `blueprint`

#### Scenario: Editing package defaults requires a bump

- GIVEN a change to `defaults/video-defaults_NN.md` without a `blueprint_version` bump
- WHEN `guard-template-immutability` runs
- THEN it fails naming the owning `spec_NN.md`

#### Scenario: Defaults declare no voice delivery values

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it declares none of `presets`, `voice_speed`, `voice_emotion` or `voice_tone`
- AND a test enforces this so that no TTS cache key gains a value and no narration is billed again

#### Scenario: Master resolution is declared

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it declares `master_resolution:: 1920x1920`

### Requirement: Series Concept

The blueprint MUST define a top-level `Series` Concept for real series only, carrying the cascade parameters of `Video Defaults` (excluding `master_resolution`), including `presets`, `avatar` and `intro`, plus `title`. A series folder MUST hold at most one scope document `<s>_scope_NN.md` (frontmatter `scope: true`). The series level MUST come only from a series root strictly below the domain root; an episode outside a series folder MUST have no series level.
(Previously: the carried set did not exclude `master_resolution`, which this change adds.)

Source: D9.

#### Scenario: Series document supplies the series level

- GIVEN `s_scope_NN.md` in the series folder declaring `transition:: fade`
- WHEN a Scene in that series without `transition::` is compiled
- THEN its transition is `fade` with source `series`

#### Scenario: Episode outside a series has no series level

- GIVEN a script directly under the domain root (or in a folder with no scope document below it) and a domain Video Defaults declaring `transition:: fade`
- WHEN a Scene without `transition::` is compiled
- THEN its transition is `fade` with source `domain`, never `series`

#### Scenario: Series supplies avatar and intro through the cascade

- GIVEN `s_scope_NN.md` declaring `avatar:: lucas.png` and `intro:: intro.mp4`
- WHEN a Scene without those fields is resolved
- THEN `avatar` and `intro` resolve to the Series values with source `series`

#### Scenario: Legacy series_NN.md supplies nothing

- GIVEN a series folder holding `series_NN.md` declaring `transition:: wipe` and no scope document
- WHEN a Scene without `transition::` is compiled
- THEN the series level is absent and the value comes from a lower level

### Requirement: Shared Field Definitions

Each cascade parameter MUST have exactly one Field Definition whose `concept::` lists every Concept where it is settable, with the names, Concepts, types, options and blueprint defaults of the table below, and the Field `master_resolution` MUST be defined once for `Video Defaults` only.

| Field | concept:: | type / options | Blueprint default |
|---|---|---|---|
| tags | all Concepts (global) | select, multiple | none |
| title | Video, Series | string | none |
| description, status, script, master, thumbnail | Video | unchanged | none |
| master_resolution | Video Defaults | select `1920x1920` | `1920x1920` |
| presets | Video, Scene, Series, Video Defaults | select, multiple, no options | none |
| voice, voice_model, voice_speed, voice_emotion, voice_tone | Video, Scene, Preset, Series, Video Defaults | string (`voice_speed` numeric) | `voice` `default`; `voice_model` `minimax/speech-2.8-hd`; others none |
| avatar | Video, Scene, Preset, Series, Video Defaults | file | none |
| avatar_model | Layer, Scene, Video, Preset, Series, Video Defaults | string | `wavespeed-ai/infinitetalk-fast` |
| avatar_resolution | Layer | select `480p`, `720p`, `768p` | none |
| intro | Video, Preset, Series, Video Defaults | file | none |
| image_model | Video, Scene, Preset, Series, Video Defaults | string | `wavespeed-ai/z-image/turbo` |
| background_audio | Video, Scene, Preset, Series, Video Defaults | file | none |
| background_audio_volume | Video, Scene, Preset, Series, Video Defaults | string (0 to 1) | `0.2` |
| transition | Video, Scene, Preset, Series, Video Defaults | select `fade`, `slide-left`, `slide-right`, `wipe`, `none` | `none` |
| frame | Video, Scene, Preset, Series, Video Defaults | string | `neutral` |
| fit | Layer, Scene, Video, Preset, Series, Video Defaults | select `cover`, `contain` | `cover` |
| components | Video, Preset, Series, Video Defaults | select, multiple, keyed | current list |
| sounds | Video, Preset, Series, Video Defaults | select, multiple, keyed | `[scene-boundary=whoosh]` |
| type, asset, prompt, text, position, enter_animation, exit_animation | Layer | unchanged | none |
| z_index | Layer | string (number) | none |

(Previously: the table had no `master_resolution` row.)

Source: D4.

#### Scenario: One definition reaches every listed Concept

- GIVEN the Field Definition `background_audio_volume` listing Video, Scene, Preset, Series and Video Defaults
- WHEN the blueprint schema is resolved
- THEN those Concepts carry `background_audio_volume` and `Layer` does not

#### Scenario: Presets field is not on Layer or Preset

- GIVEN the Field Definition `presets`
- WHEN the blueprint schema is resolved
- THEN `Video`, `Scene`, `Series` and `Video Defaults` carry it and `Layer` and `Preset` do not

#### Scenario: Blueprint defaults match the table

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN its values are read
- THEN `voice_model` is `minimax/speech-2.8-hd`, `background_audio_volume` is `0.2`, `transition` is `none`, `frame` is `neutral`, `fit` is `cover`, `sounds` is `[scene-boundary=whoosh]` and `master_resolution` is `1920x1920`

#### Scenario: master_resolution row exists

- GIVEN the Field Definition `master_resolution`
- WHEN the blueprint schema is resolved
- THEN it is a select with the single option `1920x1920` on `Video Defaults`

### Requirement: Frame Parameter

`frame:: <name>` MUST be a cascade parameter settable at scene, video, preset, series and domain, with a blueprint default. It names a frame document located at `frames/<name>.md` (see cognnitive-video-engine "Names Are Parameters, Files Are Found By Walk").
(Previously: not settable in a Preset, because Presets did not exist.)

#### Scenario: Scene overrides the series frame

- GIVEN the series sets `frame:: brand` and one Scene sets `frame:: night`
- WHEN that Scene's overlays are mounted
- THEN they receive the tokens of `frames/night.md`

#### Scenario: Preset supplies the frame

- GIVEN a Video with `presets:: [Night]` where `Night` sets `frame:: night` and no nearer level sets `frame`
- WHEN a Scene's frame is resolved
- THEN the value is `night` with source `video:preset:Night`

### Requirement: The Video Concept Carries The Episode Record

The `video-script` blueprint's `Video` concept MUST also declare the episode's catalogue and delivery fields `description` (markdown_inline), `status` (select of `draft`/`scripting`/`rendering`/`published`/`archived`), `script` (file), `master` (video) and `thumbnail` (image), so that one L3 document of the blueprint is both the episode's record and its script; `slug` is the reserved iNNfo identity property and MUST NOT be redeclared as a Field Definition of this blueprint.

Each file-backed field MUST hold exactly one filename resolved under the owning model's directory, `master` MUST name the episode's square master `<slug>_1920x1920.mp4`, and a `Video` element MUST NOT carry a field for a derived format variant: the vertical, horizontal and square masters and the thumbnail variants are derived from `master` by the `render-formats.mjs` naming convention and are never stored.
(Previously: the example `master` was `pepper-mapache_1080x1080.mp4`, and `master` was not tied to the 1920x1920 file name.)

Source: D4, D5.

#### Scenario: An episode is one L3 document

- GIVEN an L3 document of the `video-script` blueprint holding one `## NN Video:` element with `slug`, `status`, `script`, `master` and `thumbnail`
- WHEN it is validated as an L3 document
- THEN it validates with no schema errors

#### Scenario: Format variants are derived, not modelled

- GIVEN such an episode whose `master` is `pepper-mapache_1920x1920.mp4`
- WHEN the format-variant step runs with its default formats
- THEN the vertical variant is derived as `pepper-mapache_1080x1920.mp4`
- AND the blueprint declares no `master_vertical` or `thumbnail_vertical` field

#### Scenario: The surviving concept name is unchanged

- GIVEN an episode whose script root element is `## NN Video: <title>`
- WHEN the model is inspected
- THEN the element's concept is `Video` and no rename is required

#### Scenario: Video voice_id is gone

- GIVEN a Video element declaring `voice_id::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint

### Requirement: Field Naming Convention

Every Field Definition of the blueprint MUST follow one naming convention: fields are `snake_case` without dots, a field describing an attribute of a subject is named `subject_attribute`, a file-typed field is named by its bare content noun without a `_asset` or `_file` suffix, a list-valued field is plural, and select option values are `kebab-case`.

#### Scenario: Names are snake_case

- GIVEN every Field Definition in the blueprint
- WHEN the names are checked
- THEN each matches lowercase words joined by single underscores and none contains a dot

#### Scenario: Subject-attribute and bare-noun names

- GIVEN the voice delivery fields and the file-typed cascade fields
- WHEN the names are listed
- THEN the voice fields are `voice`, `voice_model`, `voice_speed`, `voice_emotion` and `voice_tone`
- AND the file fields are `avatar`, `intro` and `background_audio`, with no `presenter_asset` or `intro_asset`

#### Scenario: Lists are plural and values are kebab-case

- GIVEN the list-valued fields and every `select` option
- WHEN they are checked
- THEN the list fields are `presets`, `components`, `sounds` and `tags`
- AND every option value matches lowercase words joined by single hyphens

### Requirement: Cascade Parameters Are Settable Where Meaningful

Each cascade parameter MUST be settable at every level where it has meaning, so `avatar` MUST be settable on `Video`, `Scene`, `Preset`, `Series` and `Video Defaults`, the voice delivery parameters `voice_speed`, `voice_emotion` and `voice_tone` MUST cascade like `voice`, and `avatar` MUST NOT be Series-only.

#### Scenario: Avatar is set on a Scene

- GIVEN a Scene declaring `avatar:: lucas.png` and a Series declaring `avatar:: series.png`
- WHEN the Scene's avatar is resolved
- THEN the value is `lucas.png` with source `scene`

#### Scenario: Voice delivery cascades

- GIVEN the Series declares `voice_speed:: 1.1` and no nearer level sets it
- WHEN a Scene's `voice_speed` is resolved
- THEN the value is `1.1` with source `series`

#### Scenario: Layer is not a level for avatar

- GIVEN a Layer declaring `avatar:: x.png`
- WHEN the script is validated
- THEN validation fails because `avatar` is not defined for `Layer`, where `asset` is the local value

### Requirement: Presenter Layer Requires A Source

A `presenter` Layer MUST be valid only when a source for its image is available, expressed as the conditional-fields rule `presenter: [asset, prompt, avatar]`, where `avatar` is satisfied by the cascaded value of the owning Scene.

#### Scenario: Asset or prompt satisfies the rule

- GIVEN a `presenter` Layer with `asset::` or with `prompt::`
- WHEN the script is checked
- THEN no missing-conditional-field error is reported

#### Scenario: Cascaded avatar satisfies the rule

- GIVEN a `presenter` Layer with neither `asset` nor `prompt` in a Scene whose resolved `avatar` comes from a Series, Video, Scene or Preset
- WHEN the script is checked
- THEN no missing-conditional-field error is reported

#### Scenario: No source anywhere

- GIVEN a `presenter` Layer with no `asset`, no `prompt` and no resolvable `avatar`
- WHEN the script is checked
- THEN `missing-conditional-field` is reported for the Layer

### Requirement: Retired Field Names Are Rejected

The blueprint MUST NOT define the retired Fields and Concept names `template`, `tool`, `tts_model`, `speed`, `emotion`, `music`, `music_volume`, `presenter_asset`, `intro_asset`, the Layer field `level`, the Layer field `model`, and the Video field `voice_id`, and a document using any of them MUST fail validation with no alias or fallback.

#### Scenario: Renamed field is rejected under the old name

- GIVEN a Scene declaring `tts_model::`, `music::`, `music_volume::` or `speed::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint
- AND the same value under `voice_model::`, `background_audio::`, `background_audio_volume::` or `voice_speed::` validates

#### Scenario: Removed fields are rejected

- GIVEN a Preset or Layer declaring `tool::`, a Layer declaring `model::`, or a Video declaring `voice_id::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint

#### Scenario: Layer `level` is replaced by `z_index`

- GIVEN a Layer declaring `level:: 2` and another declaring `z_index:: 2`
- WHEN both are validated
- THEN the first fails and the second validates
- AND the iNNfo frontmatter key `level:` remains valid

### Requirement: Master Resolution Is A Declared Video Default

The blueprint MUST define one Field Definition `master_resolution` with `concept:: Video Defaults`, `type:: select`, `options:: [1920x1920]`, default `1920x1920` and the description "Pixel size of the single rendered master. Every delivery format is derived from it; no format is rendered on its own.", and the compiler MUST resolve it through the cascade parser `^(\d+)x(\d+)$`.

Source: D3, D4.

#### Scenario: Definition reaches Video Defaults only

- GIVEN the Field Definition `master_resolution`
- WHEN the blueprint schema is resolved
- THEN `Video Defaults` carries it and `Video`, `Scene`, `Layer`, `Series` and `Preset` do not

#### Scenario: Default is read from the blueprint

- GIVEN no domain Video Defaults
- WHEN `master_resolution` is resolved
- THEN it returns `1920x1920` with source `blueprint`

#### Scenario: Domain value is honoured

- GIVEN a domain Video Defaults declaring `master_resolution:: 1920x1920`
- WHEN it is resolved
- THEN the source is `domain`

### Requirement: Master And Position Descriptions Describe The Square Master

The Field Definition `master` of `Video` MUST be described as "The episode's square master `<slug>_1920x1920.mp4`. Delivery formats are derived by `render-formats` and never modeled." and the Field Definition `position` of `Layer` MUST be described as "Overlay anchor inside the central safe square (the central 1080x1080 of the master).", with their types, options and concepts unchanged.

Source: D4.

#### Scenario: Descriptions are replaced

- GIVEN the Field Definitions `master` and `position`
- WHEN their descriptions are read
- THEN they equal the texts above and neither mentions 16:9 headroom or a dual master

#### Scenario: Types are unchanged

- GIVEN the same Field Definitions
- WHEN their type and options are compared with the previous version
- THEN they are equal
