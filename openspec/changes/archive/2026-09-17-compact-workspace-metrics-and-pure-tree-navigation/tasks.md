# Tasks: Compact Workspace Metrics and Pure Tree Navigation

## Phase 1: Compact Workspace Metrics in LeftSidebar Header
- [x] 1.1 Remove standalone `workspace-overview-panel` ("Workspace Mode" card panel) from `iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue`.
- [x] 1.2 Add inline status pill (`[data-testid="workspace-metrics-pill"]`) into the "WORKSPACE" header row in `LeftSidebar.vue` with active (emerald indicator) and draft (amber indicator) model count badges.
- [x] 1.3 Implement `workspaceMetricsTooltip` computed property displaying `"Workspace Models: ${totalModelCount} total (${activeSubmodelCount} active, ${draftSubmodelCount} draft)"` bound to the pill's title attribute.

## Phase 2: Remove Quick-Open/Isolate Arrow from ConceptTreeNode
- [x] 2.1 Remove the `ArrowUpRight` quick-open action button (`[data-testid="tree-node-open-model"]`) from `iNNfo/apps/innfo-editor/src/components/layout/ConceptTreeNode.vue`.
- [x] 2.2 Clean up unused imports (`ArrowUpRight`, `Loader2`), reactive state (`loadingModelId`), and event handler (`handleOpenModel`) from `ConceptTreeNode.vue`.
- [x] 2.3 Verify inline recursive submodel exploration via `VirtualGroupNode` and chevron expansion toggles remain functional without root jumping.

## Phase 3: Update Unit and Component Tests
- [x] 3.1 Update `iNNfo/apps/innfo-editor/tests/component/LeftSidebar-dual-mode.test.ts` (and any related sidebar tests) to assert `workspace-metrics-pill` rendering, active/draft badge counts, and hover tooltip string instead of `workspace-overview-panel`.
- [x] 3.2 Update `iNNfo/apps/innfo-editor/tests/component/ConceptTreeNode.test.ts` to remove expectations for `tree-node-open-model` and verify pure recursive tree disclosure.
- [x] 3.3 Verify E2E / integration test selectors (such as `15-workspace-taxonomy-submodels.spec.ts` if affected) for sidebar workspace header compatibility.

## Phase 4: Full Verification
- [x] 4.1 Run Vitest test suites across `innfo-editor` to verify all unit and component tests pass.
- [x] 4.2 Run repository integrity checks (`node scripts/check-integrity.js`) to ensure lint, formatting, and spec alignment.
