# Delta for ephemeral-overlays

## ADDED Requirements

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
