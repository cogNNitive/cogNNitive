# Proposal: CI Dynamic Build & Purge Bundles

## Intent

Decouple version control from compiled bundles by configuring GitHub Actions to dynamically build `@cognnitive/innfo-editor` and dependencies during Pages deployment. Untrack committed bundles (`docs/innfo/app/assets/`, `docs/innfo/cdn/`, `iNNfo/packages/innfo-mcp/bin/`), update `.gitignore`, and establish build boundaries for subsequent TypeScript migration.

## Scope

### In Scope
- **CI Dynamic Build**: Update `.github/workflows/ci.yml` to compile `@cognnitive/innfo-core`, `@cognnitive/innfo-editor`, and MCP distribution bundles before Pages deployment.
- **Bundle Purge**: Untrack committed generated files (`docs/innfo/app/assets/`, `docs/innfo/cdn/*.bundle.js`, `iNNfo/packages/innfo-mcp/bin/`).
- **Ignore Rules**: Update `.gitignore` to prevent re-committing bundle artifacts.
- **Architectural Boundary**: Define package build topology (`innfo-core` → `innfo-mcp` / `innfo-editor`) and script contracts for TS migration.

### Out of Scope
- Migrating monorepo scripts to TypeScript (deferred).
- Rewriting Git history.
- Modifying editor application runtime logic.

## Capabilities

### New Capabilities
- `ci-dynamic-bundle-build`: Automated CI pipeline building SPA and CDN artifacts during deployment.

### Modified Capabilities
- `repository-asset-hygiene`: Removal of compiled binaries and client bundles from source control.

## Approach

1. **Purge & Ignore**: Remove committed bundles from git tracking (`git rm --cached`). Add patterns to `.gitignore`.
2. **CI Pipeline**: Update `.github/workflows/ci.yml` deploy job to run `npm ci`, build core, build editor into `docs/innfo/app`, and bundle MCP into `docs/innfo/cdn`.
3. **Build Topology**: Formalize package dependency build order and npm script contracts (`build`, `typecheck`) across workspaces.

## Affected Areas

| Area | Path | Impact |
|---|---|---|
| CI Workflow | `.github/workflows/ci.yml` | Dynamic build & artifact packaging |
| Git Config | `.gitignore` | Ignore rules for bundles |
| App Assets | `docs/innfo/app/assets/` | Untrack bundle files |
| Distribution CDN | `docs/innfo/cdn/` | Untrack bundle JS |
| MCP Package | `iNNfo/packages/innfo-mcp/bin/` | Untrack bundle binaries |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Missing bundle breaks Pages | Med | Add pre-deploy build check to CI verify job |
| CI runner memory pressure | Low | Vite/tsc footprint fits within runner limits |
| Local dev missing compiled deps | Low | Existing `predev`/`prebuild` compile dependencies |

## Rollback Plan

Revert `.gitignore` and `.github/workflows/ci.yml`; re-commit bundles if dynamic build fails.

## Dependencies

- Node.js 20 GitHub Actions runner.
- Monorepo npm workspace resolution across packages and apps.

## Success Criteria

- [ ] Zero bundle files tracked in `docs/innfo/app/assets/`, `docs/innfo/cdn/`, and `iNNfo/packages/innfo-mcp/bin/`.
- [ ] `.gitignore` prevents committing bundle artifacts.
- [ ] CI compiles `@cognnitive/innfo-editor` and dependencies dynamically during deployment.
- [ ] GitHub Pages deploys and serves the editor SPA cleanly.
- [ ] Monorepo build order invariants documented for TypeScript migration.
