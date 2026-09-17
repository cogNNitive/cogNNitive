# Proposal: Repository Structure Encapsulation, Simulation Renaming, and Legacy Cleanup

## Intent
Clean and normalize the repository root structure:
1. Encapsulate the root dogfooding workspace (`workspace_NN.md`, `models/`, `sources/`, `procedures/`, `artifacts/`) into a dedicated subfolder `workspace_NN/`, removing workspace sprawl from the monorepo root while preserving full semantic coherence and relative path validity.
2. Rename `simulacro/` to `simulation/` enforcing 100% English naming conventions across all test suites, harness configs, package definitions, and documentation.
3. Clean out all legacy and ephemeral directories: remove the obsolete root `specs/` cache directory, delete developer scratch and note folders (`dev/`, `conversations/`), and clear disposable scratchpad files from `temp/`.
4. Relocate the test fixture currently in `temp/simulacro-refactorizacion` into a permanent test fixture directory (`iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion`) so tests do not depend on disposable gitignored paths.

## Scope
1. **Dogfooding Workspace Encapsulation**: Move `workspace_NN.md`, `models/`, `sources/`, `procedures/`, and `artifacts/` into `workspace_NN/`. Update internal relative paths in `workspace_NN/workspace_NN.md` pointing to `../iNNfo/specs/...`, `../skills/...`, and `../scripts/...`.
2. **Simulation Harness Renaming**: Rename `simulacro/` to `simulation/`. Update `simulation/lib/harness.mjs`, `simulation/package.json`, `simulation/README.md`, `simulation/FINDINGS.md`, and test/script references (`scripts/perf-workspace-kb.mjs`).
3. **Legacy and Ephemeral Purge**: Delete root `specs/`, `dev/`, `conversations/`, and disposable subdirectories under `temp/`.
4. **Test Fixture Stabilization**: Move `temp/simulacro-refactorizacion` into `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion` and update `iNNfo/packages/innfo-core/tests/simulacro-user-workspace.test.ts`.
5. **Integrity & Verification**: Validate all simulation scenarios (`node simulation/run-all.mjs`), integrity gates (`node scripts/check-integrity.js --pre-push`), and core/MCP unit tests (`npm test`).

## Capabilities

### Modified Capabilities
- `repository-structure`: Encapsulated `workspace_NN/` containing all self-hosted dogfooding models and catalogs.
- `simulation-harness`: English-named `simulation/` running 8 automated end-to-end integration scenarios.
- `test-hygiene`: Tests decoupled from ephemeral `temp/` paths.

## Approach
- **Phase 1: OpenSpec Authoring**: Document proposal, spec, design, and tasks in `openspec/changes/2026-09-17-repository-reorganization-and-workspace-encapsulation/`.
- **Phase 2: Simulation Harness Renaming & Test Fixture Move**: Rename `simulacro` to `simulation`, update paths, relocate test fixture, and update `simulacro-user-workspace.test.ts`.
- **Phase 3: Dogfooding Workspace Encapsulation**: Create `workspace_NN/`, move catalogs, models, and `workspace_NN.md`, and normalize relative paths.
- **Phase 4: Cleanup**: Remove root `specs/`, `dev/`, `conversations/`, and clean `temp/`.
- **Phase 5: Verification & Gate Validation**: Run `node simulation/run-all.mjs`, `node scripts/check-integrity.js --pre-push`, and `npm test`.

## Rollback Plan
Revert changes on `dev` via git checkout/restore to baseline commit `4982ca74dcc8bf13e8fc3b40fc299f9d23fbd47f`.
