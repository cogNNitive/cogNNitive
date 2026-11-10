# conntent-model Delta Spec

Source decisions: D3, D4, D5 (fields), D7 (field), D17, D19 (Slice 2: Cascade). No backwards compatibility: retired fields are rejected, not aliased.

## MODIFIED Requirements

### Requirement: Universal Parameter Cascade

Every video parameter that is valid at more than one level MUST resolve through one resolver with the precedence, most specific first:

```
layer > scene > video > kind > series > domain > blueprint
```

The fold runs from outermost to innermost: blueprint, domain, series, kind, video, scene; `layer` holds explicit fields only. `series` is the episode's `Series` document; `kind` is the `Scene Kind` element of the Series named by the scene's `kind::` (absent for `Libre` scenes and when resolving at video level); `domain` is the domaiNN-root `Video Defaults` document; `blueprint` is the `Video Defaults` document shipped in the bluepriNNt package. The parameter MUST carry the same Field name at every level, and a level MUST be overridable only when that parameter's Field Definition lists the level's Concept and its scope class allows it (see `conntent-field-registry` "Every Field Declares One Scope Class"). Default values MUST be blueprint data, never engine code. The resolver MUST return the source trace of every value (see `conntent-field-registry` "Every Resolved Value Carries A Source Trace"). There MUST be no `cli` level: no command-line flag supplies a parameter. List parameters (`components`, `sounds`) hold `key=name` items and MUST resolve per key.

Each of `domain`, `series`, `kind`, `video` and `scene` contributes, in this order from nearest to farthest within the level: its explicit fields (a `kind` level has explicit fields, because a Scene Kind accepts direct fields), the node of the active Character when the level sets `character` (see `conntent-character`), and its expanded `presets` (see `conntent-presets` "Per-Level Additive Expansion Order").
(Previously: a `kind` level contributed only its expanded `presets`, and no Character node existed.)

#### Scenario: Most specific level wins and is named
- GIVEN `background_audio_volume` set in the series document and in the domaiNN Video Defaults
- WHEN the resolver runs for a Scene that does not set it
- THEN it returns the series value with source `series`

#### Scenario: Domain Video Defaults overrides the blueprint
- GIVEN the domaiNN Video Defaults declares `background_audio_volume:: 0.3` and no series sets it
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

#### Scenario: Kind direct field sits between series and video
- GIVEN the Series sets `transition:: wipe`, the Scene Kind `Noticia` declares `transition:: fade`, and a scene of kind `Noticia` sets none
- WHEN its transition is resolved
- THEN the value is `fade` with source `kind`

#### Scenario: Kind explicit field beats its own preset
- GIVEN the Scene Kind declares `transition:: fade` and `presets:: [K]` where `K` sets `transition:: slide-left`
- WHEN a scene of that kind resolves `transition`
- THEN the value is `fade` with source `kind`

#### Scenario: Kind preset sits between series and video
- GIVEN the Series sets `transition:: wipe`, the Scene Kind `Noticia` lists `presets:: [K]` where `K` sets `transition:: fade`, and a scene of kind `Noticia` sets none
- WHEN its transition is resolved
- THEN the value is `fade` with source `kind:preset:K`

#### Scenario: Video beats kind
- GIVEN the Scene Kind declares `voice:: kind-voice` and the Video sets `voice:: video-voice`
- WHEN a scene of that kind resolves `voice`
- THEN the value is `video-voice` with source `video`

#### Scenario: Libre has no kind level
- GIVEN a Scene Kind declaring `transition:: fade` and a `Libre` scene
- WHEN the scene resolves `transition`
- THEN no value comes from `kind`

#### Scenario: Character sits beneath the explicit fields of its level
- GIVEN the Series declares `character:: lucas` and `voice:: custom`, and a scene sets none
- WHEN the scene resolves `voice` and `pose`
- THEN `voice` is `custom` with source `series` and `pose` is Lucas's `default_pose` with source `series:character:lucas`

### Requirement: Video Defaults Concept

The blueprint MUST define a top-level `Video Defaults` Concept carrying every cascade parameter: `presets`, `voice`, `voice_model`, `voice_speed`, `voice_emotion`, `avatar`, `avatar_model`, `avatar_resolution`, `intro`, `image_model`, `image_size`, `background_audio`, `background_audio_volume`, `transition`, `fit`, `frame`, `components`, `sounds`, `captions`, `caption_model`, `character`, `pose`, `background`, `language`, `budget`, `daily_budget`, `output_formats`, `review_gates`, `thumbnail_formats`, `thumbnail_base`, `thumbnail_title` and `thumbnail_badge`. The bluepriNNt package MUST ship one instance at `defaults/video-defaults_NN.md` holding every baseline value, and that instance MUST NOT declare `presets`, `voice`, `voice_speed`, `voice_emotion`, `character`, `pose`, `background`, `language` or `budget`, and MUST NOT contain a Preset. A domaiNN MAY hold one instance at its root, `video-defaults_NN.md`; when absent, the `domain` level is skipped. Changing the package instance MUST bump `blueprint_version`.
(Previously: the carried set had `script_review` instead of `review_gates`, and none of `avatar_resolution`, `captions`, `caption_model`, `character`, `pose`, `background`, `thumbnail_*`; the package declared a `voice` default of `default`.)

Source: D3, D4, D5, D7.

#### Scenario: Missing domain document falls through
- GIVEN a domaiNN with no `video-defaults_NN.md` at its root
- WHEN a parameter set only in the package Video Defaults is resolved
- THEN it returns that value with source `blueprint`

#### Scenario: Editing package defaults requires a bump
- GIVEN a change to `defaults/video-defaults_NN.md` without a `blueprint_version` bump
- WHEN `guard-template-immutability` runs
- THEN it fails naming the owning `spec_NN.md`

#### Scenario: Defaults declare no voice values
- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it declares none of `presets`, `voice`, `voice_speed` or `voice_emotion`
- AND a test enforces this so that no TTS cache key gains a value and no narration is billed again

#### Scenario: Output formats are declared
- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it declares `output_formats:: [1920x1920, 1080x1920, 1920x1080, 1080x1080]`, whose first entry is the master size

#### Scenario: Delivery defaults are declared
- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it declares `review_gates:: [script, preview]`, `captions:: off`, `thumbnail_formats:: [2560x1440, 1080x1920]`, an `image_size` and an `output_formats` list
- AND it declares no `budget` and no `language`: an unset `budget` is a spend stop (exit 11) whenever the plan total is above zero (`conntent-review-gates`), and an unset `language` is a validation error naming the field
- AND `daily_budget` is settable only in a `Video Defaults` document (domaiNN or blueprint level)

#### Scenario: Retired script_review in defaults
- GIVEN a `Video Defaults` document declaring `script_review:: required`
- WHEN it is validated
- THEN it fails with `retired-key` naming the replacement `review_gates`

### Requirement: Series Concept

The blueprint MUST define a top-level `Series` Concept for real series only, carrying every cascade parameter of `Video Defaults` except `daily_budget` (so, among others, `presets`, `character`, `pose`, `background`, `avatar`, `avatar_resolution`, `intro`, `language`, `budget`, `output_formats`, `review_gates`, `captions` and `thumbnail_formats`), plus `title`, together with the `Scene Kind` and `Chrome` elements of capability `conntent-scene-kinds`. A series folder MUST hold at most one Series document `<s>_coNNtent_NN.md` (frontmatter `scope: true`, naming per `conntent-folder-contract`), recognised by the frontmatter marker and never by file name. The series level MUST come only from a series root strictly below the domaiNN root; an episode outside a series folder MUST have no series level.
(Previously: the carried set had `script_review` and none of the Character, caption or thumbnail fields.)

Source: D3, D9, D19.

#### Scenario: Series document supplies the series level
- GIVEN `series/s/s_coNNtent_NN.md` with `scope: true` declaring `transition:: fade`
- WHEN a Scene in that series without `transition::` is compiled
- THEN its transition is `fade` with source `series`

#### Scenario: Episode outside a series has no series level
- GIVEN a script directly under the domaiNN root (or in a folder with no scope document below it) and a domaiNN Video Defaults declaring `transition:: fade`
- WHEN a Scene without `transition::` is compiled
- THEN its transition is `fade` with source `domain`, never `series`

#### Scenario: Series supplies avatar and intro through the cascade
- GIVEN `series/s/s_coNNtent_NN.md` declaring `avatar:: characters/lucas/avatars/neutral` and `intro:: media/intro`
- WHEN a Scene without those fields is resolved
- THEN `avatar` and `intro` resolve to the Series values with source `series`

#### Scenario: Legacy series_NN.md supplies nothing
- GIVEN a series folder holding `series_NN.md` declaring `transition:: wipe` and no Series document with `scope: true`
- WHEN a Scene without `transition::` is compiled
- THEN the series level is absent and the value comes from a lower level

#### Scenario: Series carries delivery parameters
- GIVEN a Series declaring `budget:: 2.5`, `review_gates:: []` and `thumbnail_formats:: [1280x720]`
- WHEN an episode of that Series resolves them
- THEN the values are `2.5`, `[]` and `[1280x720]` with source `series`

#### Scenario: Series sets its host
- GIVEN a Series declaring `character:: lucas` and `captions:: words`
- WHEN a scene resolves both
- THEN `character` is `lucas` and `captions` is `words`, both with source `series`

### Requirement: Shared Field Definitions

Each cascade parameter MUST have exactly one Field Definition whose `scope::` names its class and whose `concept::` lists every Concept where it is settable, with the names, classes, Concepts, types, options and blueprint defaults of the table below. `Scene Kind` is a settable Concept of every `render` field except `intro`. The fields `master_resolution`, `voice_tone` and `script_review` MUST NOT exist.

| Field | class | concept:: | type / options | Blueprint default |
|---|---|---|---|---|
| tags | record | all Concepts (global) | select, multiple | none |
| title | record | Video, Series | string | none |
| description, script, master, thumbnail | record | Video | unchanged (`thumbnail` names the first thumbnail, see folder contract) | none |
| status | record | Video | select; options owned by `conntent-episode-lifecycle` | `idea` |
| translation_of | record | Video | string `<slug>` (same series) or `<series>/<slug>` | none |
| kind | record | Scene | select, options from the Series kinds plus `Libre` | none |
| review | record | Scene | select `approved`, `needs-change`; semantics owned by `conntent-review-gates` | none |
| presets | render | Video, Scene, Scene Kind, Series, Video Defaults | select, multiple, no options | none |
| voice | render | Video, Scene, Scene Kind, Preset, Series, Video Defaults | string, the slug of a catalog `Voice` | none |
| voice_model | render | same as `voice` | string | `minimax/speech-2.8-hd` |
| voice_speed | render | same as `voice` | numeric | none |
| voice_emotion | render | same as `voice` | string | none |
| avatar | render | same as `voice` | file, logical name | none |
| avatar_model | render | Layer, Scene, Scene Kind, Video, Preset, Series, Video Defaults | string | `wavespeed-ai/infinitetalk-fast` |
| avatar_resolution | render | Layer, Scene, Scene Kind, Video, Preset, Series, Video Defaults | select `480p`, `720p`, `768p` | none |
| intro | render | Video, Preset, Series, Video Defaults | file, logical name | none |
| image_model | render | Layer, Scene, Scene Kind, Video, Preset, Series, Video Defaults | string | `wavespeed-ai/z-image/turbo` |
| image_size | render | same as `image_model` | string `<W>x<H>`, one of the resolved image model's catalog `sizes` | `1024x1024` |
| background_audio | render | Video, Scene, Scene Kind, Preset, Series, Video Defaults | file, logical name | none |
| background_audio_volume | render | same as `background_audio` | string (0 to 1) | `0.2` |
| transition | render | same as `background_audio` | select `fade`, `slide-left`, `slide-right`, `wipe`, `none` | `none` |
| frame | render | same as `background_audio` | string, a frame name | `neutral` |
| fit | render | Layer, Scene, Scene Kind, Video, Preset, Series, Video Defaults | select `cover`, `contain` | `cover` |
| components | render | Video, Scene, Scene Kind, Preset, Series, Video Defaults | select, multiple, keyed | current list |
| sounds | render | same as `components` | select, multiple, keyed | `[scene-boundary=whoosh]` |
| captions | render | Video, Scene, Scene Kind, Preset, Series, Video Defaults | select `off`, `words`, `lines` | `off` |
| caption_model | render | same as `captions` | string matching `^(tiny\|base\|small\|medium\|large-v[123])(\.en)?$` | none (derived from `language` by the engine) |
| character | render | same as `captions` | string, a Character name | none |
| pose | render | same as `captions` | string, a pose name | none |
| background | render | same as `captions` | string, a background name | none |
| language | video | Video, Series, Video Defaults | string, ISO 639-1 lowercase two-letter code | none (unset is a validation error) |
| budget | video | Video, Series, Video Defaults | number (domaiNN currency, per episode) | none (unset is a spend stop when the plan total is above zero) |
| daily_budget | domain | Video Defaults | number (domaiNN currency) | none (no daily cap) |
| output_formats | video | Video, Series, Video Defaults | list of `<W>x<H>`; the first entry is the master size | `[1920x1920, 1080x1920, 1920x1080, 1080x1080]` |
| review_gates | video | Video, Series, Video Defaults | select, multiple, options `script`, `preview`; `[]` is valid | `[script, preview]` |
| thumbnail_formats | video | Video, Series, Video Defaults | non-empty list of `<W>x<H>` | `[2560x1440, 1080x1920]` |
| thumbnail_base | video | Video, Series, Video Defaults | file, logical name | none (the first scene still is used) |
| thumbnail_title | video | Video, Series, Video Defaults | string | none (the Video `title` is used) |
| thumbnail_badge | video | Video, Series, Video Defaults | string | none (no badge) |
| type | record | Layer | select `avatar`, `media`, `text`, `animation` | none |
| placement | record | Layer (`media`) | select `full`, `inset` | none |
| timing | record | Layer (`media`) | select `scene`, `slot` | none |
| style | record | Layer (`text`) | select `title`, `lower-third`, `caption`, `watermark`, `quote` | none |
| source | record | Layer (`text`) | select `narration` | none |
| asset, prompt, text, position, enter_animation, exit_animation | record | Layer | unchanged; `asset` is a logical name | none |
| z_index | record | Layer | string (number) | none |

(Previously: no `class` column; `published_url` existed; `avatar_resolution` was Layer-only; `image_model` and `image_size` omitted `Layer`; `Scene Kind` listed only `presets`; `components` and `sounds` omitted `Scene`; `script_review` existed; none of `captions`, `caption_model`, `character`, `pose`, `background`, `translation_of`, `review_gates`, `thumbnail_*` existed; `voice` defaulted to `default`.)

Source: D3, D4, D5, D7, D19.

<!-- shared with slice 3: `status` options (conntent-episode-lifecycle), `review` mirror semantics and `review_gates` behaviour (conntent-review-gates) are owned by the Slice 3 capabilities; the rows above fix names, classes, Concepts and defaults only. `published_url` is retired (see "Retired Field Names Are Rejected"). -->

#### Scenario: One definition reaches every listed Concept
- GIVEN the Field Definition `background_audio_volume` listing Video, Scene, Scene Kind, Preset, Series and Video Defaults
- WHEN the blueprint schema is resolved
- THEN those Concepts carry `background_audio_volume` and `Layer` does not

#### Scenario: Presets field is not on Layer or Preset
- GIVEN the Field Definition `presets`
- WHEN the blueprint schema is resolved
- THEN `Video`, `Scene`, `Scene Kind`, `Series` and `Video Defaults` carry it and `Layer` and `Preset` do not

#### Scenario: Scene Kind carries every render field except intro
- GIVEN the Field Definitions of class `render`
- WHEN the blueprint schema is resolved
- THEN `Scene Kind` carries each of them except `intro`

#### Scenario: Blueprint defaults match the table
- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN its values are read
- THEN `voice_model` is `minimax/speech-2.8-hd`, `background_audio_volume` is `0.2`, `transition` is `none`, `frame` is `neutral`, `fit` is `cover`, `sounds` is `[scene-boundary=whoosh]`, `captions` is `off`, `review_gates` is `[script, preview]`, `image_size` is `1024x1024`, `thumbnail_formats` is `[2560x1440, 1080x1920]` and `output_formats` holds the four default entries
- AND none of `budget`, `language` and `voice` has a blueprint default

#### Scenario: output_formats is replaced as a whole
- GIVEN a Series declaring `output_formats:: [1280x1280, 720x1280]`
- WHEN an episode of that Series resolves it
- THEN the value is exactly those two entries with source `series` and the master size is `1280x1280`

#### Scenario: Malformed format size
- GIVEN `output_formats:: [wide]` or `thumbnail_formats:: [wide]`
- WHEN the document is validated
- THEN validation fails because the entry does not match `<W>x<H>`

#### Scenario: Empty thumbnail formats
- GIVEN `thumbnail_formats:: []`
- WHEN the document is validated
- THEN validation fails because the list must not be empty

#### Scenario: review_gates may be empty
- GIVEN a Series declaring `review_gates:: []`
- WHEN the document is validated
- THEN it validates and the resolved value is `[]` with source `series`

#### Scenario: review_gates rejects an unknown gate
- GIVEN `review_gates:: [master]`
- WHEN the document is validated
- THEN validation fails because `master` is not an option of the Field

#### Scenario: image_size must be a size of the model
- GIVEN a scene resolving an image model whose catalog `sizes` exclude `4096x4096` and `image_size:: 4096x4096`
- WHEN the estimate is built
- THEN it fails before spend naming the field, the size and the model

#### Scenario: image_size cascades
- GIVEN a Series declaring `image_size:: 1920x1080` and a scene setting none
- WHEN the scene resolves `image_size`
- THEN the value is `1920x1080` with source `series`

#### Scenario: avatar_resolution cascades beyond Layer
- GIVEN a Series declaring `avatar_resolution:: 720p` and an avatar Layer that sets none
- WHEN the Layer resolves `avatar_resolution`
- THEN the value is `720p` with source `series`

#### Scenario: avatar_resolution invalid option
- GIVEN `avatar_resolution:: 1080p`
- WHEN the document is validated
- THEN validation fails because the value is not an option of the Field

#### Scenario: captions option
- GIVEN `captions:: lines` on a Scene and `captions:: karaoke` on another
- WHEN both are validated
- THEN the first validates and the second fails because `karaoke` is not an option

#### Scenario: caption_model pattern and language
- GIVEN `caption_model:: small.en` and `caption_model:: whisper-x`
- WHEN both are validated
- THEN the first validates and the second fails with the allowed pattern
- AND `caption_model:: small.en` with the resolved `language` `es` fails with `caption-model-language-mismatch` before spend

#### Scenario: Thumbnail fields
- GIVEN a Video declaring `thumbnail_title:: Why founders fail`, `thumbnail_badge:: NEW` and `thumbnail_base:: media/hero`
- WHEN it is validated
- THEN it validates and a Scene declaring `thumbnail_title::` fails with `unknown-key` naming the class `video`

#### Scenario: Retired parameters have no definition
- GIVEN the blueprint schema
- WHEN its Field Definitions are listed
- THEN none of `master_resolution`, `voice_tone` and `script_review` is present

### Requirement: Frame Parameter

`frame:: <name>` MUST be a `render` class cascade parameter settable at scene, scene kind, video, preset, series and domaiNN, with a blueprint default of `neutral`. It names a frame folder `frames/<name>/` containing `FRAME.md`, resolved through the library lookup (see capabilities `conntent-frame` and `conntent-library`).
(Previously: it named a file `frames/<name>.md` located by a nearest-folder walk, and was not settable at a Scene Kind.)

#### Scenario: Scene overrides the series frame
- GIVEN the series sets `frame:: brand` and one Scene sets `frame:: night`
- WHEN that Scene's overlays are mounted
- THEN they receive the tokens of `frames/night/FRAME.md`

#### Scenario: Preset supplies the frame
- GIVEN a Video with `presets:: [Night]` where `Night` sets `frame:: night` and no nearer level sets `frame`
- WHEN a Scene's frame is resolved
- THEN the value is `night` with source `video:preset:Night`

### Requirement: The Video Concept Carries The Episode Record

The `coNNtent` blueprint's `Video` concept MUST also declare the episode's catalogue and delivery fields `description` (markdown_inline), `status` (select, options owned by `conntent-episode-lifecycle`), `script` (file), `master` (video), `thumbnail` (image) and `translation_of` (string), and MUST NOT declare `published_url` (publishing is out of scope), so that one L3 document of the blueprint is both the episode's record and its script; `slug` is the reserved iNNfo identity property and MUST NOT be redeclared as a Field Definition of this blueprint.

Each file-backed field MUST hold exactly one filename resolved under the owning model's directory, `master` MUST name the episode's master `<slug>_<W>x<H>.mp4` where `<W>x<H>` is the first entry of the resolved `output_formats`, `thumbnail` MUST name the first thumbnail `<slug>_thumbnail_<W>x<H>.png` where `<W>x<H>` is the first entry of the resolved `thumbnail_formats`, and a `Video` element MUST NOT carry a field for a derived format variant: the other formats and the other thumbnails are derived and never stored.
(Previously: `thumbnail` was `thumbnail.png`, `published_url` was declared, and there was no `translation_of`.)

Source: D4, D5, F5.

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

#### Scenario: Thumbnail name follows the declared size
- GIVEN the default `thumbnail_formats`
- WHEN the thumbnail is named
- THEN `thumbnail` is `<slug>_thumbnail_2560x1440.png`

#### Scenario: The surviving concept name is unchanged
- GIVEN an episode whose script root element is `## NN Video: <title>`
- WHEN the model is inspected
- THEN the element's concept is `Video` and no rename is required

#### Scenario: Video voice_id is gone
- GIVEN a Video element declaring `voice_id::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint

### Requirement: Cascade Parameters Are Settable Where Meaningful

Each cascade parameter MUST be settable at every level where it has meaning, so `avatar` MUST be settable on `Video`, `Scene`, `Scene Kind`, `Preset`, `Series` and `Video Defaults`, the voice delivery parameters `voice_speed` and `voice_emotion` MUST cascade like `voice`, and `avatar` MUST NOT be Series-only.
(Previously: `Scene Kind` was not in the list.)

#### Scenario: Avatar is set on a Scene
- GIVEN a Scene declaring `avatar:: media/lucas` and a Series declaring `avatar:: media/series`
- WHEN the Scene's avatar is resolved
- THEN the value is `media/lucas` with source `scene`

#### Scenario: Voice delivery cascades
- GIVEN the Series declares `voice_speed:: 1.1` and no nearer level sets it
- WHEN a Scene's `voice_speed` is resolved
- THEN the value is `1.1` with source `series`

#### Scenario: Layer is not a level for avatar
- GIVEN a Layer declaring `avatar:: x.png`
- WHEN the script is validated
- THEN validation fails because `avatar` is not defined for `Layer`, where `asset` is the local value

### Requirement: Avatar Layer Requires A Source

An `avatar` Layer MUST be valid only when a source for its image is available, expressed as the conditional-fields rule `avatar: [asset, prompt, avatar]`, where the field `avatar` is satisfied by the cascaded value of the owning Scene, including a value supplied by the active Character.
(Previously: named "Presenter Layer Requires A Source", keyed by the retired type `presenter`; the cascaded value could come only from a Series, Video, Scene or Preset.)

#### Scenario: Asset or prompt satisfies the rule
- GIVEN an `avatar` Layer with `asset::` or with `prompt::`
- WHEN the script is checked
- THEN no missing-conditional-field error is reported

#### Scenario: Cascaded avatar satisfies the rule
- GIVEN an `avatar` Layer with neither `asset` nor `prompt` in a Scene whose resolved `avatar` comes from a Series, Scene Kind, Video, Scene or Preset
- WHEN the script is checked
- THEN no missing-conditional-field error is reported

#### Scenario: Character avatar satisfies the rule
- GIVEN an `avatar` Layer with neither `asset` nor `prompt` in a Scene whose active Character has an avatar for the resolved pose
- WHEN the script is checked
- THEN no missing-conditional-field error is reported

#### Scenario: No source anywhere
- GIVEN an `avatar` Layer with no `asset`, no `prompt` and no resolvable `avatar`
- WHEN the script is checked
- THEN `missing-conditional-field` is reported for the Layer

### Requirement: Layer `type::` Discriminator

Every `Layer` MUST declare a `type::` select field with exactly the allowed values `avatar`, `media`, `text` and `animation`. A `text` Layer MUST declare `style::` (`title`, `lower-third`, `caption`, `watermark`, `quote`); a `media` Layer MAY declare `placement::` (`full`, `inset`) and `timing::`. Fields MAY differ per `type::` and validation MUST be conditional on it. A `text` Layer of style `caption` is **static text** for its own duration; it MUST NOT be interpreted as word-level narration subtitles (see "Narration Subtitles Are Not A Layer" and `conntent-captions`). An `animation` Layer MUST declare `asset::` pointing at an authored HyperFrames project and MUST NOT carry overlay text; "animation" never means a portfolio component (`conntent-component-portfolio`). An `avatar` Layer's model override MUST be the Field `avatar_model::`. Any other value, including the retired `presenter`, `talking_avatar`, `talking-avatar`, `background`, `b-roll`, `title`, `lower-third`, `caption`, `brand`, `quote`, `watermark`, `video` and `ai_video`, MUST fail validation (see "Retired Field Names Are Rejected").
(Previously: the allowed values were `presenter`, `background`, `b-roll`, `title`, `lower-third`, `caption`, `brand`, `quote`, `watermark` and `animation`.)

#### Scenario: Unknown layer type is rejected

- GIVEN a Layer whose `type::` value is `presenter` or `b-roll`
- WHEN the script is validated
- THEN validation fails naming the invalid `type::`

#### Scenario: Conditional fields are enforced

- GIVEN a Layer of `type:: text` with no `style::`
- WHEN the script is validated
- THEN validation fails for the missing field

#### Scenario: Caption is static text, not narration

- GIVEN a `text` Layer with `style:: caption` declaring `text:: Fuente: The Guardian, 2026-10-24`
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

### Requirement: Scene Owns A Review Verdict

The blueprint MUST define the Scene Field `review` (`approved` or `needs-change`) as an engine-written display mirror of the derived gate state. Its writer, semantics and the `unbacked-review` finding are specified by `conntent-review-gates` ("`review::` is a display mirror, and an unbacked value is flagged"); the value MUST NOT approve any gate.
(Previously: representation and lifecycle were specified by capability `video-script-review`, and the field was the approval itself.)

#### Scenario: Valid review value

- GIVEN a Scene with `review:: approved` written by the engine mirror
- WHEN the script is validated
- THEN it validates with no schema errors

#### Scenario: Invalid value

- GIVEN a Scene with `review:: maybe`
- WHEN the script is validated
- THEN validation fails because the value is not an option of the Field

#### Scenario: Value is not an approval

- GIVEN a Scene with `review:: approved` and no applied verdict
- WHEN the gate state is computed
- THEN the gate is `open`

### Requirement: Retired Field Names Are Rejected

The blueprint MUST NOT define the retired Fields and Concept names `template`, `tool`, `tts_model`, `speed`, `emotion`, `music`, `music_volume`, `presenter_asset`, `intro_asset`, `voice_tone`, `scene_duration`, `scene_tts_model`, `master_resolution`, `script_review` and `published_url`, the Layer field `level`, the Layer field `model`, and the Video field `voice_id`, and a document using any of them MUST fail validation with no alias or fallback. The retired type names `presenter`, `talking_avatar` and `talking-avatar` MUST fail the same way, naming their replacement `avatar`; the retired generated-clip types `video` and `ai_video` MUST fail naming `unsupported-capability`. `script_review` MUST name its replacement `review_gates`.
(Previously: `script_review` and `published_url` were defined fields, and `video`/`ai_video` layer types were priced.)

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

#### Scenario: published_url is retired
- GIVEN a Video declaring `published_url:: https://example.com/v`
- WHEN the script is validated
- THEN validation fails because the Field is not defined by the blueprint

#### Scenario: script_review is replaced
- GIVEN a Series or Video declaring `script_review:: skip`
- WHEN the document is validated
- THEN it fails with `retired-key` naming the replacement `review_gates`

#### Scenario: Layer `level` is replaced by `z_index`
- GIVEN a Layer declaring `level:: 2` and another declaring `z_index:: 2`
- WHEN both are validated
- THEN the first fails and the second validates
- AND the iNNfo frontmatter key `level:` remains valid

### Requirement: Background Audio Is a Field, Not a Layer

Background audio MUST be declared as the `background_audio::` cascade field, settable on `Video`, `Scene`, `Scene Kind`, `Preset`, `Series` and `Video Defaults`, whose value is a logical name resolved through the library (see `conntent-library`), and MUST NOT be modeled as a `Layer`. The Chrome `music` item and `background_audio` MUST have one precedence: a Chrome `music` item applies to the scenes of the kinds that list it as the `kind`-level value of `background_audio` (design D-K2), so an explicit `background_audio` at `video` or `scene` level wins over it and no second mechanism exists. This precedence is the recommended default of an open product question listed in the proposal.
(Previously: settable on `Video`, `Scene`, `Preset`, `Series` and `Video Defaults`, with a relative file name, and no stated precedence against the Chrome `music` item.)

#### Scenario: Scene background audio does not become a layer
- GIVEN a Scene with a `background_audio::` field
- WHEN the model is read
- THEN the value is exposed as the Scene field
- AND no audio Layer is emitted

#### Scenario: Video-level background audio applies to scenes
- GIVEN a Video with `background_audio:: music/bed` and a Scene that sets none
- WHEN the Scene's background audio is resolved
- THEN the value is `music/bed` with source `video`

#### Scenario: Chrome music has a defined precedence
- GIVEN a Chrome `music` item `music/theme` listed by kind `Cierre` and a scene of that kind that sets `background_audio:: music/own`
- WHEN the scene's background audio is resolved
- THEN the value is `music/own` with source `scene`
- AND without the scene value it is `music/theme` with source `kind`

## ADDED Requirements

### Requirement: One Language Per Episode

An episode MUST have exactly one resolved `language` (a `video` class field, ISO 639-1 lowercase two-letter code, no blueprint default), and an unset language MUST fail validation before any spend, naming the field. The resolved `language` MUST:

1. select the catalog `Voice`: the resolved `voice` MUST name a catalog `Voice` whose `language` equals it, else `voice-language-mismatch` naming the scene, the Voice and both languages, before any spend;
2. be sent to the TTS provider with every request and be part of the TTS cache key;
3. select the `Chrome` element of that language (see `conntent-scene-kinds`);
4. select the Character voice `voices[<language>]` (see `conntent-character`).

A scene MUST NOT synthesise in a language other than the episode's, and the engine MUST NOT default the language (no `Spanish` fallback). An unset `voice` for a scene without an active Character MUST fail with `missing-voice` naming the language; the blueprint ships no `voice` default (recommended default of an open product question listed in the proposal).

#### Scenario: Spanish episode
- GIVEN `language:: es`, a Character with `voices.es` and a Chrome element `es`
- WHEN `produce` runs the validation
- THEN the Voice is the Spanish catalog Voice and the Chrome is the Spanish one

#### Scenario: Voice of the wrong language
- GIVEN `language:: es` and `voice:: lucas-en` where `lucas-en` has `language: en`
- WHEN the pre-compile check runs
- THEN it fails with `voice-language-mismatch` naming `lucas-en`, `en` and `es`
- AND nothing is spent

#### Scenario: TTS request carries the language
- GIVEN `language:: es`
- WHEN a TTS request is built
- THEN it carries `es` and the cache key includes it

#### Scenario: Unset language
- GIVEN no level declares `language`
- WHEN `produce` runs
- THEN it fails naming `language` and nothing is spent

#### Scenario: Unset voice
- GIVEN `language:: es`, no `voice` at any level and no active Character
- WHEN the pre-compile check runs
- THEN it fails with `missing-voice` naming `es`

### Requirement: Translations Are Separate Episodes

A translation MUST be a separate episode with its own folder and document, declaring `translation_of:: <slug>` (an episode of the same series) or `translation_of:: <series>/<slug>` (an episode of another series) and its own `language`. Validation MUST fail before any spend when:

- the referenced episode does not exist (`translation-source-not-found`);
- the referenced episode is the episode itself (`translation-self`);
- the referenced episode has the same resolved `language` (`translation-same-language`);
- the referenced episode itself declares `translation_of` (`translation-chain`, the field MUST name the original);
- the Chrome element or the Character voice for the translation's language is missing (`missing-chrome-language`, `missing-character-voice`).

A scene of a translation corresponds to the scene of the original with the same `slug`. Scenes with no counterpart MUST be allowed. Content-addressed caching is unchanged: images are reused across languages because the image key contains no language.

<!-- shared with slice 4: the stale-translation flag in the console is specified by conntent-domain-console; the original-scene hash comparison belongs to Slice 3. -->

#### Scenario: English translation of a Spanish episode
- GIVEN an episode `language:: en` with `translation_of:: gas-pump` and the original `gas-pump` with `language:: es`
- WHEN the pre-compile check runs
- THEN it validates provided the English Chrome and the Character `voices.en` exist

#### Scenario: Missing Chrome for the translation
- GIVEN the translation above and a Series with only a Chrome element `es`
- WHEN the pre-compile check runs
- THEN it fails with `missing-chrome-language` naming the item and `en`, and nothing is spent

#### Scenario: Missing character voice for the translation
- GIVEN the translation above and a Character with only `voices.es`
- WHEN the pre-compile check runs
- THEN it fails with `missing-character-voice` naming the Character and `en`

#### Scenario: Source episode does not exist
- GIVEN `translation_of:: ghost` and no such episode
- WHEN the pre-compile check runs
- THEN it fails with `translation-source-not-found`

#### Scenario: Same language
- GIVEN `translation_of:: gas-pump` with both episodes `language:: es`
- WHEN the pre-compile check runs
- THEN it fails with `translation-same-language`

#### Scenario: Translation of a translation
- GIVEN `translation_of:: gas-pump-en` where `gas-pump-en` itself declares `translation_of:: gas-pump`
- WHEN the pre-compile check runs
- THEN it fails with `translation-chain` naming `gas-pump` as the original

#### Scenario: Self reference
- GIVEN an episode `gas-pump` declaring `translation_of:: gas-pump`
- WHEN the pre-compile check runs
- THEN it fails with `translation-self`

#### Scenario: Images reused across languages
- GIVEN an original and its translation whose scenes have the same image prompt and `image_model`
- WHEN both are produced
- THEN the second run is a cache hit for those images

## RENAMED Requirements

### Requirement: Presenter Layer Requires A Source → Avatar Layer Requires A Source

(Reason: the Layer type `presenter` is retired; the only Layer types are `avatar`, `media`, `text` and `animation`. The updated body is the MODIFIED block "Avatar Layer Requires A Source" above.)
(Migration: none; references and tests use the new name.)
