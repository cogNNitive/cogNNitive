# Delta for metrics-console-adoption

The Metrics timeline stops being a standalone shell generated from `timeline.html`. It becomes the registered `timeline` view (`metrics/assets/console-view-timeline.js`, see `console-view-registry`), delivered as a tab of `domaiNN_console.html` or standalone via `export-console.mjs --view timeline`. Requirements not listed here (Series-as-Data Slot Contract, Shared Console Charts Capability, Code-as-Slot Resolution Record) are unchanged.

## MODIFIED Requirements

### Requirement: Activation Gate Before Thinning

Thinning MUST NOT begin until the `innfo-console-feedback-loop` runtime is deployed (Pages + jsDelivr), its `file://` smoke test passes, AND the `charts` capability is registered in `console/needs-registry.json`. Until both the runtime pins and `charts` are verified, the `timeline` view MUST NOT be offered in a Metrics export.
(Previously: until both were verified, "the inline metrics layout asset SHALL remain canonical and untouched". That asset, `timeline.html`, is deleted.)

#### Scenario: Gate blocks early thinning

- GIVEN the runtime is not deployed, its smoke test fails, or `charts` is not registered
- WHEN Metrics console generation is requested
- THEN no console containing the `timeline` view is produced

#### Scenario: Gate opens after runtime and charts verification

- GIVEN the runtime is live, the `file://` smoke test passes, and `charts` is registered
- WHEN the procedure runs
- THEN console generation proceeds

### Requirement: Thinned Console Artifact Shape

A Metrics console MUST declare only `needs[]` plus `innfo-schema`/`innfo-model` slot payloads and MUST NOT carry hand-authored inline runtime code. The runtime bundle MUST appear exactly once, inlined by `export-console.mjs`. The timeline layout MUST be the registered view `timeline` (no `timeline.html` shell and no `timeline-layout` layout id). The Metrics pilot `needs[]` SHALL declare `charts` plus the minimal set (`concept-rail`, `fulltext-search`, `matrix-grids`, `hash-routing`, `reference-popup`), adding `feedback-export` only when the export UI is required. The artifact is `domaiNN_console.html` (fixed name, overwritten on export) or, standalone, `artifacts/timeline_view/timeline_view_<stamp>.html`; the `{Model}_V_{version}_console.html` name no longer applies. `MODEL_DATA.template.json` meta (model, model_version, source_model, generated_at, months, historyMonths, charts, slug, title, startMonth/startYear) MUST map into `innfo-model`.
(Previously: the artifact kept the stable name `{Model}_V_{version}_console.html` and its layout asset was `timeline.html` (layout id `timeline-layout`); the artifact "MUST NOT inline runtime code".)

#### Scenario: Slots-only render via file://

- GIVEN a thinned timeline console with populated slots
- WHEN opened via `file://` double-click
- THEN the runtime hydrates sheet and charts with zero hand-authored inline runtime and a single inlined bundle

#### Scenario: Inline runtime rejected

- GIVEN a console containing a duplicated runtime block or a second bundle copy
- WHEN the harness scans it
- THEN verification fails naming the offending block

#### Scenario: Timeline is a view, not a shell

- GIVEN the Metrics bluepriNNt assets
- WHEN listed
- THEN `assets/console-view-timeline.js` exists and `assets/timeline.html` does not

### Requirement: Console Generation Procedure

`create_timeline_procedures_NN.md` MUST generate the timeline console by running `export-console.mjs --view timeline` (or the domain export, where `timeline` is a tab) and replace Version-And-Archive with Apply Feedback: staleness check, diff preview, `apply_change`, `validate_model`, patch bump, console regeneration. It MUST NOT reference `timeline.html` or generate a console from a layout shell.
(Previously: `create_timeline_NN.md` generated the console artifact from the layout asset and regenerated it under the stable name.)

#### Scenario: Feedback replaces archive step

- GIVEN a verified console and pending feedback
- WHEN the procedure completes
- THEN Apply Feedback runs and Version-And-Archive does not

#### Scenario: Stale feedback blocked

- GIVEN feedback pinned to an older `source_model_version`
- WHEN Apply Feedback runs
- THEN it blocks with a staleness report until the reviewer confirms

#### Scenario: Procedure generates through the exporter

- GIVEN the Create Timeline procedure document
- WHEN its generation step is read
- THEN it invokes `export-console.mjs --view timeline` and names no `timeline.html`

### Requirement: Timeline Rename (artifact only)

The Metrics console MUST be named "Timeline" throughout: the view id is `timeline`, its title is "Timeline" and its procedure is `procedures/create_timeline_procedures_NN.md`. The former layout asset `assets/timeline.html` and layout id `timeline-layout` (renamed earlier from `projections.html` and `projections-layout`) are retired; the view replaces them. The rename is artifact-only: the DATA field `scenarioType` (`historical`/`projection`) SHALL remain unchanged, and the metrics template (`spec_NN.md`) references SHALL point to the `timeline` view and `--view timeline`, never to a layout asset.
(Previously: `assets/projections.html` → `assets/timeline.html`, layout id `projections-layout` → `timeline-layout`, and `procedures/create_projections_NN.md` → `procedures/create_timeline_NN.md`, with `spec_NN.md` pointing at the renamed paths.)

#### Scenario: Model remains valid after the rename

- GIVEN an existing metrics model carrying `scenarioType` values `historical` and `projection`
- WHEN the console is delivered as the `timeline` view
- THEN the model still validates with the data vocabulary untouched

#### Scenario: Console generated as timeline view

- GIVEN an open activation gate
- WHEN the Create Timeline procedure runs
- THEN the console contains the `timeline` view, either as a tab of `domaiNN_console.html` or standalone via `--view timeline`

#### Scenario: Metrics template points at the view

- GIVEN `metrics/spec_NN.md`
- WHEN scanned for console asset references
- THEN none names `timeline.html` or `timeline-layout`
- AND `template_version` is bumped for the change

### Requirement: Harness and Sample Verification

`verify.harness.js` MUST validate slot payloads, `charts` capability presence (declared in `needs[]` AND registered in needs-registry), series payload shape (pure-data arrays per declared chartId), and the `timeline` view artifact produced by `export-console.mjs --view timeline`, with zero pageerrors and a `file://` render. It MUST NOT depend on `timeline.html` or `timeline-layout`. The Ghostbusters sample MUST be regenerated so that it carries the `timeline` view.
(Previously: the harness validated the timeline-named artifact (`timeline.html`, `timeline-layout`) and the sample was regenerated as a timeline console.)

#### Scenario: Harness passes on sample console

- GIVEN the Ghostbusters console exported with `--view timeline` and declaring `charts`
- WHEN the harness runs
- THEN it reports zero pageerrors, valid slots, resolved charts capability, and pure-data series

#### Scenario: Harness has no shell dependency

- GIVEN the harness source
- WHEN scanned
- THEN it references neither `timeline.html` nor `timeline-layout`
