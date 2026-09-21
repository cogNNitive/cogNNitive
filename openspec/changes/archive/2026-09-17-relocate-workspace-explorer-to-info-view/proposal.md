# Proposal: Relocate Workspace Explorer to Info View

## Intent
Streamline workspace navigation and reduce UI clutter:
1. **Focus Left Sidebar on Semantic Navigation**: Remove the "Explorer" switcher tab from [`LeftSidebar.vue`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue), dedicating the left navigation pane exclusively to semantic model browsing (Editor, Graph, Consoles).
2. **Relocate File Explorer to Info View**: Embed the workspace file tree into the Workspace Info view (accessible via the Header `(i)` button / [`ModelInfoPanel.vue`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/components/editor/ModelInfoPanel.vue) / [`WorkspaceDashboard.vue`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/components/layout/WorkspaceDashboard.vue)).
3. **Clean Tree Presentation**: Remove the category filter bar (models/sources/artifacts) from the file explorer, presenting an uncluttered, direct filesystem hierarchy with search.
4. **Preserve Functionality**: Retain file previewing, opening, and markdown inspection capabilities without regressions.

## Scope
- **LeftSidebar**: Remove Explorer switcher button and conditional rendering in [`LeftSidebar.vue`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue).
- **Info View / Dashboard**: Integrate [`WorkspaceExplorer.vue`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/components/layout/WorkspaceExplorer.vue) into the Info page layout.
- **WorkspaceExplorer**: Strip out category filter chips (`filterOptions`, `explorerFilterMode`), preserving search, refresh, and file click/preview interactions.
- **UI State & Stores**: Adjust [`uiStore.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/stores/uiStore.ts) active view defaults if needed.
- **Automated Tests**: Update component and integration tests referencing the sidebar explorer tab and filter chips.

## Capabilities

### Modified Capabilities
- `sidebar-navigation`: LeftSidebar contains only semantic model view modes (`editor`, `graph`, `consoles`).
- `workspace-file-explorer`: File explorer moved to Info view with a streamlined unfiltered directory tree and file inspection modal.

## Affected Areas
- `iNNfo/apps/innfo-editor/src/components/layout/LeftSidebar.vue`
- `iNNfo/apps/innfo-editor/src/components/layout/WorkspaceExplorer.vue`
- `iNNfo/apps/innfo-editor/src/components/editor/ModelInfoPanel.vue`
- `iNNfo/apps/innfo-editor/src/views/WorkspaceView.vue`
- `iNNfo/apps/innfo-editor/src/stores/uiStore.ts`
- `iNNfo/apps/innfo-editor/tests/` (LeftSidebar and Explorer unit/component tests)

## Risks
- **Discoverability**: Users accustomed to the sidebar explorer tab must find the file tree in the Info page. *Mitigation*: Ensure clear Header `(i)` affordance and dashboard integration.
- **Broken Tests**: Existing component tests checking `#view-switcher-explorer` or category filters will fail. *Mitigation*: Update and refactor component tests to match the new component hierarchy.

## Rollback Plan
Revert changes via git back to the baseline commit prior to applying `2026-09-17-relocate-workspace-explorer-to-info-view`.

## Success Criteria
1. LeftSidebar renders only semantic view options (`editor`, `graph`, `consoles`), without the `explorer` tab.
2. The Header `(i)` button navigates to the Info view, displaying the workspace file tree alongside model/workspace metadata.
3. The file explorer displays a clean directory tree without category filter buttons, retaining search, expand/collapse, and file preview/open modals.
4. All unit, component, and E2E tests pass.
