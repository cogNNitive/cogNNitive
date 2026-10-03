# Delta for console-export-cli

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Status Reporting and Staleness Detection

The console export CLI MUST support a `--status` flag to report compilation state for all Level 3 models in the workspace.
- The status report MUST classify each model as `fresh`, `stale`, `uncompiled`, or `version_mismatch`.
- Staleness MUST be determined by comparing the source model content SHA-256 against `meta.sha256` of the existing compiled console under `export/<stem>_console/`. A console built by either path carries `meta.sha256` and MUST be `fresh` when content is unchanged.
(Previously: SHA-256 or modification timestamp; procedure consoles lacked `sha256` and always read `stale`.)

#### Scenario: Inspecting model compilation status
- **GIVEN** a workspace containing compiled, modified, and newly created Level 3 models
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --status`
- **THEN** the CLI outputs each model's path and status tag (`[fresh]`, `[stale]`, `[uncompiled]`, or `[mismatch]`)
- **AND** no console artifacts are compiled or written to disk during status inspection

#### Scenario: Procedure-built console is fresh
- **GIVEN** a console compiled by `compile_model_console` from unchanged content
- **WHEN** running `--status`
- **THEN** it is tagged `[fresh]`
