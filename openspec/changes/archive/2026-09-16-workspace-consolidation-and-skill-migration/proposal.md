# Proposal: Workspace Consolidation, Root Dogfooding Catalogs, and Skill Migration

## Intent
Align the monorepo structure with the newly established Workspace Metamodel (`workspace_spec_NN.md`) and root manifest (`workspace_NN.md`):
1. Establish genuine self-hosted dogfooding catalogs (`sources/sources_NN.md`, `procedures/procedures_NN.md`, `artifacts/artifacts_NN.md`) for cogNNitive development, decoupling the root workspace from the `_samples_nn/` Ghostbusters test universe.
2. Remove obsolete legacy directories (`cogNNitive_nn/`).
3. Consolidate the agent capabilities layer by moving public skills from `actioNN/skills/` directly to root `skills/`, moving CLI tooling from `actioNN/scripts/` to `scripts/`, and eliminating the redundant `actioNN/` wrapper directory.
4. Update manifest distribution, integrity verification guards, and build scripts to maintain 100% deterministic test coverage.

## Scope
1. **Dogfooding Root Catalogs**: Author `sources_NN.md`, `procedures_NN.md`, and `artifacts_NN.md` representing cogNNitive's own engineering workflows.
2. **Workspace Root Manifest Alignment**: Update `workspace_NN.md` to reference local root catalogs and `skills_dir:: skills/`.
3. **Skills Consolidation**: Migrate all 9 public agent skills from `actioNN/skills/` to root `skills/`.
4. **Skills Manager Consolidation**: Relocate `actioNN/scripts/skills-manager.js` to `scripts/skills-manager.js`.
5. **Tooling & Generator Updates**: Update build scripts, line-count guards in `scripts/verify.js`, and `manifest/source.yaml`.
6. **Legacy Deprecation**: Remove `cogNNitive_nn/` and `actioNN/`.

## Capabilities

### New Capabilities
- `monorepo-root-catalogs`: Dedicated sources, procedures, and artifacts catalogs for cogNNitive monorepo development.
- `root-skills-governance`: Agent skills directly governed by root workspace under `skills/`.

### Modified Capabilities
- `manifest-distribution`: Update source.yaml skills registry paths from `actioNN/skills/*` to `skills/*`.
- `verification-suite`: Update orchestrator line guards and preflight test paths in `verify.js`.

## Approach
- **Phase 1**: Author root catalogs and update `workspace_NN.md`.
- **Phase 2**: Move skills and skills-manager to root `skills/` and `scripts/`.
- **Phase 3**: Update `manifest/source.yaml`, `scripts/verify.js`, build scripts, and test references.
- **Phase 4**: Remove `cogNNitive_nn/` and `actioNN/`.
- **Phase 5**: Run full integrity verification gate (`scripts/check-integrity.js`).

## Rollback Plan
Git revert to baseline commit on `dev`.
