# Delta for console-export-slots-and-standalone-pin

## MODIFIED Requirements

### R-EXP-02: Standalone Exporter Single-File Execution Contract
`scripts/export-console.mjs` MUST be runnable as a standalone CLI script given access only to the model workspace and the vendored console assets (`blueprint.html`, `innfo-console.bundle.js`, `console-payload.generated.cjs`), without requiring `scripts/lib/*` or `manifest/source.yaml`. The payload mirror MUST be resolved from the same `consoleDir` as the shell and bundle and MUST ship as a `console_assets` entry.
(Previously: listed only the shell and bundle next to the exporter.)

#### Scenario: Running export-console in workspace-only environment
- GIVEN a directory containing only `export-console.mjs`, `blueprint.html`, `innfo-console.bundle.js` and `console-payload.generated.cjs`
- WHEN invoked against a valid Level 3 model workspace
- THEN it MUST successfully export the console HTML without throwing module-resolution errors.

#### Scenario: Mirror omitted from the asset set
- GIVEN the same directory without `console-payload.generated.cjs`
- WHEN invoked
- THEN it MUST fail loudly rather than export with a different payload builder

## ADDED Requirements

### Requirement: Release Channels Carry the Change

The change MUST ship on its own tags, bumping versions verified in `manifest/source.yaml` at release time (expected: `innfo-console` 0.7.0, `blueprints` 0.20.0, `skills` 2.9.0, `innfo-mcp` 0.13.0). The mirror MUST be a `console_assets` entry; shells MUST pin the new console tag; `blueprint_version` MUST be bumped on every edited or deleted procedure. Refs MUST come from `sync-versions.mjs`/`channel-refs.js`, never by hand, and a published bundle MUST NOT be overwritten.

#### Scenario: Integrity after release prep

- GIVEN the bumped manifest and shells
- WHEN `check-integrity.js` and the `--release` rehearsal run
- THEN both pass and every shell pins the new console tag

#### Scenario: Mirror listed

- GIVEN `manifest/source.yaml`
- WHEN `console_assets` is read
- THEN it includes `console/console-payload.generated.cjs`
