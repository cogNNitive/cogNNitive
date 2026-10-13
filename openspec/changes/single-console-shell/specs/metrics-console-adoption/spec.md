# Delta for metrics-console-adoption

## MODIFIED Requirements

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
