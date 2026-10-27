# Delta for cognnitive-video-engine

Scope: component, sound and frame resolution, sound events, authored-animation mounting and
duration exposure, regeneration guard, package-defaults lookup; b-roll zoom-in, the guard
`defaults` block and the `elevenlabs`/`edge-tts` providers are removed. The engine names no
concrete component, sound, frame, default value or series-language value.

## ADDED Requirements

### Requirement: Names Are Parameters, Files Are Found By Walk

Which component mounts for a slot, which sound plays for an event and which frame applies MUST
be a cascade value (a name; see video-script-model "Universal Parameter Cascade"). The engine
MUST locate the file for a name as `components/<name>.html`, `sounds/<name>.*` or
`frames/<name>.md` by one nearest-folder walk from the script's folder up to the domain root
(episode, then series, then domain), then the skill's `components/` or `frames/` fallback. There
MUST be no other frame discovery (no nearest `frame.md`). A sound name whose file is not found
MUST be silent and MUST emit one warning naming it; an event with no resolved name MUST be
silent without warning. A frame name with no file at any level MUST fail with a named error.

#### Scenario: Nearest component file wins

- GIVEN the `quote` slot resolves to `quote` and `components/quote.html` exists in the episode and series folders
- WHEN the project is emitted
- THEN the mounted component is the episode file

#### Scenario: Frame resolved by name

- GIVEN the series sets `frame:: brand` and `frames/brand.md` exists only at the domain root
- WHEN the project is emitted
- THEN overlays receive the tokens of the domain `frames/brand.md`
- AND a `frame.md` in the series folder is ignored

#### Scenario: Dry run names the resolved frame

- GIVEN a script whose frame resolves to `frames/brand.md` from the series level
- WHEN `compile --dry-run` runs
- THEN it prints the frame name, its path and source `series`

#### Scenario: Blueprint default sound with a series file

- GIVEN the blueprint Video Defaults declares `scene-boundary=whoosh` and the series folder holds `sounds/whoosh.mp3`
- WHEN a scene boundary occurs
- THEN that file plays and engine code contains no `whoosh` literal

#### Scenario: Missing sound file warns and is silent

- GIVEN `scene-boundary` resolves to `whoosh` and no `sounds/whoosh.*` exists at any level
- WHEN the project is emitted
- THEN no sound is emitted, one warning names `whoosh`, and rendering succeeds

### Requirement: Slot Contract

The engine MUST pass the resolved frame's `font` and `accent` tokens and the overlay's
`text`/`src`/`position`/`enter`/`exit` (plus `fit` for `b-roll`) as variable values. A resolved
component that does not declare every variable of its slot's fallback MUST fail emission with
`SlotContractError` naming the slot and the missing variables.

#### Scenario: Frame tokens reach the component

- GIVEN the resolved frame document declares a body font and a primary color
- WHEN an overlay is mounted
- THEN the component receives them as the `font` and `accent` variable values

### Requirement: Blueprint Defaults Are Read From The Package

The engine MUST read the `blueprint` cascade level from the installed bluepriNNt package's
`defaults/video-defaults_NN.md`, located from the skill's own folder for the repository,
global and workspace install layouts. When no package is found the engine MUST fail with a
named error listing every path tried. It MUST NOT write any Video Defaults document.

#### Scenario: Package not found

- GIVEN a skill copy with no `video-script` package at any known location
- WHEN `compile` runs
- THEN it fails before any spend with an error listing the paths tried

### Requirement: Sound Effects Bound To Engine Events

The engine MUST support exactly these sound keys, each timed from the manifest: `video-start`
(frame 0), `video-end` (ends at the video's end), `scene-boundary` (start of every scene after
the first), `overlay-enter.<slot>` and `overlay-exit.<slot>` for `title`, `lower-third`,
`caption`, `quote`, `watermark` (overlay start and end), and `layer-enter.<type>` for `b-roll`,
`animation`, `presenter` (layer start). Sounds MUST be root audio without a `data-duration`. No
caption or word event MUST exist.

#### Scenario: Per-slot key

- GIVEN the series sets `sounds:: [overlay-enter.title=click]`
- WHEN a `title` overlay enters and a `lower-third` overlay enters
- THEN `click` plays for the title only

#### Scenario: First scene has no boundary sound

- GIVEN a three-scene video with `scene-boundary` resolved
- WHEN the project is emitted
- THEN exactly two boundary sounds are emitted

### Requirement: Animation Layer Mounts As A Sub-Composition

For a Layer with `type:: animation`, the engine MUST copy the authored HyperFrames project at
`asset::` into `authored/<slug>/` and mount it as a sub-composition that plays its own audio at
its authored level, with no playback-rate retime and no ducking. The scene duration MUST be
`max(narration, animation)`; a shorter animation MUST hold its last frame. An unresolvable
`asset::` MUST fail loudly with a named, non-zero error.

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

### Requirement: Scene Target Duration Is Exposed

An animation's intended length is its scene's length. `compile --dry-run` MUST print each
scene's target duration and whether it is `estimated` (no narration audio yet) or `measured`;
the compiled manifest MUST keep each scene's duration. When a mounted animation's duration
differs from its scene's narration duration by more than one frame, the engine MUST warn naming
the scene and both durations.

#### Scenario: Dry run lists target durations

- GIVEN a script whose narration is not yet synthesized
- WHEN `compile --dry-run` runs
- THEN every scene is listed with a duration marked `estimated`

#### Scenario: Mismatch warns

- GIVEN narration of 6 s and an animation of 4 s
- WHEN the project is emitted
- THEN a warning names the scene, 4 s and 6 s, and emission succeeds

### Requirement: Regeneration Guard

When writing the emitted project, the engine MUST record a content hash of every file it
writes. On regeneration it MUST compare each existing file's hash with the recorded one; if any
differ, it MUST refuse, write nothing, and list every edited file. A recorded file that no
longer exists MUST be regenerated. There MUST be no `--force` option. Files with no recorded
hash MUST be written normally.

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

The `b-roll` overlay MUST render by mounting the resolved `b-roll` slot component, which MUST
honor the cascaded `fit` (`cover`|`contain`); with `contain` the fallback MUST present the asset
whole, uncropped, inside a margin. The engine MUST NOT add motion; any motion is the series
component's choice.
(Previously: a HyperFrames media-clip block that MUST apply a subtle zoom-in, disabled with `zoomIn:false`. The zoom-in was Remotion-era legacy (50633fac) and was never implemented after the HyperFrames migration.)

#### Scenario: Contained b-roll

- GIVEN a b-roll overlay with `fit: contain` using the fallback component
- WHEN it renders
- THEN the whole asset is visible with a margin and a rounded/shadowed card
- AND it does not move

### Requirement: Watermark overlay rendering

The engine MUST render a `watermark` overlay as a small persistent text notice with a
configurable position, by mounting the resolved `watermark` slot component, scaled so it stays
inside the safe area at any output size.
(Previously: rendered using a HyperFrames block.)

#### Scenario: Watermark drawn over the scene

- GIVEN a manifest with a `watermark` overlay
- WHEN the scene renders
- THEN the text notice is drawn for the overlay's duration at the configured position
- AND it stays inside the action-safe area

### Requirement: Stable TTS cache key

The TTS cache key MUST depend only on the narration text and the cascaded `voice` and
`tts_model`, and MUST be unchanged by the Field rename from `model` to `tts_model` for an equal
value. Changing a presenter Layer's `avatar_model::` MUST NOT change the TTS cache key.
(Previously: the fields were `model::`; voice/model fallbacks were private to `tts-options.mjs`, with an `elevenlabs` fallback.)

#### Scenario: Avatar model change does not re-bill TTS

- GIVEN a Scene compiled once (TTS cached)
- WHEN the presenter's `avatar_model::` changes and the Scene is recompiled
- THEN the TTS step is a cache hit (zero spend) for an unchanged narration

#### Scenario: Template field rename does not re-bill TTS

- GIVEN a Scene cached with a Template declaring `model:: minimax/speech-2.8-hd`
- WHEN the Template is migrated to `tts_model:: minimax/speech-2.8-hd` and the Scene is recompiled
- THEN the TTS step is a cache hit

### Requirement: Only Implemented Providers Exist

The engine MUST name only providers it has a request path for (WaveSpeed and Replicate) plus
the offline `local`/`mock` modes. `elevenlabs`, `edge-tts` and `ELEVENLABS_API_KEY` MUST NOT
appear in the skill's scripts, tests or docs.

#### Scenario: No phantom provider

- GIVEN the skill tree
- WHEN it is searched for `elevenlabs`, `edge-tts` or `ELEVENLABS_API_KEY` (case-insensitive)
- THEN nothing is found

### Requirement: Spend Guard Is Gate-Only

The spend guard (`video-guard.json` + `SpendGuard`) MUST gate spend: it decides whether a resolved
model is allowed and whether the run fits the budget and daily cap. It MUST NOT select a model id
and MUST NOT supply any cascade level.
(Previously: an optional `defaults` block MAY supply the `workspace` scope, with scenario "Workspace default participates in the cascade"; never implemented. Migration: move such values to the domain-root `video-defaults_NN.md`.)

#### Scenario: Blocked resolved model is refused before spend

- GIVEN a resolved model whose id is not in `allowedModels`
- WHEN `compile` runs
- THEN the whole run is refused before the first charge with a named error

#### Scenario: Guard never selects

- GIVEN the guard module
- WHEN it is inspected
- THEN it returns only allow/deny and budget verdicts, never a model id

### Requirement: Manifest to HyperFrames Project Emission

The renderer MUST lower the Composition Manifest into a HyperFrames project deterministically:
emitting the same manifest twice MUST produce byte-identical files. The project MUST contain a
root `index.html` that mounts exactly one scene host per Scene (with `data-start` and
`data-duration` derived from frames/fps), one Sub-composition per Scene under `compositions/`,
and a `hyperframes.json`. Overlay and animation hosts MUST be root elements with global times.
Narration, music and sound-effect audio MUST be root `<audio>` elements with global times and
unique ids. The only exception is the audio of an authored `animation` sub-composition, which
plays from its own mount. The root `data-duration` MUST equal the manifest's
`totalDurationInSeconds`.
(Previously: all audio was root-level, with no sound effects, overlay hosts or authored-animation exception.)

#### Scenario: Deterministic emission

- GIVEN a manifest
- WHEN the project is emitted twice
- THEN the emitted trees are byte-identical

#### Scenario: Audio lives at the root

- GIVEN a manifest with per-scene narration, looping music and resolved sound effects
- WHEN the project is emitted
- THEN every such `<audio>` element is a root element with a global `data-start` and a unique `id`
- AND no Sub-composition nests audible media with a non-zero start, except an authored animation's own audio

#### Scenario: Project validates

- GIVEN an emitted project
- WHEN `hyperframes check --json` runs
- THEN it reports zero errors
