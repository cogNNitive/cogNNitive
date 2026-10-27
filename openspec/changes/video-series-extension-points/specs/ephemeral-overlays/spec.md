# Delta for ephemeral-overlays

Scope: an overlay renders by mounting the resolved slot component. The registry-block default and
the `seriesFrame`/`sceneBlock` escape are removed (clean break). Scheduling is unchanged.

## ADDED Requirements

### Requirement: Overlays Render By Mounting A Slot Component

Each overlay MUST render by mounting the component resolved for its slot (`title`, `lower-third`,
`caption`, `quote`, `watermark`, `b-roll`) inside the owning Scene's `<!-- nn-overlay-host -->`,
passing the overlay's `text`/`src`/`position`/`enter`/`exit` and the frame tokens `font`/`accent`
as variable values. The engine MUST NOT emit overlay markup or overlay CSS of its own. The emitted
project MUST pass `hyperframes check` with no errors.

#### Scenario: Overlay mounts its slot component

- GIVEN a Scene with a `lower-third` Layer declaring text and position
- WHEN the project is emitted
- THEN the overlay host mounts `components/lower-third.html` with those values as variable values
- AND the project passes `hyperframes check` with no errors

#### Scenario: Declared animations reach the component

- GIVEN an overlay Layer declaring `enter_animation` and `exit_animation`
- WHEN the project is emitted
- THEN the mounted component receives them as the `enter` and `exit` variable values

#### Scenario: Component lacks a required variable

- GIVEN a resolved component that does not accept a variable its slot declares
- WHEN the project is emitted
- THEN emission fails with a named non-zero error that names the slot and the missing variable

## REMOVED Requirements

### Requirement: Overlays Render Through HyperFrames Blocks

(Reason: the registry-block default was inert and hardcoded the overlay look; replaced by "Overlays Render By Mounting A Slot Component".)
(Migration: none; the neutral fallback components shipped by the skill are the new default.)

### Requirement: Series And Scene Block Escape

(Reason: `sceneBlock`/`seriesFrame` were never wired; override now happens by file convention `components/<slot>.html` at episode or series level.)
(Migration: place the component in the series or episode folder; see `series-script-templates`.)
