# Tasks: Workspace Console Hub & Canonical Console Consolidation

## Phase 1: Canonical Console & Master.html Reconcile
- [x] 1.1 Audit all references to `master.html` in skills (`nn-innfo`, `nn-trannsform`, docs) and replace with `<Template> Console`.
- [x] 1.2 Align procedure declarations across canonical templates (`business`, `procedures`, `organization`) to standardize console generator outputs.
- [x] 1.3 Ensure template console generators adhere to `nn-design-presets`.

## Phase 2: Workspace Hub Procedure Specification & Generator
- [x] 2.1 Author canonical procedure `workspace_hub_procedures_V_0-1-0_NN.md` for workspace aggregation.
- [x] 2.2 Implement standalone HTML template generator for `artifacts/workspace_hub.html`.
- [x] 2.3 Add interactive card grid and embedded iframe viewer inside `workspace_hub.html`.

## Phase 3: iNNfo Modeler Central Panel Integration
- [x] 3.1 Update `uiStore` in `iNNfo Modeler` to support `activeView: 'consoles'`.
- [x] 3.2 Implement embedded console / hub viewer in `WorkspaceView.vue` using isolated `<iframe>` (`ConsoleHubView.vue`).
- [x] 3.3 Add navigation item / tab in the workspace sidebar (`LeftSidebar.vue`) and router sync (`useViewSync.ts`).

## Phase 4: Verification & Sample Validation
- [x] 4.1 Test workspace hub blueprint and responsive interaction.
- [x] 4.2 Verify embedded rendering and type safety in `iNNfo Modeler` (TypeScript / `vue-tsc` green).
- [x] 4.3 Run full test suite (91 test files, 663 tests passed cleanly).
