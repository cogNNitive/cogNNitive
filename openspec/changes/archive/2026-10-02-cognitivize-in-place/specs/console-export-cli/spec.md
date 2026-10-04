# Console Export CLI (Delta)

## Purpose

Console exports become write-once artifacts under `artifacts/`, targets come from the contract predicate, and the script builds payloads through the core builder (carried over from base-change verify W4).

## MODIFIED Requirements

### Requirement: Status Reporting and Staleness Detection

The CLI MUST support `--status` reporting for every model chosen by the contract discovery predicate. Each model MUST be `fresh`, `stale`, `uncompiled`, or `version_mismatch`. Staleness MUST compare the model's content hash with `meta.sha256` embedded in the latest member of the console family under `artifacts/`; no member means `uncompiled`.
(Previously: compared against `export/<stem>_console/` and selected every non-L2 `*_NN.md`.)

#### Scenario: Inspecting compilation status
- GIVEN compiled, modified, and new models
- WHEN `node scripts/export-console.mjs <workspaceRoot> --status` runs
- THEN each model prints a tag (`[fresh]`, `[stale]`, `[uncompiled]`, `[mismatch]`)
- AND no file is written

#### Scenario: Sidecars are not targets
- GIVEN a workspace with sidecars
- WHEN `--status` runs
- THEN no sidecar appears in the output

### Requirement: Tree Hierarchy Visualization

`--tree` MUST render models and their console family members under `artifacts/` and exit `0`.
(Previously: artifacts under `export/`.)

#### Scenario: Visualizing hierarchy
- GIVEN models in subdirectories and compiled consoles in `artifacts/`
- WHEN `--tree` runs
- THEN a tree of models and linked console files is printed

### Requirement: Selective Compilation and Filtering

The CLI MUST support `--stale`, `--filter <pattern>`, `--all`, `--list`, and positional substring arguments. Every compile MUST write through `writeOnce` into `artifacts/`.
(Previously: wrote to `export/<stem>_console/<stem>_console.html`, overwriting.)

#### Scenario: Compiling only stale models
- GIVEN one modified and two unchanged models
- WHEN `--stale` runs
- THEN one new suffixed console file is written and the others are skipped with a notice

#### Scenario: Filtering by pattern
- GIVEN several models
- WHEN `--filter business` runs
- THEN only matching models are compiled

## ADDED Requirements

### Requirement: Console exports are write-once

The console HTML family key MUST be `<stem>_console` and each export MUST be a new suffixed member. Re-running on an unchanged model MUST write nothing (dedup). A changed model MUST add a member and leave earlier consoles byte-identical.

#### Scenario: Unchanged model
- GIVEN a compiled model with unchanged content
- WHEN `--all` runs
- THEN no file is written

#### Scenario: Changed model
- GIVEN the model changed
- WHEN `--stale` runs
- THEN a new `<stem>_console_<UTC suffix>.html` exists and the previous console's SHA-256 is unchanged

### Requirement: Export uses the core payload builder

`export-console.mjs` MUST obtain payloads from innfo-core `buildConsolePayload` and MUST NOT scan models independently. Exported consoles MUST contain `innfo-model.meta.sources` when the model has citations.

#### Scenario: Meta sources present
- GIVEN a model with one citation
- WHEN its console is exported
- THEN the embedded `innfo-model.meta.sources` lists that citation

#### Scenario: No private scanner
- GIVEN `scripts/export-console.mjs`
- WHEN inspected
- THEN it contains no model-discovery regex or directory walk of its own
