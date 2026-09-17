# Tasks: Workspace Consolidation, Root Dogfooding Catalogs, and Skill Migration

- [x] **Phase 1: Dogfooding Root Catalogs & Workspace Manifest**
  - [x] Create `sources/sources_NN.md` (Level 3 sources catalog for cogNNitive).
  - [x] Create `procedures/procedures_NN.md` (Level 3 procedures catalog for cogNNitive).
  - [x] Create `artifacts/artifacts_NN.md` (Level 3 artifacts catalog for cogNNitive).
  - [x] Update root `workspace_NN.md` to reference `sources/sources_NN.md`, `procedures/procedures_NN.md`, and `artifacts/artifacts_NN.md`.
  - [x] Remove legacy `cogNNitive_nn/` directory.

- [x] **Phase 2: Consolidate Skills Layer to Root `skills/`**
  - [x] Move `actioNN/skills/*` to `skills/*`.
  - [x] Move `actioNN/scripts/skills-manager.js` and `actioNN/scripts/lib/*` to `scripts/skills-manager.js` and `scripts/lib/*`.
  - [x] Update `workspace_NN.md` (`skills_dir:: skills/` and `# NN Skills` paths).
  - [x] Remove `actioNN/` directory.

- [x] **Phase 3: Tooling, Manifest, & Verification Alignment**
  - [x] Update `manifest/source.yaml` (skills path from `actioNN/skills/` to `skills/`).
  - [x] Update `scripts/verify.js` (`ORCHESTRATORS` line limit list and preflight test paths).
  - [x] Update `scripts/build-preflight-primitives.mjs` and `scripts/build-trannsform-slug-mirror.mjs` output paths.
  - [x] Update any test files or scripts referencing `actioNN/`.
    - Note: 3 references survived this pass (uncaught because no CI job runs the `skills/` test suites); fixed in `openspec/changes/2026-09-17-post-consolidation-reference-remediation`.

- [x] **Phase 4: Full Gate & Parity Verification**
  - [x] Run `node scripts/check-integrity.js --pre-push`.
  - [x] Run test suites across `innfo-core`, `innfo-mcp`, and `innfo-editor`.
  - [x] Verify 100% green status.
