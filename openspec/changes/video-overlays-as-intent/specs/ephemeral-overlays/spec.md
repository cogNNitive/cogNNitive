# Delta for ephemeral-overlays

Scope: overlays stay modelled as `Layer` intent; rendering moves to HyperFrames blocks with a
series/scene escape. Scheduling is unchanged.

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Overlays Render Through HyperFrames Blocks

Overlay rendering MUST be delegated to HyperFrames. For each overlay `type::` the renderer MUST
instantiate a HyperFrames **registry block** by default, parameterized with the overlay's text or
asset as variables, inside the owning Scene's `<!-- nn-overlay-host -->`. The engine MUST NOT ship
its own overlay HTML as the default path. The emitted overlay MUST be lint-clean
(`hyperframes check` with no errors).

#### Scenario: Default block per overlay type

- GIVEN a Scene with a `lower-third` and a `b-roll` Layer
- WHEN the project is emitted
- THEN each overlay is rendered by its default HyperFrames registry block
- AND the project passes `hyperframes check` with no errors

### Requirement: Series And Scene Block Escape

A Series or a scene MUST be able to override the default block for an overlay `type::`. Resolution
precedence MUST be `sceneBlock > seriesFrame > registry default`. An override that names a block
which does not resolve MUST fail loudly with a named error before render.

#### Scenario: A series frame overrides a default block

- GIVEN a series frame declaring a custom block for `lower-third`
- WHEN an overlay of `type:: lower-third` is emitted
- THEN the series block is used instead of the registry default

#### Scenario: A scene override wins

- GIVEN both a series frame and a scene block for the same `type::`
- WHEN the overlay is emitted
- THEN the scene block wins

#### Scenario: An unknown override fails loudly

- GIVEN a series frame referencing a block id that does not resolve
- WHEN the project is emitted
- THEN the system fails with a named, non-zero error before render
