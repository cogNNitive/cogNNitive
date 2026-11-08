# conntent-scene-kinds Specification

## Purpose
TBD - created by archiving change 2026-11-02-video-script-v1. Update Purpose after archive.
## Requirements
### Requirement: Series Declares Scene Kinds

The Series document (`<s>_series_NN.md`, frontmatter `scope: true`) MUST be able to declare zero or more `Scene Kind` elements, each with a unique name and these properties: `role` (free text), `narration` (`on` or `off`), `max_duration` (seconds, optional), `fixed` (`none`, `first`, `last` or `after:<kind>`, default `none`), `asset` (the media of a fixed scene, only valid when `fixed` is not `none`), `chrome` (list of chrome item names that apply to the kind) and `presets`. A Scene Kind carries no other cascade parameter: its effect on the cascade is its expanded `presets`. Kinds MUST live only in the Series document; no sibling kinds file exists.

#### Scenario: Kinds are read from the Series

- GIVEN a Series declaring kinds `Gancho`, `Noticia` and `Cierre`
- WHEN the model of an episode in that Series is read
- THEN the three kinds are available to every scene of the episode with their properties

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

### Requirement: Every Scene States Its Kind

Every `Scene` of a V_0-15-0 episode MUST state `kind::` with the name of a Scene Kind of its Series or the reserved name `Libre`. A scene's content MUST be its narration body plus its `Layer` elements (for example a `media` Layer with an asset or an image prompt, a `text` Layer whose `style` names a component, or an `avatar` Layer with a cached clip). An unknown kind name MUST fail the pre-compile check with `unknown-kind`, naming the scene, the name and the kinds available, before any spend.

#### Scenario: Known kind validates

- GIVEN a scene with `kind:: Noticia` in a Series that declares `Noticia`
- WHEN the script is checked
- THEN no kind error is reported

#### Scenario: Missing kind

- GIVEN a scene with no `kind::`
- WHEN the script is checked
- THEN a `missing-kind` error names the scene

#### Scenario: Unknown kind stops the run

- GIVEN a scene with `kind:: Noticias` and no such kind
- WHEN `produce` runs
- THEN it fails with `unknown-kind` listing the declared kinds
- AND nothing is spent

### Requirement: Kind Rules Are Enforced

For a non-`Libre` scene the engine MUST apply its kind's rules. `narration:: off` MUST mean no TTS request is made and a non-empty narration body is a `narration-not-allowed` error. `max_duration` MUST be compared with the estimated duration before spend and with the measured duration after TTS; an overrun MUST be reported as a warning naming the scene, the limit and the duration.

#### Scenario: Silent kind makes no TTS call

- GIVEN a kind with `narration:: off` and a scene of that kind without narration
- WHEN `produce` runs
- THEN no TTS request is made for that scene

#### Scenario: Narration on a silent kind

- GIVEN a scene of a `narration:: off` kind whose body contains text
- WHEN the script is checked
- THEN `narration-not-allowed` names the scene

#### Scenario: Overrun is reported

- GIVEN a kind with `max_duration:: 8` and a narration measured at 11 s
- WHEN the run summary is produced
- THEN a warning names the scene, 8 s and 11 s and the run is not stopped

### Requirement: Fixed Scenes Are Inserted By The Engine

A Scene Kind whose `fixed` is not `none` MUST describe a scene the engine inserts without the episode declaring it, at the placement `first`, `last`, or `after:<kind>` (after the first scene of that kind), using the kind's `asset`. The episode MUST NOT need to contain such a scene, and the inserted scene MUST appear in the manifest, the estimate and the chapters in its placed order.

#### Scenario: Bumper is inserted

- GIVEN a kind `Intro` with `fixed:: after:Gancho` and an episode with scenes `Gancho`, `Noticia`, `Cierre`
- WHEN the manifest is compiled
- THEN the scene order is `Gancho`, `Intro`, `Noticia`, `Cierre`
- AND the episode document holds no `Intro` scene

#### Scenario: First and last

- GIVEN fixed kinds with `first` and `last`
- WHEN the manifest is compiled
- THEN they are the first and the last scene

#### Scenario: Missing anchor kind

- GIVEN a fixed kind `after:Gancho` and an episode with no `Gancho` scene
- WHEN the manifest is compiled
- THEN the fixed scene is not inserted and one warning names the kind and the missing anchor

### Requirement: Series Structure Is Orientative

An episode MAY reorder, remove or repeat scenes of any kind. The engine MUST NOT require the series' kind sequence and MUST NOT reject an episode for deviating from it.

#### Scenario: Repeated and reordered scenes

- GIVEN an episode with scenes `Noticia`, `Noticia`, `Gancho`
- WHEN the script is checked
- THEN it validates and the compiled order equals the episode order, plus fixed scenes

### Requirement: Libre Inherits No Kind Rules

A scene with `kind:: Libre` MUST inherit no kind rules (narration setting, maximum duration), no kind presets and no kind chrome, and MUST contribute no node to the cascade at the `kind` level. It MAY declare any `Layer` elements, including an `animation` Layer pointing at its own HyperFrames project. Every other cascade level still applies to a `Libre` scene.

#### Scenario: Libre with its own animation

- GIVEN a `Libre` scene with an `animation` Layer
- WHEN the script is checked and compiled
- THEN it validates and none of the Series' kind rules or chrome is applied to it

#### Scenario: Libre has no kind node

- GIVEN a kind with `presets:: [K]` and a `Libre` scene
- WHEN the scene's values are resolved
- THEN no value has source `kind`

#### Scenario: Libre still gets series values

- GIVEN a Series with `transition:: fade` and a `Libre` scene setting none
- WHEN its transition is resolved
- THEN the value is `fade` with source `series`

### Requirement: Series Chrome Is Declared Once And Applied Per Kind

A Series MUST be able to declare one `Chrome` element per language, each with `language` and any of `watermark`, `cta`, `bumper` and `music`, whose media live in `series/<s>/assets/`. A Scene Kind's `chrome` list names the items applied to its scenes. The engine MUST apply those items to every scene of the kind, using the `Chrome` element for the cascaded `language`, without the episode repeating them. The applied `watermark` and `cta` MUST be visible in rendered frames during their declared interval: sampled frames inside that interval MUST show the element, not only the emitted DOM. When a kind lists a chrome item and no `Chrome` element for the resolved language declares it, the run MUST fail before spend with `missing-chrome-language` naming the item and the language.
(Previously: chrome was emitted into the manifest and DOM but was not required to be visible in rendered frames.)

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

#### Scenario: Watermark and CTA visible in rendered frames

- GIVEN a rendered scene whose kind lists `watermark` and `cta`
- WHEN a frame inside each item's interval is sampled from the render
- THEN the watermark text is visible in the sampled watermark frame
- AND the CTA is visible in the sampled CTA frame
- AND each is inside the safe area

#### Scenario: Chrome is not visible outside its interval

- GIVEN a CTA declared for the last two seconds of a scene
- WHEN a frame before that interval is sampled
- THEN the CTA is not visible

### Requirement: Language Is A Cascade Field

`language` MUST be a cascade parameter set by the Series and overridable by an episode, driving voice selection, chrome text, narration rules and the description language. The bluepriNNt MUST ship no `language` default, so an unset language MUST be a validation error naming the field before any spend.

#### Scenario: Episode overrides the series language

- GIVEN a Series with `language:: es` and an episode with `language:: en`
- WHEN `language` is resolved for a scene
- THEN the value is `en` with source `video`

#### Scenario: Unset language fails before spend

- GIVEN no level of the chain declares `language`
- WHEN `produce` runs
- THEN it fails with a named validation error naming `language`
- AND nothing is spent

### Requirement: Scene Text Layers Are Lowered To Overlays

Every `text` Layer in a scene (title, lower-third, caption, as declared in `scenes[].props.layers`) MUST be lowered into an entry of `tracks.overlays` in the manifest, carrying the Layer's declared text and style, and MUST be emitted into the root `index.html` as an overlay host with global start and duration. A text Layer MUST NOT be dropped silently: every declared text Layer MUST appear in both the manifest overlays and `index.html`. Overlay text MUST come from the Layer's declared text field, never from the Layer name.

#### Scenario: Title, lower-third and caption reach index.html

- GIVEN a scene whose `props.layers` declare a title, a lower-third and a caption
- WHEN the manifest is compiled and the project emitted
- THEN `tracks.overlays` holds three entries with the declared texts
- AND `index.html` holds an overlay host for each, with the same text

#### Scenario: Overlay timing is global

- GIVEN a text Layer in the second scene, starting 1 s into that scene
- WHEN the project is emitted
- THEN its overlay host has `data-start` equal to the scene start plus 1 s on the global timeline

#### Scenario: Text comes from the declared field

- GIVEN a text Layer named `Lower third` whose text field is `Gas pump printer`
- WHEN the overlay is lowered
- THEN the overlay text is `Gas pump printer`

#### Scenario: Scene without text layers

- GIVEN a scene whose `props.layers` hold no text Layer
- WHEN the manifest is compiled
- THEN no text overlay is added for that scene

### Requirement: Avatar Layers Are Detected From Model Fields

A Layer MUST be treated as an `avatar` Layer when its model type field marks it as `avatar`, whether that marker is on the Layer's `type` or on `fields.type`. `produce` MUST NOT rely on a separate `fields.avatar` workaround to include such a Layer in avatar synthesis.

#### Scenario: Layer typed through fields.type is detected

- GIVEN a Layer whose `fields.type` is `avatar` and which has no `fields.avatar`
- WHEN avatar layers are collected for synthesis
- THEN the Layer is included

#### Scenario: Layer typed through type is detected

- GIVEN a Layer whose top-level `type` is `avatar`
- WHEN avatar layers are collected for synthesis
- THEN the Layer is included

#### Scenario: Non-avatar Layer is excluded

- GIVEN a Layer whose type is `media`
- WHEN avatar layers are collected for synthesis
- THEN the Layer is not included

#### Scenario: Workaround removed

- GIVEN a model whose avatar Layer carries only `fields.type`
- WHEN `produce` selects the layers to synthesize
- THEN it does not read or require `fields.avatar`

### Requirement: Avatar Synthesis Resolves Series Scene Kinds

`synthesize-avatar` MUST resolve the Series Scene Kinds of the episode by passing the script directory to scene resolution, as the cost estimator does. Kind-derived values (presets, chrome, narration setting) MUST therefore be identical between the estimator and avatar synthesis for the same scene.

#### Scenario: Kind preset reaches avatar synthesis

- GIVEN a Series Scene Kind whose `presets` set an avatar-relevant cascade value and a scene of that kind
- WHEN `synthesize-avatar` resolves the scene
- THEN the value has source `kind`

#### Scenario: Estimator and synthesis agree

- GIVEN the same episode
- WHEN the estimator and `synthesize-avatar` resolve a scene
- THEN both resolve the same Scene Kind and the same kind-derived values

#### Scenario: Without script directory kinds are not resolved

- GIVEN `synthesize-avatar` invoked with a script whose Series declares kinds
- WHEN scene resolution runs
- THEN it is called with the script directory, so the declared kinds are found and no `unknown-kind` is raised for a declared kind

