# Delta for video-script-model

Change `2026-11-02-video-script-v1`. Decisions D1 to D4, D9, D11, D12, plus maintainer decisions 1–3 (four Layer behaviour types, `avatar` naming, no `budget` or `language` default). Defaults named below (`language`, `budget`, `output_formats`, `script_review`) are settled by the maintainer decisions table in `tasks.md`.

## ADDED Requirements

### Requirement: Layer Types Are Four Behaviours

The blueprint MUST define the Layer Field `type` with exactly four options, each naming a behaviour and not an appearance: `avatar` (a lip-synced, paid avatar job), `media` (an image or a video), `text` (overlay text) and `animation` (an authored HyperFrames sub-composition). A `media` Layer MUST carry `placement` (`full` or `inset`) and `timing` (`scene` or `slot`). A `text` Layer MUST carry `style` (the visual component: `title`, `lower-third`, `caption`, `watermark` or `quote`) and MAY carry `source` (the reserved value `narration` takes the scene narration). Appearance MUST come from Presets, never from a type name, and a `Style` MUST be styleable by a Preset such as "Lower third", "Title", "Quote", "Captions" or "B-roll". The name `avatar` MUST be used everywhere (the Field `type`, the internal manifest kind and every `avatar*` Field), and the names `presenter`, `talking_avatar` and `talking-avatar` MUST NOT exist as a type, Concept or alias.

Source: maintainer decisions 1 and 1b.

#### Scenario: Four types validate

- GIVEN Layers declaring `type:: avatar`, `type:: media`, `type:: text` and `type:: animation`
- WHEN the script is validated
- THEN each validates and no fifth type is accepted

#### Scenario: Retired type names are rejected

- GIVEN a Layer declaring `type:: presenter`, `type:: background`, `type:: b-roll`, `type:: title`, `type:: lower-third`, `type:: caption`, `type:: brand`, `type:: quote` or `type:: watermark`
- WHEN the script is validated
- THEN validation fails naming the value and the four accepted types, with no alias
- AND the same visual intent is expressed as a Preset on a `text` or `media` Layer

#### Scenario: A text Layer names its component by style

- GIVEN a `text` Layer with `style:: lower-third` and `source:: narration`
- WHEN the manifest is compiled
- THEN it renders the Lower-third component with the scene narration as its text
- AND no Layer type is named `lower-third`

#### Scenario: Media placement and timing are declared

- GIVEN a `media` Layer with `placement:: inset` and `timing:: slot`
- WHEN the script is validated
- THEN both values validate and the manifest carries them
- AND a `media` Layer without `placement` or without `timing` fails naming the missing Field

#### Scenario: Avatar is the only name

- GIVEN a Layer declaring `type:: avatar` and `avatar_model::`
- WHEN the manifest is compiled
- THEN its manifest kind is `avatar` and every generated field name starts with `avatar`

## ADDED Requirements

### Requirement: Scene Owns Variants And A Review Verdict

The blueprint MUST define the Concept `Variant` as a child of `Scene`, with the Field `for` and a prose body holding the candidate value, and the Scene Field `review` (`approved` or `needs-change`). A `Variant` MUST NOT exist at `Video` level. After the episode reaches `approved`, no `Variant` element MUST remain. Representation and lifecycle are specified by capability `video-script-review`.

Source: D4, design A3.

#### Scenario: Variant under a Scene

- GIVEN a Scene with two `Variant` children declaring `for:: narration`
- WHEN the script is validated
- THEN it validates with no schema errors

#### Scenario: Variant outside a Scene

- GIVEN a `Variant` directly under the Video
- WHEN the script is validated
- THEN validation fails naming the Variant

#### Scenario: Variant left after approval

- GIVEN an episode with `status:: approved` that still holds a `Variant`
- WHEN the check runs
- THEN it fails naming the Variant

#### Scenario: Invalid verdict

- GIVEN a Scene with `review:: maybe`
- WHEN the script is validated
- THEN validation fails because the value is not an option of the Field

## MODIFIED Requirements

### Requirement: Universal Parameter Cascade

Every video parameter that is valid at more than one level MUST resolve through one resolver with the precedence, most specific first:

```
layer > scene > video > kind > series > domain > blueprint
```

The fold runs from outermost to innermost: blueprint, domain, series, kind, video, scene; `layer` holds explicit fields only. `series` is the episode's `Series` document; `kind` is the `Scene Kind` element of the Series named by the scene's `kind::` (absent for `Libre` scenes and when resolving at video level); `domain` is the domain-root `Video Defaults` document; `blueprint` is the `Video Defaults` document shipped in the bluepriNNt package. The parameter MUST carry the same Field name at every level, and a level MUST be overridable only when that parameter's Field Definition lists the level's Concept. Default values MUST be blueprint data, never engine code. The resolver MUST report the level that supplied the value. There MUST be no `cli` level: no command-line flag supplies a parameter. List parameters (`components`, `sounds`) hold `key=name` items and MUST resolve per key. Each of `domain`, `series`, `kind`, `video` and `scene` MAY list `presets`, which expand directly before that level's explicit node as specified by video-presets "Per-Level Additive Expansion Order"; at the `kind` level `presets` is the only contribution.
(Previously: the order began with `cli`, had no `kind` level, `output_formats` did not exist, and `presets` expanded at `domain`, `series`, `video` and `scene` only.)

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

- GIVEN the engine and draft-procedure scripts
- WHEN they are searched for default values of cascade parameters
- THEN none is found

#### Scenario: There is no cli level

- GIVEN the engine CLI
- WHEN it is run with a flag that would set a model id or an output size
- THEN it exits non-zero with a usage that does not list the flag

#### Scenario: Preset value is named by its source

- GIVEN a Series with `presets:: [Lucas]` where `Lucas` sets `voice_speed:: 1.1`
- WHEN a Scene without `voice_speed` is resolved
- THEN the value is `1.1` with source `series:preset:Lucas`

#### Scenario: Kind sits between series and video

- GIVEN the Series sets `transition:: wipe`, the Scene Kind `Noticia` lists `presets:: [K]` where `K` sets `transition:: fade`, and a scene of kind `Noticia` sets none
- WHEN its transition is resolved
- THEN the value is `fade` with source `kind:preset:K`

#### Scenario: Video beats kind

- GIVEN the Scene Kind lists a preset setting `voice:: kind-voice` and the Video sets `voice:: video-voice`
- WHEN a scene of that kind resolves `voice`
- THEN the value is `video-voice` with source `video`

#### Scenario: Libre has no kind level

- GIVEN a Scene Kind listing a preset setting `transition:: fade` and a `Libre` scene
- WHEN the scene resolves `transition`
- THEN no value comes from `kind`

### Requirement: Video Defaults Concept

The blueprint MUST define a top-level `Video Defaults` Concept carrying every cascade parameter: `presets`, `voice`, `voice_model`, `voice_speed`, `voice_emotion`, `avatar`, `avatar_model`, `intro`, `image_model`, `image_size`, `background_audio`, `background_audio_volume`, `transition`, `fit`, `frame`, `components`, `sounds`, `language`, `budget`, `daily_budget`, `output_formats` and `script_review`. The bluepriNNt package MUST ship one instance at `defaults/video-defaults_NN.md` holding every baseline value, and that instance MUST NOT declare `presets`, `voice_speed` or `voice_emotion`, and MUST NOT contain a Preset. A domain MAY hold one instance at its root, `video-defaults_NN.md`; when absent, the `domain` level is skipped. Changing the package instance MUST bump `blueprint_version`.
(Previously: the carried set included `voice_tone` and the declaration `master_resolution`, and had no `language`, `budget`, `output_formats` or `script_review`.)

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
- THEN it declares none of `presets`, `voice_speed` or `voice_emotion`
- AND a test enforces this so that no TTS cache key gains a value and no narration is billed again

#### Scenario: Output formats are declared

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it declares `output_formats:: [1920x1920, 1080x1920, 1920x1080, 1080x1080]`, whose first entry is the master size

#### Scenario: Delivery defaults are declared

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it declares `script_review:: required`, an `image_size` and an `output_formats` list
- AND it declares no `budget` and no `language`: an unset `budget` always asks at the budget gate and an unset `language` is a validation error naming the field
- AND `daily_budget` is settable only in a `Video Defaults` document (domain or blueprint level)

### Requirement: Series Concept

The blueprint MUST define a top-level `Series` Concept for real series only, carrying the cascade parameters of `Video Defaults`, including `presets`, `avatar`, `intro`, `language`, `budget`, `output_formats` and `script_review`, plus `title`, but not `daily_budget`, together with the `Scene Kind` and `Chrome` elements of capability video-scene-kinds. A series folder MUST hold at most one Series document `<s>_series_NN.md` (frontmatter `scope: true`), recognised by the frontmatter marker and never by file name. The series level MUST come only from a series root strictly below the domain root; an episode outside a series folder MUST have no series level.
(Previously: the carried set excluded `master_resolution`, the Series declared no kinds or chrome, and the document was named `<s>_scope_NN.md`.)

Source: D9.

#### Scenario: Series document supplies the series level

- GIVEN `s_series_NN.md` in the series folder declaring `transition:: fade`
- WHEN a Scene in that series without `transition::` is compiled
- THEN its transition is `fade` with source `series`

#### Scenario: Episode outside a series has no series level

- GIVEN a script directly under the domain root (or in a folder with no scope document below it) and a domain Video Defaults declaring `transition:: fade`
- WHEN a Scene without `transition::` is compiled
- THEN its transition is `fade` with source `domain`, never `series`

#### Scenario: Series supplies avatar and intro through the cascade

- GIVEN `s_series_NN.md` declaring `avatar:: lucas.png` and `intro:: intro.mp4`
- WHEN a Scene without those fields is resolved
- THEN `avatar` and `intro` resolve to the Series values with source `series`

#### Scenario: Legacy series_NN.md supplies nothing

- GIVEN a series folder holding `series_NN.md` declaring `transition:: wipe` and no Series document with `scope: true`
- WHEN a Scene without `transition::` is compiled
- THEN the series level is absent and the value comes from a lower level

#### Scenario: Series carries delivery parameters

- GIVEN a Series declaring `budget:: 2.5` and `script_review:: skip`
- WHEN an episode of that Series resolves them
- THEN the values are `2.5` and `skip` with source `series`

### Requirement: Shared Field Definitions

Each cascade parameter MUST have exactly one Field Definition whose `concept::` lists every Concept where it is settable, with the names, Concepts, types, options and blueprint defaults of the table below. Only `presets` is settable on `Scene Kind`; no other cascade parameter lists it. The fields `master_resolution` and `voice_tone` MUST NOT exist.

| Field | concept:: | type / options | Blueprint default |
|---|---|---|---|
| tags | all Concepts (global) | select, multiple | none |
| title | Video, Series | string | none |
| description, script, master, thumbnail | Video | unchanged | none |
| status | Video | select `idea`, `draft`, `approved`, `produced`, `published`, `archived` | `idea` |
| published_url | Video | string (URL) | none |
| kind | Scene | select, options from the Series kinds plus `Libre` | none |
| review | Scene | select `approved`, `needs-change` | none |
| for | Variant | string (a Scene field name or `narration`) | none |
| presets | Video, Scene, Scene Kind, Series, Video Defaults | select, multiple, no options | none |
| voice, voice_model, voice_speed, voice_emotion | Video, Scene, Preset, Series, Video Defaults | string (`voice_speed` numeric) | `voice` `default`; `voice_model` `minimax/speech-2.8-hd`; others none |
| avatar | Video, Scene, Preset, Series, Video Defaults | file | none |
| avatar_model | Layer, Scene, Video, Preset, Series, Video Defaults | string | `wavespeed-ai/infinitetalk-fast` |
| avatar_resolution | Layer | select `480p`, `720p`, `768p` | none |
| intro | Video, Preset, Series, Video Defaults | file | none |
| image_model | Video, Scene, Preset, Series, Video Defaults | string | `wavespeed-ai/z-image/turbo` |
| image_size | Video, Scene, Preset, Series, Video Defaults | string `<W>x<H>`, one of the resolved image model's catalog `sizes` | `1024x1024` |
| background_audio | Video, Scene, Preset, Series, Video Defaults | file | none |
| background_audio_volume | Video, Scene, Preset, Series, Video Defaults | string (0 to 1) | `0.2` |
| transition | Video, Scene, Preset, Series, Video Defaults | select `fade`, `slide-left`, `slide-right`, `wipe`, `none` | `none` |
| frame | Video, Scene, Preset, Series, Video Defaults | string | `neutral` |
| fit | Layer, Scene, Video, Preset, Series, Video Defaults | select `cover`, `contain` | `cover` |
| components | Video, Preset, Series, Video Defaults | select, multiple, keyed | current list |
| sounds | Video, Preset, Series, Video Defaults | select, multiple, keyed | `[scene-boundary=whoosh]` |
| language | Video, Series, Video Defaults | string (language code) | none (unset is a validation error) |
| budget | Video, Series, Video Defaults | number (domaiNN currency, per episode) | none (unset always asks at the budget gate) |
| daily_budget | Video Defaults | number (domaiNN currency) | none (no daily cap) |
| output_formats | Video, Series, Video Defaults | list of `<W>x<H>`; the first entry is the master size | `[1920x1920, 1080x1920, 1920x1080, 1080x1080]` |
| script_review | Video, Series, Video Defaults | select `required`, `skip` | `required` |
| type | Layer | select `avatar`, `media`, `text`, `animation` | none |
| placement | Layer (`media`) | select `full`, `inset` | none |
| timing | Layer (`media`) | select `scene`, `slot` | none |
| style | Layer (`text`) | select `title`, `lower-third`, `caption`, `watermark`, `quote` | none |
| source | Layer (`text`) | select `narration` | none |
| asset, prompt, text, position, enter_animation, exit_animation | Layer | unchanged | none |
| z_index | Layer | string (number) | none |

(Previously: the table had `master_resolution`, `voice_tone` and the old `status` options, and no `kind`, `review`, `for`, `published_url`, `image_size`, `language`, `budget`, `daily_budget`, `output_formats` or `script_review`; and `type` was an unconstrained name with one type per visual role.)

Source: D4.

#### Scenario: One definition reaches every listed Concept

- GIVEN the Field Definition `background_audio_volume` listing Video, Scene, Preset, Series and Video Defaults
- WHEN the blueprint schema is resolved
- THEN those Concepts carry `background_audio_volume` and `Layer` and `Scene Kind` do not

#### Scenario: Presets field is not on Layer or Preset

- GIVEN the Field Definition `presets`
- WHEN the blueprint schema is resolved
- THEN `Video`, `Scene`, `Scene Kind`, `Series` and `Video Defaults` carry it and `Layer` and `Preset` do not

#### Scenario: Blueprint defaults match the table

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN its values are read
- THEN `voice_model` is `minimax/speech-2.8-hd`, `background_audio_volume` is `0.2`, `transition` is `none`, `frame` is `neutral`, `fit` is `cover`, `sounds` is `[scene-boundary=whoosh]`, `script_review` is `required`, `image_size` is `1024x1024` and `output_formats` holds the four default entries
- AND neither `budget` nor `language` has a blueprint default

#### Scenario: output_formats is replaced as a whole

- GIVEN a Series declaring `output_formats:: [1280x1280, 720x1280]`
- WHEN an episode of that Series resolves it
- THEN the value is exactly those two entries with source `series` and the master size is `1280x1280`

#### Scenario: Malformed format size

- GIVEN `output_formats:: [wide]`
- WHEN the document is validated
- THEN validation fails because the entry does not match `<W>x<H>`

#### Scenario: image_size must be a size of the model

- GIVEN a scene resolving an image model whose catalog `sizes` exclude `4096x4096` and `image_size:: 4096x4096`
- WHEN the estimate is built
- THEN it fails before spend naming the field, the size and the model

#### Scenario: image_size cascades

- GIVEN a Series declaring `image_size:: 1920x1080` and a scene setting none
- WHEN the scene resolves `image_size`
- THEN the value is `1920x1080` with source `series`

#### Scenario: Retired parameter has no definition

- GIVEN the blueprint schema
- WHEN its Field Definitions are listed
- THEN neither `master_resolution` nor `voice_tone` is present

### Requirement: Field Naming Convention

Every Field Definition of the blueprint MUST follow one naming convention: fields are `snake_case` without dots, a field describing an attribute of a subject is named `subject_attribute`, a file-typed field is named by its bare content noun without a `_asset` or `_file` suffix, a list-valued field is plural, and select option values are `kebab-case`.
(Previously: the voice-field scenario listed `voice_tone`.)

#### Scenario: Names are snake_case

- GIVEN every Field Definition in the blueprint
- WHEN the names are checked
- THEN each matches lowercase words joined by single underscores and none contains a dot

#### Scenario: Subject-attribute and bare-noun names

- GIVEN the voice delivery fields and the file-typed cascade fields
- WHEN the names are listed
- THEN the voice fields are `voice`, `voice_model`, `voice_speed` and `voice_emotion`
- AND the file fields are `avatar`, `intro` and `background_audio`, with no `presenter_asset` or `intro_asset`

#### Scenario: Lists are plural and values are kebab-case

- GIVEN the list-valued fields and every `select` option
- WHEN they are checked
- THEN the list fields are `presets`, `components`, `sounds`, `output_formats` and `tags`
- AND every option value matches lowercase words joined by single hyphens

### Requirement: Cascade Parameters Are Settable Where Meaningful

Each cascade parameter MUST be settable at every level where it has meaning, so `avatar` MUST be settable on `Video`, `Scene`, `Preset`, `Series` and `Video Defaults`, the voice delivery parameters `voice_speed` and `voice_emotion` MUST cascade like `voice`, and `avatar` MUST NOT be Series-only.
(Previously: `voice_tone` was among the delivery parameters.)

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

### Requirement: The Video Concept Carries The Episode Record

The `coNNtent` blueprint's `Video` concept MUST also declare the episode's catalogue and delivery fields `description` (markdown_inline), `status` (select of `idea`/`draft`/`approved`/`produced`/`published`/`archived`), `published_url` (string), `script` (file), `master` (video) and `thumbnail` (image), so that one L3 document of the blueprint is both the episode's record and its script; `slug` is the reserved iNNfo identity property and MUST NOT be redeclared as a Field Definition of this blueprint.

Each file-backed field MUST hold exactly one filename resolved under the owning model's directory, `master` MUST name the episode's master `<slug>_<W>x<H>.mp4` where `<W>x<H>` is the first entry of the resolved `output_formats`, and a `Video` element MUST NOT carry a field for a derived format variant: the other formats and the thumbnail variants are derived from `master` and are never stored.
(Previously: `status` had the options `draft`/`scripting`/`rendering`/`published`/`archived`, there was no `published_url`, and `master` was tied to the file name `<slug>_1920x1920.mp4`.)

Source: D4, D5.

#### Scenario: An episode is one L3 document

- GIVEN an L3 document of the `coNNtent` blueprint holding one `## NN Video:` element with `slug`, `status`, `script`, `master` and `thumbnail`
- WHEN it is validated as an L3 document
- THEN it validates with no schema errors

#### Scenario: Format variants are derived, not modelled

- GIVEN such an episode whose `master` is `pepper-mapache_1920x1920.mp4`
- WHEN the format-variant step runs with the default `output_formats`
- THEN the vertical variant is derived as `pepper-mapache_1080x1920.mp4`
- AND the blueprint declares no `master_vertical` or `thumbnail_vertical` field

#### Scenario: Master name follows the declared size

- GIVEN `output_formats:: [1280x1280, 720x1280]`
- WHEN the master is named
- THEN `master` is `<slug>_1280x1280.mp4`

#### Scenario: The surviving concept name is unchanged

- GIVEN an episode whose script root element is `## NN Video: <title>`
- WHEN the model is inspected
- THEN the element's concept is `Video` and no rename is required

#### Scenario: Video voice_id is gone

- GIVEN a Video element declaring `voice_id::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint

### Requirement: Retired Field Names Are Rejected

The blueprint MUST NOT define the retired Fields and Concept names `template`, `tool`, `tts_model`, `speed`, `emotion`, `music`, `music_volume`, `presenter_asset`, `intro_asset`, `voice_tone`, `scene_duration`, `scene_tts_model` and `master_resolution`, the Layer field `level`, the Layer field `model`, and the Video field `voice_id`, and a document using any of them MUST fail validation with no alias or fallback. The retired type names `presenter`, `talking_avatar` and `talking-avatar` MUST fail the same way, naming their replacement `avatar`.
(Previously: `voice_tone`, `scene_duration`, `scene_tts_model` and `master_resolution` were not in the retired set, and the type names were not validated at all.)

#### Scenario: Renamed field is rejected under the old name

- GIVEN a Scene declaring `tts_model::`, `music::`, `music_volume::` or `speed::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint
- AND the same value under `voice_model::`, `background_audio::`, `background_audio_volume::` or `voice_speed::` validates

#### Scenario: Removed fields are rejected

- GIVEN a Preset or Layer declaring `tool::`, a Layer declaring `model::`, or a Video declaring `voice_id::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint

#### Scenario: Dead and phantom fields are rejected

- GIVEN a Scene declaring `voice_tone::`, `scene_duration::` or `scene_tts_model::`, or a Video Defaults declaring `master_resolution::`
- WHEN the document is validated
- THEN validation fails naming the key

#### Scenario: Layer `level` is replaced by `z_index`

- GIVEN a Layer declaring `level:: 2` and another declaring `z_index:: 2`
- WHEN both are validated
- THEN the first fails and the second validates
- AND the iNNfo frontmatter key `level:` remains valid

### Requirement: Master And Position Descriptions Describe The Declared Master

The Field Definition `master` of `Video` MUST be described as "The episode's master `<slug>_<W>x<H>.mp4`, sized by the first entry of `output_formats`. Delivery formats are derived from it and never modeled." and the Field Definition `position` of `Layer` MUST be described as "Overlay anchor inside the central safe square (the central 1080x1080 of the default square master).", with their types, options and concepts unchanged.
(Previously: the master was described as the square master `<slug>_1920x1920.mp4` derived by `render-formats`.)

Source: D4.

#### Scenario: Descriptions are replaced

- GIVEN the Field Definitions `master` and `position`
- WHEN their descriptions are read
- THEN they equal the texts above and neither mentions 16:9 headroom or a dual master

#### Scenario: Types are unchanged

- GIVEN the same Field Definitions
- WHEN their type and options are compared with the previous version
- THEN they are equal

## REMOVED Requirements

### Requirement: Master Resolution Is A Declared Video Default

(Reason: the single-option `master_resolution` field is replaced by the `output_formats` list, whose first entry declares the master size; see "Shared Field Definitions".)
(Migration: declare `output_formats:: [<W>x<H>, ...]`; a document declaring `master_resolution` fails as a retired key.)
