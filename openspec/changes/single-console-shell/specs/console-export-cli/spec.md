# Delta for console-export-cli

## ADDED Requirements

### Requirement: Scoped console mode

`<ModelName>` positional arguments, `--filter <pattern>` and `--all` MUST NOT produce per-model console files. Each MUST select a set of models and produce one domain console scoped to that set (`meta.consoleScope.models`, see `console-scope`), built from the single shell. The scope label and the `<scope>` family key MUST be derived deterministically from the selected set. Selecting no model MUST exit non-zero and write nothing. Scope MUST be chosen only through these CLI options.

#### Scenario: One model name
- GIVEN a domaiNN with models A and B
- WHEN `export-console.mjs <root> A` runs
- THEN one console is written whose `meta.consoleScope.models` is `[A]` and whose `meta.models` has only A

#### Scenario: Filter selects a subset
- GIVEN models `business_x`, `business_y` and `metrics_z`
- WHEN `--filter business` runs
- THEN one console is written scoped to `business_x` and `business_y`

#### Scenario: Empty selection
- GIVEN a filter matching no model
- WHEN the export runs
- THEN it exits non-zero naming the filter and writes no file

### Requirement: Scoped export never touches the domain console

A scoped export MUST write only under `artifacts/<scope>_console/` and MUST NOT create, overwrite or delete `domaiNN_console.html`. The whole-domaiNN export (`--domain` with no model selection) remains the only writer of `domaiNN_console.html`.

#### Scenario: Domain console untouched
- GIVEN an existing `domaiNN_console.html` with a known SHA-256
- WHEN a scoped export runs
- THEN `domaiNN_console.html` still has that SHA-256

#### Scenario: Scoped output location
- GIVEN a scoped export for the scope key `a`
- WHEN it completes
- THEN the new file is `artifacts/a_console/a_console_<UTC suffix>.html`

### Requirement: View scope combines with a model subset

`--view <id>` MUST be combinable with a model selection. The artifact MUST mount only that view over the selected models' payload, and its `meta.consoleScope` MUST carry both `view` and `models`. An unknown view id MUST still fail listing the available ids.

#### Scenario: View over a subset
- GIVEN models A and B
- WHEN `--view timeline` runs together with `A`
- THEN the artifact mounts only `timeline` and its payload contains only A

#### Scenario: View over a subset, unknown id
- GIVEN `--view nope` with `A`
- WHEN the export runs
- THEN it exits non-zero listing the available ids and writes nothing

## MODIFIED Requirements

### Requirement: Status Reporting and Staleness Detection

The CLI MUST support `--status` reporting for every model chosen by the contract discovery predicate. Each model MUST be `fresh`, `stale`, `uncompiled`, or `version_mismatch`. The basis MUST be the per-model entry in `meta.models` of the most recently generated console (by `meta.generated`) that lists the model, among `domaiNN_console.html` and the members of every scoped console family under `artifacts/`. The model's current content hash is compared with that entry's `sha256` (`fresh` when equal, otherwise `stale`); a differing recorded `modelVersion` is `version_mismatch`; no console listing the model means `uncompiled`.
(Previously: staleness compared the model's hash with `meta.sha256` of the latest member of that model's own `<stem>_console` family.)

#### Scenario: Inspecting compilation status
- GIVEN compiled, modified, and new models
- WHEN `node scripts/export-console.mjs <workspaceRoot> --status` runs
- THEN each model prints a tag (`[fresh]`, `[stale]`, `[uncompiled]`, `[mismatch]`)
- AND no file is written

#### Scenario: Status read from a scoped console
- GIVEN model A only ever exported inside a console scoped to A and B, then A edited
- WHEN `--status` runs
- THEN A is `[stale]` and B is `[fresh]`

#### Scenario: Newest console wins
- GIVEN A recorded with hash `H1` in an older console and `H2` in a newer one, and A's current hash is `H2`
- WHEN `--status` runs
- THEN A is `[fresh]`

#### Scenario: Sidecars are not targets
- GIVEN a workspace with sidecars
- WHEN `--status` runs
- THEN no sidecar appears in the output

---

### Requirement: Tree Hierarchy Visualization

`--tree` MUST render models and the console family members under `artifacts/` that list them in `meta.models`, and exit `0`.
(Previously: rendered each model with its own `<stem>_console` family.)

#### Scenario: Visualizing hierarchy
- **GIVEN** models in subdirectories and scoped consoles in `artifacts/`
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --tree`
- **THEN** the CLI prints a structured tree representation showing models and the console HTML files that include them
- **AND** exits with status code 0

---

### Requirement: Selective Compilation and Filtering

The CLI MUST support `--stale`, `--filter <pattern>`, `--all`, `--list`, and positional substring arguments. `--stale` MUST select the models whose `--status` is not `fresh` and produce one scoped console for them; when none is stale it MUST write nothing. `--all` MUST select every discovered model. Every compile MUST write through `writeOnce` into `artifacts/`.
(Previously: each selected model was compiled to its own console file.)

#### Scenario: Compiling only stale models
- **GIVEN** one modified and two unchanged models
- **WHEN** `--stale` runs
- **THEN** one new suffixed scoped console file listing only the modified model is written

#### Scenario: Nothing stale
- **GIVEN** every model `fresh`
- **WHEN** `--stale` runs
- **THEN** no file is written and a notice is printed

#### Scenario: Filtering by pattern
- **GIVEN** several models
- **WHEN** `--filter business` runs
- **THEN** only matching models are in the scoped console

### Requirement: Console exports are write-once

The scoped console HTML family key MUST be `<scope>_console` and each export MUST be a new suffixed member under `artifacts/<scope>_console/`. Re-running with an unchanged scope and unchanged models MUST write nothing (dedup). A changed model MUST add a member and leave earlier consoles byte-identical.
(Previously: the family key was `<stem>_console`, one family per model.)

#### Scenario: Unchanged scope
- GIVEN a compiled scope whose models are unchanged
- WHEN `--all` runs again
- THEN no file is written

#### Scenario: Changed model
- GIVEN a model in the scope changed
- WHEN the same scope is exported again
- THEN a new `<scope>_console_<UTC suffix>.html` exists and the previous console's SHA-256 is unchanged
