# Delta for console-export-slots-and-standalone-pin

## MODIFIED Requirements

### R-EXP-02: Standalone Exporter Single-File Execution Contract
`scripts/export-console.mjs` MUST be runnable as a standalone CLI script given access only to the model workspace and the vendored console assets (`blueprint.html`, `innfo-console.bundle.js`, `console-payload.generated.cjs`), without requiring `scripts/lib/*`, `manifest/source.yaml` or `innfo-core` `dist`. The generated payload builder MUST be resolved from the same `consoleDir` as the shell and bundle and MUST ship as a `console_assets` entry.
(Previously: listed only the shell and bundle next to the exporter.)

#### Scenario: Running export-console in workspace-only environment
- GIVEN a directory containing only `export-console.mjs`, `blueprint.html`, `innfo-console.bundle.js` and `console-payload.generated.cjs`
- WHEN invoked against a valid Level 3 model workspace
- THEN it MUST successfully export the console HTML without throwing module-resolution errors.
