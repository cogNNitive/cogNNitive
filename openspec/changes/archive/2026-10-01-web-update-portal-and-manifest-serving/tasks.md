# Tasks: Public Web Update Portal and CDN Manifest Serving

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-250 lines (docs portal + manifest URL updates + tests) |
| 400-line budget risk | Low |
| Chained PRs recommended | No (single cohesive update) |
| Delivery strategy | single |
| User approval required before apply | Yes |

---

## Phase 1: CDN Manifest Endpoint Configuration

- [x] 1.1 Update `DEFAULT_MANIFEST_URL` in `skills/nn-preflight/scripts/preflight-check.js` to `https://cognnitive.com/use/manifest.md` with fallback chain.
      `[public-update-hub:Requirement:Canonical CDN Manifest Distribution]`
- [x] 1.2 Update manifest lookup in `skills/nn-skills-lifecycle` and `scripts/upgrade-check.js`.
      `[public-update-hub:Requirement:Canonical CDN Manifest Distribution]`
- [x] 1.3 Update blueprint catalog URL fallback to `https://cognnitive.com/innfo/blueprints/catalog.json`.
      `[public-update-hub:Requirement:Canonical CDN Manifest Distribution]`

## Phase 2: Update Portal Interface (`docs/update/`)

- [x] 2.1 Create `docs/update/index.html`, `docs/update/README.md`, and `docs/update/_sidebar.md`.
      `[public-update-hub:Requirement:Public Update Portal UI]`
- [x] 2.2 Wire update portal into `scripts/build-docs.mjs` staging pipeline.
      `[public-update-hub:Requirement:Staged Manifest Pipeline]`
- [x] 2.3 Verify `docs/update/manifest.md` staging matches `manifest/source.yaml`.
      `[public-update-hub:Requirement:Staged Manifest Pipeline]`

## Phase 3: Automated Verification

- [x] 3.1 Add unit tests for manifest URL fallback resolution and offline handling.
      `[public-update-hub:Requirement:Canonical CDN Manifest Distribution]`
- [x] 3.2 Run `node scripts/verify.js` and `node scripts/check-integrity.js`.
      `[public-update-hub:Requirement:Canonical CDN Manifest Distribution]`
