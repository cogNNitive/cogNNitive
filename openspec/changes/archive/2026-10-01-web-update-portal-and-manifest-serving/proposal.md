# Proposal: Public Web Update Portal and CDN Manifest Serving

Create a dedicated public update hub (`cognnitive.com/update`) and serve canonical distribution manifests via CDN to eliminate unauthenticated 404 failures on private repositories.

## Why

1. **Private Repository Unauthenticated Fetch Failures**: `nn-preflight` and bootstrapping tools currently query `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/docs/use/manifest.md`. Because the core monorepo is private, public HTTP requests fail with `HTTP 404 Not Found`, forcing tools into degraded offline mode.
2. **Missing Dedicated Upgrade Hub**: Users and AI agents lack a unified, human-readable web portal (complementary to `cognnitive.com/use`) that presents the release changelog, active channel freshness (`freshness.json`), Level-2 blueprint evolution matrices, and one-click copyable migration prompts.

## What Changes

- **Canonical CDN Manifest Serving**:
  - Expose production manifests and catalog snapshots through the public static site (`https://cognnitive.com/use/manifest.md`, `https://cognnitive.com/update/manifest.md`, and `https://cognnitive.com/innfo/blueprints/catalog.json`).
  - Update default manifest and catalog URLs in `skills/nn-preflight/scripts/preflight-check.js`, `skills/nn-skills-lifecycle`, and `scripts/upgrade-check.js` to target the public CDN endpoints with robust offline fallback.
- **Dedicated Update Portal (`cognnitive.com/update`)**:
  - Add `docs/update/index.html` (and Docsify/Web pipeline routing) showcasing:
    - Current channel release version and timestamp.
    - Blueprint and template upgrade matrix with version statuses.
    - Actionable migration instructions and prompts for AI coding agents (`/upgrade`, `nn-upgrade`).
- **Release Pipeline Sync**:
  - Ensure `scripts/manifest/generate-manifest.js` and distribution build scripts copy canonical manifests into web deployment artifacts.

## Deliverables & Phases

1. **Phase 1: CDN Manifest Endpoint Configuration**:
   - Update `DEFAULT_MANIFEST_URL` and fallback chains across preflight and lifecycle tools to point to `https://cognnitive.com/use/manifest.md`.
2. **Phase 2: Update Portal Interface (`docs/update/`)**:
   - Author web update page with interactive changelog, version status check, and agent command generator.
3. **Phase 3: Automated Verification**:
   - Add tests verifying public manifest reachability, fallback gracefully when offline, and valid schema parsing.
