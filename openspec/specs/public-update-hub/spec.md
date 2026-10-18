# Spec: Public Update Hub & CDN Manifest Serving

## Purpose
Expose canonical distribution manifests via CDN endpoints and establish a public update portal (`cognnitive.com/update`) to prevent unauthenticated 404 errors on private monorepos and provide live channel upgrade instructions.

## Requirements

### Requirement: Canonical CDN Manifest Distribution
Preflight and upgrade tools MUST target public CDN and site endpoints (`https://cognnitive.com/use/manifest.md`, `https://cognnitive.com/innfo/blueprints/catalog.json`) by default before falling back to GitHub raw URLs, preventing 404 failures on private repositories.

#### Scenario: Tools hit the CDN first
- GIVEN preflight or upgrade needs a manifest
- WHEN it resolves the endpoint
- THEN it requests the public CDN URL before falling back to GitHub raw

### Requirement: Public Update Portal UI
The documentation static deployment MUST include a dedicated update section (`docs/update/`) rendering current channel versions, blueprint compatibility matrix, and agent migration commands.

#### Scenario: Update portal renders the channel state
- GIVEN the deployed documentation site
- WHEN `docs/update/` is opened
- THEN it shows current channel versions, the blueprint compatibility matrix, and migration commands

### Requirement: Staged Manifest Pipeline
The `build:docs` script and distribution packaging MUST ensure `docs/use/manifest.md` and `docs/update/manifest.md` are staged with byte-identical parity against `manifest/source.yaml`.

#### Scenario: Staged manifests match the source
- GIVEN `manifest/source.yaml`
- WHEN `build:docs` runs
- THEN `docs/use/manifest.md` and `docs/update/manifest.md` are byte-identical to it
