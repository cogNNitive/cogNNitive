# Tasks: Port Legacy Gaps

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,780 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 9 work units (see below) |
| Delivery strategy | single-pr-default |
| Chain strategy | feature-branch-chain |

Decision needed before apply: **Yes**
Chained PRs recommended: **Yes**
Chain strategy: **feature-branch-chain**
400-line budget risk: **High**

### Suggested Work Units

| Unit | Goal | Likely Lines | Base Branch |
|------|------|--------------|-------------|
| 1 | Phase A â€” Tree Navigation (pills, counters, popups, ghost) | ~280 | `feature/port-legacy-gaps` |
| 2 | Phase D â€” Matrix Virtual Scrolling | ~350 | PR1 |
| 3 | Phase H â€” Taxonomy Perspectives | ~180 | PR2 |
| 4 | Phase L â€” Session Persistence + Version Panel | ~320 | PR3 |
| 5 | Phase F â€” File System Operations | ~400 | PR4 |
| 6 | Phase C â€” Widgets 1â€“7 (Date â†’ Scale) | ~350 | PR5 |
| 7 | Phase C â€” Widgets 8â€“14 (ToggleGroup â†’ Markdown) + registry | ~400 | PR6 |
| 8 | Phase B â€” Sheet Components (rels, summary, media, field-viewer, compliance, graph-inline) | ~300 | PR7 |
| 9 | Phase B â€” BlockSheet tabs + BlockFeed wiring + all B tests | ~350 | PR8 |

Each unit is independently verifiable and revertible. Merge order matters: PR1 â†’ PR2 â†’ ... â†’ PR9, all into `feature/port-legacy-gaps`, then merge the tracker branch to main. Tests travel with their code.

---

## Phase A: Tree Navigation

- [x] A.1 Improve `BlockPill.vue` â€” color resolution via parent chain (V_0-1-5), YIQ contrast (colorHex + `'18'` opacity), ghost state detection (`isEmpty`), teleported info popup, marker cycling toolbar
- [x] A.2 Extract `yiqLuminance(hex)` from `GraphViewer.vue` to `useConceptVisuals.ts` â€” shared utility, threshold at 0.55
- [x] A.3 Update `ConceptTreeNode.vue` â€” integrate BlockPill for colored pills, add info icon + popup, instance counter via `modelStore.getChildren(nodeId).length`, ghost state wiring (opacity 0.45, italic "Empty")
- [x] A.4 Enhance `VirtualGroupNode.vue` â€” colored left border, tinted bg, icon from `IconRenderer`, expand/collapse chevron, uppercase bold name, instance counter badge
- [x] A.5 Update `LeftSidebar.vue` â€” pass instance counters through, preserve expand/collapse-all and `groupByConcept` prop
- [x] A.6 Write tests for BlockPill â€” ghost state, color resolution via parent chain, YIQ text contrast, popup open/close
- [x] A.7 Write tests for ConceptTreeNode â€” instance counter rendering, info popup content, ghost appearance

Files: `BlockPill.vue`, `ConceptTreeNode.vue`, `VirtualGroupNode.vue`, `LeftSidebar.vue`, `useConceptVisuals.ts`, `shared/__tests__/BlockPill.spec.ts`, `shared/__tests__/ConceptTreeNode.spec.ts`

---

## Phase B: Sheet Content

- [x] B.1 Add `marked` + DOMPurify deps to `package.json`; create `utils/markdown.ts` exporting `renderMarkdown(md): string` with sanitize
- [x] B.2 Create `BlockRelationships.vue` â€” labeled chips with clickable targets, `relationships` + `onNavigate` props, empty state
- [x] B.3 Create `BlockMatrixSummary.vue` â€” matrix participation chips, accent color per concept, `count` of non-dash cells
- [x] B.4 Create `NodeMedia.vue` â€” image gallery grid (2â€“3 cols) with lightbox overlay, non-image file download list with type icons
- [x] B.5 Create `FieldViewer.vue` â€” dispatches fields to widget registry via `WidgetField`, read/edit modes, `commitFieldValue` integration
- [x] B.6 Create `ComplianceTab.vue` â€” scoped `ValidationReport` results for the node's concept type
- [x] B.7 Update `GraphViewer.vue` â€” add `inline` prop (no layout selector, 320px height via `height` prop, `localNodeId` scope)
- [x] B.8 Update `BlockSheet.vue` â€” 4-tab layout (View/Visual/History/Compliance), lazy v-if rendering, markdown via `renderMarkdown`, FieldViewer, rels, matrix summary, media, attachments
- [x] B.9 Update `BlockFeed.vue` â€” wire `navigate-to-node` event, pass through `conceptFields` and `hasMarkers` to BlockSheet (already correctly wired)
- [x] B.10 Write tests for BlockRelationships, BlockMatrixSummary, FieldViewer â€” chip rendering, mode switching, empty states
- [x] B.11 Write tests for NodeMedia â€” image loading, lightbox open/close, non-image file display
- [x] B.12 Write tests for ComplianceTab â€” validation results scoped by concept type

Files: `package.json`, `utils/markdown.ts`, `BlockRelationships.vue`, `BlockMatrixSummary.vue`, `NodeMedia.vue`, `FieldViewer.vue`, `ComplianceTab.vue`, `GraphViewer.vue`, `BlockSheet.vue`, `BlockFeed.vue`, 3 test files

---

## Phase C: Widget Registry (14 new widgets)

- [x] C.1 Create `DateWidget.vue` â€” `<input type="date">` in edit, formatted text in read; registered as `'date'`
- [x] C.2 Create `UrlWidget.vue` â€” clickable `<a>` in read, URL input with validation in edit; `'url'`
- [x] C.3 Create `ColorWidget.vue` â€” 20Ã—20px color swatch + hex text in read, `<input type="color">` in edit; `'color'`
- [x] C.4 Create `MultiSelectWidget.vue` â€” static chips in read, removable chips + unselected dropdown in edit; `'multiselect'`
- [x] C.5 Create `TagsWidget.vue` â€” chips in both modes, Enter/comma to add, Ã— to remove, trim + dedup; `'tags'`
- [x] C.6 Create `RatingWidget.vue` â€” filled/empty star icons (1â€“5) + `n/5` text in both modes; `'rating'`
- [x] C.7 Create `ScaleWidget.vue` â€” clickable step indicators + badge, range from `fieldDefinition.options` (default 1â€“10); `'scale'`
- [x] C.8 Create `ToggleGroupWidget.vue` â€” segmented button group for enum selection, active segment highlighted; `'togglegroup'`
- [x] C.9 Create `CycleWidget.vue` â€” clickable pill cycles through `options`, wraps around; `'cycle'`
- [x] C.10 Create `CodeWidget.vue` â€” `<pre><code>` + language badge in read, monospace textarea with gutter in edit; `'code'`
- [x] C.11 Create `MermaidWidget.vue` â€” rendered diagram via `mermaid.run()` in read, textarea in edit, Ctrl+Enter re-render; `'mermaid'`
- [x] C.12 Create `DiagramWidget.vue` â€” inline SVG from `A > B > C` DSL in read, textarea in edit; `'diagram'`
- [x] C.13 Create `TimestampWidget.vue` â€” locale-formatted datetime in read, `<input type="datetime-local">` in edit; `'timestamp'`
- [x] C.14 Create `MarkdownWidget.vue` â€” rendered markdown via `marked` in read, textarea + toolbar in edit; `'markdown'`
- [x] C.15 Update `registry.ts` + `index.ts` â€” add 14 entries to `UNIFIED_WIDGET_REGISTRY`, update `WidgetType` union, re-export
- [x] C.16 Write widget tests â€” each widget: read mode, edit mode, `update:modelValue` emission, `fieldDefinition` context; registry resolution for all 14 + fallback

Files: `shared/widgets/{Date,Url,Color,MultiSelect,Tags,Rating,Scale,ToggleGroup,Cycle,Code,Mermaid,Diagram,Timestamp,Markdown}Widget.vue` (14 new), `shared/widgets/registry.ts` (modified), `shared/widgets/index.ts` (modified), test file

---

## Phase D: Matrix Virtual Scrolling

- [x] D.1 Add virtual scroller dependency (@tanstack/vue-virtual) to `package.json`; replace flat `<table>` in `MatricesGrid.vue` with virtual rows + columns
- [x] D.2 Implement scroll position tracking per matrix â€” `Map<matrixName, {scrollTop, scrollLeft}>`, reset on switch, restore on return
- [x] D.3 Write tests for MatricesGrid with virtual scroll â€” 10k+ cells render only visible window, sticky first column, value distribution over full dataset, cell editing in virtualized range

Files: `package.json`, `MatricesGrid.vue`, test file

---

## Phase F: File System Operations

- [x] F.1 Create `composables/useFileSystem.ts` â€” `scanDirectory(handle)`, `readFileContent(fileHandle)`, `connectDirectory()` with File System Access API; check API availability
- [x] F.2 Create `composables/useUrlDocLoader.ts` â€” `fetch(url)`, parse with `@cognnitive/format-core`, populate modelStore; return `{ nodes, rootIds, sourceUrl, error }`
- [x] F.3 Create `DirectoryPickerModal.vue` â€” welcome screen with "Open Local Folder" + "Load from URL" options, API guard, URL input, recent dirs from IndexedDB, folder init with template selector
- [x] F.4 Update `workspaceStore.ts` â€” add `loadFromUrl(url)`, `backupEnabled` flag + `enableBackup/disableBackup`, auto-backup before `saveActiveFile()`, folder init event handling
- [x] F.5 Write tests for file system ops â€” directory picker guard, URL loading success/error, backup creation on save, API unavailability fallback

Files: `composables/useFileSystem.ts`, `composables/useUrlDocLoader.ts`, `DirectoryPickerModal.vue`, `stores/workspaceStore.ts`, test file

---

## Phase H: Taxonomy Perspectives

- [x] H.1 Update `metamodelStore.ts` â€” add `taxonomyEdges` computed from root node frontmatter `taxonomy` field, `conceptTree` computed (O(n) tree from edges), `getNeighborhood(conceptName)` returning `PerspectiveNeighborhood`
- [x] H.2 Update `ConceptPerspectivePanel.vue` â€” read from `metamodelStore.taxonomyEdges` and `getNeighborhood`, display Parents/Children/Siblings, clickable pills update `uiStore.activePerspective`
- [x] H.3 Write tests for taxonomy edge parsing, concept tree building (roots + depth-first nesting), `getNeighborhood` correctness, empty taxonomy fallback, uiStore integration

Files: `stores/metamodelStore.ts`, `ConceptPerspectivePanel.vue`, test file

---

## Phase L: Misc â€” Session Persistence & Version Management

- [x] L.1 Create `utils/db.ts` â€” IndexedDB wrapper with v2 schema (`handles`, `session`, `treeState`, `sidebarWidths`), generic `dbGet/dbSet/dbDelete/dbGetAll/dbClear`, convenience functions (`getSessionState/setSessionState/getTreeState/setTreeState/getSidebarWidth/setSidebarWidth`), graceful degradation
- [x] L.2 Update `workspaceStore.ts` â€” session persistence in `open()` (lastFile, lastOpenedAt) and `recoverHandle()` (restore uiStore state), `persistTreeState`/`restoreTreeState` actions
- [x] L.3 Update `useResizablePanel.ts` â€” IndexedDB read in init, write on `onPointerUp` using `storageKey` as `panelId`
- [x] L.4 Update `ModelInfoPanel.vue` â€” add collapsible "Version Management" section, current version display, three bump buttons (major/minor/patch) with hover preview, disabled states, save invokes `saveActiveFileWithVersionBump`
- [x] L.5 Write tests for db.ts (schema upgrade, CRUD, graceful degradation), version panel (bump buttons, disabled states, tooltip), session persistence (reload restores state, tree state round-trip)

Files: `utils/db.ts`, `stores/workspaceStore.ts`, `composables/useResizablePanel.ts`, `ModelInfoPanel.vue`, test file

---

## Verification Criteria

- [x] All existing tests pass (unchanged suites)
- [x] Each phase's new specs are covered by tests
- [x] Build succeeds with no TypeScript errors
- [x] Tree nodes display colored pills with YIQ-optimized text, instance counters, info popups, ghost states (per R-TN-01â€“07)
- [x] BlockSheet renders full Markdown, inline graph, relationships, matrix summary, media with lightbox, widget-based fields, 4 tabs (per R-SC-01â€“10)
- [x] All 14 new widgets resolve from registry and render in read/edit modes (per R-WR-01â€“16)
- [x] MatricesGrid virtualizes 10k+ cells with scroll position per matrix (per R-MV-01â€“07)
- [x] Directory picker opens native folder dialog; URL-loaded models parse correctly; backup created on save (per R-FS-01â€“06)
- [x] Taxonomy edges parse from frontmatter; perspective neighborhood navigable (per R-TP-01â€“06)
- [x] Session state survives page reload; version panel creates semver bumps (per R-SP-01â€“07, R-VM-01â€“07)
