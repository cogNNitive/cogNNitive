# Implementation Tasks: CI Dynamic Build & Purge Bundles

This document outlines the concrete tasks and phases for the `ci-build-and-purge-bundles` change.

---

## Review Workload Forecast

* **Decision needed before apply**: No
* **Chained PRs recommended**: No
* **Chain strategy**: stacked-to-main
* **400-line budget risk**: Low
* **Estimated changed lines**: ~150 lines modified/added across config and scripts (excluding untracked bundle deletions from Git index)
* **Total files affected**: 4 modified files, 1 new script, and untracked asset paths

---

## Phase 1: Git Hygiene & Asset Purge

**Goal**: Untrack all compiled SPA bundles, CDN distributions, and MCP binaries from the Git index and enforce ignore rules.

### Tasks
- [x] 1.1 **Update `.gitignore`**:
  - Add ignore patterns for `docs/innfo/app/assets/` and `docs/innfo/app/index.html`.
  - Add ignore pattern for `docs/innfo/cdn/*.bundle.js`.
  - Add ignore pattern for `iNNfo/packages/innfo-mcp/bin/`.
- [x] 1.2 **Purge tracked bundles from Git index**:
  - Run `git rm --cached` on tracked files in `docs/innfo/app/assets/`.
  - Run `git rm --cached` on `docs/innfo/app/index.html`.
  - Run `git rm --cached` on tracked files matching `docs/innfo/cdn/*.bundle.js`.
  - Run `git rm --cached` on tracked files in `iNNfo/packages/innfo-mcp/bin/`.
  - Preserve `docs/innfo/app/starter/`, `docs/innfo/app/404.html`, and `docs/innfo/cdn/manifest.json`.

---

## Phase 2: Build Orchestrator & Script Contracts

**Goal**: Implement cross-platform build orchestration honoring package dependencies and staging artifacts to `docs/`.

### Tasks
- [x] 2.1 **Create `scripts/build-docs.mjs`**:
  - Implement sequential topological build execution:
    1. Build `innfo-core` (`npm --prefix iNNfo/packages/innfo-core run build`).
    2. Build `innfo-mcp` (`npm --prefix iNNfo/packages/innfo-mcp run build`).
    3. Build `innfo-editor` (`npm --prefix iNNfo/apps/innfo-editor run build`).
  - Stage `iNNfo/apps/innfo-editor/dist/*` into `docs/innfo/app/`.
  - Extract version from `iNNfo/packages/innfo-mcp/package.json`, copy `bin/innfo-mcp.bundle.js` to `docs/innfo/cdn/innfo-mcp-v${version}.bundle.js`, and write `docs/innfo/cdn/manifest.json`.
- [x] 2.2 **Update package scripts**:
  - Add `"build:docs": "node scripts/build-docs.mjs"` to root `package.json`.
  - Correct `deploy:cdn` target path in `iNNfo/packages/innfo-mcp/package.json` to `docs/innfo/cdn`.

---

## Phase 3: CI Workflow & Verification Gates

**Goal**: Integrate dynamic build into CI workflows and verify automated build and deployment behavior.

### Tasks
- [x] 3.1 **Update `.github/workflows/ci.yml`**:
  - Add `npm ci` and `npm run build:docs` build gate to `verify` job for pull request validation.
  - Add `npm ci` and `npm run build:docs` dynamic compilation to `deploy-pages` job prior to `actions/upload-pages-artifact`.
- [x] 3.2 **Local verification & validation**:
  - Run `npm run build:docs` locally and verify generated artifacts in `docs/innfo/app` and `docs/innfo/cdn`.
  - Verify `git status` shows zero untracked or staged bundle files.
  - Run `npm run verify` to ensure monorepo checks pass cleanly.
