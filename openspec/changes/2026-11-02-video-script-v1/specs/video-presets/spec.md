# Delta for video-presets

Change `2026-11-02-video-script-v1`. Decision D3: a kind says what a scene IS, a Preset says how it looks or sounds; a kind carries default presets.

## MODIFIED Requirements

### Requirement: Preset Is A Parameters-Only Concept

The `coNNtent` blueprint MUST define a top-level `Preset` Concept that has no Field of its own, so that a `# NN Preset` element MAY carry only the preset parameters (the Fields whose `concept::` lists `Preset`) and the global `tags` Field (D2).

The preset parameters are `voice`, `voice_model`, `voice_speed`, `voice_emotion`, `avatar`, `avatar_model`, `intro`, `image_model`, `image_size`, `background_audio`, `background_audio_volume`, `transition`, `frame`, `fit`, `components` and `sounds`. A Preset MUST NOT contain `Layer` elements. `tags` characterise a Preset and MUST NOT affect any resolved value. The reserved `slug` identity key that every element carries is exempt from the `preset-field` check and is not a preset parameter; migrated Presets keep their `slug::`.
(Previously: the list of preset parameters included `voice_tone` and had no `image_size`.)

#### Scenario: Preset with parameters only is valid

- GIVEN a `# NN Preset` element `Lucas` declaring `voice:: lucas-es`, `voice_speed:: 1.1` and `tags:: [series-lucas]`
- WHEN the script and its scope chain are checked
- THEN no preset error is reported

#### Scenario: Non-parameter key is rejected

- GIVEN a Preset element declaring `presets:: [Other]`, `type:: avatar`, `asset:: a.png` or `title:: X`
- WHEN the script is checked
- THEN the check reports a `preset-field` error naming the Preset and the offending key
- AND `presets` inside a Preset is rejected so that Presets cannot compose or form cycles

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

### Requirement: The `presets` Field And Its Syntax

The blueprint MUST define an optional `presets` Field of `type:: select` with `multiple:: true` and no declared options on `Video`, `Scene`, `Scene Kind`, `Series` and `Video Defaults`, written as a bracketed list of bare Preset names such as `presets:: [Lucas, Studio Warm]` (D1).

`presets` MUST NOT be defined on `Layer`, on `Preset` or in the blueprint package defaults. A single bare name (`presets:: Lucas`) MUST be accepted. The reader MUST accept both an array and a raw string and return an ordered list of names. A token containing `[[`, `]]` or `::` MUST be a `preset-syntax` error whose hint gives the canonical form. A name listed twice in one `presets` list MUST be an error.
(Previously: `Scene Kind` was not a level that could list `presets`.)

#### Scenario: Bracketed list keeps order

- GIVEN a Scene with `presets:: [Lucas, Studio Warm]`
- WHEN the list is parsed
- THEN the result is `["Lucas", "Studio Warm"]` in that order

#### Scenario: Single bare name

- GIVEN a Scene with `presets:: Lucas`
- WHEN the list is parsed
- THEN the result is `["Lucas"]`

#### Scenario: Wiki-link form is rejected

- GIVEN a Scene with `presets:: [[Lucas]]` or `presets:: [[Doc :: Lucas]]`
- WHEN the script is checked
- THEN a `preset-syntax` error is reported whose hint shows `presets:: [Lucas]`

#### Scenario: Both reader shapes agree

- GIVEN the same `presets` value delivered once as a JSON array and once as a raw string
- WHEN each is parsed
- THEN both yield the same ordered list

#### Scenario: Layer cannot carry presets

- GIVEN a Layer declaring `presets:: [Lucas]`
- WHEN the script is validated against the blueprint
- THEN validation fails because the Field is not defined for `Layer`

#### Scenario: Repeated name in one list

- GIVEN a Scene with `presets:: [Lucas, Lucas]`
- WHEN the script is checked
- THEN an error naming `Lucas` is reported before any spend

#### Scenario: Scene Kind lists presets

- GIVEN a Scene Kind `Noticia` declaring `presets:: [Studio Warm]`
- WHEN the Series is validated
- THEN it validates with no schema errors

### Requirement: Per-Level Additive Expansion Order

Each of the `domain`, `series`, `kind`, `video` and `scene` levels MUST expand its own `presets` in list order directly beneath that level's explicit fields, so that the existing most-specific-first fold yields: the last Preset of a list wins, a level's explicit fields beat its own Presets, and a nearer level beats every outer level including that level's explicit fields (D4).

`presets` lists MUST be additive across levels and MUST NOT replace each other. `layer` MUST have explicit fields only, and there is no `cli` level. The `kind` level contributes only its expanded `presets` (a Scene Kind has no explicit parameter fields), and a `Libre` scene contributes no `kind` node. When several series folders supply a series level, their lists MUST be concatenated from outermost to innermost. A Preset that omits a parameter MUST NOT reset it; the value supplied by the previous Preset or outer level remains.
(Previously: there was no `kind` level between `series` and `video`, and `layer` and `cli` had explicit fields only.)

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

#### Scenario: Kind preset sits between series and video

- GIVEN a Series with `voice:: series-voice`, a Scene Kind with `presets:: [K]` where K sets `voice:: from-k`, and a Video with `presets:: [A]` where A sets `voice:: from-a`
- WHEN a scene of that kind resolves `voice`
- THEN the value is `from-a`, and without the Video preset it is `from-k`

#### Scenario: Libre scene skips kind presets

- GIVEN a Scene Kind with `presets:: [K]` where K sets `transition:: wipe`, and a `Libre` scene
- WHEN the scene resolves `transition`
- THEN no value has source `kind:preset:K`

## REMOVED Requirements

### Requirement: Console Draft Tool Offers One Preset Selector

(Reason: the standalone draft console is deleted; the selector moves into the Episode review view.)
(Migration: see video-console-views "Episode Review View", which keeps one ordered selector writing an ordered `presets` list.)
