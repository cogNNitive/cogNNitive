# Delta for ephemeral-overlays

Scope: an overlay renders by mounting the slot component named by the cascade. The
registry-block default and the `seriesFrame`/`sceneBlock` escape are removed (clean break).
Scheduling is unchanged.

## ADDED Requirements

### Requirement: Overlays Render By Mounting A Slot Component

Each overlay MUST render by mounting, as a root-level host with global times, the component
whose name the cascade resolves for its slot (`title`, `lower-third`, `caption`, `quote`,
`watermark`, `b-roll`; key of the `components` parameter), passing the overlay's
`text`/`src`/`position`/`enter`/`exit` and the `font`/`accent` tokens of the cascaded `frame` as
variable values.
The engine MUST NOT emit overlay markup or overlay CSS of its own. The emitted project MUST pass
`hyperframes check` with no errors.

#### Scenario: Overlay mounts its slot component

- GIVEN a Scene with a `lower-third` Layer declaring text and position, and no `components` override
- WHEN the project is emitted
- THEN a root host mounts `components/lower-third.html` with those values as variable values
- AND the project passes `hyperframes check` with no errors

#### Scenario: Series picks another component name

- GIVEN the series sets `components:: [lower-third=pill]` and holds `components/pill.html`
- WHEN a `lower-third` overlay is emitted
- THEN `pill.html` is mounted for it

#### Scenario: Declared animations reach the component

- GIVEN an overlay Layer declaring `enter_animation` and `exit_animation`
- WHEN the project is emitted
- THEN the mounted component receives them as the `enter` and `exit` variable values

#### Scenario: Component lacks a required variable

- GIVEN a resolved component that does not accept a variable its slot declares
- WHEN the project is emitted
- THEN emission fails with `SlotContractError` naming the slot and the missing variable

## REMOVED Requirements

### Requirement: Overlays Render Through HyperFrames Blocks

(Reason: the registry-block default was inert and hardcoded the overlay look; replaced by "Overlays Render By Mounting A Slot Component".)
(Migration: none; the neutral fallback components shipped by the skill are the new default.)

### Requirement: Series And Scene Block Escape

(Reason: `sceneBlock`/`seriesFrame` were never wired; override now happens through the `components` cascade parameter plus `components/<name>.html` files.)
(Migration: place the component in the series or episode folder; see `series-script-templates`.)
