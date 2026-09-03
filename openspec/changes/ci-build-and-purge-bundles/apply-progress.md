# Implementation Progress: CI Dynamic Build & Purge Bundles

## Status: Complete

### Executed Phases

#### Phase 1: Git Hygiene & Asset Purge
- [x] **Update `.gitignore`**:
  - Added rules to ignore `docs/innfo/app/assets/`, `docs/innfo/app/index.html`, `docs/innfo/cdn/*.bundle.js`, and `iNNfo/packages/innfo-mcp/bin/`.
- [x] **Purge tracked bundles from Git index**:
  - Staged deletions for 83 compiled bundles and binaries from the Git index (`git rm --cached -r docs/innfo/app/assets docs/innfo/app/index.html docs/innfo/cdn/*.bundle.js iNNfo/packages/innfo-mcp/bin`).
  - Preserved tracked files `docs/innfo/app/404.html`, `docs/innfo/app/starter/*`, and `docs/innfo/cdn/manifest.json`.

#### Phase 2: Build Orchestrator & Script Contracts
- [x] **Create `scripts/build-docs.mjs`**:
  - Topologically executes sequential package builds: `@cognnitive/innfo-core` -> `@cognnitive/innfo-mcp` -> `@cognnitive/innfo-editor`.
  - Stages `iNNfo/apps/innfo-editor/dist/*` into `docs/innfo/app/` while preserving existing `starter/` and `404.html`.
  - Stages `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` into `docs/innfo/cdn/innfo-mcp-v${version}.bundle.js`.
  - Updates `docs/innfo/cdn/manifest.json` with the latest version and date.
- [x] **Update package scripts**:
  - Added `"build:docs": "node scripts/build-docs.mjs"` to root `package.json`.
  - Corrected `deploy:cdn` target path in `iNNfo/packages/innfo-mcp/package.json` to `../../../docs/innfo/cdn`.

#### Phase 3: CI Workflow & Verification Gates
- [x] **Update `.github/workflows/ci.yml`**:
  - Added `npm ci` and `npm run build:docs` build gate to `verify` job for pull request validation.
  - Added Node.js setup, `npm ci`, and `npm run build:docs` dynamic compilation to `deploy-pages` job prior to `actions/upload-pages-artifact`.
- [x] **Local verification & validation**:
  - Executed `npm run build:docs` locally; verified assets staged in `docs/innfo/app` and `docs/innfo/cdn`.
  - Verified `git status` shows zero untracked bundle files and all generated artifacts match `.gitignore`.
  - Executed `npm run verify` passing all 80 test suites (541 tests) and typechecks.
  - Executed `node scripts/verify.js` passing deterministic template inventory guards and manifest validation.
