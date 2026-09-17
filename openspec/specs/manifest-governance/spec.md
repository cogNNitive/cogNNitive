# Manifest Governance

## Purpose
Ensure ecosystem manifests and reference documentation reflect only active, supported workflows by purging unsupported legacy pipelines.

## Requirements

### Requirement: Supported Workflow Catalog Purity
`manifest/source.yaml` MUST contain only actively supported workflows and pipelines.
- The legacy `pdf-to-innfo-dashboard` workflow MUST NOT be defined in `manifest/source.yaml` or any synchronized channel manifests (`dist/`, `manifest/`).
- Running `npm run check:versions` MUST validate all manifest definitions without errors.

#### Scenario: Validating manifest workflow catalog
- **GIVEN** `manifest/source.yaml` and derived manifest channel files
- **WHEN** executing `npm run check:versions`
- **THEN** all workflow entries pass validation
- **AND** `pdf-to-innfo-dashboard` is absent from the catalog

---

### Requirement: Reference Documentation Alignment
Documentation files (`docs/use/manifest.md`, `docs/use/manifest-next.md`) MUST NOT reference unsupported PDF export pipelines or unmaintained workflows.

#### Scenario: Consulting manifest documentation
- **GIVEN** a user or agent reads `docs/use/manifest.md` or `docs/use/manifest-next.md`
- **WHEN** reviewing available workflow configurations
- **THEN** only supported workflows are described
- **AND** no references to `pdf-to-innfo-dashboard` are present
