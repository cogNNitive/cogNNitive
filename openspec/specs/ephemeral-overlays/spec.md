# ephemeral-overlays Specification

## Purpose

Ephemeral overlays (quote, lower-third, b-roll) are modeled as native `Layer` elements discriminated by the `type::` values defined in the `video-script` blueprint. Overlay content is declared through Layer Fields, and the scene compiler schedules overlays sequentially without temporal collision, ordering them by list order and applying configurable `enter_animation`/`exit_animation`.
## Requirements
### Requirement: Overlays Are Layer `type::` Kinds

Ephemeral overlays MUST be modeled as `Layer` elements discriminated by the `type::` values
`quote`, `lower-third`, and `b-roll`, as defined in the `video-script` blueprint. Overlay text
and asset content MUST be declared through the Layer's own Fields, not through inline syntax.
Overlays MUST be modelled as **intent**: the Layer declares the overlay's semantic content
(text/asset, type, position, animations), and the renderer paints it from a HyperFrames block.
The blueprint MUST NOT encode the overlay's visual treatment.
(Previously: overlays were modelled and implicitly rendered by the engine's own React components.)

#### Scenario: An overlay is declared as a Layer kind

- GIVEN a Scene that needs a quote overlay
- WHEN it is authored
- THEN it contains a `Layer` with `type::` `quote` carrying its text Field
- AND no inline overlay syntax is used

#### Scenario: Overlay intent compiles into an overlay track

- GIVEN Scenes declaring `quote`, `lower-third`, and `b-roll` Layers
- WHEN the engine compiles them
- THEN each becomes its corresponding overlay track in the manifest
- AND the visual treatment is resolved by the renderer, not the model

### Requirement: Sequential Collision-Free Overlay Scheduling

The scene compiler MUST schedule `quote`, `lower-third`, and `b-roll` Layer overlays sequentially
without temporal collision, ordering them by list order, and MUST apply configurable
`enter_animation` and `exit_animation` per overlay. Scheduling MUST be independent of the block
that renders the overlay.

#### Scenario: Sequential overlays do not overlap

- GIVEN multiple overlay Layers declared in one Scene
- WHEN the scene is compiled
- THEN their timelines are scheduled sequentially with no overlap

#### Scenario: Configured animations reach the overlay track

- GIVEN an overlay Layer declaring enter and exit animations
- WHEN the overlay track is emitted
- THEN it carries the configured `enter_animation` and `exit_animation`

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

#### Scenario: Overlay host reflects configured position class

- GIVEN an overlay Layer declaring a `position` value
- WHEN the project is emitted
- THEN the overlay host carries the class `nn-pos-<position>` (sanitized to alphanumeric and dashes)
- AND slot fallback components honor position classes via CSS

### Requirement: Overlay Hosts Declare Their Timeline

An overlay host MUST carry `data-no-timeline` when its resolved component is static — the
component's root declares `data-no-timeline`. HyperFrames otherwise waits its sub-composition
timeline-readiness timeout (45s) on every render for a component that never registers a timeline.
A host whose component registers a timeline MUST NOT carry it, so the wait still applies.

#### Scenario: Static overlay host skips the readiness wait

- GIVEN an overlay whose resolved component declares `data-no-timeline` on its root
- WHEN the project is emitted
- THEN the overlay host carries `data-no-timeline`

#### Scenario: Animated component host keeps the wait

- GIVEN an overlay whose resolved component does not declare `data-no-timeline`
- WHEN the project is emitted
- THEN the overlay host does not carry `data-no-timeline`

