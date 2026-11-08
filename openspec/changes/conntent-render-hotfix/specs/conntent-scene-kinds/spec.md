# conntent-scene-kinds Delta Spec

## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

None.
