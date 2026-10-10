# ephemeral-overlays Specification

## Purpose

Ephemeral overlays (quote, lower-third, b-roll) are modeled as native `Layer` elements discriminated by the `type::` values defined in the `video-script` blueprint. Overlay content is declared through Layer Fields, and the scene compiler schedules overlays sequentially without temporal collision, ordering them by list order and applying configurable `enter_animation`/`exit_animation`.

## Requirements

### Requirement: Overlays Are Layer `type::` Kinds

Ephemeral overlays MUST be modeled as `Layer` elements discriminated by the `type::` values `quote`, `lower-third`, and `b-roll`, as defined in the `video-script` blueprint. Overlay text and asset content MUST be declared through the Layer's own Fields, not through inline syntax.

#### Scenario: An overlay is declared as a Layer kind

- GIVEN a Scene that needs a quote overlay
- WHEN it is authored
- THEN it contains a `Layer` with `type::` `quote` carrying its text Field
- AND no inline overlay syntax is used

#### Scenario: Overlay kinds compile into overlay tracks

- GIVEN Scenes declaring `quote`, `lower-third`, and `b-roll` Layers
- WHEN the engine compiles them
- THEN each becomes its corresponding overlay track in the manifest

### Requirement: Sequential Collision-Free Overlay Scheduling

The scene compiler MUST schedule `quote`, `lower-third`, and `b-roll` Layer overlays sequentially without temporal collision, ordering them by list order, and MUST apply configurable `enter_animation` and `exit_animation` per overlay.
(Previously: overlays came from `>` blockquotes lowered by the VUS parser.)

#### Scenario: Sequential overlays do not overlap

- GIVEN multiple overlay Layers declared in one Scene
- WHEN the scene is compiled
- THEN their timelines are scheduled sequentially with no overlap

#### Scenario: Configured animations reach the overlay track

- GIVEN an overlay Layer declaring enter and exit animations
- WHEN the overlay track is emitted
- THEN it carries the configured `enter_animation` and `exit_animation`
