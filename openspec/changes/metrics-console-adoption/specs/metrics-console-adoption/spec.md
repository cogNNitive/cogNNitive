# Delta for metrics-console-adoption

## ADDED Requirements

### Requirement: Activation Gate Before Thinning

Thinning MUST NOT begin until the `innfo-console-feedback-loop` runtime is deployed (Pages + jsDelivr) and its `file://` smoke test passes. Until then the inline `projections.html` SHALL remain canonical and untouched.

#### Scenario: Gate blocks early thinning

- GIVEN the console runtime is not deployed or its smoke test fails
- WHEN Metrics console generation is requested
- THEN no `*_console.html` is produced and inline `projections.html` stays canonical

#### Scenario: Gate opens after runtime verification

- GIVEN the runtime is live and the `file://` smoke test passes
- WHEN the procedure runs
- THEN console generation proceeds

### Requirement: Thinned Console Artifact Shape

Generated `*_console.html` MUST declare only `needs[]` plus `innfo-schema`/`innfo-model` slot payloads and MUST NOT inline runtime code. The Metrics pilot `needs[]` SHALL be minimal (charts, plus `feedback-export` only when export UI is required). `MODEL_DATA.template.json` meta (model, model_version, source_model, generated_at, months, historyMonths, charts, slug, title, startMonth/startYear) MUST map into `innfo-model`.

#### Scenario: Slots-only render via file://

- GIVEN a thinned console with populated slots
- WHEN opened via `file://` double-click
- THEN the runtime hydrates sheet and charts with zero inline runtime

#### Scenario: Inline runtime rejected

- GIVEN a console containing a duplicated runtime block
- WHEN the harness scans it
- THEN verification fails naming the offending block

### Requirement: Series-as-Data Slot Contract

The procedure MUST pre-compute SERIES into pure-JSON `innfo-model`; the runtime MUST only render. Preserved: FORMULAS/DEPS/SERIES slot info, the meta contract above, domain-free engine, `is_variable`/`is_formula`/`is_derived` markers, and fixed/compound/additive growth.

#### Scenario: Pure-data series snapshot

- GIVEN a model with compound and additive rows
- WHEN the snapshot step extracts `innfo-model`
- THEN month values are present as data with no executable JS

#### Scenario: Executable slot payload rejected

- GIVEN a slot payload containing executable JS or `eval`
- WHEN validated
- THEN validation fails

### Requirement: Code-as-Slot Resolution Record

The procedure MUST record the adopted decision (series-as-data) and the rejected alternative (executable-logic slot: breaks the two-slot contract, needs `eval`, harms `file://` safety), and MUST contain no `eval`-based slot path.

#### Scenario: Resolution is traceable

- GIVEN a reviewer reading the updated procedure
- WHEN checking the slot design rationale
- THEN the adopted and rejected options are stated with reasons

### Requirement: Console Generation Procedure

`create_projections_NN.md` MUST generate the console artifact and replace Version-And-Archive with Apply Feedback: staleness check, diff preview, `apply_change`, `validate_model`, patch bump, stable-name console regeneration.

#### Scenario: Feedback replaces archive step

- GIVEN a verified console and pending feedback
- WHEN the procedure completes
- THEN Apply Feedback runs and Version-And-Archive does not

#### Scenario: Stale feedback blocked

- GIVEN feedback pinned to an older `source_model_version`
- WHEN Apply Feedback runs
- THEN it blocks with a staleness report until the reviewer confirms

### Requirement: Harness and Sample Verification

`verify.harness.js` MUST validate slot payloads and the thinned artifact (zero pageerrors, `file://` render). The Ghostbusters sample MUST be regenerated as a console.

#### Scenario: Harness passes on sample console

- GIVEN the thinned Ghostbusters console
- WHEN the harness runs
- THEN it reports zero pageerrors and valid slots

#### Scenario: Malformed slot payload fails fast

- GIVEN an `innfo-model` missing a required meta key
- WHEN the harness runs
- THEN it fails naming the missing key
