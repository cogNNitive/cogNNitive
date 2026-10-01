# Delta for console-export-cli

## ADDED Requirements

### Requirement: CLI Delegates to Shared Builder

`scripts/export-console.mjs` MUST obtain its payload only from `buildConsolePayload` and MUST NOT hand-parse models. It MUST `require` the builder from `console-payload.generated.cjs`, an esbuild CJS mirror of `innfo-core/src/console/index.ts` that ships in the resolved `consoleDir`, next to the shell and bundle. The mirror MUST NOT pull the embedded canonical registry. A `--check` drift guard run by `verify.js` MUST fail, naming the generated file, when the mirror is stale relative to `innfo-core` sources.

#### Scenario: CLI output matches builder

- GIVEN a model
- WHEN the CLI compiles it
- THEN the embedded payload equals the builder output

#### Scenario: Stale builder detected

- GIVEN a `console-payload.generated.cjs` out of date with `innfo-core` sources
- WHEN `build-console-payload.mjs --check` runs
- THEN it exits 1 naming the stale generated file

## MODIFIED Requirements

### Requirement: Status Reporting and Staleness Detection

The console export CLI MUST support a `--status` flag to report compilation state for all Level 3 models in the workspace.
- The status report MUST classify each model as `fresh`, `stale`, `uncompiled`, or `version_mismatch`.
- Staleness MUST be determined by comparing the source model content SHA-256 against `meta.sha256` of the existing compiled console under `export/<stem>_console/`. Consoles built by the procedure carry `meta.sha256` and MUST be reported `fresh` when content is unchanged. When versions match but the hash differs, the status MUST be `stale`.
(Previously: hash or modification timestamp; procedure consoles lacked `sha256` and always reported `stale`.)

#### Scenario: Inspecting model compilation status
- **GIVEN** a workspace containing compiled, modified, and newly created Level 3 models
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --status`
- **THEN** the CLI outputs each model's path and status tag (`[fresh]`, `[stale]`, `[uncompiled]`, or `[mismatch]`)
- **AND** no console artifacts are compiled or written to disk during status inspection

#### Scenario: Procedure-built console is fresh
- **GIVEN** a console compiled by `compile_model_console` from unchanged content
- **WHEN** running `--status`
- **THEN** it is tagged `[fresh]`

#### Scenario: Same version, edited content
- **GIVEN** a model edited without a version bump
- **WHEN** running `--status`
- **THEN** it is tagged `[stale]`
