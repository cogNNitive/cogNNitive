# Tasks: Migrate Canonical Spec Hosting to Monorepo

## 1. Delete Dead Root Specs Island
- [x] 1.1 Remove `specs/**` directory (6 legacy files) from repository root. <!-- id: 1.1 -->

## 2. Codemod Script & URL Migration
- [x] 2.1 Implement `scripts/migrate-spec-urls.mjs` with deterministic LF-safe regex rewrites across Buckets A1–A7, A9, A5, B, C, and E-active, excluding fixtures, archive, bundles, and manifest paths. <!-- id: 2.1 -->
- [x] 2.2 Execute `node scripts/migrate-spec-urls.mjs` to rewrite canonical spec URLs. <!-- id: 2.2 -->
- [x] 2.3 Verify line endings are LF and review file diffs for clean single-line replacements. <!-- id: 2.3 -->

## 3. Editor Runtime Refactor
- [x] 3.1 Export `REMOTE_SPEC_BASE` from `iNNfo/apps/innfo-editor/src/config/samples.ts`. <!-- id: 3.1 -->
- [x] 3.2 Update `ModelInfoPanel.vue`, `StandaloneProcedureView.vue`, and `src/ai-guide/procedure_NN.md` to use `REMOTE_SPEC_BASE`. <!-- id: 3.2 -->

## 4. CI Spec URL Checker Rework
- [x] 4.1 Re-root URL collection in `iNNfo/scripts/check-spec-version.mjs` to repository root and widen file extensions (`.ts`, `.vue`, `.md`, `.mjs`, `.js`, `.yaml`, `.yml`, `.json`, `.html`). <!-- id: 4.1 -->
- [x] 4.2 Update canonical URL regex to target `cogNNitive/cogNNitive` and resolve against `iNNfo/` workspace directory. <!-- id: 4.2 -->
- [x] 4.3 Add strict legacy scan for `/cogNNitive\/iNNfo(?![\w-])/`, fail on unallowlisted matches, and emit loud WARNING for allowlisted manifest paths on every run. <!-- id: 4.3 -->
- [x] 4.4 Update usage comments in `iNNfo/scripts/check-spec-version.mjs` and `iNNfo/CONTRIBUTING.md`. <!-- id: 4.4 -->

## 5. Folded-in Documentation & Staleness Updates
- [x] 5.1 Adopt `iNNfo_V_0-2-1` as current L1 in `docs/innfo/documentation/specifications.md`, `docs/specifications.md`, and `docs/innfo/template-package-spec.md`. <!-- id: 5.1 -->
- [x] 5.2 Update `nn-innfo` doc references from `V_0-1-0` to `V_0-1-2` in `docs/actionn/documentation/README.md` and `docs/actionn/documentation/skills/nn-innfo.md`. <!-- id: 5.2 -->
- [x] 5.3 Update MCP bundle reference to `v0.2.4` in `docs/innfo/mcp-setup.md`. <!-- id: 5.3 -->
- [x] 5.4 Fix `github.com/iNNfo/iNNfo` URLs in `docs/innfo/documentation/specifications.md`. <!-- id: 5.4 -->
- [x] 5.5 Fix UTF-8 encoding mojibake in `docs/innfo/changesets/format-repo.md` and `docs/innfo/changesets/innfo-repo.md`. <!-- id: 5.5 -->

## 6. Verification & Validation Gates
- [x] 6.1 Test failure on seeded legacy URL to prove `check:spec-urls` is not a vacuous green. <!-- id: 6.1 -->
- [x] 6.2 Run `npm --prefix iNNfo run check:spec-urls` and verify exit 0 with loud warnings for manifest debt. <!-- id: 6.2 -->
- [x] 6.3 Run `npm --prefix iNNfo run check:spec-version -- --inventory` and verify byte-identical output against pre-change. <!-- id: 6.3 -->
- [x] 6.4 Run `npm run verify` and `npm run build:docs`. <!-- id: 6.4 -->
- [x] 6.5 Confirm `git diff --stat` shows zero whole-file rewrites and no CRLF regressions. <!-- id: 6.5 -->
