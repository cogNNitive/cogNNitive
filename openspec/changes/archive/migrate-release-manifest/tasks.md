# Tasks: Migrate Release Manifest to Monorepo

## 1. Manifest Source Updates
- [x] 1.1 Update `manifest/source.yaml` skills to `repo: cogNNitive/cogNNitive`, `path: actioNN/skills/<name>`, and `ref_key: skills`. <!-- id: 1.1 -->
- [x] 1.2 Update `manifest/source.yaml` templates to `repo: cogNNitive/cogNNitive`, `path: iNNfo/specs/templates/<path>`, `ref_key: templates`, and fix versions for `business-model` and `analysis` to `V_0-1-0`. <!-- id: 1.2 -->
- [x] 1.3 Update `manifest/source.yaml` mcp bundle to `repo: cogNNitive/cogNNitive`, `path: iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`, and `ref_key: innfo-mcp`. <!-- id: 1.3 -->
- [x] 1.4 Update `manifest/source.yaml` channels for `stable` and `preview` referencing keys `skills`, `templates`, and `innfo-mcp` under `repo: cogNNitive/cogNNitive`. <!-- id: 1.4 -->

## 2. Release Tagging on Monorepo
- [x] 2.1 Create git tags `skills-v1.1.3`, `templates-v0.2.0`, and `innfo-mcp-v0.2.4` on `cogNNitive/cogNNitive` at current `main`. <!-- id: 2.1 -->
- [x] 2.2 Push tags to `origin` with explicit user confirmation. <!-- id: 2.2 -->

## 3. Manifest Generation & Mirror Sync
- [x] 3.1 Regenerate `docs/use/manifest.md` via `node scripts/manifest/generate-manifest.js --channel stable`. <!-- id: 3.1 -->
- [x] 3.2 Regenerate `docs/use/manifest-next.md` via `node scripts/manifest/generate-manifest.js --channel preview`. <!-- id: 3.2 -->

## 4. Test Suites & Checker Cleanup
- [x] 4.1 Update `scripts/manifest/validate-manifest.test.js` mock data from `cogNNitive/iNNfo` to `cogNNitive/cogNNitive`. <!-- id: 4.1 -->
- [x] 4.2 Update `scripts/manifest/generate-manifest.test.js` mock data from `cogNNitive/iNNfo` to `cogNNitive/cogNNitive`. <!-- id: 4.2 -->
- [x] 4.3 Update `actioNN/scripts/skills-manager.test.js` mock data from `cogNNitive/iNNfo` to `cogNNitive/cogNNitive`. <!-- id: 4.3 -->
- [x] 4.4 Remove `ALLOWLISTED_EXACT_PATHS` in `iNNfo/scripts/check-spec-version.mjs` and verify strict zero-residual scanning. <!-- id: 4.4 -->

## 5. Verification & Validation
- [x] 5.1 Run `node scripts/manifest/validate-manifest.js --channel stable` and verify PASS. <!-- id: 5.1 -->
- [x] 5.2 Run `node scripts/manifest/validate-manifest.js --channel preview` and verify PASS. <!-- id: 5.2 -->
- [x] 5.3 Run `npm --prefix iNNfo run check:spec-urls` and verify PASS with 0 warnings. <!-- id: 5.3 -->
- [x] 5.4 Run `npm run verify` and verify all tests and guards pass. <!-- id: 5.4 -->
