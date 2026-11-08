# conntent-presets Delta Spec

Source decisions: D3, D19, C9, U7 (Slice 2: Cascade).

## MODIFIED Requirements

### Requirement: Preset Is A Parameters-Only Concept

The `coNNtent` blueprint MUST define a top-level `Preset` Concept that has no Field of its own, so that a `# NN Preset` element MAY carry only the preset parameters (the Fields whose `concept::` lists `Preset`, which are exactly the `render` class fields except `presets`) and the global `tags` Field (D2).

The preset parameters are `voice`, `voice_model`, `voice_speed`, `voice_emotion`, `avatar`, `avatar_model`, `avatar_resolution`, `intro`, `image_model`, `image_size`, `background_audio`, `background_audio_volume`, `transition`, `frame`, `fit`, `components`, `sounds`, `captions`, `caption_model`, `character`, `pose` and `background`. A Preset MUST NOT contain `Layer` elements and MUST NOT carry a `video` or `domain` class field (`language`, `budget`, `daily_budget`, `output_formats`, `review_gates`, `thumbnail_*`). `tags` characterise a Preset and MUST NOT affect any resolved value. The reserved `slug` identity key that every element carries is exempt from the `preset-field` check and is not a preset parameter; migrated Presets keep their `slug::`.
(Previously: the parameter list had no `avatar_resolution`, `captions`, `caption_model`, `character`, `pose` or `background`.)

#### Scenario: Preset with parameters only is valid
- GIVEN a `# NN Preset` element `Lucas` declaring `voice:: lucas-es`, `voice_speed:: 1.1` and `tags:: [series-lucas]`
- WHEN the script and its scope chain are checked
- THEN no preset error is reported

#### Scenario: Preset may carry the new render fields
- GIVEN a Preset declaring `captions:: words`, `avatar_resolution:: 720p` and `character:: lucas`
- WHEN the script and its scope chain are checked
- THEN no preset error is reported

#### Scenario: Non-parameter key is rejected
- GIVEN a Preset element declaring `presets:: [Other]`, `type:: avatar`, `asset:: a.png` or `title:: X`
- WHEN the script is checked
- THEN the check reports a `preset-field` error naming the Preset and the offending key
- AND `presets` inside a Preset is rejected so that Presets cannot compose or form cycles

#### Scenario: Video-class key in a Preset is rejected
- GIVEN a Preset declaring `language:: es` or `review_gates:: []`
- WHEN the script is checked
- THEN the check reports a `preset-field` error naming the Preset, the key and the class `video`

#### Scenario: Reserved slug is not a preset-field error
- GIVEN a `# NN Preset` element `Lucas` declaring `slug:: lucas` and `voice:: lucas-es`
- WHEN the script and its scope chain are checked
- THEN no `preset-field` error is reported
- AND the Preset is also found by the slug `lucas`

#### Scenario: Layers inside a Preset are not accepted
- GIVEN a Preset element that owns a nested `### NN Layer:` heading
- WHEN the script is checked
- THEN validation fails and no Layer from the Preset reaches any Scene

#### Scenario: Accepted key set matches the registry
- GIVEN the set of preset parameters the engine accepts and the Fields listing `Preset` in the generated field registry
- WHEN they are compared
- THEN the two sets are equal because the engine reads the registry

#### Scenario: Retired voice_tone in a Preset
- GIVEN a Preset declaring `voice_tone:: warm`
- WHEN the script is checked
- THEN the check fails with `retired-key` naming the Preset

### Requirement: Per-Level Additive Expansion Order

Each of the `domain`, `series`, `kind`, `video` and `scene` levels MUST contribute, from nearest to farthest within the level: its explicit fields, the node of the active Character when the level sets `character` (see `conntent-character`), and its own `presets` expanded in list order. The existing most-specific-first fold therefore yields: the last Preset of a list wins, a level's explicit fields beat its Character, a level's Character beats its own Presets, and a nearer level beats every outer level including that level's explicit fields (D4).

`presets` lists MUST be additive across levels and MUST NOT replace each other. `layer` MUST have explicit fields only, and there is no `cli` level. The `kind` level contributes its explicit fields (a Scene Kind accepts direct fields) and its expanded `presets`, and a `Libre` scene contributes no `kind` node. When several series folders supply a series level, their lists MUST be concatenated from outermost to innermost. A Preset that omits a parameter MUST NOT reset it; the value supplied by the previous Preset or outer level remains.
(Previously: the `kind` level contributed only its expanded `presets`, and no Character node existed.)

#### Scenario: Last preset wins
- GIVEN a Scene with `presets:: [A, B]` where A and B both set `voice`
- WHEN `voice` is resolved for the Scene
- THEN the value is B's

#### Scenario: Omitted parameter is inherited from the earlier preset
- GIVEN `presets:: [A, B]` where A sets `voice_speed:: 1.1` and B sets only `voice`
- WHEN `voice_speed` is resolved
- THEN the value is `1.1` supplied by A

#### Scenario: Explicit field beats its own presets
- GIVEN a Scene with `voice:: own` and `presets:: [A]` where A sets `voice:: from-a`
- WHEN `voice` is resolved
- THEN the value is `own`

#### Scenario: Character beats the same-level preset
- GIVEN a Video with `character:: lucas` and `presets:: [A]` where A sets `voice:: from-a`
- WHEN a Scene that sets neither resolves `voice`
- THEN the value is Lucas's voice with source `video:character:lucas`

#### Scenario: Scene explicit voice beats a Video preset
- GIVEN a Video with `presets:: [A]` setting `voice:: from-a` and a Scene with `voice:: own`
- WHEN the Scene's `voice` is resolved
- THEN the value is `own`

#### Scenario: Video explicit field beats a Video preset
- GIVEN a Video with `voice:: own` and `presets:: [A]` where A sets `voice:: from-a`
- WHEN the Scene's `voice` is resolved and the Scene sets neither
- THEN the value is `own`

#### Scenario: Video preset beats Series explicit
- GIVEN a Series with `voice:: series-voice` and a Video with `presets:: [A]` where A sets `voice:: from-a`
- WHEN a Scene's `voice` is resolved
- THEN the value is `from-a`

#### Scenario: Inner preset beats outer explicit
- GIVEN a Video with `voice:: video-voice` and a Scene with `presets:: [B]` where B sets `voice:: from-b`
- WHEN the Scene's `voice` is resolved
- THEN the value is `from-b`

#### Scenario: Lists are additive across levels
- GIVEN a Series with `presets:: [A]` where A sets `voice_emotion:: calm` and `voice`, and a Scene with `presets:: [B]` where B sets only `voice`
- WHEN the Scene is resolved
- THEN `voice` is B's and `voice_emotion` is `calm` from A

#### Scenario: Series folders concatenate outer to inner
- GIVEN outer folder `presets:: [A]` and inner folder `presets:: [B]`, both setting `frame`
- WHEN `frame` is resolved
- THEN the value is B's

#### Scenario: Outer folder explicit field beats inner folder preset
- GIVEN the outer folder sets `frame:: plain` explicitly and the inner folder's Preset sets `frame:: night`
- WHEN `frame` is resolved at the series level
- THEN the value is `plain`

#### Scenario: Layer explicit beats Scene preset
- GIVEN a Scene with `presets:: [A]` where A sets `avatar_model:: m-a` and an `avatar` Layer with `avatar_model:: m-layer`
- WHEN the Layer's `avatar_model` is resolved
- THEN the value is `m-layer`

#### Scenario: Keyed lists merge per key through presets
- GIVEN a Preset setting `sounds:: [scene-boundary=click]` and the blueprint setting `sounds:: [scene-boundary=whoosh, video-start=chime]`
- WHEN `scene-boundary` and `video-start` are resolved
- THEN they return `click` (preset) and `chime` (blueprint)

#### Scenario: Kind explicit field and preset
- GIVEN a Series with `voice:: series-voice`, a Scene Kind with `voice:: kind-voice` and `presets:: [K]` where K sets `voice:: from-k`, and a Video with `presets:: [A]` where A sets `voice:: from-a`
- WHEN a scene of that kind resolves `voice`
- THEN the value is `from-a`; without the Video preset it is `kind-voice` with source `kind`; without the kind's explicit field it is `from-k`

#### Scenario: Libre scene skips kind presets and fields
- GIVEN a Scene Kind with `presets:: [K]` where K sets `transition:: wipe` and with `frame:: night`, and a `Libre` scene
- WHEN the scene resolves `transition` and `frame`
- THEN no value has a source starting with `kind`

## ADDED Requirements

### Requirement: Presets Beside A Character Warn

Validation MUST emit the warning `preset-sets-character-field` for a Preset that sets `voice`, `avatar`, `avatar_model`, `avatar_resolution`, `pose` or `background` when the Series (or a Scene Kind or Scene using the Preset) has an active Character, naming the Preset, the field and the Character; and MUST emit `character-override` (see `conntent-character` "Overriding A Character Value Warns") when a preset or an explicit field actually wins over a value the Character supplies. Neither warning MUST stop a run. The guidance "when characters are in use, presets do not set `voice` or `avatar`" MUST be recorded in the Series procedure and in SKILL.md.

#### Scenario: Preset sets the host voice
- GIVEN a Series with `character:: lucas` and `presets:: [Studio]` where `Studio` sets `voice`
- WHEN the script is validated
- THEN the warning `preset-sets-character-field` names `Studio`, `voice` and `lucas`
- AND the run is not stopped

#### Scenario: Preset without character-supplied fields
- GIVEN a Series with `character:: lucas` and `presets:: [Warm]` where `Warm` sets only `transition` and `frame`
- WHEN the script is validated
- THEN no warning is reported

#### Scenario: Preset used where no character is active
- GIVEN a Preset setting `voice` and no active Character
- WHEN the script is validated
- THEN no `preset-sets-character-field` warning is reported

#### Scenario: Kind preset wins over the series character
- GIVEN the Series `character:: lucas` and a Scene Kind `Presenter` with `presets:: [P]` where `P` sets `voice`
- WHEN the script is validated
- THEN both `preset-sets-character-field` (for `P`) and `character-override` (for the kind) are reported
