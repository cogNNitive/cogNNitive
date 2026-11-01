# Delta for video-script-model

Scope: `master_resolution` as a declared Video Defaults field; the Video `master` and Layer `position` text for the single square master; the Series concept anchored by its scope document. Design decision ids (D3, D4, D9) refer to `design.md` of change `2026-11-01-video-folder-contract`.

Composition with `2026-11-01-video-presets` (applied first, archived first). That change MODIFIES four requirements that this delta also modifies: "Series Concept", "The Video Concept Carries The Episode Record", "Shared Field Definitions" and "Video Defaults Concept". Each MODIFIED block below is a full copy of that change's version of the requirement, edited, and replaces it when this change is archived after it. The remaining requirements of that change are untouched. The `Video Defaults` default `master_resolution` is not a cascade parameter below `Video Defaults`: it is read by neither the TTS options nor the image options.

## ADDED Requirements

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

## MODIFIED Requirements

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
