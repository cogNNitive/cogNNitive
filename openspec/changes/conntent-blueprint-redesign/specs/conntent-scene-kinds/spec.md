# conntent-scene-kinds Delta Spec

Source decisions: D3, D4, D2 (Slices 1 and 2).

## MODIFIED Requirements

### Requirement: Series Declares Scene Kinds

The Series document (`<s>_coNNtent_NN.md`, frontmatter `scope: true`) MUST be able to declare zero or more `Scene Kind` elements, each with a unique name and these properties: `role` (free text), `narration` (`on` or `off`), `max_duration` (seconds, optional), `fixed` (`none`, `first`, `last` or `after:<kind>`, default `none`), `asset` (the media of a fixed scene as a logical name, see `conntent-library`, only valid when `fixed` is not `none`), `chrome` (list of chrome item names that apply to the kind) and `presets`. A Scene Kind MUST also accept every `render` class cascade field whose Field Definition lists `Scene Kind` set directly (for example `transition`, `frame`, `voice`, `character`, `captions`), which sit at the `kind` level above the kind's own `presets`; it MUST NOT accept a `video` or `domain` class field. Kinds MUST live only in the Series document; no sibling kinds file exists.
(Previously: a Scene Kind carried no cascade parameter other than `presets`, and `asset` was a relative file.)

#### Scenario: Kinds are read from the Series
- GIVEN a Series declaring kinds `Gancho`, `Noticia` and `Cierre`
- WHEN the model of an episode in that Series is read
- THEN the three kinds are available to every scene of the episode with their properties

#### Scenario: Kind declares direct fields
- GIVEN a Scene Kind `Noticia` declaring `transition:: wipe`, `frame:: night` and `captions:: lines`
- WHEN the Series is validated
- THEN it validates and a scene of kind `Noticia` resolves the three values with source `kind`

#### Scenario: Kind declares a video-class field
- GIVEN a Scene Kind declaring `language:: en`
- WHEN the Series is checked
- THEN it fails with `unknown-key` naming the Scene Kind and the class `video`

#### Scenario: Kind declares a character
- GIVEN a Scene Kind `Entrevista` declaring `character:: maria`
- WHEN a scene of that kind resolves `voice`
- THEN the value is Maria's voice for the episode language with source `kind:character:maria`

#### Scenario: Duplicate kind name
- GIVEN a Series declaring two Scene Kinds named `Noticia`
- WHEN the Series is checked
- THEN a `kind-duplicate` error naming the document is reported before any spend

#### Scenario: Series without kinds
- GIVEN a Series that declares no Scene Kind
- WHEN an episode scene states `kind:: Libre`
- THEN the episode validates, and any other kind name fails with `unknown-kind`

#### Scenario: Asset on a non-fixed kind
- GIVEN a Scene Kind with `fixed:: none` and an `asset`
- WHEN the Series is checked
- THEN the check fails naming the kind

#### Scenario: Fixed asset is a logical name
- GIVEN a Scene Kind `Intro` with `fixed:: first` and `asset:: media/bumpers/intro` and the file in the series `library/media/bumpers/`
- WHEN the manifest is compiled
- THEN the asset resolves to the series library file, and the plan lists the resolved path

#### Scenario: Fixed asset as a path
- GIVEN a Scene Kind with `asset:: ../library/intro.mp4`
- WHEN the Series is checked
- THEN it fails with `reference-escape` naming the kind

### Requirement: Libre Inherits No Kind Rules

A scene with `kind:: Libre` MUST inherit no kind rules (narration setting, maximum duration), no kind direct fields, no kind presets and no kind chrome, and MUST contribute no node to the cascade at the `kind` level. It MAY declare any `Layer` elements, including an `animation` Layer pointing at its own HyperFrames project. Every other cascade level still applies to a `Libre` scene.
(Previously: a kind had no direct fields.)

#### Scenario: Libre with its own animation
- GIVEN a `Libre` scene with an `animation` Layer
- WHEN the script is checked and compiled
- THEN it validates and none of the Series' kind rules or chrome is applied to it

#### Scenario: Libre has no kind node
- GIVEN a kind with `presets:: [K]` and `frame:: night`, and a `Libre` scene
- WHEN the scene's values are resolved
- THEN no value has source `kind`

#### Scenario: Libre still gets series values
- GIVEN a Series with `transition:: fade` and a `Libre` scene setting none
- WHEN its transition is resolved
- THEN the value is `fade` with source `series`

### Requirement: Series Chrome Is Declared Once And Applied Per Kind

A Series MUST be able to declare one `Chrome` element per language, each with `language` and any of `watermark`, `cta`, `bumper` and `music`. Media named by a Chrome item MUST be logical names resolved through the series `library/` as specified by `conntent-library`, never relative paths. A Scene Kind's `chrome` list names the items applied to its scenes. The engine MUST apply those items to every scene of the kind, using the `Chrome` element for the cascaded `language`, without the episode repeating them; a `music` item MUST apply as the `kind`-level value of `background_audio` (owned by `conntent-model` "Background Audio Is a Field, Not a Layer"). When a kind lists a chrome item and no `Chrome` element for the resolved language declares it, the run MUST fail before spend with `missing-chrome-language` naming the item and the language.
(Previously: Chrome media lived in `series/<s>/assets/`, and `music` had no stated precedence against `background_audio`.)

#### Scenario: Watermark follows the language
- GIVEN `Chrome` elements `es` (`watermark: generado con IA`) and `en` (`watermark: made with AI`), a kind listing `watermark`, and an episode with `language:: en`
- WHEN the manifest is compiled
- THEN every scene of that kind carries the watermark overlay with `made with AI`

#### Scenario: Chrome applies only to listing kinds
- GIVEN a `cta` chrome item listed only by kind `Cierre`
- WHEN the manifest is compiled
- THEN only `Cierre` scenes carry it

#### Scenario: Missing language variant
- GIVEN a kind listing `watermark`, a `Chrome` element for `es` only and `language:: en`
- WHEN `produce` runs
- THEN it fails with `missing-chrome-language` naming `watermark` and `en`
- AND nothing is spent

#### Scenario: Chrome music resolves through the library
- GIVEN a `Chrome` element `es` with `music:: music/theme` and `series/s/library/music/theme.mp3`
- WHEN the manifest is compiled for a scene of a kind listing `music`
- THEN the background audio is the library file with source `kind`

#### Scenario: Translation needs the translated chrome
- GIVEN an episode with `translation_of` and `language:: en`, and a kind listing `cta` with a Chrome element for `es` only
- WHEN `produce` runs
- THEN it fails with `missing-chrome-language` naming `cta` and `en` before spend
