# Delta for cognnitive-video-engine

Scope: slot and sound resolution, authored-animation mounting, regeneration guard. The engine
names no concrete sound and no series-language value.

## ADDED Requirements

### Requirement: Slot Component Resolution

The engine MUST resolve each overlay slot's component from `components/<slot>.html` using the
episode, then series, then skill-fallback order, by the same nearest-folder walk used for frame
tokens. It MUST pass `font` and `accent` frame tokens to the component as variable values. A
resolved component that violates its slot contract MUST fail emission naming the slot.

#### Scenario: Nearest component wins

- GIVEN `components/quote.html` in the episode and series folders
- WHEN the project is emitted
- THEN the mounted component is the episode file

#### Scenario: Frame tokens reach the component

- GIVEN a `frame.md` declaring `font` and `accent`
- WHEN an overlay is mounted
- THEN the component receives both as variable values

### Requirement: Sound Effects Bound To Engine Events

The engine MUST play a sound for exactly two events, `scene-boundary` and `overlay-enter`, taken
from `sounds/<event>.*` via the nearest-folder walk (episode, then series). For `overlay-enter`
it MUST try `sounds/overlay-enter.<slot>.*` first, then `sounds/overlay-enter.*`. When nothing
resolves, the event MUST be silent and MUST NOT error. Engine code MUST NOT name any concrete
sound file.

#### Scenario: Per-slot sound wins

- GIVEN `sounds/overlay-enter.title.*` and `sounds/overlay-enter.*` in the series folder
- WHEN a `title` overlay enters
- THEN the per-slot file is played

#### Scenario: Generic sound used when no per-slot file

- GIVEN only `sounds/overlay-enter.*` and a `lower-third` overlay
- WHEN the overlay enters
- THEN the generic file is played

#### Scenario: Silent fallback

- GIVEN no `sounds/` folder at any level
- WHEN a scene boundary and an overlay entry occur
- THEN no sound is emitted and rendering succeeds

### Requirement: Animation Layer Mounts As A Sub-Composition

For a Layer with `type:: animation`, the engine MUST copy the authored HyperFrames project at
`asset::` into `authored/<slug>/` of the emitted project and mount it as a sub-composition that
plays its own audio at its authored level, with no playback-rate retime and no ducking. The
scene duration MUST be `max(narration, animation)`; an animation shorter than the scene MUST
hold its last frame. An unresolvable `asset::` MUST fail loudly with a named, non-zero error.

#### Scenario: Animation is mounted with its own audio

- GIVEN a Scene with an `animation` Layer whose project has an audio track
- WHEN the project is emitted
- THEN the project is copied to `authored/<slug>/` and mounted as a sub-composition
- AND the layer is not muted and carries no playback-rate attribute

#### Scenario: Animation longer than narration extends the scene

- GIVEN narration of 4 s and an animation of 6 s
- WHEN the scene duration is computed
- THEN the scene lasts 6 s

#### Scenario: Shorter animation holds its last frame

- GIVEN narration of 6 s and an animation of 4 s
- WHEN the scene renders
- THEN the scene lasts 6 s and the animation shows its last frame from 4 s to 6 s

#### Scenario: Missing animation project fails loudly

- GIVEN an `animation` Layer whose `asset::` does not exist
- WHEN the project is emitted
- THEN the system fails with a named non-zero error

### Requirement: Regeneration Guard

When writing the emitted project, the engine MUST record a content hash of every file it
writes. On regeneration it MUST compare each existing file's hash with the recorded one; if any
differ, it MUST refuse, write nothing, and list every edited file. A recorded file that no
longer exists MUST be regenerated, meaning the user accepts regeneration. There MUST be no
`--force` option. Files with no recorded hash MUST be written normally.

#### Scenario: Edited file blocks regeneration

- GIVEN a previously emitted project in which the user edited one generated file
- WHEN the project is regenerated
- THEN the engine refuses with a named non-zero error listing that file
- AND no file is overwritten

#### Scenario: Deleting the file accepts regeneration

- GIVEN an edited generated file that the user then deletes
- WHEN the project is regenerated
- THEN the file is regenerated and the run succeeds

#### Scenario: Untouched project regenerates

- GIVEN an emitted project with no hand edits
- WHEN it is regenerated
- THEN every file is rewritten and the run succeeds

#### Scenario: No force flag

- GIVEN the emit CLI
- WHEN `--force` is passed
- THEN it is not recognised as a way to bypass the guard

## MODIFIED Requirements

### Requirement: B-roll overlay rendering

The `b-roll` slot component MUST honor a per-Layer `fit` (`cover`|`contain`); with `contain` the
fallback MUST present the asset whole, uncropped, inside a margin, and MUST apply a subtle
zoom-in over its duration (disable with `zoomIn:false`).
(Previously: rendered by a HyperFrames media-clip block rather than the resolved slot component.)

#### Scenario: Contained b-roll with motion

- GIVEN a b-roll overlay with `fit: contain` using the fallback component
- WHEN it renders
- THEN the whole asset is visible with a margin and a rounded/shadowed card
- AND it zooms in gently across its duration

### Requirement: Watermark overlay rendering

The engine MUST render a `watermark` overlay as a small persistent text notice with a
configurable position, by mounting the `watermark` slot component, scaled so it stays inside the
safe area at any output size.
(Previously: rendered using a HyperFrames block.)

#### Scenario: Watermark drawn over the scene

- GIVEN a manifest with a `watermark` overlay
- WHEN the scene renders
- THEN the text notice is drawn for the overlay's duration at the configured position
- AND it stays inside the action-safe area

### Requirement: Manifest to HyperFrames Project Emission

The renderer MUST lower the Composition Manifest into a HyperFrames project deterministically:
emitting the same manifest twice MUST produce byte-identical files. The project MUST contain a
root `index.html` that mounts exactly one scene host per Scene (with `data-start` and
`data-duration` derived from frames/fps), one Sub-composition per Scene under `compositions/`,
and a `hyperframes.json`. Narration, music and sound-effect audio MUST be placed as root
`<audio>` elements with global times and unique ids (nested media with a non-zero start basis
inside a Sub-composition has ambiguous timing). The only exception is the audio of an authored
`animation` sub-composition, which plays from its own mount. The root `data-duration` MUST equal
the manifest's `totalDurationInSeconds`.
(Previously: all audio was root-level, with no sound effects and no authored-animation exception.)

#### Scenario: Deterministic emission

- GIVEN a manifest
- WHEN the project is emitted twice
- THEN the emitted trees are byte-identical

#### Scenario: Audio lives at the root

- GIVEN a manifest with per-scene narration, looping music and resolved sound effects
- WHEN the project is emitted
- THEN every such `<audio>` element is a root element with a global `data-start`/`data-duration` and a unique `id`
- AND no Sub-composition nests audible media with a non-zero start, except an authored animation's own audio

#### Scenario: Project validates

- GIVEN an emitted project
- WHEN `hyperframes check --json` runs
- THEN it reports zero errors
