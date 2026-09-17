# Proposal: iNNfo Subsystem Tooling Unification and Legacy Cleanup

## Intent
Eliminate the "Nested Monorepo Syndrome" inside `iNNfo/` by consolidating all tooling, package governance, linting, formatting, and scripts at the monorepo root:
1. Promote `eslint`, `prettier`, and `check-spec-version` scripts to the root level so that the root `package.json` directly governs all `iNNfo/packages/*` and `iNNfo/apps/*` workspaces natively.
2. Remove redundant nested repo configurations (`iNNfo/package.json`, `iNNfo/package-lock.json`, and nested `iNNfo/node_modules/`).
3. Purge orphaned legacy sub-repo artifacts inside `iNNfo/` (`.agents/`, `.atl/`, `.claude/`, `.opencode/`, `AGENTS.md`, `openspec/`, `archive/`, `run-dev.bat`, `runplaywright.bat`, `test-quick.bat`, `test-results/`, and `.spec-cache/`).
4. Keep `iNNfo/` purely as a clean, semantic product namespace housing `apps/`, `packages/`, and `specs/`.

## Scope
1. **Root Tooling Elevation**: Move `iNNfo/eslint.config.mjs`, `iNNfo/.prettierrc.json`, and `iNNfo/.prettierignore` to the repository root. Add required devDependencies to root `package.json`.
2. **Script Relocation**: Relocate `iNNfo/scripts/check-spec-version.mjs` to `scripts/check-spec-version.mjs` and update internal relative imports.
3. **Root Monorepo Scripts Update**: Configure root `package.json` with direct workspace scripts (`lint`, `format`, `test`, `typecheck`, `check:specs`).
4. **Integrity Runner Alignment**: Update `scripts/check-integrity.js` to execute direct root commands rather than cascading `--prefix iNNfo` proxies.
5. **Sub-repo Deletion**: Remove `iNNfo/package.json`, `iNNfo/package-lock.json`, `iNNfo/node_modules/`, `iNNfo/.gitignore`, and duplicate `.agents/`, `.claude/`, `AGENTS.md`, `openspec/`, `archive/`, and batch files.

## Capabilities

### Modified Capabilities
- `monorepo-tooling`: Unified single-lockfile, single-linter, single-prettier configuration at repository root.
- `innfo-namespace`: Clean architecture for `iNNfo/` containing only source packages, apps, and specs.

## Approach
- **Phase 1**: Promote configs (`eslint`, `prettier`), move `check-spec-version.mjs` to `scripts/`, and install root devDependencies.
- **Phase 2**: Update root `package.json` scripts and `scripts/check-integrity.js`.
- **Phase 3**: Remove `iNNfo/package.json`, `iNNfo/package-lock.json`, nested `node_modules`, and orphaned directories.
- **Phase 4**: Verify all gates (`npm test`, `npm run lint`, `npm run typecheck`, `node simulation/run-all.mjs`, `node scripts/check-integrity.js --pre-push`).

## Rollback Plan
Revert changes on branch `dev` via git checkout to baseline commit.
