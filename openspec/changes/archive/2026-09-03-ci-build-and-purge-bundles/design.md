# Design: CI Dynamic Build & Purge Bundles

## Technical Approach

Decouple repository version control from generated bundles by establishing dynamic compilation in CI before GitHub Pages deployment. Tracked compiled artifacts (`docs/innfo/app/assets/`, `docs/innfo/app/index.html`, `docs/innfo/cdn/*.bundle.js`, `iNNfo/packages/innfo-mcp/bin/`) are purged from git tracking via `git rm --cached` and ignored in `.gitignore`. 

A cross-platform build script (`scripts/build-docs.mjs`), invokable via `npm run build:docs`, orchestrates topologically ordered workspace builds and stages distribution bundles into `docs/`. In CI, `verify` validates build integrity on PRs, while `deploy-pages` dynamically compiles and deploys artifacts to Pages.

```
┌────────────────────────────────────────────────────────┐
│               Monorepo Build Topology                  │
│                                                        │
│             @cognnitive/innfo-core (tsc)               │
│                     │            │                     │
│                     ▼            ▼                     │
│   @cognnitive/innfo-mcp        @cognnitive/innfo-editor│
│          (tsup)                   (vue-tsc + vite)     │
│             │                            │             │
│             ▼                            ▼             │
│     docs/innfo/cdn/               docs/innfo/app/      │
│   innfo-mcp-v*.bundle.js        assets/* & index.html  │
└────────────────────────────────────────────────────────┘
```

## Architecture Decisions

### D1: Centralized Build Orchestrator (`scripts/build-docs.mjs`)
- **Choice**: Cross-platform Node script `scripts/build-docs.mjs` executed via `npm run build:docs`.
- **Alternatives**:
  - *Inline bash in `ci.yml`*: Platform-dependent; fails locally on Windows without WSL; untestable before CI push.
  - *Scattered workspace lifecycle scripts*: Tight coupling of package definitions to repository-level `docs/` hosting topology.
- **Rationale**: Keeps CI declarative (`run: npm run build:docs`), decouples individual packages from Pages directory layout, and guarantees identical local and remote execution.

### D2: Untrack `docs/innfo/app/index.html` alongside `assets/`
- **Choice**: Untrack and ignore both `docs/innfo/app/assets/` and `docs/innfo/app/index.html`.
- **Alternatives**:
  - *Track `index.html` in Git*: Leaves index.html pointing to missing or stale hashed asset bundles whenever Vite rebuilds.
- **Rationale**: Vite injects hashed chunk paths directly into `index.html`. Preserving `docs/innfo/app/starter/` and `docs/innfo/app/404.html` in git while treating `index.html` as a generated artifact prevents broken bundle references.

### D3: Fail-Fast CI Build Validation in `verify` Job
- **Choice**: Run `npm run build:docs` inside the `verify` job on every pull request.
- **Alternatives**:
  - *Build only in `deploy-pages`*: PRs merge without detecting broken bundling, breaking production deployments on `main`.
- **Rationale**: Catches bundle compilation failures and type mismatches before merge.

## Workflow & Data Flow

1. **Local Development**:
   - `innfo-editor`: Vite dev server (`npm --prefix iNNfo/apps/innfo-editor run dev`) serves app dynamically without building bundles.
   - `innfo-mcp`: `tsup` builds to local `dist/` and `bin/` (both gitignored).
2. **Pre-Merge Validation (`verify` job)**:
   - `npm ci` installs monorepo dependencies.
   - `npm run verify` runs typechecking and test suites across packages.
   - `node scripts/verify.js` executes deterministic manifest and template inventory guards.
   - `npm run build:docs` verifies clean artifact compilation.
3. **Continuous Deployment (`deploy-pages` job)**:
   - Triggers on `main` push after `verify` passes.
   - Runs `npm ci` and `npm run build:docs`.
   - `scripts/build-docs.mjs`:
     1. Runs `npm --prefix iNNfo/packages/innfo-core run build`.
     2. Runs `npm --prefix iNNfo/packages/innfo-mcp run build`.
     3. Runs `npm --prefix iNNfo/apps/innfo-editor run build`.
     4. Copies `iNNfo/apps/innfo-editor/dist/*` into `docs/innfo/app/`.
     5. Reads version from `iNNfo/packages/innfo-mcp/package.json`, copies `bin/innfo-mcp.bundle.js` to `docs/innfo/cdn/innfo-mcp-v${version}.bundle.js`, and writes `docs/innfo/cdn/manifest.json`.
   - `actions/upload-pages-artifact@v3` packages `docs/` and `actions/deploy-pages@v4` deploys to GitHub Pages.

## File Changes

| File | Action | Purpose |
|---|---|---|
| `.gitignore` | Modify | Ignore `docs/innfo/app/assets/`, `docs/innfo/app/index.html`, `docs/innfo/cdn/*.bundle.js`, `iNNfo/packages/innfo-mcp/bin/` |
| `.github/workflows/ci.yml` | Modify | Add `npm ci` and `build:docs` to `verify` and `deploy-pages` jobs |
| `scripts/build-docs.mjs` | Create | Orchestrate package compilation, artifact staging, and CDN manifest generation |
| `package.json` | Modify | Add root `build:docs` script contract |
| `iNNfo/packages/innfo-mcp/package.json` | Modify | Fix `deploy:cdn` target path to `docs/innfo/cdn` |
| Git Index (tracked files) | Untrack | Purge 78 asset files, CDN bundles, MCP bin files, and SPA index.html via `git rm --cached` |

## Testing Strategy

1. **Bundle Purge Invariant**:
   - Verify `git status` reports zero tracked files matching `.gitignore` bundle rules.
2. **Local Build & Staging**:
   - Run `npm run build:docs` locally.
   - Confirm `docs/innfo/app/index.html`, `docs/innfo/app/assets/*.js`, `docs/innfo/cdn/innfo-mcp-v*.bundle.js`, and `manifest.json` are generated cleanly.
   - Confirm `git status --ignored` lists them under ignored patterns without dirtying tracked files.
3. **CI Pipeline Simulation**:
   - Run `npm run verify` and `npm run build:docs` in a clean environment to ensure zero runner-specific assumptions.
4. **End-to-End SPA & CDN Verification**:
   - Confirm editor SPA loads at `/app/` and resolves assets with HTTP 200.
   - Confirm CDN endpoint delivers MCP bundle matching `manifest.json`.

## Rollback Plan

Revert the CI workflow changes, `.gitignore`, and restore tracked bundles via `git checkout HEAD~1 -- docs/innfo/app/assets docs/innfo/app/index.html docs/innfo/cdn iNNfo/packages/innfo-mcp/bin`.
