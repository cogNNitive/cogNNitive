# Delta for conntent-blueprint

Issue #612 left two gaps in the coNNtent Layer contract: an `animation` Layer could not receive data (a local rig could not follow viseme cues), and a presenter picture-in-picture shown on every scene of a kind had to be declared scene by scene. This change gives an `animation` Layer validated data inputs, lets it mount a library component instead of an authored project, and lets a Scene Kind or a Preset contribute Layers to the scenes that use it. coNNtent moves to `blueprint_version` `V_0-30-0`.

## ADDED Requirements

### Requirement: An animation Layer carries validated data inputs

An `animation` Layer MAY declare `inputs:: [name=value, ...]`, and the engine MUST reject `inputs` on any other Layer type before anything is spent.
Each input name MUST be a variable that the mounted project or component declares in the `data-composition-variables` of its root `index.html`, and a declared variable without a `default` MUST be given.
A `number` input MUST be numeric, a `boolean` input MUST be `true` or `false`, and an `enum` input MUST be one of its declared option values.
A value written `file:<path>` MUST be replaced by the text of that file, read relative to the episode document, and a missing file MUST fail.
The checked inputs MUST reach the staged project as the mount host's `data-variable-values`.
An authored project mounted without `inputs` MUST keep its previous behavior: it is not checked against its variables and its host carries no `data-variable-values`.

#### Scenario: Inputs reach the mounted project
- GIVEN an `animation` Layer with `inputs:: [cues=0.0 A, gain=2]` whose project declares `cues` as a string and `gain` as a number
- WHEN the episode is compiled
- THEN the mount host carries `data-variable-values` with `cues` as the string `0.0 A` and `gain` as the number `2`

#### Scenario: An undeclared input fails before spend
- GIVEN an `animation` Layer with an input its project does not declare
- WHEN the episode is compiled
- THEN the compile fails naming the input and the declared variables, and nothing is synthesized

#### Scenario: Inputs on another Layer type are rejected
- GIVEN a `media` Layer that declares `inputs::`
- WHEN the pre-compile guard runs
- THEN it reports `inputs-not-animation` for that Layer

### Requirement: A changed input reopens only its scene

The lowered `animation` Layer MUST carry its inputs, so they are part of that scene's review subject and changing an input MUST change that scene's review hash and no other scene's hash.
A Layer without `inputs` MUST NOT carry an inputs property, so its review hash is the one it had before inputs existed.

#### Scenario: Editing one input reopens one scene
- GIVEN two scenes whose `animation` Layers were approved at the `script` gate
- WHEN one Layer's input value changes
- THEN only that scene's review hash changes and only that scene returns to review

### Requirement: An animation Layer can mount a library component

An `animation` Layer MAY write `asset:: component:<name>` to mount the HyperFrames component `components/<name>`, resolved by the library walk (episode, series, domain, skill) before anything is spent, and a missing component MUST fail naming every folder searched.
A component mounted this way MUST always be checked against its declared variables, so its required inputs must be given and its declared defaults fill the inputs left unset.

#### Scenario: A component from the domain library
- GIVEN a domain library folder `library/components/rig/` whose root declares a required `cues` variable
- WHEN an `animation` Layer declares `asset:: component:rig` and `inputs:: [cues=0.0 A]`
- THEN the engine mounts that folder and passes `cues` with every declared default

### Requirement: A Scene Kind or a Preset contributes Layers

A Layer nested under a Scene Kind or under a Preset MUST be contributed to every scene that uses that kind or that Preset, and a scene uses a Preset when any level of its cascade lists it.
The contributions MUST resolve in Universal Parameter Cascade order, `scene > scene presets > video > video presets > kind > kind presets > series > series presets > domain > domain presets`, where a nearer contribution replaces an outer one with the same Layer slug.
A Layer the scene declares itself MUST replace an inherited Layer with the same slug whole, with no inherited field leaking into it.
The scene's Layers MUST be the inherited ones it does not override, outermost contribution first, followed by its own in document order.
An inherited Layer MUST be validated by the pre-compile guard like a scene Layer, and a Layer nested under a Preset MUST NOT be assigned to a scene by its document position.
A fixed Scene Kind's `asset::` MUST remain the one media Layer of the scene the engine inserts.

#### Scenario: A kind Layer reaches every scene of the kind
- GIVEN a Scene Kind `Talk` with a nested `### NN Layer: PiP`
- WHEN an episode has two `Talk` scenes and one `Libre` scene
- THEN both `Talk` scenes render the `PiP` Layer and the `Libre` scene does not

#### Scenario: A scene Layer overrides an inherited one
- GIVEN a Scene Kind `Talk` with a nested Layer of slug `pip` and a `Talk` scene that declares its own Layer of slug `pip`
- WHEN the episode is lowered
- THEN the scene has one `pip` Layer, the scene's own, with none of the inherited fields

#### Scenario: An invalid inherited Layer fails before spend
- GIVEN a Scene Kind whose nested `media` Layer has no `asset::` and no `prompt::`
- WHEN the pre-compile guard runs on an episode with a scene of that kind
- THEN it reports `missing-conditional-field` for that Layer
