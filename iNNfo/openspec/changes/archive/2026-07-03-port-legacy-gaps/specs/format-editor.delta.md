# Delta: Format-Editor Spec — Modified Requirements

## Purpose

Amends the existing `openspec/specs/format-editor/spec.md` to accommodate the new capabilities introduced by this change. The original spec (hierarchy-model, recursive parser) remains unchanged in its existing requirements. This delta adds/modifies requirements for components that the new capabilities interact with.

## MODIFIED Requirements

### Requirement: BlockSheet — Extended Content Sections (supersedes existing placeholder)

The existing `BlockSheet.vue` (which currently renders a header, markers, edit fields, inline markdown description, field list, and a simple relationships section) MUST be extended with:

- **Full Markdown rendering** using the `marked` library (instead of `renderInlineMarkdown`) — per R-SC-01
- **Inline GraphViewer** mode in a `320px` container when the "Visual" tab is active — per R-SC-02
- **BlockRelationships** component replacing the current inline relationships list — per R-SC-03
- **BlockMatrixSummary** chips section showing matrix participation — per R-SC-04
- **NodeMedia** component for asset display with lightbox — per R-SC-05
- **FieldViewer** widget-based field rendering replacing the current simple field list — per R-SC-06
- **Four detail tabs** (View, Visual, History, Compliance) replacing the current single-body layout — per R-SC-07
- **File attachments** section at the bottom of the View tab — per R-SC-08

The existing `isEditing` mode MUST remain functional and render the current field editor layout (WidgetField grid + description textarea). The read-mode body MUST now use the tab system.

#### Scenario: BlockSheet render modes unchanged for edit

- GIVEN a BlockSheet in edit mode
- WHEN the user clicks the pencil icon
- THEN the existing field grid and description textarea render (identical to current behavior)
- AND the new tabs/content sections are hidden during edit

### Requirement: BlockFeed — Pass-through Wiring

`BlockFeed.vue` MUST pass through all new events and props to `BlockSheet`:

- `navigate-to-node` event from inline GraphViewer and relationships
- `show-add-child` button on the concept sheet (already wired)
- The `conceptFields` and `hasMarkers` props pass through unchanged

The `selectedItemName` behavior (expanding the matching instance sheet) MUST remain unchanged.

### Requirement: LeftSidebar — Instance Counters and Grouping Refinements

`LeftSidebar.vue` MUST remain compatible with the revised tree components:

- The `groupByConcept` prop on `ConceptTreeNode` MUST continue to work
- Instance counters in `VirtualGroupNode` MUST render via the existing `children.length` display (R-TN-02)
- The "Relations" section with `MatrixPill` components MUST remain unchanged
- Graph View button must continue routing to `uiStore.setActiveView('graph')`

The existing resize handle at the right edge of the sidebar MUST continue to work. Sidebar width persistence is handled by R-SP-04 (session-persistence).

### Requirement: ConceptTreeNode — Colored Pills, Popups, Ghost States

`ConceptTreeNode.vue` MUST be extended with:

- Colored pills with YIQ-optimized text contrast — per R-TN-01
- Info icon button (appears on hover) with teleported popup — per R-TN-03
- Ghost state rendering for empty nodes — per R-TN-04
- Instance counter for concept-like nodes

The existing recursive child rendering, virtual grouping, expand/collapse, and move-up/move-down controls MUST remain unchanged.

#### Scenario: Tree node interaction unchanged for non-empty nodes

- GIVEN a node with description and fields
- WHEN the user clicks the node row
- THEN the existing select behavior fires
- AND the name/icon styling is unchanged from current behavior
- AND additionally the colored pill renders on the left

### Requirement: VirtualGroupNode — Enhanced Styling

`VirtualGroupNode.vue` MUST use the enhanced styling from R-TN-05. The existing recursive `ConceptTreeNode` rendering for children MUST remain unchanged. The `expandedGeneration` prop behavior MUST remain the same.

### Requirement: MatricesGrid — Virtual Scrolling (replaces flat table)

`MatricesGrid.vue` MUST replace its current flat `<table>` rendering with virtual scrolling for both rows and columns — per R-MV-01 through R-MV-07. The matrix definition parsing (`__matrix_defs`), cell storage format (`MatrixName||Row||Col` keys), and Markdown export MUST remain unchanged.

The existing matrix dropdown selector, value distribution bar, and copy-table button MUST remain functional and interact with the virtual scroller.

#### Scenario: Matrix dropdown and value distribution unchanged

- GIVEN a matrix with 500x500 cells
- WHEN the user selects it from the dropdown
- THEN the dropdown renders identically to current behavior
- AND the value distribution bar shows correct counts for all 250,000 cells
- AND the table renders with virtual scrolling (only visible rows/cols in DOM)

### Requirement: GraphViewer — Inline Mode Slot

`GraphViewer.vue` MUST support a new `inline` mode prop. When `inline: true`:

- Height is constrained to `320px` (configurable via a `height` prop)
- No layout selector header renders
- The zoom controls remain (intrinsic to d3 zoom)
- The `localNodeId` prop scopes the graph to the given node's relationships

The existing full-page mode (no `inline` prop) MUST remain unchanged.

#### Scenario: GraphViewer inline mode renders compact

- GIVEN `localNodeId: "Process/Phase"` and `inline: true`
- WHEN GraphViewer renders
- THEN the graph area is 320px tall
- AND no layout buttons show
- AND the graph is centered on Process/Phase's relationships

### Requirement: modelStore — Enhanced Node Support

`modelStore` MUST support the new fields that the ported components rely on:

- `assets?: string[]` on `ModelNode` — already exists in the type definition but may not be populated by the current parser. The parser MUST NOT be modified in this slice; store actions must handle `assets` if present.
- `assetMode?: 'centralized' | 'per-element'` — already exists in `ModelNode` type.

No new store actions are needed for this slice. The existing `upsertNode`, `markDirty`, `getNode`, `getChildren`, `getRoots` continue to work.

### Requirement: metamodelStore — Taxonomy and Perspectives

`metamodelStore` MUST be extended with:

- `taxonomyEdges` computed property — per R-TP-01
- `conceptTree` computed property — per R-TP-02
- `getNeighborhood(conceptName)` function — per R-TP-04

The existing `concepts`, `markers`, `getConceptByName`, `getConceptFields`, documentation, and guidance accessors MUST remain unchanged.

### ADDED Requirements

### Requirement: workspaceStore — Auto-Backup, URL Loading, Version Save

`workspaceStore` MUST integrate:

- Auto-backup before save (`backupEnabled` flag, `enableBackup`/`disableBackup` actions) — per R-FS-02
- `loadFromUrl(url)` action — per R-FS-03
- The existing `saveActiveFileWithVersionBump` action MUST be verified to work with the new version panel (R-VM-05)

#### Scenario: Auto-backup runs before save

- GIVEN `workspaceStore.backupEnabled` is `true` and a node is dirty
- WHEN `saveActiveFile()` runs
- THEN a backup is written to `backups/` before the main save
- AND the backup filename includes the current timestamp

### Requirement: utils/db.ts — Session, Tree State, Sidebar Persistence

A new `utils/db.ts` module MUST provide IndexedDB persistence as per R-SP-05. The existing `openHandleDb`/`storeHandle`/`loadStoredHandle` in `workspaceStore` MUST continue to work alongside the new module (they use the same database but different object stores).

### Requirement: ModelInfoPanel — Version Management Section

`ModelInfoPanel.vue` MUST add a version management section as described in R-VM-01, R-VM-03, R-VM-04, R-VM-06. The existing model metadata display, workspace info, and plain text view MUST remain unchanged.

## Removed Requirements from Original Spec

None removed. All original format-editor spec requirements remain in effect. This delta is additive.

## Scenario: Original format-editor spec still passes

- GIVEN the existing recursive parser and hierarchy-model tests
- WHEN the changes in this slice are applied
- THEN all existing format-editor spec scenarios pass
- AND the new scenarios from all port-legacy-gaps spec files also pass
