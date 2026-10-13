# metrics-console-adoption Specification

## Purpose

The `metrics` bluepriNNt ships its Timeline console as a **registered console view**
(`assets/console-view-timeline.js`, `registerView`). The shared runtime mounts it
inside the domaiNN console; the view derives the timeline grid from the shared
payload's metrics elements. The old single-model stack — a standalone
`*_console.html` artifact, an `innfo-model` `meta`+`rows`+`series` snapshot, a
`verify.harness.js` gate, and a `Create Timeline` generation procedure — is
**retired**. Console generation is the domain exporter's job; views are its
specialization.
## Requirements
### Requirement: Registered Timeline View

The `metrics` bluepriNNt MUST ship its Timeline console as a registered view: a
classic script at `assets/console-view-timeline.js` that calls `registerView` and
derives its grid from `ctx.payload`. It MUST NOT depend on a standalone console
artifact, an `innfo-model` `rows`/`series` snapshot, or a verify harness. The view
MUST work in the whole-domaiNN console, in a model-scoped console and as a
view-scoped console (`--view timeline`), reading only the models present in the
scoped payload.
(Previously: the scenario covered `--view timeline` or the domaiNN export only.)

#### Scenario: View discovered and inlined

- GIVEN a domaiNN whose models parent to the `metrics` blueprint
- WHEN `export-console.mjs --view timeline` (or the domaiNN export) runs
- THEN the exporter discovers `assets/console-view-timeline.js` and inlines it into the console

#### Scenario: View over a scoped payload

- GIVEN a console scoped to one `metrics` model
- WHEN the `timeline` tab mounts
- THEN its grid is derived from that model's elements only

#### Scenario: No standalone artifact remains

- GIVEN the retired single-model stack
- WHEN inspecting the `metrics` blueprint package
- THEN it carries only its `spec_NN.md`, the `timeline` view asset, and its model sample

### Requirement: Shared Charts Capability

The console runtime (`iNNfo/specs/bluepriNNts/console/`) MUST expose the charts
renderer that reads pure-data series and renders uPlot charts, and
`needs-registry.json` MUST register the `charts` capability. The renderer MUST
NOT execute slot JavaScript.

#### Scenario: Charts from the shared runtime

- GIVEN a console view that renders charts
- WHEN the console opens via `file://`
- THEN uPlot charts render through the shared runtime, with no per-blueprint chart library

#### Scenario: Missing series degrades gracefully

- GIVEN a console view rendering a chart with no matching data
- WHEN boot completes
- THEN the rest of the console still renders and the chart is skipped

