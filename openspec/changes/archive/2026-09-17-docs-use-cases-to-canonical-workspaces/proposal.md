# Proposal: Transform Documentation Use Cases to Canonical Workspaces

## Intent
Transform the 4 documentation sample folders under `docs/samples/use-cases/` (`startup-founder`, `consulting-sales`, `freelance-designer`, `youtube-creator`) into full, self-contained, canonical Level 1/2/3/4 iNNfo workspaces. This ensures strict spec compliance, multi-tree navigation readiness, and seamless inspection via the web app.

## Scope
1. **Workspace Manifests**: Create canonical `workspace_NN.md` files in each use-case folder declaring models, sources, procedures, artifacts, and metadata.
2. **Directory Standardization**: Migrate legacy `export/` directories to standard `artifacts/`, and establish standard `sources/` (with `sources/import/` and `sources/nn/`), `models/`, and `procedures/` trees.
3. **Procedure Relocation**: Move procedure models (e.g. `youtube-creator/models/*procedures_NN.md`) into `procedures/`.
4. **Catalog Index Files**: Add canonical catalog index files (`sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`) where appropriate.
5. **Documentation & App Presets**: Update `docs/use-cases.md`, `docs/use-cases.html` (modal data and action links), `workspace_NN/models/UseCases_Catalog_V_1-0-0_use-cases_NN.md`, and `iNNfo/apps/innfo-editor/src/config/workspaces.ts` to reflect the new structure.

## Capabilities

### Modified Capabilities
- `sample-workspaces`: Upgrades sample use cases to canonical workspaces compliant with workspace manifest schemas and parser standards.
- `docs-workspace-explorer`: Synchronizes documentation hyperlinks and interactive modal explorer with canonical workspace paths (`artifacts/`, `procedures/`, `workspace_NN.md`).

## Approach
- **Phase 1: Directory & File Reorganization**: Migrate `export/` to `artifacts/` across all 4 use cases. Relocate procedure models to `procedures/`.
- **Phase 2: Catalog & Manifest Generation**: Author `workspace_NN.md` and auxiliary catalog index files (`sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`) following the iNNfo workspace template schema.
- **Phase 3: Documentation & Preset Synchronization**: Update `docs/use-cases.md`, `docs/use-cases.html`, and `workspaces.ts` preset URLs.
- **Phase 4: Integrity Verification**: Validate schemas, check spec versions, and ensure all tests and linters pass.

## Affected Areas
- `docs/samples/use-cases/{startup-founder,consulting-sales,freelance-designer,youtube-creator}/`
- `docs/use-cases.md`
- `docs/use-cases.html`
- `workspace_NN/models/UseCases_Catalog_V_1-0-0_use-cases_NN.md`
- `iNNfo/apps/innfo-editor/src/config/workspaces.ts`

## Risks
- **Broken External or Internal Links**: Changing `export/` to `artifacts/` and moving procedure files may break existing links if not updated everywhere.
  *Mitigation*: Perform global repository grep and atomic updates across documentation, HTML explorer modal data, and workspace presets.

## Rollback Plan
Revert commit on the `dev` branch using `git revert` or checkout baseline commit.

## Dependencies
- Canonical workspace specifications (`workspace_spec_NN.md`, `sources_spec_NN.md`, `procedures_spec_NN.md`, `artifacts_spec_NN.md`).

## Success Criteria
- [ ] All 4 use-case directories contain valid `workspace_NN.md` manifests.
- [ ] Legacy `export/` directories migrated to `artifacts/`.
- [ ] Procedure models relocated to `procedures/`.
- [ ] `docs/use-cases.md` and `docs/use-cases.html` modal data accurately match canonical files.
- [ ] Web app workspace presets point to valid canonical models and manifests.
- [ ] Monorepo verification scripts (`lint`, `check:specs`, `test`) succeed.
