# Tasks: Relocate Workspace Explorer to Info View

- [x] 1. Store & UI State Streamlining
  - [x] 1.1 Remove `explorerFilterMode` and `setExplorerFilterMode` action from `iNNfo/apps/innfo-editor/src/stores/uiStore.ts`.
  - [x] 1.2 Verify `activeView` types and defaults support semantic views (`editor`, `graph`, `consoles`, `info`).

- [x] 2. LeftSidebar Semantic Navigation Refactoring
  - [x] 2.1 Remove the Explorer switcher button (`[data-testid="view-switcher-explorer"]`) in `LeftSidebar.vue`.
  - [x] 2.2 Remove conditional rendering of `<WorkspaceExplorer />` and redundant view guards from `LeftSidebar.vue`.
  - [x] 2.3 Clean up unused imports (`WorkspaceExplorer`, unreferenced Lucide icons) in `LeftSidebar.vue`.

- [x] 3. Streamline File Explorer Components
  - [x] 3.1 Remove category filter chips bar and filter state handling from `WorkspaceExplorer.vue`.
  - [x] 3.2 Ensure `WorkspaceExplorer.vue` search bar, tree refresh, and click navigation (model focus in editor vs. preview modal) operate cleanly.
  - [x] 3.3 Simplify `FileTreeNode.vue` props and search filtering logic to rely purely on recursive filename search.

- [x] 4. Info View Integration
  - [x] 4.1 Import `WorkspaceExplorer.vue` into `ModelInfoPanel.vue`.
  - [x] 4.2 Embed `<WorkspaceExplorer />` inside the Workspace Directory section with scrollable container styling.

- [x] 5. Component & Integration Tests
  - [x] 5.1 Update or add unit/component tests for `LeftSidebar.vue` verifying exclusive semantic switcher modes (`editor`, `graph`, `consoles`) and absence of explorer switcher.
  - [x] 5.2 Update or add component tests for `WorkspaceExplorer.vue` verifying tree display, absence of filter chips, search query filtering, and file click handlers.
  - [x] 5.3 Update or add component tests for `ModelInfoPanel.vue` verifying embedded `WorkspaceExplorer` presence and interaction.
  - [x] 5.4 Run full test suite and workspace integrity gate to verify zero regressions.

