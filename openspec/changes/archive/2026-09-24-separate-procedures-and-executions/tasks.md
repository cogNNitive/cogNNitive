# Tasks: Separate Procedure Definitions vs. Execution Runs in iNNfo Workspaces

## Batch 1: Template Specification Update
- [x] 1.1 Update `iNNfo/specs/templates/workspace_spec_NN.md` to include `* [[Executions]]`, `# NN Concept Definition: Executions`, and its associated field definitions.
- [x] 1.2 Sync copies of `workspace_spec_NN.md` across canonical locations (`skills/nn-innfo/templates/workspace_spec_NN.md`, fixtures, etc.).
- [x] 1.3 Verify template syntax and run `npm run sync:versions` if applicable.

## Batch 2: CLI & Provenance Engine Update
- [x] 2.1 Update `skills/nn-trannsform/scripts/lib/provenance-model.js` to define `# NN Executions` in fresh models and append runs under `## NN Executions: <command> @ <timestamp>`.
- [x] 2.2 Update unit tests in `skills/nn-trannsform/test/unit/test-lineage-sync.js` and `test-provenance.js` to assert `# NN Executions`.
- [x] 2.3 Run test suite for `nn-trannsform` to verify all scanner/provenance tests pass.

## Batch 3: Modeler UI Visuals & Grouping
- [x] 3.1 Verify `useConceptVisuals.ts` and icon resolution for `Executions` (mapping to `terminal` icon).
- [x] 3.2 Ensure `LeftSidebar.vue`, `IconRenderer.vue`, and `VirtualGroupNode.vue` properly render and group `Executions` entries.
- [x] 3.3 Run tests in `innfo-editor` to ensure no visual or functional regressions.

## Batch 4: Verification & Integrity Gating
- [x] 4.1 Run `npm run check:versions` / `node scripts/verify.js`.
- [x] 4.2 Run monorepo test suite / integrity checks.
- [x] 4.3 Create SDD verification report `verify-report.md`.
