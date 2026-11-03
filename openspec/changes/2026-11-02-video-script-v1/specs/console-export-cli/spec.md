# Delta for console-export-cli

Change `2026-11-02-video-script-v1`, design.md A12. The exporter's payload stays the core builder's output; the only addition is the `viewData` key produced by the view data hook of `console-view-registry`.

## MODIFIED Requirements

### Requirement: CLI Delegates to the Shared Builder and Fails Loudly

`scripts/export-console.mjs` MUST obtain its payload only from `buildConsolePayload`, loaded from `console-payload.generated.cjs` in the resolved `consoleDir`, and MAY add only the `viewData` key collected through the view data hook of `console-view-registry`. If the mirror cannot be loaded the CLI MUST exit non-zero with an error naming the mirror path. `fallbackBuildPayload` MUST NOT exist.
(Previously: the payload was only the builder output, with no `viewData` addition.)

#### Scenario: Mirror missing

- GIVEN a `consoleDir` without `console-payload.generated.cjs`
- WHEN the CLI runs
- THEN it exits non-zero naming the mirror and writes no console

#### Scenario: CLI output matches builder

- GIVEN a model and views with no data modules
- WHEN the CLI compiles it
- THEN the embedded payload equals the builder output

#### Scenario: Only viewData is added

- GIVEN a view with a data module
- WHEN the CLI compiles the model
- THEN the embedded payload equals the builder output plus the `viewData` key and nothing else
