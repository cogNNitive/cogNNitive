# video-presets Specification

## Purpose

Defines the `Preset` concept of the `video-script` bluepriNNt: a named bundle of cascade parameters that replaces the retired `Template` concept. Covers what a Preset may carry, the `presets` field and its syntax, where Presets are defined and found, how they expand into the parameter cascade, how the supplying Preset is reported, and which errors stop a run before any spend. Design decisions are referenced as D1 to D8 in `design.md` of change `2026-11-01-video-presets`.

## Requirements

### Requirement: Preset Is A Parameters-Only Concept

The `video-script` blueprint MUST define a top-level `Preset` Concept that has no Field of its own, so that a `# NN Preset` element MAY carry only the preset parameters (the Fields whose `concept::` lists `Preset`) and the global `tags` Field (D2).

The preset parameters are `voice`, `voice_model`, `voice_speed`, `voice_emotion`, `voice_tone`, `avatar`, `avatar_model`, `intro`, `image_model`, `background_audio`, `background_audio_volume`, `transition`, `frame`, `fit`, `components` and `sounds`. A Preset MUST NOT contain `Layer` elements. `tags` characterise a Preset and MUST NOT affect any resolved value. The reserved `slug` identity key that every element carries is exempt from the `preset-field` check and is not a preset parameter; migrated Presets keep their `slug::`.

#### Scenario: Preset with parameters only is valid

- GIVEN a `# NN Preset` element `Lucas` declaring `voice:: lucas-es`, `voice_speed:: 1.1` and `tags:: [presenter]`
- WHEN the script and its scope chain are checked
- THEN no preset error is reported

#### Scenario: Non-parameter key is rejected

- GIVEN a Preset element declaring `presets:: [Other]`, `type:: presenter`, `asset:: a.png` or `title:: X`
- WHEN the script is checked
- THEN the check reports a `preset-field` error naming the Preset and the offending key
- AND `presets` inside a Preset is rejected so that Presets cannot compose or form cycles

#### Scenario: Reserved slug is not a preset-field error - GIVEN a `# NN Preset` element `Lucas` declaring `slug:: lucas` and `voice:: lucas-es`
- WHEN the script and its scope chain are checked
- THEN no `preset-field` error is reported
- AND the Preset is also found by the slug `lucas`

#### Scenario: Layers inside a Preset are not accepted

- GIVEN a Preset element that owns a nested `### NN Layer:` heading
- WHEN the script is checked
- THEN validation fails and no Layer from the Preset reaches any Scene

#### Scenario: Accepted key set matches the blueprint

- GIVEN the set of preset parameters the engine accepts and the Fields listing `Preset` in the blueprint `spec_NN.md`
- WHEN the drift test compares them
- THEN the two sets are equal

### Requirement: The `presets` Field And Its Syntax

The blueprint MUST define an optional `presets` Field of `type:: select` with `multiple:: true` and no declared options on `Video`, `Scene`, `Series` and `Video Defaults`, written as a bracketed list of bare Preset names such as `presets:: [Lucas, Studio Warm]` (D1).

`presets` MUST NOT be defined on `Layer`, on `Preset` or in the blueprint package defaults. A single bare name (`presets:: Lucas`) MUST be accepted. The reader MUST accept both an array and a raw string and return an ordered list of names. A token containing `[[`, `]]` or `::` MUST be a `preset-syntax` error whose hint gives the canonical form. A name listed twice in one `presets` list MUST be an error.

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

### Requirement: Preset Definition Locations And Lookup Order

Presets MUST be definable in the script, in Series scope documents and in the domain `video-defaults_NN.md`, and every `presets` reference, whatever level it appears on, MUST be resolved by one lookup order: the script, then the Series chain from innermost to outermost folder scope document, then the domain `video-defaults_NN.md`; the first match MUST win (D3).

Names match case-insensitively by name or by slug. A deeper definition MUST shadow an outer definition of the same name, including for references written at an outer level. In a Series scope document the `# NN Preset` section MUST follow the Series section; a Preset section that is the first concept section MUST be a `preset-section-order` error. Two Presets with the same name or slug in one document MUST be a `preset-duplicate` error. When the series level is supplied by the legacy `series_NN.md` fallback, Presets defined in that document MUST also be found.

#### Scenario: Script definition shadows series definition

- GIVEN `Lucas` defined in the Video document and in the Series document
- WHEN a Scene with `presets:: [Lucas]` is resolved
- THEN the Video document's `Lucas` supplies the values

#### Scenario: Shadow applies to an outer-level reference

- GIVEN the Series document sets `presets:: [Lucas]` and the Video document redefines `Lucas`
- WHEN a Scene of that Video is resolved
- THEN the series-level reference uses the Video-local `Lucas`

#### Scenario: Innermost series folder wins

- GIVEN `Lucas` defined in an outer and in an inner series folder scope document
- WHEN the reference is looked up
- THEN the inner folder's definition is used

#### Scenario: Series beats domain

- GIVEN `Lucas` defined in a Series document and in the domain `video-defaults_NN.md`
- WHEN the reference is looked up
- THEN the Series definition is used

#### Scenario: Domain Preset is found regardless of section order

- GIVEN a domain `video-defaults_NN.md` with a `# NN Preset` section placed before or after the Video Defaults section
- WHEN a reference to one of its Presets is looked up
- THEN the Preset is found and the domain parameters are still read

#### Scenario: Case-insensitive match

- GIVEN a Preset named `Studio Warm` and a reference `presets:: [studio warm]`
- WHEN the reference is looked up
- THEN it resolves to `Studio Warm`

#### Scenario: Preset section placed first is rejected

- GIVEN a Series scope document whose first concept section is `Preset`
- WHEN the chain is loaded
- THEN a `preset-section-order` error is reported naming the document

#### Scenario: Duplicate definition

- GIVEN two Presets named `Lucas` in one document
- WHEN the document is loaded
- THEN a `preset-duplicate` error is reported naming the document

### Requirement: The Blueprint Package Ships No Presets

The `video-script` package `defaults/video-defaults_NN.md` MUST NOT contain a `Preset` element or a `presets` Field, so that the blueprint floor never needs preset expansion (D3).

#### Scenario: Package defaults are preset-free

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is inspected
- THEN it contains no `# NN Preset` section and no `presets` key

### Requirement: Per-Level Additive Expansion Order

Each of the `domain`, `series`, `video` and `scene` levels MUST expand its own `presets` in list order directly beneath that level's explicit fields, so that the existing most-specific-first fold yields: the last Preset of a list wins, a level's explicit fields beat its own Presets, and a nearer level beats every outer level including that level's explicit fields (D4).

`presets` lists MUST be additive across levels and MUST NOT replace each other. `layer` and `cli` MUST have explicit fields only. When several series folders supply a series level, their lists MUST be concatenated from outermost to innermost. A Preset that omits a parameter MUST NOT reset it; the value supplied by the previous Preset or outer level remains.

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

- GIVEN the outer folder sets `frame:: brand` explicitly and the inner folder's Preset sets `frame:: night`
- WHEN `frame` is resolved at the series level
- THEN the value is `brand`

#### Scenario: Layer explicit beats Scene preset

- GIVEN a Scene with `presets:: [A]` where A sets `avatar_model:: m-a` and a presenter Layer with `avatar_model:: m-layer`
- WHEN the Layer's `avatar_model` is resolved
- THEN the value is `m-layer`

#### Scenario: Keyed lists merge per key through presets

- GIVEN a Preset setting `sounds:: [scene-boundary=click]` and the blueprint setting `sounds:: [scene-boundary=whoosh, video-start=chime]`
- WHEN `scene-boundary` and `video-start` are resolved
- THEN they return `click` (preset) and `chime` (blueprint)

### Requirement: Explain Names The Supplying Preset

When a resolved value is supplied by a Preset, the resolution trace MUST name the Preset as the winning source with a scope of the form `<level>:preset:<Name>` and MUST name the document that defines it.

#### Scenario: Series preset supplies the value

- GIVEN a Series with `presets:: [Lucas]` where `Lucas` sets `voice` and nothing nearer sets it
- WHEN `voice` is explained for a Scene
- THEN the winner scope is `series:preset:Lucas`
- AND the supplier document is the one defining `Lucas`

#### Scenario: Explicit field is named by its level

- GIVEN a Scene with an explicit `voice` and `presets:: [Lucas]`
- WHEN `voice` is explained
- THEN the winner scope is `scene`
- AND the trace lists `scene:preset:Lucas` as overridden

### Requirement: Invalid Preset References Fail Before Spend

The pre-compile check MUST report `unknown-preset`, `preset-syntax`, `preset-field`, `preset-duplicate` and `preset-section-order` as errors aggregated with the other script errors, and a run with any of them MUST fail before any synthesis, charge or render (D1, D7).

An `unknown-preset` error MUST name the Preset, the level that referenced it and every document searched. An unknown name MUST NOT be downgraded to a warning.

#### Scenario: Unknown preset stops the run

- GIVEN a Scene with `presets:: [Nobody]` and no Preset of that name in the script, Series chain or domain
- WHEN `compile` runs
- THEN it fails with `unknown-preset` naming `Nobody`, level `scene` and the documents searched
- AND no synthesis or render starts and nothing is spent

#### Scenario: Several errors are aggregated

- GIVEN a script with one unknown preset and one `preset-syntax` error
- WHEN the pre-compile check runs
- THEN both errors are reported in one failure

#### Scenario: Valid references pass

- GIVEN every referenced Preset exists in the lookup order
- WHEN the pre-compile check runs
- THEN no preset error is reported

### Requirement: Console Draft Tool Offers One Preset Selector

The review console of the draft authoring tools MUST offer a single preset selector listing the names of the Presets visible from the script's lookup order, with no preset kinds such as character, environment or look, and MUST write the author's choice as an ordered `presets` list.

#### Scenario: One selector lists visible presets

- GIVEN a script whose chain defines `Lucas` in the Series and `Studio Warm` in the domain
- WHEN the console is built
- THEN one selector offers `Lucas` and `Studio Warm`
- AND no per-kind selector exists

#### Scenario: Choice is exported as a list

- GIVEN the author selects `Lucas` then `Studio Warm`
- WHEN the reviewed JSON is exported
- THEN it carries `presets` with `["Lucas", "Studio Warm"]` in that order

### Requirement: Template Concept Is Retired

The blueprint MUST NOT define a `Template` Concept or a `template` Field, and the word `Template` MUST NOT name this mechanism anywhere in the blueprint, skill or dev tooling, because it collides with the deprecated bluepriNNt alias.

#### Scenario: Template element is not valid

- GIVEN a script containing a `# NN Template` section or a `template::` field
- WHEN it is validated against the blueprint
- THEN validation fails because the Concept or Field is not defined

#### Scenario: Shipped files carry no Template concept

- GIVEN the blueprint `spec_NN.md`, the package defaults, the skill and the dev tooling
- WHEN they are searched for the retired concept and its `template::` field
- THEN none is found outside `openspec/changes/archive/`

### Requirement: Preset Resolution Needs No nn-core Change

Preset loading and expansion MUST be implemented in the video skill only: nn-core resolution and loading sources MUST be unchanged, and the generated nn-core mirror MUST NOT be rebuilt for this change (D4).

#### Scenario: nn-core is untouched

- GIVEN the change's file set
- WHEN it is compared with the nn-core source tree
- THEN no nn-core source file is modified

#### Scenario: Engine resolution is authoritative

- GIVEN a value supplied by a Preset
- WHEN it is resolved by the engine and explained
- THEN the engine reports the Preset as supplier
- AND a preset-blind `resolve_effective` call is a documented limitation, not an error
