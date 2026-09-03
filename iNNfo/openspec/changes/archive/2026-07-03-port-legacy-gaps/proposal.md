# Proposal: Port Legacy Gaps to format-editor

## Intent

The format-editor consolidated two predecessor SPAs (file-format, folder-format) but many features were not ported or were simplified. This change closes those gaps: tree navigation richness, sheet content depth, the full widget system, file system operations, matrix virtual scrolling, taxonomy perspectives, and session persistence.

## Scope

### In Scope

- **A (Tree)**: Colored PILLS with icons/counters/popups/hover-cards; ghost state for empty nodes; improved VirtualGroupNode grouping
- **B (Sheet)**: Full Markdown rendering; inline GraphViewer; BlockRelationships/BlockMatrixSummary; NodeMedia; FieldViewer with real widgets; detail tabs (View/Visual/History/Compliance); file attachments
- **C (Widgets)**: 14 new widget types registered in shared/widgets/registry.ts with read+edit modes
- **D (Matrices)**: Virtual scrolling for rows and columns in MatricesGrid
- **F (File System)**: DirectoryPickerModal (File System Access API); auto-backup on save; load from URL; folder init modal
- **H (Taxonomy)**: Taxonomy edges from frontmatter; ConceptPerspectivePanel with PerspectiveNeighborhood
- **L (Misc)**: IndexedDB session persistence; version creation panel

### Out of Scope

- Cross-boundary wikilinks or relationship editors
- AI/LLM functionality
- FILE↔FOLDER mode conversion
- Index-block generation on save
- Performance optimization beyond virtual scrolling in matrices

## Capabilities

### New Capabilities
- `tree-navigation`: Colored pills, instance counters, popups, ghost states, grouping
- `sheet-content`: Markdown rendering, graph viewer, relationships, matrix summary, media, field viewer, detail tabs, attachments
- `widget-registry`: 14 new widget types with read/edit modes
- `matrix-virtual-scrolling`: Virtual scroll for MatricesGrid rows and columns
- `file-system-ops`: Directory picker, auto-backup, URL loading, folder init
- `taxonomy-perspectives`: Taxonomy edges from frontmatter, perspective navigation
- `session-persistence`: IndexedDB for last file, tree state, sidebar widths
- `version-management`: Version creation panel with semver bump

### Modified Capabilities
- `format-editor` (existing spec): Extended — BlockSheet, BlockFeed, LeftSidebar, ConceptTreeNode, MatricesGrid behavior changes; new slots in GraphViewer; enhanced modelStore/metamodelStore

## Approach

Divide into 7 independent phases (A→L) by category. Each phase is additive: new components + targeted modifications to existing ones. Phases can be implemented and reverted independently.

- **Phase A**: Modify `ConceptTreeNode.vue`, `LeftSidebar.vue`, `VirtualGroupNode.vue`; new `BlockPill.vue`
- **Phase B**: Overhaul `BlockSheet.vue` and `BlockFeed.vue`; new components for rels, matrix-summary, media, field-viewer, tabs, attachments
- **Phase C**: Add 14 widget `.vue` files under `shared/widgets/`; register in `registry.ts`
- **Phase D**: Add virtual scroller dependency; modify `MatricesGrid.vue`
- **Phase F**: New `DirectoryPickerModal.vue`; `useFileSystem.ts`/`useUrlDocLoader.ts` composables; workspace store changes
- **Phase H**: Extend `metamodelStore.ts`; enhance `ConceptPerspectivePanel.vue`
- **Phase L**: New `utils/db.ts` for IndexedDB; version panel in `ModelInfoPanel.vue`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/layout/ConceptTreeNode.vue` | Modified | Pills, counters, popups, ghost states |
| `src/components/layout/LeftSidebar.vue` | Modified | Instance counters, grouping refinements |
| `src/components/layout/VirtualGroupNode.vue` | Modified | Improved grouping styling |
| `src/components/editor/BlockSheet.vue` | Modified | Full markdown, graph, rels, matrix-summary, media, tabs, attachments |
| `src/components/editor/BlockFeed.vue` | Modified | Adapt to revised BlockSheet |
| `src/components/editor/BlockRelationships.vue` | Modified | From file-format version |
| `src/components/editor/BlockMatrixSummary.vue` | New | Matrix summary chips |
| `src/components/editor/GraphViewer.vue` | Modified | Inline mode for sheet |
| `src/components/editor/NodeMedia.vue` | New | From folder-format |
| `src/components/editor/FieldViewer.vue` | New | Widget-based field rendering |
| `src/components/editor/ComplianceTab.vue` | New | From folder-format |
| `src/shared/widgets/registry.ts` | Modified | +14 widget registrations |
| `src/shared/widgets/*Widget.vue` | New (x14) | Date, URL, Color, MultiSelect, Tags, Rating, Scale, ToggleGroup, Cycle, Code, Mermaid, Diagram, Timestamp, Markdown |
| `src/components/editor/MatricesGrid.vue` | Modified | Virtual scrolling |
| `src/components/layout/DirectoryPickerModal.vue` | New | File System Access API |
| `src/composables/useFileSystem.ts` | New | File system operations |
| `src/composables/useUrlDocLoader.ts` | New | URL loading |
| `src/stores/workspaceStore.ts` | Modified | Auto-backup, URL loading |
| `src/stores/metamodelStore.ts` | Modified | Taxonomy edges, perspectives |
| `src/utils/db.ts` | New | IndexedDB wrapper |
| `src/utils/colors.ts` | Modified | Enhanced color system |
| `src/composables/useConceptVisuals.ts` | Modified | Enhanced resolution |
| `src/components/editor/ModelInfoPanel.vue` | Modified | Version panel |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Widget count (14 new) may balloon review size | Med | Phase C can be sliced per-widget if review exceeds budget |
| Tree changes affect UX flow | Low | Scoped to cosmetic + counter; revertible by phase commit |
| IndexedDB schema may conflict with future features | Low | Use versioned schema with migration support |

## Rollback Plan

Each phase is a separate commit slice. Revert the specific phase's commits. No cross-phase coupling exists — rolling back Phase B does not affect Phase C widgets or Phase A tree.

## Dependencies

- Virtual scroller library for Vue 3 (e.g., `vue-virtual-scroller` or `@tanstack/react-virtual` equivalent)
- `marked` library for full Markdown rendering

## Success Criteria

- [x] Tree nodes display colored pills with YIQ-optimized text, icons, instance counters, and info popups
- [x] BlockSheet renders full Markdown, inline graph, relationships, matrix summary, media with lightbox, widget-based fields, and 4 detail tabs
- [x] All 14 new widgets render correctly in read/edit modes
- [x] MatricesGrid scrolls virtually with 10k+ cells
- [x] Directory picker opens native folder dialog; recent dirs persist in IndexedDB
- [x] Taxonomy edges from frontmatter produce navigable concept tree
- [x] Auto-backup creates timestamped `backups/` copies on save
- [x] URL loading works for FORMAT model files
- [x] Session state (last file, expansion, sidebar widths) survives page reload
- [x] Version panel creates semver bumps
- [x] Existing test suite passes unchanged
