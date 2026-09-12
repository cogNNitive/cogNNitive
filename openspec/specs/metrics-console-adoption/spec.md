# metrics-console-adoption Specification

## Purpose

Pilots the Metrics template onto the shared `innfo-console-feedback-loop` console runtime: a gated thinned timeline console artifact declaring only `needs[]` plus `innfo-schema`/`innfo-model` slot payloads, a series-as-data slot contract (no executable slot JS), a shared `charts` console capability registered in `needs-registry.json`, the artifact-only Projections → Timeline rename, and a Create Timeline procedure in which Apply Feedback replaces Version-And-Archive.

## Requirements

### Requirement: Activation Gate Before Thinning

Thinning MUST NOT begin until the `innfo-console-feedback-loop` runtime is deployed (Pages + jsDelivr), its `file://` smoke test passes, AND the `charts` capability is registered in `console/needs-registry.json`. Until both the runtime pins and `charts` are verified, the inline metrics layout asset SHALL remain canonical and untouched.

#### Scenario: Gate blocks early thinning

- GIVEN the runtime is not deployed, its smoke test fails, or `charts` is not registered
- WHEN Metrics console generation is requested
- THEN no `*_console.html` is produced and the inline metrics layout asset stays canonical

#### Scenario: Gate opens after runtime and charts verification

- GIVEN the runtime is live, the `file://` smoke test passes, and `charts` is registered
- WHEN the procedure runs
- THEN console generation proceeds

### Requirement: Thinned Console Artifact Shape

Generated `*_console.html` MUST declare only `needs[]` plus `innfo-schema`/`innfo-model` slot payloads and MUST NOT inline runtime code. The Metrics pilot `needs[]` SHALL declare `charts` plus the minimal set (`concept-rail`, `fulltext-search`, `matrix-grids`, `hash-routing`, `reference-popup`), adding `feedback-export` only when the export UI is required. The artifact keeps the stable name `{Model}_V_{version}_console.html`; its layout asset is now `timeline.html` (layout id `timeline-layout`). `MODEL_DATA.template.json` meta (model, model_version, source_model, generated_at, months, historyMonths, charts, slug, title, startMonth/startYear) MUST map into `innfo-model`.

#### Scenario: Slots-only render via file://

- GIVEN a thinned timeline console with populated slots
- WHEN opened via `file://` double-click
- THEN the runtime hydrates sheet and charts with zero inline runtime

#### Scenario: Inline runtime rejected

- GIVEN a console containing a duplicated runtime block
- WHEN the harness scans it
- THEN verification fails naming the offending block

### Requirement: Series-as-Data Slot Contract

The procedure MUST pre-compute SERIES into pure-JSON `innfo-model`; the runtime MUST render FROM that pure data only and SHALL NOT execute slot JS (no eval, no serialized formulas). Preserved: FORMULAS/DEPS/SERIES slot info, the meta contract above, domain-free engine, `is_variable`/`is_formula`/`is_derived` markers, and fixed/compound/additive growth.

#### Scenario: Pure-data series snapshot

- GIVEN a model with compound and additive rows
- WHEN the snapshot step extracts `innfo-model`
- THEN month values are present as data with no executable JS

#### Scenario: Executable slot payload rejected

- GIVEN a slot payload containing executable JS or `eval`
- WHEN validated
- THEN validation fails

### Requirement: Shared Console Charts Capability

The console runtime (`iNNfo/specs/templates/console/`) MUST gain a charts renderer that reads pure-data series from `innfo-model.series{chartId: number[]}` and renders uPlot charts. `needs-registry.json` MUST register the `charts` capability so any template console can declare it in `needs[]`. The renderer MUST NOT execute slot JavaScript.

#### Scenario: Charts from a declarative need

- GIVEN a future business-template console declaring `"charts"` in `needs[]` with pins resolved via needs-registry
- WHEN the console opens via `file://`
- THEN uPlot charts render for every chartId with no template-specific code

#### Scenario: Missing series degrades gracefully

- GIVEN a console declaring `charts` but a chartId with no matching series array
- WHEN boot completes
- THEN the sheet still renders and the chart is skipped with a console warning

### Requirement: Code-as-Slot Resolution Record

The procedure MUST record the adopted decision (series-as-data) and the rejected alternative (executable-logic slot: breaks the two-slot contract, needs `eval`, harms `file://` safety), and MUST contain no `eval`-based slot path.

#### Scenario: Resolution is traceable

- GIVEN a reviewer reading the updated procedure
- WHEN checking the slot design rationale
- THEN the adopted and rejected options are stated with reasons

### Requirement: Console Generation Procedure

`create_timeline_NN.md` MUST generate the console artifact and replace Version-And-Archive with Apply Feedback: staleness check, diff preview, `apply_change`, `validate_model`, patch bump, stable-name console regeneration.

#### Scenario: Feedback replaces archive step

- GIVEN a verified console and pending feedback
- WHEN the procedure completes
- THEN Apply Feedback runs and Version-And-Archive does not

#### Scenario: Stale feedback blocked

- GIVEN feedback pinned to an older `source_model_version`
- WHEN Apply Feedback runs
- THEN it blocks with a staleness report until the reviewer confirms

### Requirement: Timeline Rename (artifact only)

The Metrics console layout asset, its procedure, and its layout id SHALL be renamed from "Projections" to "Timeline": `assets/projections.html` → `assets/timeline.html` (displayed name "Timeline"), layout id `projections-layout` → `timeline-layout`, and `procedures/create_projections_NN.md` → `procedures/create_timeline_NN.md`. The rename is artifact-only: the DATA field `scenarioType` (`historical`/`projection`) SHALL remain unchanged, and the metrics template (`spec_NN.md`) references SHALL point to the renamed paths.

#### Scenario: Model remains valid after the rename

- GIVEN an existing metrics model carrying `scenarioType` values `historical` and `projection`
- WHEN the console artifact is renamed Projections → Timeline
- THEN the model still validates with the data vocabulary untouched

#### Scenario: Console generated as timeline

- GIVEN an open activation gate
- WHEN the Create Timeline procedure runs
- THEN the console is generated from `timeline.html` (`timeline-layout`) under the stable name `{Model}_V_{version}_console.html`

### Requirement: Harness and Sample Verification

`verify.harness.js` MUST validate slot payloads, `charts` capability presence (declared in `needs[]` AND registered in needs-registry), series payload shape (pure-data arrays per declared chartId), and the timeline-named artifact (`timeline.html`, `timeline-layout`), with zero pageerrors and a `file://` render. The Ghostbusters sample MUST be regenerated as a timeline console.

#### Scenario: Harness passes on sample console

- GIVEN the thinned timeline Ghostbusters console declaring `charts`
- WHEN the harness runs
- THEN it reports zero pageerrors, valid slots, resolved charts capability, and pure-data series

#### Scenario: Malformed slot payload fails fast

- GIVEN an `innfo-model` missing a required meta key
- WHEN the harness runs
- THEN it fails naming the missing key