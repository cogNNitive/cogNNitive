# Console Export CLI

## Purpose
Console exports become write-once artifacts under `artifacts/`, targets come from the contract predicate, and the script builds payloads through the core builder (carried over from base-change verify W4).

## Requirements

### Requirement: Status Reporting and Staleness Detection

The CLI MUST support `--status` reporting for every model chosen by the contract discovery predicate. Each model MUST be `fresh`, `stale`, `uncompiled`, or `version_mismatch`. Staleness MUST compare the model's content hash with `meta.sha256` embedded in the latest member of the console family under `artifacts/`; no member means `uncompiled`.

#### Scenario: Inspecting compilation status
- GIVEN compiled, modified, and new models
- WHEN `node scripts/export-console.mjs <workspaceRoot> --status` runs
- THEN each model prints a tag (`[fresh]`, `[stale]`, `[uncompiled]`, `[mismatch]`)
- AND no file is written

#### Scenario: Sidecars are not targets
- GIVEN a workspace with sidecars
- WHEN `--status` runs
- THEN no sidecar appears in the output

---

### Requirement: Tree Hierarchy Visualization

`--tree` MUST render models and their console family members under `artifacts/` and exit `0`.

#### Scenario: Visualizing hierarchy
- **GIVEN** models in subdirectories and compiled consoles in `artifacts/`
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --tree`
- **THEN** the CLI prints a structured tree representation showing models and linked console HTML files
- **AND** exits with status code 0

---

### Requirement: Selective Compilation and Filtering

The CLI MUST support `--stale`, `--filter <pattern>`, `--all`, `--list`, and positional substring arguments. Every compile MUST write through `writeOnce` into `artifacts/`.

#### Scenario: Compiling only stale models
- **GIVEN** one modified and two unchanged models
- **WHEN** `--stale` runs
- **THEN** one new suffixed console file is written and the others are skipped with a notice

#### Scenario: Filtering by pattern
- **GIVEN** several models
- **WHEN** `--filter business` runs
- **THEN** only matching models are compiled

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

### Requirement: CLI Delegates to the Shared Builder and Fails Loudly

`scripts/export-console.mjs` MUST obtain its payload only from `buildConsolePayload`, loaded from `console-payload.generated.cjs` in the resolved `consoleDir`. If the mirror cannot be loaded the CLI MUST exit non-zero with an error naming the mirror path. `fallbackBuildPayload` MUST NOT exist.

#### Scenario: Mirror missing

- GIVEN a `consoleDir` without `console-payload.generated.cjs`
- WHEN the CLI runs
- THEN it exits non-zero naming the mirror and writes no console

#### Scenario: CLI output matches builder

- GIVEN a model
- WHEN the CLI compiles it
- THEN the embedded payload equals the builder output

### Requirement: Real domain identity and model-qualified element ids

`export-console` MUST derive the domain version from content (a domain hash or the real
aggregate of model versions), never a constant. The draft store key MUST include a
domain identity beyond `basename(root)`. Element ids MUST be qualified by model so two
models with the same element name never collide in `elementsById`.

#### Scenario: Content change moves the version

- GIVEN a domain exported once
- WHEN one model's content changes and the domain is exported again
- THEN the exported `modelVersion` differs and the stale-draft banner can fire

#### Scenario: Same element name in two models

- GIVEN models A and B both define an element `Customer`
- WHEN the console payload is built
- THEN their ids differ and a draft on A's `Customer` never targets B's

### Requirement: Injected Citation Resolver

The CLI MUST inject a filesystem-backed citation resolver into the builder, so exported consoles carry per-field citations (single shape per `console-payload-builder`). The resolver reads files only; citation logic stays in `innfo-core`.

#### Scenario: Citations in a CLI console

- GIVEN a domaiNN whose element has a `sources` field pointing at a file
- WHEN exported
- THEN `el.citations.sources` holds a resolved entry

### Requirement: Root Ledger Input

The CLI MUST read verdicts from `<domaiNN root>/feedback-ledger.jsonl` and embed them as `meta.feedbackState`. It MUST NOT read `sources/import/feedback/ledger.jsonl` or any other candidate path. An absent ledger yields empty `feedbackState`; a malformed line is reported with its line number and the remaining entries load.

#### Scenario: Ledger read from root

- GIVEN a domaiNN with `feedback-ledger.jsonl` at its root
- WHEN exported
- THEN `meta.feedbackState` reflects the effective statuses

#### Scenario: Old location ignored

- GIVEN a ledger only under `sources/import/feedback/`
- WHEN exported
- THEN `feedbackState` is empty
