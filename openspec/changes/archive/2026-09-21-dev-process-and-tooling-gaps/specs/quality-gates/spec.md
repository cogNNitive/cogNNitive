# quality-gates Specification

## Purpose

Deterministic verification and version integrity scripts ensure all generated artifacts, template copies, manifest registries, and template catalogs remain fully synchronized across releases and development workflows.

## Requirements

### ADDED Requirement: Comprehensive template version synchronization and verification

`npm run sync:versions` MUST regenerate all generated artifacts invalidated by template version changes (including `iNNfo/specs/templates/catalog.json`), and `npm run check:versions` MUST verify the freshness of all generated artifacts (including `catalog.json`) against their source definitions.

#### Scenario: Sync regenerates template catalog alongside version copies and manifest

- **GIVEN** a template version bump or template file modification
- **WHEN** `npm run sync:versions` is executed
- **THEN** it SHALL synchronize template version copies (`scripts/sync-template-versions.mjs`)
- **AND** it SHALL generate the stable manifest (`scripts/manifest/generate-manifest.js --channel stable`)
- **AND** it SHALL regenerate `iNNfo/specs/templates/catalog.json` via `scripts/template-catalog.mjs`.

#### Scenario: Version freshness check detects stale template catalog

- **GIVEN** `iNNfo/specs/templates/catalog.json` is missing or out-of-sync with template definitions
- **WHEN** `npm run check:versions` is executed
- **THEN** it SHALL detect the catalog drift via `scripts/template-catalog.mjs --check`
- **AND** it SHALL exit with a non-zero status code.

#### Scenario: Version check passes when all artifacts are synchronized

- **GIVEN** template version copies, stable manifest, and template catalog are all up-to-date
- **WHEN** `npm run check:versions` is executed
- **THEN** all three verification steps SHALL pass with exit code 0.
